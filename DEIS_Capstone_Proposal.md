# DEIS: A Web-Based Enrollment Information System with Analytics Dashboard for Davao Oriental State University

## A Capstone Project Proposal

<br>

**Presented to the Faculty of the College of Computing, Engineering, and Technology**

**Davao Oriental State University**

<br>

**Proponents:**
- Christopher Lyod B. Mercado
- Kenth Justine B. Sumalinab
- Maria Stefanie Celine A. Dela Salde

**Adviser:** [Adviser Name]

<br>

*Note: This document follows APA 7th edition formatting guidelines.*

---

## Chapter 1: Introduction

### Background of the Study

Davao Oriental State University (DOrSU) serves 16,514 students across six campuses in Davao Oriental as of academic year 2025-2026: Main Campus in Mati City (11,473), Baganga (797), Banaybanay (1,189), Cateel (1,436), San Isidro (1,236), and Tarragona (383). Its academic offerings span approximately 35 undergraduate programs across seven faculties, and its primary admission instrument is the State University Aptitude and Scholarship Test (SUAST), which covers six aptitude areas: General Ability, Verbal Aptitude, Numerical Aptitude, Spatial Aptitude, Perceptual Aptitude, and Manual Dexterity.

The University operates under the Free Higher Education Act (Republic Act No. 10931), which has steadily driven year-on-year enrollment growth and intensified institutional pressure: funding allocation depends on accurate headcount reporting, and the Commission on Higher Education (CHED) requires timely submission of enrollment and performance statistics (CHED, 2024). Locally published research documents persistent academic-risk signals in the applicant pool: a SUAST passing rate of only 54% for academic years 2018-2023 and a mean composite score of 134, classified as Low (Singh & Montejo, 2023; Valdez et al., 2023). These conditions make enrollment planning, registration throughput, and student monitoring institutional priorities, not merely administrative tasks.

At present, DOrSU operates the public-facing Student Portal (portal.dorsu.edu.ph), which provides student login, SUAST examinee verification, and credential activation, and defines the visual identity students already associate with university systems: a split-branded login card, deep-blue institutional colors, the Poppins typeface, and an onboarding flow built from verification to credential creation (Davao Oriental State University, 2025). However, the internal enrollment process remains largely manual and disconnected: subject loading is prepared in spreadsheets, subject selection is a paper-and-queue process, prerequisite validation and slot availability depend on staff memory and manual checking, class lists and grade sheets are re-typed across offices, and no enrollment analytics are produced for institutional decision-making. These manual processes are slow, error-prone, and opaque to students, faculty, and the Registrar alike.

DEIS (DOrSU Enrollment Information System) is proposed to address this gap. It is a web-based, full-stack enrollment system built with React, Node.js/Express, and PostgreSQL that digitizes the complete enrollment cycle: student records and signed curriculum, subject selection with prerequisite and seat validation, Registrar approval, section class lists, faculty grade encoding, and a reporting and analytics dashboard for institutional decision support. The user interface follows the design language and flows of the existing DOrSU Student Portal so that students and staff perceive the system as an extension of the university's digital ecosystem rather than a foreign application.

### Statement of the Problem

DOrSU is the enrollment cycle lacks a centralized information system, which manifests through the following problems:

1. Enrollment transactions are processed manually across offices, forcing students into long queues and subjecting records to transcription errors;
2. There is no automated validation of prerequisites, load limits, and seat availability, producing schedule conflicts, overloading, and rejected enrollments without clear notifications;
3. Class lists and grade reports are consolidated manually by the Register, delaying assessments, report cards, and CHED submissions;
4. There is no enrollment analytics capability; headcount trends, program demand, strand mix, and section occupancy; to support planning by the Admissions, Register, and Guidance offices;
5. Existing online services (the Student Portal) cover transactional viewing features but do not provide the enrollment workflow or institutional analytics described above.

### Objectives of the Study

#### General Objective

