import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError, UnprocessableError } from '../../lib/http.js';

export const PASSING_GRADE = 3.0;
export const MAX_UNITS_PER_TERM = 24;
const STATUS_HOLDING_SEATS = ['PENDING', 'APPROVED'];

function countHeldSeats(sectionId) {
  return prisma.enrollmentItem.count({
    where: { sectionId, request: { status: { in: STATUS_HOLDING_SEATS } } },
  });
}

async function findPassedPrereqs(studentId, prereqIds) {
  if (prereqIds.length === 0) return new Set();
  const passed = await prisma.gradeRecord.findMany({
    where: { studentId, grade: { lte: PASSING_GRADE }, section: { subjectId: { in: prereqIds } } },
    select: { section: { select: { subjectId: true } } },
  });
  return new Set(passed.map((p) => p.section.subjectId));
}

/**
 * Validates a proposed enrollment. Returns an array of {sectionId, code, message}
 * violations; an empty array means the enrollment is valid.
 */
export async function validateEnrollment(studentId, termId, sectionIds) {
  const issues = [];

  const term = await prisma.term.findUnique({ where: { id: termId } });
  if (!term) throw new NotFoundError('Academic term not found.');
  if (!term.enrollmentOpen) {
    throw new UnprocessableError('Enrollment is currently closed for this term.');
  }

  const existing = await prisma.enrollmentRequest.findFirst({
    where: { studentId, termId, status: { in: ['PENDING', 'APPROVED'] } },
  });
  if (existing) {
    throw new ConflictError('You already have an active request for this term.');
  }

  const uniqueIds = [...new Set(sectionIds)];
  const sections = await prisma.section.findMany({
    where: { id: { in: uniqueIds }, termId },
    include: { subject: { include: { requires: { include: { prereq: true } } } } },
  });
  if (sections.length !== uniqueIds.length) {
    throw new UnprocessableError('One or more selected sections do not exist in this term.');
  }

  const selectedSubjects = new Set();
  let totalUnits = 0;

  for (const section of sections) {
    const subject = section.subject;

    if (selectedSubjects.has(subject.code)) {
      issues.push({ sectionId: section.id, code: 'DUPLICATE_SUBJECT', message: `Duplicate subject ${subject.code} selected` });
    }
    selectedSubjects.add(subject.code);
    totalUnits += subject.units;

    const heldSeats = await countHeldSeats(section.id);
    if (heldSeats >= section.capacity) {
      issues.push({ sectionId: section.id, code: 'SECTION_FULL', message: `Section ${section.code} is full (${heldSeats}/${section.capacity})` });
    }

    const passed = await findPassedPrereqs(studentId, subject.requires.map((r) => r.prereqId));
    const missing = subject.requires.filter((r) => !passed.has(r.prereqId));
    if (missing.length > 0) {
      issues.push({
        sectionId: section.id,
        code: 'PREREQUISITE_MISSING',
        message: `Missing prerequisite: ${missing.map((m) => m.prereq.code).join(', ')}`,
      });
    }
  }

  if (totalUnits > MAX_UNITS_PER_TERM) {
    issues.push({
      sectionId: null,
      code: 'UNITS_EXCEEDED',
      message: `Load of ${totalUnits} units exceeds the ${MAX_UNITS_PER_TERM}-unit maximum`,
    });
  }

  for (const section of sections) {
    for (const other of sections) {
      if (other.id === section.id || other.schedule !== section.schedule) continue;
      issues.push({
        sectionId: section.id,
        code: 'SCHEDULE_CONFLICT',
        message: `${section.code} conflicts with ${other.code} (${section.schedule})`,
      });
    }
  }

  return issues;
}