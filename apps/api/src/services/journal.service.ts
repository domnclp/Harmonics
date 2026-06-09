import { prisma } from "../prisma/client.js";
import { AppError } from "../middleware/error.middleware.js";

export const journalService = {
  async update(userId: string, id: string, content: string) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, instance: { userId } }
    });
    if (!entry) throw new AppError(404, "Journal entry not found");

    return prisma.journalEntry.update({
      where: { id },
      data: { content }
    });
  }
};