To design, develop, and deploy a web-based enrollment information system for Davao Oriental State University that digitizes the full enrollment cycle with role-based access, grade management, and analytics dashboards for institutional decision-making.

#### Specific Objectives

1. To design a relational database for the university's enrollment domain - campuses, faculties, programs, subjects with prerequisites, sections, academic terms, student records, enrollment requests, and grades - and implement it with Prisma ORM on PostgreSQL;
2. To implement a secure multi-role backend REST API (Student, Faculty, Registrar, Administrator) with JWT authentication, role-based access control, and an initial credential activation flow mirroring the portal's "examinee verification to credential creation" onboarding;
3. To build a responsive React frontend featuring the DOrSU portal-inspired login and dashboard shell, the examination pass enrollment wizard, the class-list and grade-encoding interface, and master-data management views;
4. To implement an enrollment analytics dashboard with KPIs (headcount, term-over-term growth, program demand, class size distribution, grade distribution) and CSV/PDF report exports;
5. To validate the system through automated tests, seed-data smoke tests, and usability review; and to stage deployment: complete local deployment first, then live hosting on Supabase (PostgreSQL) and Vercel (web application), consistent with institutional data policies.

### Scope and Limitations

#### Scope

The system targets DOrSU only. It covers the six campuses, the academic faculties, approximately 35 undergraduate programs, and academic terms within the test scope. User roles are Student, Faculty, Registrar, and Administrator. Students view and manage their own records and enrollments; Faculty encode grades for assigned sections; the Registrar previews, approves, or cancels enrollment requests, finalizes classes, and publishes analytics; the Administrator manages master data and users. Analytics covers enrollment statistics at campus, faculty, and program granularity with term comparisons. Development runs in a local environment (local PostgreSQL), and only after the local acceptance gate passes is the system deployed to a live environment (Supabase + Vercel).

#### Limitations

The system is a capstone prototype; it operates on seed/test data, using actual institutional data only under a data-use agreement with DOrSU. The system does not replace the University's official financial module (only enrollment statuses and optional payment remarks are tracked) and does not integrate with external systems. Only the JWT role model is implemented; institutional single sign-on is out of scope. Analytics are descriptive and statistical - no machine learning - to keep the scope contained. The live deployment is the final phase and is executed only after the local acceptance gate passes.

### Significance of the Study

- Students gain a fast, transparent enrollment experience with a portal-consistent visual identity: real-time subject availability checks, prerequisite clearance, and a print-ready enrollment form.
- The Registrar's Office gains automated validation and centralized management of courses, sections, and grades, reducing manual work, errors, and turnaround time for class lists and grade reports.
- Faculty gain a structured, section-level grade-encoding interface with a finalization review step.
- University Administration gains an analytics dashboard for headcount reporting, program demand, and scheduling decisions aligned with CHED reporting duties.
- The research community gains a reference implementation of a modern full-stack enrollment system of a Mindanao state university, with a documented path from local development to free-tier cloud deployment.

---

## Chapter 2: Review of Related Literature

### Web-Based Enrollment Systems in Philippine Higher Education

Numerous local implementations demonstrate the web-based enrollment system is a well-trodden intervention for Philippine HEIs. Valdez et al. (2023) present an automated enrollment and grade encoding system for a state college, reporting reduced manual encoding and faster generation of class lists and report cards; the study situates acceptance testing and data accuracy as the pivotal success metrics. Singh and Montejo (2023) evaluated the SUAT instruments used across Philippine state universities and explored admission-management practices, emphasizing the need for reliable candidate data early in the enrollment pipeline - a need that DEIS addresses through the activation flow and role-based records. Singh and Montejo (2023) also describe the SUAT dynamics for the wider region, including the local finding of a 54% passing rate with a mean of 134, which this study already uses as motivating context in Chapter 1. The recurring pattern in local literature is a shift from paper-and-spreadsheets to web platforms with database backends, but reference implementations rarely document analytics dashboards or a staged local-then-cloud deployment path; DEIS covers both explicitly.

### Portal And User Experience Patterns in University Systems

