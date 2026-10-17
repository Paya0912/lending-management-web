"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface ActionState {
  error?: string;
  success?: boolean;
}

// 1. Action Thu Tiền (Đã bổ sung chặn số tiền vượt quá gốc/lãi)
export async function processRepaymentAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const loanId = formData.get("loanId") as string;
  const rawAmount = formData.get("amount") as string;
  const target = formData.get("target") as "INTEREST_ONLY" | "PRINCIPAL_ONLY" | "AUTO";
  const paymentMethod = (formData.get("paymentMethod") as string) || "Tiền mặt";
  const notes = (formData.get("notes") as string)?.trim() || "";

  const amount = Number(rawAmount?.replace(/\D/g, ""));
  if (!loanId || !amount || amount <= 0) {
    return { error: "Vui lòng nhập số tiền thanh toán hợp lệ lớn hơn 0." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUniqueOrThrow({
        where: { id: loanId },
      });

      const remPrincipal = Number(loan.remainingPrincipal);
      const accInterest = Number(loan.accruedInterest);
      const totalDue = remPrincipal + accInterest;

      const userNote = notes.trim();
      const defaultNote = `Thanh toán (${
        target === "INTEREST_ONLY"
          ? "Trả lãi"
          : target === "PRINCIPAL_ONLY"
          ? "Trả gốc"
          : "Tự động"
      })`;

      // KIỂM TRA LỖI NẾU SỐ TIỀN VƯỢT QUÁ
      if (target === "PRINCIPAL_ONLY") {
        if (amount > remPrincipal) {
          throw new Error(
            `Số tiền trừ gốc (${amount.toLocaleString("vi-VN")} đ) không được vượt quá số tiền gốc đang nợ (${remPrincipal.toLocaleString("vi-VN")} đ)!`
          );
        }
      } else if (target === "INTEREST_ONLY") {
        if (amount > accInterest) {
          throw new Error(
            `Số tiền trừ lãi (${amount.toLocaleString("vi-VN")} đ) không được vượt quá số tiền lãi đang nợ (${accInterest.toLocaleString("vi-VN")} đ)!`
          );
        }
      } else if (target === "AUTO") {
        if (amount > totalDue) {
          throw new Error(
            `Số tiền thanh toán (${amount.toLocaleString("vi-VN")} đ) không được vượt quá tổng số nợ cần trả (${totalDue.toLocaleString("vi-VN")} đ)!`
          );
        }
      }

      let deductedPrincipal = 0;
      let deductedInterest = 0;

      if (target === "INTEREST_ONLY") {
        deductedInterest = amount;
      } else if (target === "PRINCIPAL_ONLY") {
        deductedPrincipal = amount;
      } else {
        if (amount <= accInterest) {
          deductedInterest = amount;
        } else {
          deductedInterest = accInterest;
          deductedPrincipal = amount - accInterest;
        }
      }

      const newPrincipal = new Prisma.Decimal(remPrincipal - deductedPrincipal);
      const newInterest = new Prisma.Decimal(accInterest - deductedInterest);
      const isPaidOff = newPrincipal.lte(0) && newInterest.lte(0);

      // Cập nhật số dư khoản vay
      await tx.loan.update({
        where: { id: loanId },
        data: {
          remainingPrincipal: newPrincipal,
          accruedInterest: newInterest,
          status: isPaidOff ? "PAID_OFF" : loan.status,
        },
      });

      // Ghi lịch sử giao dịch
      await tx.transaction.create({
        data: {
          loanId,
          type: "REPAYMENT",
          amount: new Prisma.Decimal(amount),
          deductedPrincipal: new Prisma.Decimal(deductedPrincipal),
          deductedInterest: new Prisma.Decimal(deductedInterest),
          paymentMethod,
          notes: userNote ? userNote : defaultNote,
        },
      });
    });

    revalidatePath(`/admin/loans/${loanId}`);
    revalidatePath("/");
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Không thể xử lý thu tiền.";
    return { error: errorMsg };
  }
}

