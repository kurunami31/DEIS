import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ok } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, allowRoles, requireStudent } from '../../middleware/auth.js';

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