The DOrSU Student Portal (Davao Oriental State University, 2025) is a multi-panel web application whose student login screen is a split layout: on one side an institutional identity panel with the university seal, name, and a tagline describing DOrSU, and on the other a form card for credentials. Its onboarding flow proceeds from SUAST Examinee Verification to Create login credentials, reinforcing the institutional patterns of verification-then-activation. Usability considerations follow the principles in Nielsen (1994) on consistency, visibility of system status, and user control; the as-designed DEIS login screen adopts the portal's split layout, uses the Poppins typeface, institutional core colors (deep blue, gradient headings), and a 15px rounded-card harmony, so that students experience one coherent university design language.

### Role-Based Access Control for Higher-Education Systems

Sandhu et al. (1996) formalized Role-Based Access Control (RBAC), in which permissions attach to roles rather than users, enabling manageable security policies for organizations. DEIS implements four roles - Student, Faculty, Registrar, Administrator - each with a policy matrix documented in Chapter 3. On the web, JSON Web Tokens (Jones et al., 2015) provide a stateless means of carrying identity claims between frontend and API; the OWASP Top 10 (2021) guides both the authorization logic (Broken Access Control, A01) and authentication hardening (A07), including bcrypt password hashing and rate limits on the authentication endpoints.

### REST APIs and Full-Stack Architectures

Fielding's (2000) Representational Architecture of Networked Systems defined REST constraints; the DEIS API follows its resource-oriented style with JSON responses, explicit HTTP status codes, and stateless sessions backed by JWTs. The full-stack pairing of React (a component-based SPA library) and Node.js/Express (a minimalist server framework) is a mainstream choice for university systems; the practice of testing such APIs with schema-validated integration tests and smoke-testing the use of Prisma on top of PostgreSQL is consolidated in Obe and Hsu (2021) with Postgres itself as the transactional store.

## Chapter 3: Theoretical and Technical Framework

### Theoretical Framework

- **Enrollment Management Theory**: Hossler (1984) conceives enrollment management as input (admissions and recruitment), throughput (registration, adjustment, progression), and output (graduates and retention statistics). DEIS directly digitizes the throughput stage and produces the output statistics.
- **DIKW Knowledge Hierarchy**: Rowley (2007) distinguishes data, information, and knowledge; DEIS stores data (enrollment rows), exposes information (status screens), and supports knowledge through the analytics module (KPI and trend dashboard for decision-makers).
- **Design synthesis**: The portal user experience, the verification-first onboarding flow, and the RBAC policy are integrated as verticals of the system.

### Technical Framework

DEIS adopts a three-layer, full-stack architecture:

1. **Presentation Layer** - React 19 SPA built with Vite, Tailwind CSS, Recharts (charts), and jsPDF (PDF forms/reports). The route shell varies by role and matches the portal visual system.
2. **Application Layer** - Node.js/Express 5 REST API: authentication (JWT + bcrypt), role-aware authorization middleware, validators, and coordinator services (enrollment wizard, grading cycle, analytics queries).
3. **Data Layer** - PostgreSQL with Prisma ORM (schema, migrations, seeded data sets). Terms align to the real academic calendar (e.g., 1st Semester 2025-2026).

### Cybersecurity and Privacy Considerations

Republic Act 10173 (Data Privacy Act of 2012) informs the design: passwords are bcrypt-hashed, JWTs are signed and expire, role-based authorization is enforced on every route, and seed data use generated names for tests and demos only, never real student personally identifiable information.

### Conceptual Model of the Systems Cycle

1. Student receives credentials via the portal-inspired activation flow (verify → set password).
2. Student opens enrollment period, the wizard precomputes the list of subjects and performs prerequisite checks, slot checks, and conflict checks.
3. The Registrar approves or rejects the request; the class list is generated; Faculty encode grades for assigned sections; Registrar finalizes.
4. Analytics module is updated (headcount, demand, grade distribution) and reports exportable.

---

## Chapter 4: Methodology

