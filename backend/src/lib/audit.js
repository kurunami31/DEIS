import { prisma } from '../lib/prisma.js';

/**
 * Records an auditable action. Non-fatal: failures are logged, never thrown.
 * @param {{ actorId?: string, action: string, entityType: string, entityId?: string, meta?: object }} entry
 */
export async function audit(entry) {
  try {
    await prisma.activityRecord.create({
      data: {
        actorId: entry.actorId,
        actionKey: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        meta: entry.meta,
      },
    });
  } catch (err) {
    console.error('[deis-api] failed to write audit log', err.message);
  }
}