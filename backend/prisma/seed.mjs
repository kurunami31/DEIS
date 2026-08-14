import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { demoPassword } from '../src/lib/passwords.js';

const prisma = new PrismaClient();

const TERMS = [
  { code: 'AY-2024-2025-T1', label: '1st Semester, AY 2024-2025', start: '2024-08-05', end: '2024-12-20' },
  { code: 'AY-2024-2025-T2', label: '2nd Semester, AY 2024-2025', start: '2025-01-13', end: '2025-05-23' },
  { code: 'AY-2025-2026-T1', label: '1st Semester, AY 2025-2026', start: '2025-08-04', end: '2025-12-19', isActive: true, open: true },
];

const CAMPUSES = [
  { code: 'MATI', name: 'Main Campus - Mati', isMain: true },
  { code: 'BAGANGA', name: 'Baganga Campus' },
  { code: 'BANAYBANAY', name: 'Banaybanay Campus' },
  { code: 'CATEEL', name: 'Cateel Campus' },
  { code: 'SANISIDRO', name: 'San Isidro Campus' },
  { code: 'TARRAGONA', name: 'Tarragona Campus' },
];

const FACULTIES = [
  { code: 'FCE', name: 'Faculty of Computing and Engineering', campus: 'MATI' },
  { code: 'FBM', name: 'Faculty of Business and Management', campus: 'MATI' },
  { code: 'FED', name: 'Faculty of Education', campus: 'CATEEL' },
  { code: 'FNAHS', name: 'Faculty of Nursing and Allied Health Sciences', campus: 'MATI' },
  { code: 'FAG', name: 'Faculty of Agriculture and Fisheries', campus: 'BAGANGA' },
  { code: 'FST', name: 'Faculty of Science and Technology', campus: 'CATEEL' },
  { code: 'FAH', name: 'Faculty of Arts and Humanities', campus: 'BANAYBANAY' },
];

/**
 * Curriculum definitions for each program. Subjects are listed in curriculum
 * order and grouped four per academic year; `yearLevel` is derived from the
 * index, `semester` is always the first block (demo scope).
 */
