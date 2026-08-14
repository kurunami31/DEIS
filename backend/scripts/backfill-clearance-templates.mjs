/**
 * One-off production backfill for clearance templates.
 *
 * Fixes office accounts seeing an empty Clearance Review: templates that were
 * seeded before office roles existed have a NULL ownerRole, so office accounts
 * (ACCOUNTING, OSCD, ...) cannot see their sign-off items. This script sets
 * ownerRole (and label/category) on every template by code, and creates any
 * templates that are missing entirely — backfilling a PENDING sign-off on
 * every existing clearance so requirement counts stay consistent.
 *
 * Idempotent: safe to run any number of times against any database.
 *
 * Usage (run from backend/, overrides the local .env connection):
 *   DATABASE_URL="postgresql://..." npm run db:backfill-clearance
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { CLEARANCE_TEMPLATES } from '../prisma/clearance-templates.mjs';

const prisma = new PrismaClient();

async function main() {
  let updated = 0;
  let created = 0;
  let signoffsAdded = 0;

  for (const def of CLEARANCE_TEMPLATES) {
    const existing = await prisma.clearanceTemplate.findUnique({ where: { code: def.code } });
    if (existing) {
      await prisma.clearanceTemplate.update({
        where: { code: def.code },
        data: { label: def.label, category: def.category, ownerRole: def.ownerRole ?? null },
      });
      updated += 1;
      console.log(`updated ${def.code} -> ownerRole=${def.ownerRole ?? 'null'}`);
      continue;
    }

    const createdTemplate = await prisma.clearanceTemplate.create({ data: def });
    created += 1;
    const clearances = await prisma.studentClearance.findMany({ select: { id: true } });
    if (clearances.length > 0) {
      const result = await prisma.clearanceSignoff.createMany({
        data: clearances.map((clearance) => ({ clearanceId: clearance.id, templateId: createdTemplate.id })),
        skipDuplicates: true,
      });
      signoffsAdded += result.count;
    }
    console.log(`created ${def.code} (ownerRole=${def.ownerRole ?? 'null'}) + signoffs for ${clearances.length} clearances`);
  }

  console.log(`Clearance template backfill complete: ${updated} updated, ${created} created, ${signoffsAdded} signoffs added`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
