import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config.js';
import { ok, asyncHandler } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { chatLimiter } from '../../lib/rate-limit.js';
import { localRespond } from '../../lib/chatResponder.js';

const router = Router();

const SYSTEM_PROMPT = `You are the DOrSU (Davao Oriental State University) enrollment assistant chatbot, embedded in the DEIS portal.
Answer briefly and helpfully about enrollment, clearance, grades, the Student Profile Form (FM-DOrSU-ODI-05), terms, schedules, and fees.
Use the user's role context below. If you don't know, say so and suggest contacting the Registrar.
Keep replies under 120 words.`;

function buildContext(user, role) {
  return prisma
    .$transaction(async (tx) => {
      const activeTerm = await tx.term.findFirst({ where: { isActive: true } });
      let clearance = null;
      let gwa = null;
      let student = null;
      if (role === 'STUDENT') {
        student = await tx.studentProfile.findUnique({ where: { userId: user.id }, include: { program: true } });
        if (student && activeTerm) {
          clearance = await tx.studentClearance.findFirst({
            where: { studentId: student.id, termId: activeTerm.id },
            include: { signoffs: true },
          });
        }
        const agg = await tx.gradeRecord.aggregate({
          where: { studentId: student?.id, status: 'FINALIZED' },
          _avg: { grade: true },
        });
        gwa = agg._avg.grade;
      }
      const upcoming = await tx.universityActivity.findMany({
        where: { startsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
        take: 3,
      });
      return {
        role,
        user: { fullName: user.fullName, student: student ? { studentNo: student.studentNo } : null },
        activeTerm,
        clearance: clearance
          ? {
              status: clearance.status,
              signoffs: clearance.signoffs.map((s) => ({ status: s.status })),
            }
          : null,
        gwa,
        upcoming,
      };
    });
}

router.post(
  '/',
  chatLimiter,
  authenticate,
  validate(z.object({ message: z.string().trim().min(1).max(1000) })),
  asyncHandler(async (req, res) => {
    const ctx = await buildContext(req.user, req.user.role);

    if (req.query.stream && config.groqApiKey) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const controller = new AbortController();
      req.on('close', () => controller.abort());

      try {
        const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.groqApiKey}`,
          },
          body: JSON.stringify({
            model: config.groqModel,
            stream: true,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'system', content: `Current context: ${JSON.stringify(ctx)}` },
              { role: 'user', content: req.body.message },
            ],
            temperature: 0.4,
            max_tokens: 300,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const fallback = localRespond(req.body.message, ctx);
          res.write(`data: ${JSON.stringify({ text: fallback, source: 'local', done: true })}\n\n`);
          return res.end();
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let sent = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content ?? '';
              if (delta) {
                sent = true;
                res.write(`data: ${JSON.stringify({ text: delta, source: 'groq' })}\n\n`);
              }
            } catch {
              /* ignore partial chunks */
            }
          }
        }
        if (!sent) {
          res.write(`data: ${JSON.stringify({ text: localRespond(req.body.message, ctx), source: 'local', done: true })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        }
        return res.end();
      } catch (err) {
        if (controller.signal.aborted) return res.end();
        res.write(`data: ${JSON.stringify({ text: localRespond(req.body.message, ctx), source: 'local', done: true })}\n\n`);
        return res.end();
      }
    }

    // non-streaming path
    if (config.groqApiKey) {
      try {
        const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.groqApiKey}`,
          },
          body: JSON.stringify({
            model: config.groqModel,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'system', content: `Current context: ${JSON.stringify(ctx)}` },
              { role: 'user', content: req.body.message },
            ],
            temperature: 0.4,
            max_tokens: 300,
          }),
        });
        if (upstream.ok) {
          const json = await upstream.json();
          const text = json.choices?.[0]?.message?.content?.trim();
          if (text) return ok(res, { text, source: 'groq' });
        }
      } catch {
        /* fall through to local responder */
      }
    }

    return ok(res, { text: localRespond(req.body.message, ctx), source: 'local' });
  }),
);

export default router;