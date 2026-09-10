import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created, NotFoundError } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';

const router = Router();

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'GCASH', 'MAYA', 'CHECK'];
const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
router.get('/dashboard', authenticate, allowRoles('CASHIERING', 'ADMIN'), asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalPayments, thisMonthTotal, totalAmount, thisMonthAmount] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.count({ where: { paidAt: { gte: startOfMonth } } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: startOfMonth } } }),
  ]);

  return ok(res, {
    totalPayments,
    thisMonthTotal,
    totalAmount: Number(totalAmount._sum.amount ?? 0),
    thisMonthAmount: Number(thisMonthAmount._sum.amount ?? 0),
  });
}));

// ---------------------------------------------------------------------------
// Fee Structures
// ---------------------------------------------------------------------------
const feeCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  amount: z.number().min(0),
  termId: z.string().uuid().optional(),
  lineItems: z.array(z.object({ description: z.string().trim().min(1).max(200), amount: z.number().min(0) })).optional(),
});

router.get('/fees', authenticate, allowRoles('CASHIERING', 'ADMIN'), validate(pagination, 'query'), asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const [fees, total] = await Promise.all([
    prisma.feeStructure.findMany({
      include: { lineItems: true, term: { select: { code: true, label: true } } },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.feeStructure.count(),
  ]);
  return ok(res, { fees, total, page, limit });
}));

router.post('/fees', authenticate, allowRoles('CASHIERING', 'ADMIN'), validate(feeCreateSchema), asyncHandler(async (req, res) => {
  const { lineItems, ...data } = req.body;
  const fee = await prisma.feeStructure.create({
    data: {
      ...data,
      amount: data.amount,
      ...(lineItems?.length ? { lineItems: { create: lineItems } } : {}),
    },
    include: { lineItems: true },
  });
  await audit({ actorId: req.user.id, action: 'FEE_STRUCTURE_CREATED', entityType: 'fee_structure', entityId: fee.id });
  return created(res, fee);
}));

router.delete('/fees/:id', authenticate, allowRoles('CASHIERING', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), asyncHandler(async (req, res) => {
  const existing = await prisma.feeStructure.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Fee structure not found.');
  await prisma.feeStructure.delete({ where: { id: req.params.id } });
  await audit({ actorId: req.user.id, action: 'FEE_STRUCTURE_DELETED', entityType: 'fee_structure', entityId: req.params.id });
  return ok(res, { deleted: true });
}));

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
const paymentCreateSchema = z.object({
  studentId: z.string().uuid(),
  termId: z.string().uuid().optional(),
  amount: z.number().min(0.01),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  lineItems: z.array(z.object({ label: z.string().trim().min(1).max(200), amount: z.number().min(0) })).optional(),
});

router.get('/payments', authenticate, allowRoles('CASHIERING', 'ADMIN'), validate(pagination, 'query'), asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      include: {
        student: { select: { id: true, studentNo: true, firstName: true, lastName: true } },
        term: { select: { code: true, label: true } },
        lineItems: true,
        receipt: true,
      },
      orderBy: { paidAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count(),
  ]);
  return ok(res, { payments, total, page, limit });
}));

router.post('/payments', authenticate, allowRoles('CASHIERING', 'ADMIN'), validate(paymentCreateSchema), asyncHandler(async (req, res) => {
  const student = await prisma.studentProfile.findUnique({ where: { id: req.body.studentId } });
  if (!student) throw new NotFoundError('Student not found.');

  const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;

  const payment = await prisma.payment.create({
    data: {
      studentId: req.body.studentId,
      termId: req.body.termId || null,
      amount: req.body.amount,
      method: req.body.method,
      reference: req.body.reference,
      notes: req.body.notes,
      createdBy: req.user.fullName,
      ...(req.body.lineItems?.length ? { lineItems: { create: req.body.lineItems } } : {}),
      receipt: { create: { number: receiptNumber } },
    },
    include: { lineItems: true, receipt: true },
  });

  await audit({ actorId: req.user.id, action: 'PAYMENT_CREATED', entityType: 'payment', entityId: payment.id });
  return created(res, payment);
}));

router.get('/payments/:id', authenticate, allowRoles('CASHIERING', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: {
      student: { select: { studentNo: true, firstName: true, lastName: true } },
      term: { select: { code: true, label: true } },
      lineItems: true,
      receipt: true,
    },
  });
  if (!payment) throw new NotFoundError('Payment not found.');
  return ok(res, payment);
}));

router.delete('/payments/:id', authenticate, allowRoles('CASHIERING', 'ADMIN'), validate(z.object({ id: z.string().uuid() }), 'params'), asyncHandler(async (req, res) => {
  const existing = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Payment not found.');
  await prisma.payment.delete({ where: { id: req.params.id } });
  await audit({ actorId: req.user.id, action: 'PAYMENT_DELETED', entityType: 'payment', entityId: req.params.id });
  return ok(res, { deleted: true });
}));

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------
router.get('/receipts', authenticate, allowRoles('CASHIERING', 'ADMIN'), validate(pagination, 'query'), asyncHandler(async (req, res) => {
  const { page, limit } = req.validated.query;
  const [receipts, total] = await Promise.all([
    prisma.receipt.findMany({
      include: {
        payment: {
          include: { student: { select: { studentNo: true, firstName: true, lastName: true } }, term: { select: { code: true } } },
        },
      },
      orderBy: { issuedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.receipt.count(),
  ]);
  return ok(res, { receipts, total, page, limit });
}));

export default router;
