import { prisma } from "../prisma/client.js";

export type NotificationPreferenceUpdate = {
  headsUpEnabled?: boolean;
  headsUpMinutes?: number;
  blockStartEnabled?: boolean;
  blockEndEnabled?: boolean;
  streakRiskEnabled?: boolean;
  streakRiskTime?: string;
  dailyAgendaEnabled?: boolean;
  dayWrapUpEnabled?: boolean;
  dayWrapUpTime?: string;
};

export const notificationPreferenceService = {
  /** Lazily creates the row, matching userSettingsService.get. */
  async get(userId: string) {
    const existing = await prisma.notificationPreference.findUnique({ where: { userId } });
    if (existing) return existing;

    return prisma.notificationPreference.create({ data: { userId } });
  },

  async upsert(userId: string, data: NotificationPreferenceUpdate) {
    return prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data }
    });
  }
};