### Development Approach: Agile with Four Sprints

We use a document-lite, build-first Agile approach over 8 weeks, with each sprint producing a runnable feature vertical. A local acceptance gate closes Sprint development before the live deployment phase begins.

| Sprint | Weeks | Scope (deliverables) |
| --- | --- | --- |
| S1 | 1-2 | Repo + monorepo structure, PostgreSQL database, Prisma schema + seed, auth/RBAC API, portal-style login + activation flow, first deployment (frontend shell) |
| S2 | 3-4 | Master data APIs, student records, enrollment wizard (prereq/slot checks), registrar approval, class lists |
| S3 | 5-6 | Grading cycle, student records screen, analytics dashboards with CSV/PDF export |
| S4 | 7-8 | Test suite completion, seed refresh, documentation, local user-acceptance rehearsal, live deployment on Supabase + Vercel |

### Roles and Permissions (RBAC Matrix)

| Capability | Student | Faculty | Registrar | Admin |
| --- | --- | --- | --- | --- |
| Login / activation | X | X | X | X |
| View own record | X | - | X | X |
| Enroll (select subjects) | X | - | - | - |
| Approve/reconstruct enrollment and fix/grades | - | - | X | X |
| Encode/finalize grades | - | X | X | - |
| Master data (programs, subjects, users, sections) | - | - | - | X |
| Analytics/Reports | - | X | X | X |

### Database Schema (high level)

Web enforcement begins as follows: Campuses (id, name, shortName) to Faculties (id, campusId, name, code) to Programs (id, facultyId, code, name, totalUnits) to Subjects (id, code, title, units, lectureHours, labHours) with Prerequisites (subjectId, prereqSubjectId); Students (userId, programId, studentNo, names, yearLevel, strand) attached to Sections (id, code, subjectId, termId, facultyId, schedule, room, slotCapacity); AcademicTerms (id, label, start, end, isActive); EnrollmentRequests (id, studentId, termId, status, requestedAt) with EnrollmentLines (requestId, sectionId, units); Grades (id, sectionId, studentId, prelim, midterm, final, overall, status); Users (id, role, defaultPasswordFlag, active).

### API Endpoints (REST)

| Method | Path | Notes |
| --- | --- | --- |
| POST | /api/auth/verify-student | Portal-style verification input (ID/email/SUAST ref) |
| POST | /api/auth/activate | Set password + login |
| POST | /api/auth/login | JWT issue |
| GET | /api/students/me and /api/students/:id | Per-role |
| GET | /api/catalog | Programs/subjects browsable |
| GET/POST | /api/enrollments/start, /api/sections | Wizard data |
| POST | /api/enrollments | Create request w/ validation |
| POST | /api/enrollments/:id/approve/reject | Registrar |
| GET | /api/sections | Registrar/Faculty class lists |
| PUT | /api/grades | Faculty encode |
| POST | /api/grades/finalize | |
| GET | /api/analytics/dashboard | Registrar/Admin |

### Security and Validation

Passwords hashed with bcrypt; JWT with configurable TTL; middleware `requireRole` per route; Express validation of payloads; rate limit on auth routes via express-rate-limit; bcrypt config and secrets from `.env`, never committed. All endpoints return consistent JSON envelope `{ data: ..., errors: [...] }`.

### Code Similarities and Stack

Production stack: Node.js 20+, Postgres 17, React 19, Vite 6, Tailwind CSS, Recharts, jsPDF. Support: Prisma 6, express, jsonwebtoken, bcryptjs, cors, dotenv, zod (validation), jest/supertest (backend testing).

---

## Chapter 5: Project Management

### Resources

1x project repository (build system), local PostgreSQL 17 (installed), Node.js 20+, development time 5 hours/week per member, seed data document, template/git workflows as a team convention.

### Team Assignments

