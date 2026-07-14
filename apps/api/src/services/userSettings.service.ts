import { prisma } from "../prisma/client.js";

export const userSettingsService = {
  async get(userId: string) {
    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    if (!settings) {
      return prisma.userSettings.create({ data: { userId } });
    }
    return settings;
  },

  async upsert(userId: string, data: { scheduleStart?: string; scheduleEnd?: string; weekStartsOn?: string; activeDays?: string }) {
    return prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data }
    });
  }
};
