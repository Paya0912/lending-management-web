// src/app/actions/loan.ts
"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface CreateLoanResult {
  error?: string;
}

export async function createLoanAction(
  prevState: CreateLoanResult | null,
  formData: FormData
): Promise<CreateLoanResult> {
  const borrowerMode = formData.get("borrowerMode") as "EXISTING" | "NEW";
  const rawPrincipal = formData.get("originalPrincipal") as string;
  const interestType = formData.get("interestType") as "DAILY" | "MONTHLY";
  const startDateRaw = formData.get("startDate") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;

  const principalVal = Number(rawPrincipal?.replace(/\D/g, ""));
  if (!principalVal || principalVal <= 0) {
    return { error: "Vui lòng nhập số tiền gốc hợp lệ lớn hơn 0." };
  }

  let finalBorrowerId = "";

  if (borrowerMode === "NEW") {
    const fullName = (formData.get("newBorrowerName") as string)?.trim();
    if (!fullName) {
      return { error: "Vui lòng nhập họ và tên của người vay mới." };
    }
  } else {
    finalBorrowerId = formData.get("borrowerId") as string;
    if (!finalBorrowerId) {
      return { error: "Vui lòng chọn một người vay trong danh sách." };
    }
  }

  let dailyInterestAmount: Prisma.Decimal | null = null;
  let monthlyInterestRate: Prisma.Decimal | null = null;
  let paymentDueDay = 1;

  let dailyInterestNum = 0;

  if (interestType === "DAILY") {
    const rawDaily = formData.get("dailyInterestAmount") as string;
    dailyInterestNum = Number(rawDaily?.replace(/\D/g, ""));
    if (!dailyInterestNum || dailyInterestNum <= 0) {
      return { error: "Vui lòng nhập số tiền lãi mỗi ngày hợp lệ." };
    }
    dailyInterestAmount = new Prisma.Decimal(dailyInterestNum);
  } else {
    const rawMonthly = formData.get("monthlyInterestRate") as string;
    const rateVal = parseFloat(rawMonthly);
    const dueDayVal = parseInt(formData.get("paymentDueDay") as string, 10);

    if (isNaN(rateVal) || rateVal <= 0) {
      return { error: "Vui lòng nhập lãi suất tháng hợp lệ." };
    }
    if (isNaN(dueDayVal) || dueDayVal < 1 || dueDayVal > 31) {
      return { error: "Ngày chốt lãi tháng phải nằm trong khoảng từ 1 đến 31." };
    }

    monthlyInterestRate = new Prisma.Decimal(rateVal);
    paymentDueDay = dueDayVal;

    // Quy đổi lãi ngày tạm tính cho lãi tháng (~30 ngày)
    dailyInterestNum = Math.round((principalVal * rateVal) / (100 * 30));
  }

  // --- LOGIC TÍNH BÙ LÃI NẾU NGÀY GIẢI NGÂN TRƯỚC HIỆN TẠI ---
  const startDate = startDateRaw ? new Date(startDateRaw) : new Date();
  const today = new Date();

  // Đưa về mốc 00:00:00 để so sánh chuẩn xác số ngày
  const startMidnight = new Date(startDate);
  startMidnight.setHours(0, 0, 0, 0);

  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  const diffTime = todayMidnight.getTime() - startMidnight.getTime();
  const daysPassed = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  let initialAccruedInterest = 0;
  if (daysPassed > 0) {
    initialAccruedInterest = daysPassed * dailyInterestNum;
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Tạo người vay mới nếu được chọn
      if (borrowerMode === "NEW") {
        const fullName = (formData.get("newBorrowerName") as string).trim();
        const phone = (formData.get("newBorrowerPhone") as string)?.trim() || null;
        const borrowerNotes = (formData.get("newBorrowerNotes") as string)?.trim() || null;

        const createdBorrower = await tx.borrower.create({
          data: {
            fullName,
            phone,
            notes: borrowerNotes,
          },
        });
        finalBorrowerId = createdBorrower.id;
      }

      // 2. Tạo khoản vay với lãi tích lũy ban đầu đã được tính bù
      const newLoan = await tx.loan.create({
        data: {
          borrowerId: finalBorrowerId,
          originalPrincipal: new Prisma.Decimal(principalVal),
          remainingPrincipal: new Prisma.Decimal(principalVal),
          interestType,
          dailyInterestAmount,
          monthlyInterestRate,
          paymentDueDay,
          startDate,
          status: "ACTIVE",
          accruedInterest: new Prisma.Decimal(initialAccruedInterest),
          notes,
        },
      });

      // 3. Nếu có lãi bù, ghi ngay một dòng lịch sử giao dịch để lưu vết
      if (initialAccruedInterest > 0) {
        await tx.transaction.create({
          data: {
            loanId: newLoan.id,
            type: "INTEREST_ACCRUAL",
            amount: new Prisma.Decimal(initialAccruedInterest),
            notes: `Tính bù lãi ${daysPassed} ngày (từ ngày giải ngân ${startDate.toLocaleDateString("vi-VN")} đến hiện tại)`,
          },
        });
      }
    });
  } catch (err) {
    console.error("Lỗi khi tạo khoản vay kèm tính bù lãi:", err);
    return { error: "Có lỗi xảy ra khi lưu vào cơ sở dữ liệu. Vui lòng thử lại." };
  }

  revalidatePath("/");
  redirect("/");
}