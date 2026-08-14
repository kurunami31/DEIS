import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { api, registrarToken, authHeaders } from './helpers.js';
import { prisma } from '../src/lib/prisma.js';

const IMPORT_CREATED = ['2026-9901', '2026-9902'];
const SINGLE_NO = '2026-9903';

describe('students / registration', () => {
  let registrar;

  beforeAll(async () => {
    registrar = await registrarToken();
    await prisma.studentProfile.deleteMany({
      where: { studentNo: { in: [...IMPORT_CREATED, SINGLE_NO] } },
    });
  });

  afterAll(async () => {
    await prisma.studentProfile.deleteMany({
      where: { studentNo: { in: [...IMPORT_CREATED, SINGLE_NO] } },
    });
  });

  it('registers a single student and returns a unique 6-digit activation code', async () => {
    const res = await api
      .post('/api/students')
      .set(authHeaders(registrar))
      .send({ studentNo: SINGLE_NO, firstName: 'Ana', lastName: 'Reyes', sex: 'FEMALE', yearLevel: 1, programCode: 'BSIT', campusCode: 'MATI' });
    expect(res.status).toBe(201);
    expect(res.body.data.activationCode).toMatch(/^\d{6}$/);
    expect(res.body.data.student.studentNo).toBe(SINGLE_NO);

    const duplicate = await api
      .post('/api/students')
      .set(authHeaders(registrar))
      .send({ studentNo: SINGLE_NO, firstName: 'Ana', lastName: 'Reyes', sex: 'FEMALE', yearLevel: 1, programCode: 'BSIT', campusCode: 'MATI' });
    expect(duplicate.status).toBe(409);
  });

  it('rejects unknown program or campus codes', async () => {
    const res = await api
      .post('/api/students')
      .set(authHeaders(registrar))
      .send({ studentNo: '2026-9999', firstName: 'X', lastName: 'Y', sex: 'MALE', yearLevel: 1, programCode: 'NOPE', campusCode: 'MATI' });
    expect(res.status).toBe(422);
  });

  it('imports a CSV with mixed valid and invalid rows', async () => {
    const csv = [
      'studentNo,lastName,firstName,sex,yearLevel,programCode,campusCode,strand',
      `${IMPORT_CREATED[0]},Garcia,Marco,MALE,2,BSIT,MATI,STEM`,
      `${IMPORT_CREATED[1]},Lopez,Elena,FEMALE,1,BSEd,MATI,`,
      '2026-BAD,Lopez,Elena,,,,,',
    ].join('\n');

    const res = await api.post('/api/students/import').set(authHeaders(registrar)).send({ csv });
    expect(res.status).toBe(200);
    expect(res.body.data.createdCount).toBe(2);
    expect(res.body.data.failedCount).toBe(1);
    expect(res.body.data.failed[0].row).toBe(4);
    for (const no of IMPORT_CREATED) {
      const created = res.body.data.created.find((s) => s.studentNo === no);
      expect(created).toBeTruthy();
      expect(created.activationCode).toMatch(/^\d{6}$/);
    }
  });

  it('rejects a CSV missing required headers', async () => {
    const res = await api
      .post('/api/students/import')
      .set(authHeaders(registrar))
      .send({ csv: 'name,age\nJuan,20\n' });
    expect(res.status).toBe(422);
  });
});