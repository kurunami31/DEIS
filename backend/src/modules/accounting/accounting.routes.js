import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created, NotFoundError, ValidationError } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';

const router = Router();

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
router.get('/dashboard', authenticate, allowRoles('ACCOUNTING', 'ADMIN'), asyncHandler(async (req, res) => {
  const [totalAccounts, totalEntries, totalDebits, totalCredits] = await Promise.all([
    prisma.chartOfAccount.count(),
    prisma.journalEntry.count(),
    prisma.ledgerEntry.aggregate({ _sum: { debit: true } }),
    prisma.ledgerEntry.aggregate({ _sum: { credit: true } }),
  ]);

  return ok(res, {
    totalAccounts,
    totalEntries,
    totalDebits: Number(totalDebits._sum.debit ?? 0),
    totalCredits: Number(totalCredits._sum.credit ?? 0),
  });
}));

// ---------------------------------------------------------------------------
// Chart of Accounts
// ---------------------------------------------------------------------------
const accountCreateSchema = z.object({
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2).max(100),
  type: z.enum(ACCOUNT_TYPES),
});

router.get('/accounts', authenticate, allowRoles('ACCOUNTING', 'ADMIN'), validate(pagination, 'query'), asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const [accounts, total] = await Promise.all([
    prisma.chartOfAccount.findMany({ orderBy: { code: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.chartOfAccount.count(),
  ]);
  return ok(res, { accounts, total, page, limit });
}));

router.post('/accounts', authenticate, allowRoles('ACCOUNTING', 'ADMIN'), validate(accountCreateSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.chartOfAccount.findUnique({ where: { code: req.body.code } });
  if (existing) throw new ValidationError([{ message: 'Account code already exists.' }]);
  const account = await prisma.chartOfAccount.create({ data: req.body });
  await audit({ actorId: req.user.id, action: 'ACCOUNT_CREATED', entityType: 'chart_of_account', entityId: account.id });
  return created(res, account);
}));

router.delete('/accounts/:id', authenticate, allowRoles('ACCOUNTING', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), asyncHandler(async (req, res) => {
  const existing = await prisma.chartOfAccount.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Account not found.');
  await prisma.chartOfAccount.delete({ where: { id: req.params.id } });
  await audit({ actorId: req.user.id, action: 'ACCOUNT_DELETED', entityType: 'chart_of_account', entityId: req.params.id });
  return ok(res, { deleted: true });
}));

// ---------------------------------------------------------------------------
// Journal Entries
// ---------------------------------------------------------------------------
const journalCreateSchema = z.object({
  date: z.coerce.date(),
  description: z.string().trim().min(2).max(500),
  reference: z.string().max(100).optional(),
  lines: z.array(z.object({
    accountId: z.string().uuid(),
    debit: z.number().min(0),
    credit: z.number().min(0),
  })).min(2),
});

router.get('/journals', authenticate, allowRoles('ACCOUNTING', 'ADMIN'), validate(pagination, 'query'), asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      include: { lines: { include: { account: true } } },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.journalEntry.count(),
  ]);
  return ok(res, { entries, total, page, limit });
}));

router.post('/journals', authenticate, allowRoles('ACCOUNTING', 'ADMIN'), validate(journalCreateSchema), asyncHandler(async (req, res) => {
  const totalDebit = req.body.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = req.body.lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) throw new ValidationError([{ message: 'Debits and credits must balance.' }]);

  const entry = await prisma.journalEntry.create({
    data: {
      date: req.body.date,
      description: req.body.description,
      reference: req.body.reference,
      createdBy: req.user.fullName,
      lines: { create: req.body.lines },
    },
    include: { lines: { include: { account: true } } },
  });

  await audit({ actorId: req.user.id, action: 'JOURNAL_ENTRY_CREATED', entityType: 'journal_entry', entityId: entry.id });
  return created(res, entry);
}));

router.delete('/journals/:id', authenticate, allowRoles('ACCOUNTING', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), asyncHandler(async (req, res) => {
  const existing = await prisma.journalEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Journal entry not found.');
  await prisma.journalEntry.delete({ where: { id: req.params.id } });
  await audit({ actorId: req.user.id, action: 'JOURNAL_ENTRY_DELETED', entityType: 'journal_entry', entityId: req.params.id });
  return ok(res, { deleted: true });
}));

// ---------------------------------------------------------------------------
// General Ledger
// ---------------------------------------------------------------------------
router.get('/ledger', authenticate, allowRoles('ACCOUNTING', 'ADMIN'), validate(pagination, 'query'), asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const [entries, total] = await Promise.all([
    prisma.ledgerEntry.findMany({
      include: { journalEntry: true, account: true },
      orderBy: { id: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ledgerEntry.count(),
  ]);
  return ok(res, { entries, total, page, limit });
}));

export default router;
