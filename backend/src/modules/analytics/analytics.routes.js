import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { authenticate, allowRoles } from '../../middleware/auth.js';

const router = Router();

/**
 * Enrollment analytics for institutional reporting. Sources are the live
 * enrollment requests and finalized grade records. Computation stays in SQL
 * (Prisma groupBy/aggregate) so the dashboard stays fast at campus scale.
 */
router.get(
  '/overview',
  authenticate,
  allowRoles('REGISTRAR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const [terms, programs, campuses, students] = await Promise.all([
      prisma.term.findMany({ orderBy: { startDate: 'desc' } }),
      prisma.program.count(),
      prisma.campus.count(),
      prisma.studentProfile.count(),
    ]);

    const requests = await prisma.enrollmentRequest.groupBy({
      by: ['termId', 'status'],
      _count: true,
    });
    const byTerm = {};
    for (const row of requests) {
      byTerm[row.termId] ??= { PENDING: 0, APPROVED: 0, REJECTED: 0, WITHDRAWN: 0 };
      byTerm[row.termId][row.status] = row._count;
    }

    const termSeries = terms.map((term) => ({
      term: term.label,
      code: term.code,
      pending: byTerm[term.id]?.PENDING ?? 0,
      approved: byTerm[term.id]?.APPROVED ?? 0,
      rejected: byTerm[term.id]?.REJECTED ?? 0,
    }));

    const byProgramId = await prisma.studentProfile.groupBy({ by: ['programId'], _count: true });
    const approvedTotal = termSeries.reduce((sum, t) => sum + t.approved, 0);

    const [campusLoad, strandMix, yearMix] = await Promise.all([
      prisma.studentProfile.groupBy({ by: ['campusId'], _count: true }),
      prisma.studentProfile.groupBy({ by: ['strand'], _count: true, orderBy: { _count: { strand: 'desc' } } }),
      prisma.studentProfile.groupBy({ by: ['yearLevel'], _count: true, orderBy: { _count: { yearLevel: 'desc' } } }),
    ]);

    return ok(res, {
      totals: {
        students,
        programs,
        campuses,
        approvedEnrollments: approvedTotal,
        activeTerms: terms.filter((t) => t.isActive).length,
      },
      termSeries,
      programLoad: byProgramId,
      campusLoad,
      strandMix,
      yearMix,
    });
  }),
);

router.get(
  '/sections',
  authenticate,
  allowRoles('REGISTRAR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const [sections, items] = await Promise.all([
      prisma.section.findMany({
        include: { subject: true, term: true, faculty: { select: { fullName: true } } },
      }),
      prisma.enrollmentItem.groupBy({
        by: ['sectionId'],
        where: { request: { status: { in: ['PENDING', 'APPROVED'] } } },
        _count: true,
      }),
    ]);
    const seatMap = Object.fromEntries(items.map((i) => [i.sectionId, i._count]));
    return ok(
      res,
      sections.map((s) => ({ ...s, seatsTaken: seatMap[s.id] ?? 0, seatsLeft: Math.max(0, s.capacity - (seatMap[s.id] ?? 0)) })),
    );
  }),
);

router.get(
  '/grades',
  authenticate,
  allowRoles('REGISTRAR', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const grades = await prisma.gradeRecord.findMany({
      where: { status: 'FINALIZED', grade: { not: null } },
      select: { grade: true, section: { select: { subject: { select: { code: true } } } } },
    });

    const buckets = { '1.00-1.49': 0, '1.50-1.99': 0, '2.00-2.49': 0, '2.50-2.99': 0, '3.00': 0, '3.01-5.00': 0 };
    let passCount = 0;
    for (const g of grades) {
      const value = Number(g.grade);
      if (value <= 3.0) passCount += 1;
      if (value <= 1.49) buckets['1.00-1.49'] += 1;
      else if (value <= 1.99) buckets['1.50-1.99'] += 1;
      else if (value <= 2.49) buckets['2.00-2.49'] += 1;
      else if (value <= 2.99) buckets['2.50-2.99'] += 1;
      else if (value <= 3.0) buckets['3.00'] += 1;
      else buckets['3.00-5.00'] += 1;
    }

    return ok(res, {
      distribution: Object.entries(buckets).map(([label, count]) => ({ label, count })),
      total: grades.length,
      passingRate: grades.length ? Math.round((passCount / grades.length) * 10000) / 100 : null,
    });
  }),
);

export default router;