const PROGRAMS = [
  {
    code: 'BSIT',
    name: 'Bachelor of Science in Information Technology',
    faculty: 'FCE',
    campus: 'MATI',
    curriculum: [
      { title: 'CC101 Introduction to Computing', units: 3, lec: 2, lab: 3 },
      { title: 'CC102 Computer Programming 1', units: 3, lec: 2, lab: 3 },
      { title: 'GE101 Purposive Communication', units: 3, lec: 3, lab: 0 },
      { title: 'GE102 Mathematics in the Modern World', units: 3, lec: 3, lab: 0 },
      { title: 'CC201 Data Structures and Algorithms', units: 3, lec: 2, lab: 3, prereqs: ['CC102 Computer Programming 1'] },
      { title: 'CC202 Object-Oriented Programming', units: 3, lec: 2, lab: 3, prereqs: ['CC102 Computer Programming 1'] },
      { title: 'BSIT201 Database Management 1', units: 3, lec: 2, lab: 3, prereqs: ['CC102 Computer Programming 1'] },
      { title: 'IT201 Web Systems and Technologies 1', units: 3, lec: 2, lab: 3, prereqs: ['CC102 Computer Programming 1'] },
      { title: 'CC311 Advanced Databases', units: 3, lec: 2, lab: 3, prereqs: ['BSIT201 Database Management 1'] },
      { title: 'ITE311 Business Analytics Foundations', units: 3, lec: 2, lab: 3, prereqs: ['BSIT201 Database Management 1'] },
      { title: 'GE203 Science Technology and Society', units: 3, lec: 3, lab: 0 },
      { title: 'IT401 Capstone Project 1', units: 3, lec: 2, lab: 3, prereqs: ['CC311 Advanced Databases'] },
    ],
  },
  {
    code: 'BSCS',
    name: 'Bachelor of Science in Computer Science',
    faculty: 'FCE',
    campus: 'MATI',
    curriculum: [
      { title: 'CS101 Discrete Structures 1', units: 3, lec: 3, lab: 0 },
      { title: 'CS102 Programming Fundamentals', units: 3, lec: 2, lab: 3 },
      { title: 'GE141 Purposive Communication', units: 3, lec: 3, lab: 0 },
      { title: 'GE142 Mathematics in the Modern World', units: 3, lec: 3, lab: 0 },
      { title: 'CS201 Data Structures and Algorithms', units: 3, lec: 2, lab: 3, prereqs: ['CS102 Programming Fundamentals'] },
      { title: 'CS202 Object-Oriented Programming', units: 3, lec: 2, lab: 3, prereqs: ['CS102 Programming Fundamentals'] },
      { title: 'CS221 Computer Organization', units: 3, lec: 3, lab: 0 },
      { title: 'CS301 Design and Analysis of Algorithms', units: 3, lec: 3, lab: 0, prereqs: ['CS201 Data Structures and Algorithms'] },
    ],
  },
  {
    code: 'BSBA-FM',
    name: 'Bachelor of Science in Business Administration (Financial Management)',
    faculty: 'FBM',
    campus: 'MATI',
    curriculum: [
      { title: 'BA101 Fundamentals of Management', units: 3, lec: 3, lab: 0 },
      { title: 'ACCT100 Basic Accounting', units: 3, lec: 3, lab: 0 },
      { title: 'GE110 Purposive Communication', units: 3, lec: 3, lab: 0 },
      { title: 'BA201 Financial Management 1', units: 3, lec: 3, lab: 0, prereqs: ['ACCT100 Basic Accounting'] },
      { title: 'BA301 Operations Management', units: 3, lec: 3, lab: 0, prereqs: ['BA101 Fundamentals of Management'] },
    ],
  },
  {
    code: 'BSEd',
    name: 'Bachelor of Secondary Education (Science)',
    faculty: 'FED',
    campus: 'CATEEL',
    curriculum: [
      { title: 'ED101 The Teaching Profession', units: 3, lec: 3, lab: 0 },
      { title: 'ED109 Field Study 1', units: 3, lec: 3, lab: 0, prereqs: ['ED101 The Teaching Profession'] },
    ],
  },
  {
    code: 'BSN',
    name: 'Bachelor of Science in Nursing',
    faculty: 'FNAHS',
    campus: 'MATI',
    curriculum: [
      { title: 'NUR101 Anatomy and Physiology', units: 3, lec: 2, lab: 3 },
      { title: 'NUR201 Health Assessment (RLE)', units: 6, lec: 2, lab: 6, prereqs: ['NUR101 Anatomy and Physiology'] },
    ],
  },
  {
    code: 'BSAG',
    name: 'Bachelor of Science in Agriculture',
    faculty: 'FAG',
    campus: 'BAGANGA',
    curriculum: [
      { title: 'AGRI101 Fundamentals of Crop Production', units: 3, lec: 2, lab: 3 },
      { title: 'AGRI201 Soil Science', units: 3, lec: 3, lab: 0 },
      { title: 'AGRI301 Agricultural Economics', units: 3, lec: 3, lab: 0, prereqs: ['AGRI101 Fundamentals of Crop Production'] },
    ],
  },
  {
    code: 'ABCOM',
    name: 'Bachelor of Arts in Communication',
    faculty: 'FAH',
    campus: 'BANAYBANAY',
    curriculum: [
      { title: 'COM101 Fundamentals of Communication', units: 3, lec: 3, lab: 0 },
      { title: 'COM201 Communication Research', units: 3, lec: 3, lab: 0, prereqs: ['COM101 Fundamentals of Communication'] },
    ],
  },
  {
    code: 'BSES',
    name: 'Bachelor of Science in Environmental Science',
    faculty: 'FST',
    campus: 'CATEEL',
    curriculum: [
      { title: 'ENV101 Introduction to Environmental Science', units: 3, lec: 3, lab: 0 },
      { title: 'ENV201 Environmental Pollution and Control', units: 3, lec: 3, lab: 0, prereqs: ['ENV101 Introduction to Environmental Science'] },
    ],
  },
];

const STRANDS = ['STEM', 'ABM', 'HUMMS', 'GAS', 'TVL-ICT', 'TVL-HE', 'TVL-IA'];

const FULL_NAMES = [
  'Anna Marie Dela Cruz', 'Joshua Reyes', 'Maria Clara Villanueva', 'Eduardo Ignacio',
  'Sofia Patricia Ramos', 'Rafael Bautista', 'Isabella Gonzaga', 'Nathaniel Cruz',
  'Camille Navarro', 'Miguel Paez', 'Samantha Ferrer', 'Carlos Lim',
  'Bianca Castillo', 'Francis Arce', 'Trisha Mae Sotto', 'Paolo Tagana',
  'Angeline Rosales', 'Rico Salazar', 'Chloe Ann Dizon', 'Marco Villarino',
  'Angela Marie Cordero', 'Elijah Domingo', 'Nathalie Abadilla', 'RJ Mercado',
  'Veronica Curts', 'Lance De Vera', 'Mia Obispo', 'Kristoff Bumagat',
  'Althea Andres', 'Zander Llanes', 'Rachel Lynn Quinto', 'Brianne Vivas',
];

