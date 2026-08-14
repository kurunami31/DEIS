/**
 * Canonical clearance template definitions. Single source of truth for the
 * seed (prisma/seed.mjs) and the production backfill script
 * (scripts/backfill-clearance-templates.mjs) so the two can never drift.
 *
 * `ownerRole` is the staff office that signs that item; templates without one
 * (Library, Department, Registrar) are shared and signed by Registrar/Admin.
 */
export const CLEARANCE_TEMPLATES = [
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
