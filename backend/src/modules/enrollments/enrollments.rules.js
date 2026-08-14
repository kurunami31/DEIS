// Enrollment evaluation rules (W2/W3). Centralizes every rule the evaluator
// (registrar/admission) enforces when a student submits an enrollment request.
//
// Rules implemented:
//  1. Year-level alignment  — a student may only take subjects of their year else
//     they must be a retaker of a failed subject (backlog), which is always allowed.
//  2. Backlog (retake) rule  — a failed subject (final grade > PASSING_GRADE) that
//     is offered in this term MUST be included in the load before anything else.
//  3. GWA-based load cap     — total units allowed depend on GWA tier (policy keys).
//  4. Prerequisites, seats, duplicate, schedule conflicts (existing).
//
// All numeric knobs are overridable by an ADMIN through the EnrollmentPolicy
// table; the constants here are the defaults.

import { prisma } from '../../lib/prisma.js';

export const PASSING_GRADE = 3.0;

export const POLICY_DEFAULTS = {
  MAX_UNITS_PER_TERM: '24',
  MAX_UNITS_WITH_BACKLOG: '18',
  GWA_CAP_STAR: '2.00', // GWA <= this => full load
  GWA_CAP_GOOD: '2.50', // GWA <= this => medium load
  UNITS_AT_GOOD_GWA: '21',
  UNITS_AT_LOW_GWA: '18',
  ENFORCE_YEAR_LEVEL: 'true',
  ENFORCE_BACKLOG_RETAKE: 'true',
  REQUIRE_PAYMENT_BEFORE_APPROVAL: 'true',
};

let policyCache = null;

/** Loads evaluator configuration (cached for the process lifetime, refreshed on
 *  each explicit admin update). */
export async function loadPolicy() {
  if (policyCache) return policyCache;
  const rows = await prisma.enrollmentPolicy.findMany();
  const out = { ...POLICY_DEFAULTS };
  for (const row of rows) out[row.key] = row.value;
  policyCache = Object.fromEntries(
    Object.entries(POLICY_DEFAULTS).map(([k, def]) => [k, out[k] ?? def]),
  );
  return policyCache;
}

export function invalidatePolicyCache() {
  policyCache = null;
}

export function boolOf(value) {
  return String(value).toLowerCase() === 'true';
}

function unitCap(policy) {
  return parseInt(policy.MAX_UNITS_PER_TERM, 10) || 24;
}

/**
 * Weighted GWA of a student's FINALIZED grades. Null when the student has no
 * finalized grades yet (new/first-year students are treated as the best tier).
 */
export async function computeGwa(studentId) {
  const records = await prisma.gradeRecord.findMany({
    where: { studentId, status: 'FINALIZED', grade: { not: null } },
    select: { grade: true, section: { select: { subject: { select: { units: true } } } } },
  });
  let totalUnits = 0;
  let weighted = 0;
  for (const r of records) {
    const units = r.section.subject.units;
    totalUnits += units;
    weighted += Number(r.grade) * units;
  }
  if (totalUnits === 0) return null;
  return Number((weighted / totalUnits).toFixed(2));
}

/** Subjects the student previously FAILED (final grade > passing). */
export async function findBacklogs(studentId) {
  const records = await prisma.gradeRecord.findMany({
    where: { studentId, status: 'FINALIZED', grade: { gt: PASSING_GRADE } },
    select: {
      section: {
        select: {
          subject: { select: { id: true, code: true, title: true, units: true, yearLevel: true, semester: true } },
        },
      },
    },
  });
  return records.map((r) => r.section.subject);
}

/**
 * Computes the allowed load for a student this term.
 * - A student retaking failed subjects is limited to a reduced cap.
 * - Otherwise the GWA tier decides: star (<=2.00) full load, good (<=2.50)
 *   medium, low the smallest. Students without finalized grades get the full
 *   tier (first-years).
 */
export function allowedUnitsFor(gwa, backlogCount, policy) {
  if (backlogCount > 0) {
    return parseInt(policy.MAX_UNITS_WITH_BACKLOG, 10) || 18;
  }
  const star = parseFloat(policy.GWA_CAP_STAR);
  const good = parseFloat(policy.GWA_CAP_GOOD);
  if (gwa === null || gwa <= star) return unitCap(policy);
  if (gwa <= good) return parseInt(policy.UNITS_AT_GOOD_GWA, 10) || 21;
  return parseInt(policy.UNITS_AT_LOW_GWA, 10) || 18;
}

/**
 * Produces the rule violations applicable to this proposed load.
 * `offeredSubjectIds` = ids of all subjects that have a section in this term,
 * used by the backlog-retake rule to know whether a failed subject can be taken.
 * Returns [{ sectionId|null, code, message }].
 */
export async function evaluateEnrollmentRules({
  student,
  totalUnits,
  sections,
  offeredSubjectIds,
}) {
  const policy = await loadPolicy();
  const issues = [];

  const gwa = await computeGwa(student.id);
  const backlogs = await findBacklogs(student.id);
  const backlogById = new Map(backlogs.map((b) => [b.id, b]));
  const selectedSubjectIds = new Set(sections.map((s) => s.subjectId));

  // 1. Year-level alignment. Retakers are exempt (they must go back to the
  //    failing subject's level).
  if (boolOf(policy.ENFORCE_YEAR_LEVEL)) {
    for (const section of sections) {
      const isRetake = backlogById.has(section.subjectId);
      if (isRetake) continue;
      if (section.subject.yearLevel !== student.yearLevel) {
        issues.push({
          sectionId: section.id,
          code: 'YEAR_LEVEL_MISMATCH',
          message: `${section.subject.code} is a year ${section.subject.yearLevel} subject; you are enrolled at year ${student.yearLevel}. See the evaluator if you are irregular.`,
        });
      }
    }
  }

  // 2. Backlog retake rule — a failed subject offered this term must be taken.
  if (boolOf(policy.ENFORCE_BACKLOG_RETAKE)) {
    for (const backlog of backlogs) {
      if (!offeredSubjectIds.has(backlog.id)) continue;
      if (!selectedSubjectIds.has(backlog.id)) {
        issues.push({
          sectionId: null,
          code: 'BACKLOG_RETAKE_REQUIRED',
          message: `You failed ${backlog.code} (${backlog.title}) and it is offered this term — it must be included in your load.`,
        });
      }
    }
  }

  // 3. GWA-based load cap.
  const cap = allowedUnitsFor(gwa, backlogs.length, policy);
  if (totalUnits > cap) {
    const reason =
      backlogs.length > 0
        ? ' (reduced while retaking failed subjects)'
        : gwa !== null && gwa > parseFloat(policy.GWA_CAP_GOOD)
          ? ` based on your GWA of ${gwa.toFixed(2)}`
          : '';
    issues.push({
      sectionId: null,
      code: 'UNITS_EXCEEDED',
      message: `Load of ${totalUnits} units exceeds your allowed ${cap} units${reason}.`,
    });
  }

  return issues;
}