const FACULTY_NAMES = [
  'Engr. Althea Mae Soriano', 'Joebert M. Reyes', 'Carmela P. Vidal',
  'Ronnel A. Damole', 'Melchora T. Cando', 'Jessabel T. Escobar',
];

// Staff/section accounts display their office instead of a personal name.
const FACULTY_OFFICES = [
  'Faculty of Computing and Engineering',
  'Faculty of Business and Management',
  'Faculty of Education',
  'Faculty of Nursing and Allied Health Sciences',
  'Faculty of Agriculture and Fisheries',
  'Faculty of Science and Technology',
];

const EMAIL_TITLES = new Set(['engr', 'dr', 'prof', 'sir', 'madam']);

/** Faculty accounts use their school email: <first>.<last>@dorsu.edu.ph */
function schoolEmailFromName(name) {
  const tokens = name
    .split(/\s+/)
    .map((token) => token.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter((token) => token && !EMAIL_TITLES.has(token));
  if (!tokens.length) throw new Error(`Cannot derive a school email from "${name}"`);
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  return `${first}.${last}@dorsu.edu.ph`;
}

const SCHEDULES = [
  'MW 07:00-10:00', 'MW 10:00-13:00', 'TTh 07:00-10:00', 'TTh 13:00-16:00',
  'WF 08:00-11:00', 'FS 09:00-12:00', 'MW 03:00-06:00', 'TTh 10:00-13:00',
];

const ROOMS = [
  'Room 101 - Main', 'Room 202 - Main', 'ComLab 2 - Main', 'Room 304 - Main',
  'Room 12 - Annex', 'Room 45 - Annex', 'Room 203 - Main', 'Room 305 - Main',
];

/** Deterministic PRNG so a fresh database reproduces the same demo data. */
function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(58012175);
const pick = (list) => list[Math.floor(rand() * list.length)];
const between = (min, max) => min + rand() * (max - min);

const pad = (value, width) => String(value).padStart(width, '0');

function computeGrade(prelim, midterm, final) {
  return Math.round((prelim * 0.3 + midterm * 0.3 + final * 0.4) * 100) / 100;
}

/**
 * Maps an academic year (1..n) to the term where that year of study happened.
 * We keep a single semester block of history per year for demo scale.
 */
const PREVIOUS_TERM_FOR_YEAR = { 1: 'AY-2024-2025-T1', 2: 'AY-2024-2025-T2' };
const TERM_SUFFIX = { 'AY-2024-2025-T1': '241S', 'AY-2024-2025-T2': '242S', 'AY-2025-2026-T1': '251S' };

const ACTIVE_SCENARIOS = ['PENDING', 'PENDING', 'APPROVED', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'PENDING', 'APPROVED'];

async function main() {
  // Every staff account gets its own unique generated password derived from
  // its email, so credentials are never shared across accounts.
  const staffDefs = [
    { email: 'registrar@dorsu.edu.ph', fullName: 'Office of the Registrar', role: 'REGISTRAR' },
    { email: 'admin@dorsu.edu.ph', fullName: 'DEIS Administration', role: 'ADMIN' },
    ...FACULTY_NAMES.map((name, idx) => ({
      email: schoolEmailFromName(name),
      fullName: FACULTY_OFFICES[idx],
      role: 'FACULTY',
    })),
    { email: 'accounting@dorsu.edu.ph', fullName: 'Finance & Accounting Office', role: 'ACCOUNTING' },
    { email: 'admission@dorsu.edu.ph', fullName: 'Office of Admission', role: 'ADMISSION' },
    { email: 'osa@dorsu.edu.ph', fullName: 'Office of Student Affairs', role: 'OSA' },
    { email: 'ohs@dorsu.edu.ph', fullName: 'Office of Health Services', role: 'OHS' },
    { email: 'cashiering@dorsu.edu.ph', fullName: 'Cashiering Section', role: 'CASHIERING' },
    { email: 'oscd@dorsu.edu.ph', fullName: 'Office of Student Counseling & Development', role: 'OSCD' },
    { email: 'faasg@dorsu.edu.ph', fullName: 'Financial Aids & Scholarship Grants', role: 'FAASG' },
  ];

  const staffUsers = [];
  for (const def of staffDefs) {
    staffUsers.push(
      await prisma.user.create({
        data: { email: def.email, passwordHash: await bcrypt.hash(demoPassword(def.email), 10), fullName: def.fullName, role: def.role },
      }),
    );
  }
  const registrar = staffUsers[0];
  const facultyUsers = staffUsers.filter((u) => u.role === 'FACULTY');

  const termRecords = {};
  for (const t of TERMS) {
    termRecords[t.code] = await prisma.term.create({
      data: {
        code: t.code,
        label: t.label,
        startDate: new Date(t.start),
        endDate: new Date(t.end),
        isActive: Boolean(t.isActive),
        enrollmentOpen: Boolean(t.open),
      },
    });
  }

  const campusRecords = {};
  for (const c of CAMPUSES) {
    campusRecords[c.code] = await prisma.campus.create({ data: c });
  }

  const facultyRecords = {};
  for (const f of FACULTIES) {
    facultyRecords[f.code] = await prisma.faculty.create({
      data: { code: f.code, name: f.name, campusId: campusRecords[f.campus].id },
    });
  }

  /* ------------------------------- Programs, subjects, prerequisites ---- */
  const programRecords = [];
  for (const def of PROGRAMS) {
    const program = await prisma.program.create({
      data: {
        code: def.code,
        name: def.name,
        campusId: campusRecords[def.campus].id,
        facultyId: facultyRecords[def.faculty].id,
        totalUnits: def.curriculum.reduce((sum, s) => sum + s.units, 0),
      },
    });

    const subjects = [];
    const subjectsByTitle = new Map();
    for (let index = 0; index < def.curriculum.length; index += 1) {
      const subjectDef = def.curriculum[index];
      const yearLevel = Math.floor(index / 4) + 1;
      const subject = await prisma.subject.create({
        data: {
          code: `${def.code}-Y${yearLevel}-${pad(index + 1, 2)}`,
          title: subjectDef.title,
          units: subjectDef.units,
          lectureHours: subjectDef.lec,
          labHours: subjectDef.lab,
          yearLevel,
          semester: 1,
          programId: program.id,
        },
      });
      subjects.push(subject);
      subjectsByTitle.set(subjectDef.title, subject);
    }

    for (const subjectDef of def.curriculum) {
      const target = subjectsByTitle.get(subjectDef.title);
      for (const prereqTitle of subjectDef.prereqs ?? []) {
        const prereq = subjectsByTitle.get(prereqTitle);
        if (!prereq) throw new Error(`Unknown prerequisite "${prereqTitle}" in ${def.code}`);
        await prisma.subjectRule.create({ data: { subjectId: target.id, prereqId: prereq.id } });
      }
    }

    programRecords.push({ def, program, subjects, subjectsByTitle });
  }
  console.log(`Seeded ${programRecords.length} programs with curricula`);

  /* ---------------------------- Sections (per term and subject) --------- */
  const sectionByTermSubject = new Map(); // key: `${termId}|${subjectId}`
  for (const record of programRecords) {
    for (const subject of record.subjects) {
      for (const term of TERMS) {
        const section = await prisma.section.create({
          data: {
            code: `${subject.code}-${TERM_SUFFIX[term.code]}`,
            subjectId: subject.id,
            termId: termRecords[term.code].id,
            facultyId: facultyUsers[Math.floor(rand() * facultyUsers.length)].id,
            schedule: pick(SCHEDULES),
            room: pick(ROOMS),
            capacity: subject.yearLevel === 1 ? 40 : 35,
          },
        });
        sectionByTermSubject.set(`${termRecords[term.code].id}|${subject.id}`, section);
      }
    }
  }
  console.log(`Seeded ${sectionByTermSubject.size} sections across terms`);

  /* ---------------------------------------- Students --------------------- */
  // Student number format: YYYY-NNNN (year enrolled - random 4-digit suffix).
  // A deterministic shuffle of the 0001..0032 pool keeps the demo stable
  // while still looking random; 9999 is reserved for automated tests.
  const studentNoPool = Array.from({ length: FULL_NAMES.length }, (_, idx) => pad(idx + 1, 4));
  for (let i = studentNoPool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [studentNoPool[i], studentNoPool[j]] = [studentNoPool[j], studentNoPool[i]];
  }

  const studentRecords = [];
  for (let i = 0; i < FULL_NAMES.length; i += 1) {
    const [firstName, ...rest] = FULL_NAMES[i].split(' ');
    const lastName = rest.join(' ');
    const yearLevel = (i % 4) + 1;
    const programRecord = programRecords[i % programRecords.length];

    const student = await prisma.studentProfile.create({
      data: {
        studentNo: `2025-${studentNoPool[i]}`,
        firstName,
        lastName,
        sex: i % 2 === 0 ? 'MALE' : 'FEMALE',
        yearLevel,
        strand: STRANDS[i % STRANDS.length],
        programId: programRecord.program.id,
        campusId: campusRecords[programRecord.def.campus].id,
        // Deterministic 6-digit activation code. In production this is
        // delivered privately; the demo returns it on-screen.
        activationCode: `${pad(i + 1, 3)}${pad(i * 7 + 20, 3)}`,
      },
    });
    studentRecords.push({ student, fullName: FULL_NAMES[i], yearLevel, program: programRecord });
  }
  console.log(`Seeded ${studentRecords.length} students`);

  /* ------------------------- Historical years (grades for underclasses) -- */
  for (const record of studentRecords) {
    // Only students in years 2-4 have history to show.
    const yearLevel = record.yearLevel;
    if (yearLevel < 2) continue;

    const termCode = PREVIOUS_TERM_FOR_YEAR[yearLevel];
    const term = termRecords[termCode];
    const priorYearSubjects = record.program.subjects.filter((s) => s.yearLevel === yearLevel - 1);
    if (!term || priorYearSubjects.length === 0) continue;

    const sections = priorYearSubjects.map(
      (subject) => sectionByTermSubject.get(`${term.id}|${subject.id}`),
    );

    const submittedAt = new Date(term.startDate);
    await prisma.enrollmentRequest.create({
      data: {
        studentId: record.student.id,
        termId: term.id,
        status: 'APPROVED',
        submittedAt,
        reviewedAt: new Date(submittedAt.getTime() + 7 * 86400000),
        reviewedById: registrar.id,
        items: { create: sections.map((section) => ({ sectionId: section.id })) },
      },
    });

    for (const section of sections) {
      const final = Math.min(3.0, Math.round((between(1.5, 2.3)) * 100) / 100);
      const prelim = final + between(-0.2, 0.3);
      const midterm = final + between(-0.2, 0.2);
      await prisma.gradeRecord.create({
        data: {
          sectionId: section.id,
          studentId: record.student.id,
          prelim: Math.round(prelim * 100) / 100,
          midterm: Math.round(midterm * 100) / 100,
          final,
          grade: computeGrade(
            Math.round(prelim * 100) / 100,
            Math.round(midterm * 100) / 100,
            final,
          ),
          status: 'FINALIZED',
          gradedById: registrar.id,
        },
      });
    }
  }
  console.log('Seeded historical enrollments and grades for upperclassmen');

  /* ----------------------------- Active-term enrollment scenarios -------- */
  const activeTerm = TERMS.find((t) => t.isActive);
  for (let i = 0; i < ACTIVE_SCENARIOS.length; i += 1) {
    const record = studentRecords[i];
    const status = ACTIVE_SCENARIOS[i];

    const load = record.program.subjects.filter((s) => s.yearLevel === record.yearLevel);
    if (load.length === 0) continue;
    const termRecord = termRecords[activeTerm.code];
    const sections = load.map((subject) => sectionByTermSubject.get(`${termRecord.id}|${subject.id}`));

    const submittedAt = new Date(activeTerm.start);
    const reviewedAt = status === 'PENDING' ? null : new Date(submittedAt.getTime() + 3 * 86400000);

    const request = await prisma.enrollmentRequest.create({
      data: {
        studentId: record.student.id,
        termId: termRecord.id,
        status,
        submittedAt,
        reviewedAt,
        reviewedById: status === 'PENDING' ? null : registrar.id,
        studentNote: null,
        reviewNotes: status === 'REJECTED' ? 'Report of Grades not attached; please resubmit.' : status === 'WITHDRAWN' ? 'Withdrawal requested by student.' : null,
        items: { create: sections.map((section) => ({ sectionId: section.id })) },
      },
    });

    if (status === 'APPROVED' && sections.length > 1) {
      const section = sections[1];
      const final = Math.min(3.0, Math.round(between(1.4, 2.2) * 100) / 100);
      await prisma.gradeRecord.create({
        data: {
          sectionId: section.id,
          studentId: record.student.id,
          prelim: final + 0.2,
          midterm: final + 0.1,
          final,
          grade: computeGrade(final + 0.2, final + 0.1, final),
          status: 'FINALIZED',
          gradedById: registrar.id,
        },
      });
    }
    console.log(`Scenario ${i}: ${record.fullName} -> ${status} (${request.id})`);
  }

  /* ----------------------------- Clearance -------------------------------- */
  const clearanceTemplates = [];
  const clearanceDefs = [
    { code: 'LIB', label: 'University Library', category: 'LIBRARY' },
    { code: 'FIN', label: 'Finance & Accounting Office', category: 'FINANCE', ownerRole: 'ACCOUNTING' },
    { code: 'DEP', label: 'Department / College', category: 'DEPARTMENT' },
    { code: 'GUID', label: 'Guidance Office', category: 'GUIDANCE', ownerRole: 'OSCD' },
    { code: 'REG', label: 'Registrar', category: 'REGISTRAR' },
    { code: 'ADM', label: 'Office of Admission', category: 'ADMISSION', ownerRole: 'ADMISSION' },
    { code: 'OSA', label: 'Office of Student Affairs', category: 'STUDENT_AFFAIRS', ownerRole: 'OSA' },
    { code: 'HEALTH', label: 'Office of Health Services', category: 'HEALTH', ownerRole: 'OHS' },
    { code: 'CASH', label: 'Cashiering Section', category: 'CASHIER', ownerRole: 'CASHIERING' },
    { code: 'SFA', label: 'Financial Aids & Scholarship Grants', category: 'SCHOLARSHIP', ownerRole: 'FAASG' },
  ];
  for (const def of clearanceDefs) {
    clearanceTemplates.push(
      await prisma.clearanceTemplate.upsert({
        where: { code: def.code },
        create: def,
        update: {},
      }),
    );
  }
  for (const record of studentRecords) {
    const cutoff = new Date(activeTerm.start);
    const hasApproved = ACTIVE_SCENARIOS[studentRecords.indexOf(record)] === 'APPROVED';
    await prisma.studentClearance.create({
      data: {
        studentId: record.student.id,
        termId: termRecords[activeTerm.code].id,
        status: hasApproved ? 'CLEARED' : 'IN_PROGRESS',
        signoffs: {
          create: clearanceTemplates.map((t, idx) => ({
            templateId: t.id,
            status: hasApproved ? 'CLEARED' : idx === 0 ? 'CLEARED' : 'PENDING',
            reviewedById: hasApproved ? registrar.id : idx === 0 ? registrar.id : null,
            reviewedAt: new Date(cutoff.getTime() + 86400000 + idx * 3600000),
          })),
        },
      },
    });
  }
  console.log('Seeded clearance templates and records');

  /* ----------------------------- Calendar --------------------------------- */
  const activeStart = new Date(activeTerm.start).getTime();
  const calDefs = [
    { title: 'Term Opening Program', type: 'ACADEMIC', audience: 'ALL', startsAt: new Date(activeStart), endsAt: new Date(activeStart + 2 * 3600000), location: 'DOrSU Gymnasium' },
    { title: 'Intramurals Week', type: 'SPORTS', audience: 'ALL', startsAt: new Date(activeStart + 7 * 86400000), endsAt: new Date(activeStart + 11 * 86400000), location: 'Campus Oval' },
    { title: 'STUDENT AFFAIRS: Foundation Day', type: 'CULTURAL', audience: 'ALL', startsAt: new Date(activeStart + 20 * 86400000), endsAt: new Date(activeStart + 20 * 86400000 + 6 * 3600000), location: 'University Quadrangle' },
    { title: 'Clearance Filing Opens', type: 'ADMINISTRATIVE', audience: 'STUDENTS', startsAt: new Date(activeStart + 15 * 86400000), location: 'Registrar Office' },
  ];
  for (const def of calDefs) {
    await prisma.universityActivity.create({
      data: { ...def, description: null, createdById: registrar.id },
    });
  }
  if (calDefs.length) console.log('Seeded calendar activities');

  console.log('Seed completed');
  console.log('Demo accounts (password is unique per account and derived from its email):');
  for (const def of staffDefs) {
    console.log(`  ${def.email} / ${demoPassword(def.email)}  [${def.role} - ${def.fullName}]`);
  }
  console.log('  Students: 2025-0001..0032 - activate via the verify screen, which shows the one-time activation code');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });