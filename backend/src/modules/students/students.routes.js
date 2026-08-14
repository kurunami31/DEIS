import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok, created, ConflictError, UnprocessableError } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles, requireStudent } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';

const router = Router();

const spfSchema = z.object({
  // I. Application for Admission
  applicantType: z.enum(['FIRST_YEAR', 'TRANSFEREE', 'RETURNEE']).optional(),
  lrn: z.string().trim().max(20).optional(),
  preferredCourse1: z.string().trim().max(100).optional(),
  preferredCourse2: z.string().trim().max(100).optional(),
  preferredCourse3: z.string().trim().max(100).optional(),
  admissionTerm: z.string().trim().max(50).optional(),
  // II. Personal Information
  middleName: z.string().trim().max(50).optional(),
  dateOfBirth: z.coerce.date().optional(),
  placeOfBirthCity: z.string().trim().max(100).optional(),
  placeOfBirthProvince: z.string().trim().max(100).optional(),
  placeOfBirthCountry: z.string().trim().max(100).optional(),
  civilStatus: z.enum(['SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED']).optional(),
  citizenship: z.string().trim().max(50).optional(),
  heightFt: z.string().trim().max(8).optional(),
  weightKg: z.string().trim().max(8).optional(),
  religion: z.string().trim().max(100).optional(),
  tribe: z.string().trim().max(100).optional(),
  personalEmail: z.string().email().optional().or(z.literal('')),
  contactNumber: z.string().trim().max(20).optional(),
  permanentAddress: z.string().trim().max(255).optional(),
  zipCode: z.string().trim().max(10).optional(),
  photo: z.string().max(1_500_000).optional(),
  // III. Family Background
  spouseName: z.string().trim().max(100).optional(),
  spouseOccupation: z.string().trim().max(100).optional(),
  numberOfChildren: z.coerce.number().int().min(0).max(50).optional(),
  fatherName: z.string().trim().max(100).optional(),
  fatherOccupation: z.string().trim().max(100).optional(),
  fatherContact: z.string().trim().max(20).optional(),
  motherName: z.string().trim().max(100).optional(),
  motherOccupation: z.string().trim().max(100).optional(),
  motherContact: z.string().trim().max(20).optional(),
  parentsStatus: z
    .enum(['LIVING_TOGETHER', 'PERMANENTLY_SEPARATED', 'ANNULLED', 'TEMPORARILY_SEPARATED', 'FATHER_OTHER_PARTNER', 'MOTHER_OTHER_PARTNER'])
    .optional(),
  monthlyFamilyIncome: z.string().trim().max(50).optional(),
  emergencyName: z.string().trim().max(100).optional(),
  emergencyContact: z.string().trim().max(20).optional(),
  emergencyAddress: z.string().trim().max(255).optional(),
  // IV. SCAS Result
  scasGeneral: z.coerce.number().min(0).max(100).optional(),
  scasSpatial: z.coerce.number().min(0).max(100).optional(),
  scasVerbal: z.coerce.number().min(0).max(100).optional(),
  scasPerceptual: z.coerce.number().min(0).max(100).optional(),
  scasNumerical: z.coerce.number().min(0).max(100).optional(),
  scasManualDexterity: z.coerce.number().min(0).max(100).optional(),
  // V. Unique Features
  hobbies: z.string().trim().max(255).optional(),
  motto: z.string().trim().max(255).optional(),
  specialSkills: z.string().trim().max(255).optional(),
  specialInterests: z.string().trim().max(255).optional(),
  // VI. Educational Background
  elementarySchool: z.string().trim().max(100).optional(),
  elementaryYear: z.string().trim().max(20).optional(),
  shsSchool: z.string().trim().max(100).optional(),
  shsStrand: z.string().trim().max(50).optional(),
  shsYear: z.string().trim().max(20).optional(),
  vocationalCourse: z.string().trim().max(100).optional(),
  vocationalYear: z.string().trim().max(20).optional(),
  collegeDegree: z.string().trim().max(100).optional(),
  collegeYear: z.string().trim().max(20).optional(),
});

