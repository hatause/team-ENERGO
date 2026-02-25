import { prisma } from '../db/prisma.js';

type AuditInput = {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId: string;
  payload?: unknown;
  traceId: string;
};

export const writeAuditLog = async (input: AuditInput): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      payloadJson: input.payload as object | undefined,
      traceId: input.traceId
    }
  });
};