// 2. Action Vay Thêm Tiền (Top-up Principal)
export async function topUpLoanAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const loanId = formData.get("loanId") as string;
  const rawTopUpAmount = formData.get("topUpAmount") as string;
  const notes = (formData.get("topUpNotes") as string)?.trim() || "";

  // Các trường lãi suất mới được gửi lên
  const rawNewDailyInterest = formData.get("newDailyInterest") as string;
  const rawNewMonthlyRate = formData.get("newMonthlyRate") as string;

  const topUpAmount = Number(rawTopUpAmount?.replace(/\D/g, ""));
  if (!loanId || !topUpAmount || topUpAmount <= 0) {
    return { error: "Vui lòng nhập số tiền vay thêm hợp lệ lớn hơn 0." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUniqueOrThrow({
        where: { id: loanId },
      });

      const oldRemaining = Number(loan.remainingPrincipal);
      const newRemaining = oldRemaining + topUpAmount;
      const oldOriginal = Number(loan.originalPrincipal);
      const newOriginal = oldOriginal + topUpAmount;

      // Chuẩn bị dữ liệu cập nhật
      const updateData: Prisma.LoanUpdateInput = {
        remainingPrincipal: new Prisma.Decimal(newRemaining),
        originalPrincipal: new Prisma.Decimal(newOriginal),
        status: "ACTIVE",
      };

      // Xử lý cập nhật lãi suất nếu người dùng có nhập
      let interestChangeLog: { fieldName: string; oldValue: string; newValue: string } | null = null;

      if (loan.interestType === "DAILY" && rawNewDailyInterest) {
        const newDaily = Number(rawNewDailyInterest.replace(/\D/g, ""));
        const oldDaily = Number(loan.dailyInterestAmount || 0);
        if (newDaily > 0 && newDaily !== oldDaily) {
          updateData.dailyInterestAmount = new Prisma.Decimal(newDaily);
          interestChangeLog = {
            fieldName: "dailyInterestAmount",
            oldValue: `${oldDaily.toLocaleString("vi-VN")} đ/ngày`,
            newValue: `${newDaily.toLocaleString("vi-VN")} đ/ngày`,
          };
        }
      } else if (loan.interestType === "MONTHLY" && rawNewMonthlyRate) {
        const newRate = parseFloat(rawNewMonthlyRate);
        const oldRate = Number(loan.monthlyInterestRate || 0);
        if (!isNaN(newRate) && newRate > 0 && newRate !== oldRate) {
          updateData.monthlyInterestRate = new Prisma.Decimal(newRate);
          interestChangeLog = {
            fieldName: "monthlyInterestRate",
            oldValue: `${oldRate}%/tháng`,
            newValue: `${newRate}%/tháng`,
          };
        }
      }

      // 1. Cập nhật nợ gốc và mức lãi mới vào Loan
      await tx.loan.update({
        where: { id: loanId },
        data: updateData,
      });

      // 2. Ghi nhận giao dịch dòng tiền (TOP_UP)
      await tx.transaction.create({
        data: {
          loanId,
          type: "TOP_UP",
          amount: new Prisma.Decimal(topUpAmount),
          deductedPrincipal: new Prisma.Decimal(0),
          deductedInterest: new Prisma.Decimal(0),
          paymentMethod: "Giải ngân thêm",
          notes: notes || `Vay thêm ${topUpAmount.toLocaleString("vi-VN")} đ vào nợ gốc`,
        },
      });

      // 3. Ghi vết vào LoanAuditLog về việc tăng nợ gốc
      await tx.loanAuditLog.create({
        data: {
          loanId,
          action: "TOP_UP_PRINCIPAL",
          fieldName: "remainingPrincipal",
          oldValue: `${oldRemaining.toLocaleString("vi-VN")} đ`,
          newValue: `${newRemaining.toLocaleString("vi-VN")} đ`,
          reason: notes ? `Vay thêm tiền: ${notes}` : "Khách vay thêm tiền",
        },
      });

      // 4. Ghi vết vào LoanAuditLog nếu có điều chỉnh mức lãi
      if (interestChangeLog) {
        await tx.loanAuditLog.create({
          data: {
            loanId,
            action: "UPDATE_INTEREST_RATE",
            fieldName: interestChangeLog.fieldName,
            oldValue: interestChangeLog.oldValue,
            newValue: interestChangeLog.newValue,
            reason: `Điều chỉnh lãi khi vay thêm tiền (${topUpAmount.toLocaleString("vi-VN")} đ)`,
          },
        });
      }
    });

    revalidatePath(`/admin/loans/${loanId}`);
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("Lỗi khi vay thêm và điều chỉnh lãi:", err);
    return { error: "Không thể xử lý vay thêm tiền. Vui lòng thử lại." };
  }
}

// 3. Action Xóa Khoản Vay Đã Tất Toán
export async function deletePaidOffLoanAction(formData: FormData) {
  const loanId = formData.get("loanId") as string;

  const loan = await prisma.loan.findUniqueOrThrow({
    where: { id: loanId },
  });

  // Chỉ cho phép xóa khi đã tất toán hết sạch nợ
  if (loan.status !== "PAID_OFF" || Number(loan.remainingPrincipal) > 0 || Number(loan.accruedInterest) > 0) {
    throw new Error("Không thể xóa khoản vay chưa tất toán xong!");
  }

  await prisma.loan.delete({
    where: { id: loanId },
  });

  revalidatePath("/");
  redirect("/");
}