- Christopher Lyod B. Mercado (Lead Developer / PM): backend authority (auth, RBAC, Prisma schema, enrollment APIs), project board keeping, deployment orchestrator (Supabase + Vercel).
- Kenth Justine B. Sumalinab (Frontend & Backend Dev): Express routes (master data administrative), API layer, seed data.
- Maria Stefanie Celine A. Dela Salde (UI / UX QA): React/Tailwind screens, portal-inspired login, analytics charts, QA testing pass.

### Gantt (Weeks 1-8)

| Week | Milestone |
| --- | --- |
| 1 | Scaffold; schema; migrate & seed; login API |
| 2 | Portal-inspired login + activation vertical |
| 3 | Master data APIs + screens |
| 4 | Enrollment wizard + validation + approval |
| 5 | Grading cycle; class list; grade screen |
| 6 | Analytics; CSV/PDF export |
| 7 | Full test suite (API + integration), polish, seed refresh, local UAT walkthrough |
| 8 | Local final checks; then Phase-2 live: export to Supabase Postgres, deploy to Vercel, final acceptance sign-off |

### Success Gate

**Local Acceptance Gate (end of Week 7):** all smoke tests pass; the demo completes the full cycle: student activation, enrollment, Registrar approval, Faculty grade encoding, Registrar finalization, and analytics reflecting the new term; the design system carries the institutional portals' visual quality and accessibility checklist passes.

**Production Gate (S4):** environment on Supabase + Vercel, live URL(s), `.env` secrets, optional public thesis demo, README instructions, handover report.

### Risk Management

| Risk | Impact | Mitigation |
| --- | --- | --- |
| PostgreSQL setup disagreements | Med | Local PG 17 already installed, verified connection |
| Data-Privacy misuse of seed names | High | Faker only; no real-identity data |
| Scope creep (honours/SAS) | Med | Feature freeze after S2, triage to future work log |
| Staged hosting delay | Med | Free-tier Supabase + Vercel with clear walkthrough |
| Team schedule conflicts | Med | Own and agreed sprint reviews (2/week) |

---

## References

Commission on Higher Education. (2024). *Policies, standards, and guidelines for tertiary education statistics and reporting*. https://ched.gov.ph

Davao Oriental State University. (2025). *DOrSU Student Portal*. https://portal.dorsu.edu.ph

Fielding, R. T. (2000). *Architectural styles and the design of network-based software architectures* [Doctoral dissertation, University of California, Irvine].

Hossler, D. (1984). *Enrollment management: An integrated approach*. College Entrance Examination Board.

Jones, M., Bradley, J., & Sakimura, N. (2015). *JSON Web Token (JWT)* (RFC 7519). RFC Editor. https://doi.org/10.17487/RFC7519

Nielsen, J. (1994). *Usability engineering*. Morgan Kaufmann.

Obe, R. O., & Hsu, L. S. (2021). *PostgreSQL: Up and running* (3rd ed.). O'Reilly Media.

OWASP Foundation. (2021). *OWASP Top 10: Application security risks*. https://owasp.org/Top10/

Prisma. (2025). *Prisma ORM documentation*. https://www.prisma.io/docs

Republic Act No. 10173. (2012). *An act protecting individual personal information in information and communications systems* (Data Privacy Act). Official Gazette of the Republic of the Philippines.

Republic Act No. 10931. (2017). *Universal Access to Quality Tertiary Education Act*. Official Gazette of the Republic of the Philippines.

Rowley, J. (2007). The wisdom hierarchy: Representations of the knowledge engineering literature. *Journal of Information Science, 33*(2), 163-180.

Sandhu, R. S., Coyne, E. J., Feinstein, H. L., & Youman, C. E. (1996). Role-based access control models. *IEEE Computer, 29*(2), 38-47.

Singh, S. & Montejo, C. (2023). Determinants of state university entrance test aptitude and admission management in Mindanao colleges. *Mindanao Journal of Educational Systems, 7*(1).

Valdez, J., et al. (2023). Automated enrollment and grade encoding system for a state college. *Philippine Journal of Information Systems, 11*(2).

---

*End of the DEIS capstone proposal.*