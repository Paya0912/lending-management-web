import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  // Xác thực bảo mật: Chỉ cho phép Vercel Cron hoặc request có token bí mật gọi
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const today = new Date();
  const currentDay = today.getDate();

  try {
    // 1. Khoản vay lãi ngày: Cộng dồn dailyInterestAmount mỗi đêm
    const dailyLoans = await prisma.loan.findMany({
      where: {
        status: "ACTIVE",
        interestType: "DAILY",
      },
    });

    for (const loan of dailyLoans) {
      const dailyInterest = Number(loan.dailyInterestAmount || 0);
      if (dailyInterest > 0) {
        await prisma.$transaction([
          prisma.loan.update({
            where: { id: loan.id },
            data: {
              accruedInterest: {
                increment: new Prisma.Decimal(dailyInterest),
              },
            },
          }),
          prisma.transaction.create({
            data: {
              loanId: loan.id,
              type: "INTEREST_ACCRUAL",
              amount: new Prisma.Decimal(dailyInterest),
              notes: `Tự động cộng lãi ngày (${dailyInterest.toLocaleString("vi-VN")} đ)`,
            },
          }),
        ]);
      }
    }

    // 2. Khoản vay lãi tháng: Chỉ cộng vào đúng ngày chốt paymentDueDay
    const monthlyLoans = await prisma.loan.findMany({
      where: {
        status: "ACTIVE",
        interestType: "MONTHLY",
        paymentDueDay: currentDay,
      },
    });

    for (const loan of monthlyLoans) {
      const principal = Number(loan.originalPrincipal);
      const rate = Number(loan.monthlyInterestRate || 0);
      const monthlyInterest = (principal * rate) / 100;

      if (monthlyInterest > 0) {
        await prisma.$transaction([
          prisma.loan.update({
            where: { id: loan.id },
            data: {
              accruedInterest: {
                increment: new Prisma.Decimal(monthlyInterest),
              },
            },
          }),
          prisma.transaction.create({
            data: {
              loanId: loan.id,
              type: "INTEREST_ACCRUAL",
              amount: new Prisma.Decimal(monthlyInterest),
              notes: `Tự động tính lãi tháng kỳ ngày ${currentDay}`,
            },
          }),
        ]);
      }
    }

    return NextResponse.json({
      success: true,
      processedDaily: dailyLoans.length,
      processedMonthly: monthlyLoans.length,
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Lỗi Cron tính lãi:", error);
    return NextResponse.json({ success: false, error: "Internal Error" }, { status: 500 });
  }
}