// 4. Action Sửa Tiền Gốc & Mức Lãi (Tự động tính lại gốc và lãi từ ngày giải ngân)
export async function adjustLoanAmountsAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const loanId = formData.get("loanId") as string;
  const rawOriginal = formData.get("originalPrincipal") as string;
  const rawNewDaily = formData.get("newDailyInterest") as string;
  const rawNewMonthly = formData.get("newMonthlyRate") as string;
  const reason = (formData.get("reason") as string)?.trim() || "Đính chính tiền gốc / mức lãi";

  const newOriginal = Number(rawOriginal?.replace(/\D/g, ""));
  if (!loanId || isNaN(newOriginal) || newOriginal <= 0) {
    return { error: "Vui lòng nhập số tiền gốc ban đầu hợp lệ lớn hơn 0." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUniqueOrThrow({
        where: { id: loanId },
        include: { transactions: true },
      });

      // --- A. TÍNH LẠI TIỀN GỐC CÒN LẠI ---
      const totalRepaidPrincipal = loan.transactions
        .filter((t) => t.type === "REPAYMENT")
        .reduce((sum, t) => sum + Number(t.deductedPrincipal), 0);

      const totalTopUp = loan.transactions
        .filter((t) => t.type === "TOP_UP")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const newRemaining = Math.max(0, newOriginal + totalTopUp - totalRepaidPrincipal);

      // --- B. TÍNH LẠI TIỀN LÃI TỪ NGÀY GIẢI NGÂN ĐẾN HIỆN TẠI ---
      const startMidnight = new Date(loan.startDate);
      startMidnight.setHours(0, 0, 0, 0);

      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);

      const diffTime = Math.max(0, todayMidnight.getTime() - startMidnight.getTime());
      const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Lấy mức lãi mới (nếu có nhập) hoặc giữ nguyên mức cũ
      let updatedDailyAmount = loan.dailyInterestAmount;
      let updatedMonthlyRate = loan.monthlyInterestRate;
      let currentDailyRateNum = 0;

      if (loan.interestType === "DAILY") {
        if (rawNewDaily) {
          const parsedDaily = Number(rawNewDaily.replace(/\D/g, ""));
          if (parsedDaily > 0) {
            updatedDailyAmount = new Prisma.Decimal(parsedDaily);
            currentDailyRateNum = parsedDaily;
          } else {
            currentDailyRateNum = Number(loan.dailyInterestAmount || 0);
          }
        } else {
          currentDailyRateNum = Number(loan.dailyInterestAmount || 0);
        }
      } else {
        if (rawNewMonthly) {
          const parsedMonthly = parseFloat(rawNewMonthly);
          if (!isNaN(parsedMonthly) && parsedMonthly > 0) {
            updatedMonthlyRate = new Prisma.Decimal(parsedMonthly);
            currentDailyRateNum = (newOriginal * parsedMonthly) / (100 * 30);
          } else {
            const currentMonthlyNum = Number(loan.monthlyInterestRate || 0);
            currentDailyRateNum = (newOriginal * currentMonthlyNum) / (100 * 30);
          }
        } else {
          const currentMonthlyNum = Number(loan.monthlyInterestRate || 0);
          currentDailyRateNum = (newOriginal * currentMonthlyNum) / (100 * 30);
        }
      }

      // Tổng lãi phát sinh từ ngày giải ngân đến nay theo mức lãi mới
      const totalGrossInterest = Math.round(daysPassed * currentDailyRateNum);

      // Tổng tiền lãi khách đã từng trả
      const totalRepaidInterest = loan.transactions
        .filter((t) => t.type === "REPAYMENT")
        .reduce((sum, t) => sum + Number(t.deductedInterest), 0);

      // Tiền lãi nợ thực tế sau khi tính hồi tố và trừ lãi đã trả
      const newAccruedInterest = Math.max(0, totalGrossInterest - totalRepaidInterest);

      const isPaidOff = newRemaining === 0 && newAccruedInterest === 0;

      // --- C. CẬP NHẬT KHOẢN VAY ---
      await tx.loan.update({
        where: { id: loanId },
        data: {
          originalPrincipal: new Prisma.Decimal(newOriginal),
          remainingPrincipal: new Prisma.Decimal(newRemaining),
          dailyInterestAmount: updatedDailyAmount,
          monthlyInterestRate: updatedMonthlyRate,
          accruedInterest: new Prisma.Decimal(newAccruedInterest),
          status: isPaidOff ? "PAID_OFF" : "ACTIVE",
        },
      });

      // --- D. GHI NHẬT KÝ KIỂM TOÁN (AUDIT LOG) ---
      await tx.loanAuditLog.create({
        data: {
          loanId,
          action: "RECALCULATE_TERMS",
          fieldName: "originalPrincipal & interest",
          oldValue: `Gốc: ${Number(loan.remainingPrincipal).toLocaleString("vi-VN")} đ | Lãi nợ: ${Number(loan.accruedInterest).toLocaleString("vi-VN")} đ`,
          newValue: `Gốc: ${newRemaining.toLocaleString("vi-VN")} đ | Lãi nợ mới (${daysPassed} ngày): ${newAccruedInterest.toLocaleString("vi-VN")} đ`,
          reason,
        },
      });
    });

    revalidatePath(`/admin/loans/${loanId}`);
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("Lỗi khi đính chính gốc và tính lại lãi:", err);
    return { error: "Không thể cập nhật thông tin. Vui lòng thử lại." };
  }
}