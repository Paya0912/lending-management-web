"use client";

import { useState, useActionState } from "react";
import { createLoanAction } from "@/app/actions/loan";
import Link from "next/link";

interface BorrowerOption {
  id: string;
  fullName: string;
  phone: string | null;
}

export default function LoanForm({ borrowers }: { borrowers: BorrowerOption[] }) {
  const [state, formAction, isPending] = useActionState(createLoanAction, null);

  // Chế độ chọn người vay: "EXISTING" (có sẵn) hoặc "NEW" (mới)
  const [borrowerMode, setBorrowerMode] = useState<"EXISTING" | "NEW">(
    borrowers.length > 0 ? "EXISTING" : "NEW"
  );
  const [borrowerId, setBorrowerId] = useState(borrowers[0]?.id || "");

  // Các trường số liệu
  const [principalText, setPrincipalText] = useState("");
  const [interestType, setInterestType] = useState<"DAILY" | "MONTHLY">("DAILY");
  const [dailyAmountText, setDailyAmountText] = useState("");
  const [monthlyRate, setMonthlyRate] = useState("5");
  const [paymentDueDay, setPaymentDueDay] = useState("15");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  // Tiện ích format số tiền có dấu chấm phân cách
  const formatNumberInput = (val: string) => {
    const raw = val.replace(/\D/g, "");
    if (!raw) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(raw));
  };

  // Tính toán nhanh để xem trước (Preview)
  const numPrincipal = Number(principalText.replace(/\D/g, "")) || 0;
  const numDaily = Number(dailyAmountText.replace(/\D/g, "")) || 0;
  const numRate = parseFloat(monthlyRate) || 0;

  let estDaily = 0;
  let estMonthly = 0;

  if (interestType === "DAILY") {
    estDaily = numDaily;
    estMonthly = numDaily * 30;
  } else {
    estMonthly = (numPrincipal * numRate) / 100;
    estDaily = Math.round(estMonthly / 30);
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tạo Khoản Vay Mới</h1>
          <p className="text-sm text-slate-500 mt-0.5">Nhập thông tin người vay và thỏa thuận lãi</p>
        </div>
        <Link
          href="/"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ← Quay lại
        </Link>
      </div>

      {state?.error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 font-medium">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="borrowerMode" value={borrowerMode} />
        <input type="hidden" name="interestType" value={interestType} />

        {/* 1. KHỐI NGƯỜI VAY */}
        <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Thông tin người vay</span>
            <div className="flex space-x-1 p-0.5 bg-slate-200/80 rounded-lg text-xs font-semibold">
              <button
                type="button"
                disabled={borrowers.length === 0}
                onClick={() => setBorrowerMode("EXISTING")}
                className={`px-3 py-1 rounded-md transition-all ${
                  borrowerMode === "EXISTING"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 disabled:opacity-40"
                }`}
              >
                Người có sẵn ({borrowers.length})
              </button>
              <button
                type="button"
                onClick={() => setBorrowerMode("NEW")}
                className={`px-3 py-1 rounded-md transition-all ${
                  borrowerMode === "NEW"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                + Thêm người mới
              </button>
            </div>
          </div>

          {borrowerMode === "EXISTING" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Chọn người vay từ hệ thống
              </label>
              <select
                name="borrowerId"
                value={borrowerId}
                onChange={(e) => setBorrowerId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {borrowers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.fullName} {b.phone ? `(${b.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="newBorrowerName"
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required={borrowerMode === "NEW"}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Số điện thoại (tùy chọn)
                </label>
                <input
                  type="text"
                  name="newBorrowerPhone"
                  placeholder="VD: 0912345678"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. KHỐI TIỀN GỐC & NGÀY BẮT ĐẦU */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Tiền gốc cho vay (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="originalPrincipal"
                placeholder="VD: 5.000.000"
                value={principalText}
                onChange={(e) => setPrincipalText(formatNumberInput(e.target.value))}
                className="w-full px-3.5 py-2.5 pr-12 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-semibold text-slate-400">
                VNĐ
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Ngày giải ngân
            </label>
            <input
              type="date"
              name="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm"
              required
            />
          </div>
        </div>

        {/* 3. KHỐI CHỌN HÌNH THỨC LÃI */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            Hình thức tính lãi
          </label>
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setInterestType("DAILY")}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                interestType === "DAILY"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Lãi ngày (VNĐ cố định/ngày)
            </button>
            <button
              type="button"
              onClick={() => setInterestType("MONTHLY")}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                interestType === "MONTHLY"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Lãi tháng (% cố định/tháng)
            </button>
          </div>

          {interestType === "DAILY" ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Tiền lãi mỗi ngày (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <div className="relative max-w-xs">
                <input
                  type="text"
                  name="dailyInterestAmount"
                  placeholder="VD: 50.000"
                  value={dailyAmountText}
                  onChange={(e) => setDailyAmountText(formatNumberInput(e.target.value))}
                  className="w-full px-3.5 py-2 pr-12 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-semibold text-sm"
                  required={interestType === "DAILY"}
                />
                <span className="absolute right-3.5 top-2 text-xs font-semibold text-slate-400">
                  VNĐ
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Hệ thống tự động cộng dồn số tiền này vào nợ lãi lúc 00:00 hàng ngày.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lãi suất tháng (%) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    name="monthlyInterestRate"
                    placeholder="VD: 5"
                    value={monthlyRate}
                    onChange={(e) => setMonthlyRate(e.target.value)}
                    className="w-full px-3.5 py-2 pr-8 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-semibold text-sm"
                    required={interestType === "MONTHLY"}
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày chốt lãi tháng (1 - 31) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  name="paymentDueDay"
                  value={paymentDueDay}
                  onChange={(e) => setPaymentDueDay(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm"
                  required={interestType === "MONTHLY"}
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. KHUNG XEM TRƯỚC LÃI ƯỚC TÍNH */}
        {numPrincipal > 0 && (estDaily > 0 || estMonthly > 0) && (
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-indigo-800 font-medium">Lãi dự kiến/ngày:</span>{" "}
              <strong className="text-indigo-700 font-bold">
                {estDaily.toLocaleString("vi-VN")} đ
              </strong>
            </div>
            <div>
              <span className="text-indigo-800 font-medium">Ước tính ~30 ngày:</span>{" "}
              <strong className="text-indigo-700 font-bold">
                {estMonthly.toLocaleString("vi-VN")} đ
              </strong>
            </div>
          </div>
        )}

        {/* 5. GHI CHÚ THỎA THUẬN */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Ghi chú thỏa thuận
          </label>
          <textarea
            name="notes"
            rows={2}
            placeholder="VD: Trả lãi vào chủ nhật hàng tuần, hẹn thanh toán gốc cuối tháng..."
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 text-sm"
          />
        </div>

        {/* 6. NÚT SUBMIT */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-sm transition-all shadow-md shadow-indigo-100"
        >
          {isPending ? "Đang lưu khoản vay..." : "Xác Nhận Tạo Khoản Vay"}
        </button>
      </form>
    </div>
  );
}