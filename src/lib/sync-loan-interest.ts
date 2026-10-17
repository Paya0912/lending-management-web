import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { connection } from "next/server";

export async function syncLoanInterest(loanId?: string) {
  await connection();

  const now = new Date();
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  // Lấy các khoản vay đang ACTIVE
  const loans = await prisma.loan.findMany({
    where: {
      status: "ACTIVE",
      ...(loanId ? { id: loanId } : {}),
    },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  for (const loan of loans) {
    if (loan.interestType !== "DAILY") continue;

    const dailyRate = Number(loan.dailyInterestAmount || 0);
    if (dailyRate <= 0) continue;

    // KHÓA CHỐNG TRÙNG LẶP:
    // Kiểm tra xem trong ngày hôm nay (từ 00:00 hôm nay đến nay) đã có giao dịch cộng lãi nào chưa
    const alreadyAccruedToday = loan.transactions.some(
      (t) =>
        t.type === "INTEREST_ACCRUAL" &&
        new Date(t.createdAt).getTime() >= todayMidnight.getTime()
    );

    // Nếu hôm nay ĐÃ CỘNG LÃI RỒI -> Bỏ qua ngay lập tức, không bao giờ cộng lần 2
    if (alreadyAccruedToday) {
      continue;
    }

    const startMidnight = new Date(loan.startDate);
    startMidnight.setHours(0, 0, 0, 0);

    // Tính số ngày đã vay từ ngày giải ngân đến hôm nay
    const diffTime = Math.max(0, todayMidnight.getTime() - startMidnight.getTime());
    const totalDaysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Đếm số ngày lãi ĐÃ ĐƯỢC TÍNH (dựa trên số lượng bản ghi cộng lãi)
    // Mỗi bản ghi tính bù hoặc cộng ngày mới đều được tính
    const totalInterestAccruedSoFar = loan.transactions
      .filter((t) => t.type === "INTEREST_ACCRUAL")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const daysAccruedSoFar = Math.round(totalInterestAccruedSoFar / dailyRate);

    // Số ngày còn thiếu cần bù
    const missingDays = totalDaysElapsed - daysAccruedSoFar;

    if (missingDays > 0) {
      const missingAmount = missingDays * dailyRate;

      await prisma.$transaction([
        prisma.loan.update({
          where: { id: loan.id },
          data: {
            accruedInterest: {
              increment: new Prisma.Decimal(missingAmount),
            },
          },
        }),
        prisma.transaction.create({
          data: {
            loanId: loan.id,
            type: "INTEREST_ACCRUAL",
            amount: new Prisma.Decimal(missingAmount),
            notes:
              missingDays === 1
                ? `Tự động cộng lãi ngày mới (${now.toLocaleDateString("vi-VN")})`
                : `Tự động bù ${missingDays} ngày lãi chưa cộng (đến ${now.toLocaleDateString("vi-VN")})`,
          },
        }),
      ]);
    }
  }
}