// Fields that must be present for the SPF to count as "completed" and unlock enrollment.
const SPF_REQUIRED_FIELDS = [
  'applicantType', 'lrn', 'middleName', 'dateOfBirth', 'placeOfBirthCity', 'placeOfBirthProvince',
  'placeOfBirthCountry', 'civilStatus', 'citizenship', 'sex', 'contactNumber', 'permanentAddress',
  'zipCode', 'fatherName', 'motherName', 'parentsStatus', 'monthlyFamilyIncome', 'emergencyName',
  'emergencyContact', 'emergencyAddress', 'elementarySchool', 'elementaryYear', 'shsSchool',
  'shsStrand', 'shsYear', 'collegeDegree', 'collegeYear', 'hobbies', 'specialSkills',
];

function spfMissingFields(student) {
  return SPF_REQUIRED_FIELDS.filter((field) => {
    const value = student[field];
    return value === null || value === undefined || value === '';
  });
}

router.patch(
  '/me',
  authenticate,
  requireStudent,
  validate(spfSchema),
  asyncHandler(async (req, res) => {
    const student = await prisma.studentProfile.findUnique({ where: { userId: req.user.id } });
    if (!student) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student profile not found' } });

    const data = { ...req.body };
    const updated = await prisma.studentProfile.update({
      where: { id: student.id },
      data,
    });

    const missing = spfMissingFields(updated);
    let spfCompletedAt = null;
    if (missing.length === 0) {
      spfCompletedAt = updated.spfCompletedAt ?? new Date();
      if (spfCompletedAt !== updated.spfCompletedAt) {
        await prisma.studentProfile.update({ where: { id: student.id }, data: { spfCompletedAt } });
      }
    }
    updated.spfCompletedAt = spfCompletedAt;

    return ok(res, { student: updated, spfCompleted: missing.length === 0, missing });
  }),
);

router.get(
  '/me',
  authenticate,
  requireStudent,
  asyncHandler(async (req, res) => {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        program: { include: { faculty: true, campus: true } },
        campus: true,
        enrollmentRequests: {
          include: { term: true, items: { include: { section: { include: { subject: true } } } } },
          orderBy: { submittedAt: 'desc' },
        },
        grades: {
          include: { section: { include: { subject: true, term: true } } },
          orderBy: { section: { term: { startDate: 'desc' } } },
        },
      },
    });
    return ok(res, student);
  }),
);

const createStudentSchema = z.object({
  studentNo: z.string().trim().min(1).max(20),
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  sex: z.enum(['MALE', 'FEMALE']),
  yearLevel: z.coerce.number().int().min(1).max(6).default(1),
  strand: z.string().trim().max(20).optional(),
  programCode: z.string().trim().min(1).max(20),
  campusCode: z.string().trim().min(1).max(20),
});

async function generateActivationCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    const existing = await prisma.studentProfile.findUnique({ where: { activationCode: code } });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique activation code.');
}

async function resolveProgramAndCampus(programCode, campusCode) {
  const [program, campus] = await Promise.all([
    prisma.program.findUnique({ where: { code: programCode } }),
    prisma.campus.findUnique({ where: { code: campusCode } }),
  ]);
  if (!program) throw new UnprocessableError(`Unknown program code "${programCode}".`);
  if (!campus) throw new UnprocessableError(`Unknown campus code "${campusCode}".`);
  return { programId: program.id, campusId: campus.id };
}

async function createStudentRecord({ studentNo, firstName, lastName, sex, yearLevel, strand, programCode, campusCode }, actorId) {
  const { programId, campusId } = await resolveProgramAndCampus(programCode, campusCode);
  const activationCode = await generateActivationCode();
  try {
    const student = await prisma.studentProfile.create({
      data: { studentNo, firstName, lastName, sex, yearLevel, strand, programId, campusId, activationCode },
    });
    await audit({ actorId, action: 'STUDENT_REGISTERED', entityType: 'student', entityId: student.id, meta: { studentNo } });
    return student;
  } catch (err) {
    if (err.code === 'P2002') {
      throw new ConflictError(`Student number "${studentNo}" already exists.`);
    }
    throw err;
  }
}

router.post(
  '/',
  authenticate,
  allowRoles('REGISTRAR', 'ADMIN', 'ADMISSION'),
  validate(createStudentSchema),
  asyncHandler(async (req, res) => {
    const student = await createStudentRecord(req.body, req.user.id);
    return created(res, { student, activationCode: student.activationCode });
  }),
);

// Minimal CSV parser that honors double-quoted fields (RFC 4180 style).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
      }
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const REQUIRED_CSV_HEADERS = ['studentno', 'lastname', 'firstname', 'sex', 'yearlevel', 'programcode', 'campuscode'];

const importSchema = z.object({
  csv: z.string().min(1, 'CSV content is required'),
});

router.post(
  '/import',
  authenticate,
  allowRoles('REGISTRAR', 'ADMIN', 'ADMISSION'),
  validate(importSchema),
  asyncHandler(async (req, res) => {
    const rows = parseCsv(req.body.csv);
    if (rows.length < 2) throw new UnprocessableError('CSV must contain a header row and at least one student row.');
    const header = rows[0].map((h) => h.trim().toLowerCase());
    for (const required of REQUIRED_CSV_HEADERS) {
      if (!header.includes(required)) {
        throw new UnprocessableError(`CSV is missing the required column "${required}".`);
      }
    }
    const col = (row, name) => {
      const idx = header.indexOf(name.toLowerCase());
      return idx >= 0 ? row[idx]?.trim() ?? '' : '';
    };

    const created = [];
    const failed = [];
    for (let i = 1; i < rows.length; i += 1) {
      const record = {
        studentNo: col(rows[i], 'studentNo'),
        lastName: col(rows[i], 'lastName'),
        firstName: col(rows[i], 'firstName'),
        sex: col(rows[i], 'sex').toUpperCase(),
        yearLevel: Number(col(rows[i], 'yearLevel')) || 1,
        strand: col(rows[i], 'strand') || undefined,
        programCode: col(rows[i], 'programCode'),
        campusCode: col(rows[i], 'campusCode'),
      };
      const parsed = createStudentSchema.safeParse(record);
      if (!parsed.success) {
        failed.push({ row: i + 1, studentNo: record.studentNo, error: parsed.error.issues[0]?.message ?? 'Invalid row.' });
        continue;
      }
      try {
        const student = await createStudentRecord(parsed.data, req.user.id);
        created.push({ studentNo: student.studentNo, activationCode: student.activationCode });
      } catch (err) {
        failed.push({ row: i + 1, studentNo: record.studentNo, error: err.message });
      }
    }
    return ok(res, { created, failed, createdCount: created.length, failedCount: failed.length });
  }),
);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  programId: z.string().uuid().optional(),
  campusId: z.string().uuid().optional(),
  yearLevel: z.coerce.number().int().min(1).max(6).optional(),
  search: z.string().optional(),
});

router.get(
  '/',
  authenticate,
  allowRoles('REGISTRAR', 'ADMIN', 'ADMISSION'),
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, pageSize, programId, campusId, yearLevel, search } = req.validated.query;

    const where = {
      ...(programId ? { programId } : {}),
      ...(campusId ? { campusId } : {}),
      ...(yearLevel ? { yearLevel } : {}),
      ...(search
        ? {
            OR: [
              { studentNo: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, students] = await Promise.all([
      prisma.studentProfile.count({ where }),
      prisma.studentProfile.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { program: true, campus: true, user: { select: { role: true, isActive: true } } },
        orderBy: { studentNo: 'asc' },
      }),
    ]);

    return ok(res, { items: students, total, page, pageSize });
  }),
);

router.get(
  '/:id',
  authenticate,
  allowRoles('REGISTRAR', 'ADMIN', 'ADMISSION'),
  validate(z.object({ id: z.string().uuid() }), 'params'),
  asyncHandler(async (req, res) => {
    const student = await prisma.studentProfile.findUnique({
      where: { id: req.params.id },
      include: {
        program: { include: { faculty: true } },
        campus: true,
        user: { select: { fullName: true, email: true, isActive: true } },
        enrollmentRequests: {
          include: { term: true, items: { include: { section: { include: { subject: true } } } } },
          orderBy: { submittedAt: 'desc' },
        },
        grades: {
          include: { section: { include: { subject: true, term: true } } },
          orderBy: { section: { term: { startDate: 'desc' } } },
        },
      },
    });
    if (!student) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student not found' } });
    return ok(res, student);
  }),
);

export default router;