import { prisma } from "./prisma";

interface LogActivityParams {
  userId: number;
  orgId?: number | null;
  action: string;
  details?: string | null;
}

export async function logActivity({ userId, orgId, action, details }: LogActivityParams) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        orgId: orgId ?? null,
        action,
        details: details ?? null,
      },
    });
  } catch (err) {
    console.error("[Activity] Failed to log activity:", err);
  }
}
