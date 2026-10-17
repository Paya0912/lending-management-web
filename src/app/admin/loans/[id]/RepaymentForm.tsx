"use client";

import { useState, useActionState } from "react";
import {
  processRepaymentAction,
  topUpLoanAction,
  adjustLoanAmountsAction,
} from "@/app/actions/payment";

interface RepaymentFormProps {
  loanId: string;
  originalPrincipal: number;
  remainingPrincipal: number;
  accruedInterest: number;
  totalDue: number;
  interestType: "DAILY" | "MONTHLY";
  dailyInterestAmount: number;
  monthlyInterestRate: number;
}

export default function RepaymentForm({
  loanId,
  originalPrincipal,
  remainingPrincipal,
  accruedInterest,
  totalDue,
  interestType,
  dailyInterestAmount,
  monthlyInterestRate,
}: RepaymentFormProps) {
  const [activeTab, setActiveTab] = useState<"PAY" | "TOP_UP" | "ADJUST">("PAY");

  // State form thu tiền
  const [payState, payAction, isPayPending] = useActionState(processRepaymentAction, null);
  const [amountText, setAmountText] = useState("");
  const [target, setTarget] = useState<"INTEREST_ONLY" | "PRINCIPAL_ONLY" | "AUTO">("AUTO");

  // State form vay thêm tiền & đổi lãi tương lai
  const [topUpState, topUpFormAction, isTopUpPending] = useActionState(topUpLoanAction, null);
  const [topUpText, setTopUpText] = useState("");
  const [newDailyText, setNewDailyText] = useState(
    dailyInterestAmount > 0 ? new Intl.NumberFormat("vi-VN").format(dailyInterestAmount) : ""
  );
  const [newMonthlyRateText, setNewMonthlyRateText] = useState(
    monthlyInterestRate > 0 ? String(monthlyInterestRate) : ""
  );

  // State form sửa nhầm gốc & tính lại toàn bộ lãi
  const [adjustState, adjustFormAction, isAdjustPending] = useActionState(
    adjustLoanAmountsAction,
    null
  );
  const [editOriginalText, setEditOriginalText] = useState(
    new Intl.NumberFormat("vi-VN").format(originalPrincipal)
  );
  const [editDailyRateText, setEditDailyRateText] = useState(
    dailyInterestAmount > 0 ? new Intl.NumberFormat("vi-VN").format(dailyInterestAmount) : ""
  );
  const [editMonthlyRateText, setEditMonthlyRateText] = useState(
    monthlyInterestRate > 0 ? String(monthlyInterestRate) : ""
  );

  const formatNumber = (val: string) => {
    const raw = val.replace(/\D/g, "");
    if (!raw) return "";
    return new Intl.NumberFormat("vi-VN").format(Number(raw));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      {/* Tab chuyển đổi 3 chế độ */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("PAY")}
          className={`py-2 rounded-lg transition-all ${
            activeTab === "PAY"
              ? "bg-white text-indigo-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Thu Tiền
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("TOP_UP")}
          className={`py-2 rounded-lg transition-all ${
            activeTab === "TOP_UP"
              ? "bg-white text-emerald-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          + Vay Thêm
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("ADJUST")}
          className={`py-2 rounded-lg transition-all ${
            activeTab === "ADJUST"
              ? "bg-white text-amber-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Sửa Nhầm
        </button>
      </div>

      {/* TAB 1: THU TIỀN TRẢ NỢ */}
      {activeTab === "PAY" && (
        <div className="space-y-4">
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Thu Tiền Khách Trả</h2>
            <p className="text-xs text-slate-400 mt-0.5">Tiền trừ vượt quá nợ gốc sẽ bị báo lỗi</p>
          </div>

          {payState?.error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
              {payState.error}
            </div>
          )}

          {payState?.success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
              Đã trừ nợ thành công!
            </div>
          )}

          <form action={payAction} className="space-y-4">
            <input type="hidden" name="loanId" value={loanId} />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Số tiền khách đưa (VNĐ)</label>
                {totalDue > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmountText(new Intl.NumberFormat("vi-VN").format(totalDue))}
                    className="text-[11px] text-indigo-600 font-semibold hover:underline"
                  >
                    Trả hết ({totalDue.toLocaleString("vi-VN")} đ)
                  </button>
                )}
              </div>
              <input
                type="text"
                name="amount"
                placeholder="VD: 500.000"
                value={amountText}
                onChange={(e) => setAmountText(formatNumber(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* MỤC ĐÍCH TRỪ GIỮ NGUYÊN NGUYÊN BẢN THEO YÊU CẦU */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Mục đích trừ</label>
              <div className="space-y-2 text-xs">
                <label className="flex items-center space-x-2 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="target"
                    value="PRINCIPAL_ONLY"
                    checked={target === "PRINCIPAL_ONLY"}
                    onChange={() => setTarget("PRINCIPAL_ONLY")}
                    className="text-indigo-600"
                  />
                  <span className="font-semibold text-slate-700">
                    Trừ nợ gốc (tối đa {remainingPrincipal.toLocaleString("vi-VN")} đ)
                  </span>
                </label>

                <label className="flex items-center space-x-2 p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="target"
                    value="AUTO"
                    checked={target === "AUTO"}
                    onChange={() => setTarget("AUTO")}
                    className="text-indigo-600"
                  />
                  <span className="font-semibold text-slate-700">
                    Trừ hết lãi trước, còn dư trừ gốc
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hình thức nhận</label>
              <select
                name="paymentMethod"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none"
              >
                <option value="Tiền mặt">Tiền mặt</option>
                <option value="Chuyển khoản">Chuyển khoản</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ghi chú khi trả tiền
              </label>
              <input
                type="text"
                name="notes"
                placeholder="VD: Trả tiền mặt tại nhà, CK VCB lúc 14h..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isPayPending || totalDue <= 0}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs shadow transition-all"
            >
              {isPayPending ? "Đang xử lý..." : "Xác Nhận Thu Tiền"}
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: VAY THÊM TIỀN & ĐIỀU CHỈNH LÃI */}
      {activeTab === "TOP_UP" && (
        <div className="space-y-4">
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Vay Thêm Tiền & Chỉnh Lãi</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Cộng nợ gốc và cập nhật mức lãi thỏa thuận mới
            </p>
          </div>

          {topUpState?.error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
              {topUpState.error}
            </div>
          )}

          {topUpState?.success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
              Đã cộng tiền và cập nhật lãi thành công!
            </div>
          )}

          <form action={topUpFormAction} className="space-y-4">
            <input type="hidden" name="loanId" value={loanId} />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số tiền vay thêm (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="topUpAmount"
                placeholder="VD: 2.000.000"
                value={topUpText}
                onChange={(e) => setTopUpText(formatNumber(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            {interestType === "DAILY" ? (
              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1.5">
                <label className="block text-xs font-bold text-emerald-900">
                  Mức lãi ngày mới (VNĐ/ngày)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="newDailyInterest"
                    value={newDailyText}
                    onChange={(e) => setNewDailyText(formatNumber(e.target.value))}
                    placeholder="VD: 100.000"
                    className="w-full px-3 py-1.5 pr-12 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">
                    VNĐ
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1.5">
                <label className="block text-xs font-bold text-emerald-900">
                  Mức lãi suất tháng mới (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    name="newMonthlyRate"
                    value={newMonthlyRateText}
                    onChange={(e) => setNewMonthlyRateText(e.target.value)}
                    placeholder="VD: 6.0"
                    className="w-full px-3 py-1.5 pr-8 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">
                    %
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú vay thêm</label>
              <input
                type="text"
                name="topUpNotes"
                placeholder="VD: Vay thêm xoay hàng, tăng lãi lên 100k/ngày..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isTopUpPending}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-bold text-xs shadow transition-all"
            >
              {isTopUpPending ? "Đang xử lý..." : "+ Xác Nhận Vay Thêm & Cập Nhật Lãi"}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: SỬA SỐ TIỀN GỐC & MỨC LÃI (TÍNH HỒI TỐ TỪ NGÀY GIẢI NGÂN) */}
      {activeTab === "ADJUST" && (
        <div className="space-y-4">
          <div>
            <h2 className="font-bold text-amber-800 text-sm">Sửa Gốc & Mức Lãi Thỏa Thuận</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hệ thống sẽ tính lại toàn bộ lãi từ ngày giải ngân đến nay theo mức lãi mới, tự trừ tiền khách đã trả.
            </p>
          </div>

          {adjustState?.error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
              {adjustState.error}
            </div>
          )}

          {adjustState?.success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
              Đã cập nhật gốc & tính lại toàn bộ tiền lãi thành công!
            </div>
          )}

          <form action={adjustFormAction} className="space-y-3.5">
            <input type="hidden" name="loanId" value={loanId} />

            {/* 1. Tiền gốc ban đầu */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tiền gốc ban đầu đúng (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="originalPrincipal"
                value={editOriginalText}
                onChange={(e) => setEditOriginalText(formatNumber(e.target.value))}
                placeholder="VD: 5.000.000"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Hiện tại: <strong>{originalPrincipal.toLocaleString("vi-VN")} đ</strong>
              </span>
            </div>

            {/* 2. Mức lãi thỏa thuận mới (Tính hồi tố từ ngày giải ngân) */}
            {interestType === "DAILY" ? (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                <label className="block text-xs font-bold text-amber-900">
                  Mức lãi ngày đúng (VNĐ/ngày) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="newDailyInterest"
                    value={editDailyRateText}
                    onChange={(e) => setEditDailyRateText(formatNumber(e.target.value))}
                    placeholder="VD: 50.000"
                    className="w-full px-3 py-1.5 pr-12 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">VNĐ</span>
                </div>
                <span className="text-[11px] text-amber-700 block">
                  Hiện tại: <strong>{dailyInterestAmount.toLocaleString("vi-VN")} đ/ngày</strong>. Lãi sẽ được nhân lại từ ngày giải ngân đến hôm nay.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                <label className="block text-xs font-bold text-amber-900">
                  Lãi suất tháng đúng (%) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    name="newMonthlyRate"
                    value={editMonthlyRateText}
                    onChange={(e) => setEditMonthlyRateText(e.target.value)}
                    placeholder="VD: 5.0"
                    className="w-full px-3 py-1.5 pr-8 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-bold">%</span>
                </div>
                <span className="text-[11px] text-amber-700 block">
                  Hiện tại: <strong>{monthlyInterestRate}%/tháng</strong>.
                </span>
              </div>
            )}

            {/* 3. Lý do sửa */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lý do chỉnh sửa
              </label>
              <input
                type="text"
                name="reason"
                defaultValue="Sửa nhầm tiền gốc / mức lãi ban đầu"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isAdjustPending}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 text-white font-bold text-xs shadow transition-all"
            >
              {isAdjustPending ? "Đang tính toán lại..." : "Lưu & Tính Lại Toàn Bộ Lãi"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}