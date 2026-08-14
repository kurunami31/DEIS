import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import * as authService from '../src/modules/auth/auth.service.js';
import { demoPassword } from '../src/lib/passwords.js';

export const app = createApp();
export const api = request(app);

export const TEST_STUDENT_NO = '2025-9999';
export const TEST_ACTIVATION_CODE = '987654';
export const TEST_STUDENT_PASSWORD = 'DorsuTest@123!';

let testStudentId = null;
let testUserId = null;

/* Make test runs idempotent: purge any leftovers from interrupted runs. */
await prisma.studentProfile.deleteMany({ where: { studentNo: TEST_STUDENT_NO } });
await prisma.user.deleteMany({
  where: { OR: [{ email: `${TEST_STUDENT_NO.toLowerCase()}@students.dorsu.edu.ph` }, { email: 'tst-student@students.dorsu.edu.ph' }] },
});

/** Creates a student record that has NOT activated credentials yet (mirrors
 *  the portal's verify-then-activate onboarding). */
export async function createUnactivatedStudent() {
  const program = await prisma.program.findUnique({ where: { code: 'BSIT' } });
  const campus = await prisma.campus.findUnique({ where: { code: 'MATI' } });

  const student = await prisma.studentProfile.create({
    data: {
      studentNo: TEST_STUDENT_NO,
      firstName: 'Tester',
      lastName: 'Student',
      sex: 'MALE',
      yearLevel: 2,
      strand: 'STEM',
      programId: program.id,
      campusId: campus.id,
      activationCode: TEST_ACTIVATION_CODE,
      spfCompletedAt: new Date(), // enrollment tests exercise review flow, not the SPF gate
    },
  });
  testStudentId = student.id;
  return { student };
}

/** Activates the test student through the real service (creates the account). */
export async function activateTestStudent(password = TEST_STUDENT_PASSWORD) {
  const session = await authService.activate(TEST_STUDENT_NO, TEST_ACTIVATION_CODE, password, {
    dpaVersion: 1,
  });
  const created = await prisma.studentProfile.findUnique({
    where: { studentNo: TEST_STUDENT_NO },
    include: { user: true },
  });
  testUserId = created.user.id;
  return { user: created.user, token: session.token };
}

/** Full helper: student + account, ready to login. */
export async function createTestStudent() {
  await createUnactivatedStudent();
  await activateTestStudent();
  return { user: await prisma.user.findUnique({ where: { id: testUserId } }) };
}

export function getTestStudentId() {
  return testStudentId;
}

export async function cleanupTestData() {
  if (!testStudentId) return;
  await prisma.clearanceSignoff.deleteMany({ where: { clearance: { studentId: testStudentId } } });
  await prisma.studentClearance.deleteMany({ where: { studentId: testStudentId } });
  await prisma.enrollmentItem.deleteMany({ where: { request: { studentId: testStudentId } } });
  await prisma.enrollmentRequest.deleteMany({ where: { studentId: testStudentId } });
  await prisma.gradeRecord.deleteMany({ where: { studentId: testStudentId } });
  await prisma.studentProfile.deleteMany({ where: { id: testStudentId } });
  if (testUserId) await prisma.user.deleteMany({ where: { id: testUserId } });
  await prisma.user.deleteMany({
    where: { OR: [{ email: `${TEST_STUDENT_NO.toLowerCase()}@students.dorsu.edu.ph` }, { email: 'tst-student@students.dorsu.edu.ph' }] },
  });
  testStudentId = null;
  testUserId = null;
}

export async function loginAs(identifier, password = demoPassword(identifier)) {
  const res = await api.post('/api/auth/login').send({ identifier, password });
  // Mirrors a real user accepting the Data Privacy notice at portal entry.
  if (res.body?.data?.token) {
    await api
      .post('/api/auth/consent')
      .set('Authorization', `Bearer ${res.body.data.token}`)
      .send({ version: 1 });
  }
  return res;
}

export async function loginAsTestStudent() {
  return loginAs(TEST_STUDENT_NO, TEST_STUDENT_PASSWORD);
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

export const registrarToken = async () => (await loginAs('registrar@dorsu.edu.ph')).body.data.token;
export const adminToken = async () => (await loginAs('admin@dorsu.edu.ph')).body.data.token;
export const facultyToken = async () => (await loginAs('althea.soriano@dorsu.edu.ph')).body.data.token;