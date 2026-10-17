import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import RepaymentForm from "./RepaymentForm";
import { deletePaidOffLoanAction } from "@/app/actions/payment";
import { syncLoanInterest } from "@/lib/sync-loan-interest";
import { connection } from "next/server";

export const instant = false;

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;

  await syncLoanInterest(id);

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      borrower: true,
      transactions: {
        orderBy: { createdAt: "desc" },
      },
      auditLogs: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!loan) notFound();

  const remPrincipal = Number(loan.remainingPrincipal);
  const accInterest = Number(loan.accruedInterest);
  const totalDue = remPrincipal + accInterest;

  // Tính số ngày đã vay từ ngày giải ngân đến hiện tại
  const startDate = new Date(loan.startDate);
  const today = new Date();
  const diffTime = Math.max(0, today.getTime() - startDate.getTime());
  const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ← Dashboard
            </Link>
            <h1 className="font-bold text-lg text-slate-800">
              Chi Tiết Khoản Vay: {loan.borrower.fullName}
            </h1>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              loan.status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {loan.status === "ACTIVE" ? "Đang Vay" : "Đã Tất Toán"}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-8 space-y-6">
        {/* KHỐI THÔNG TIN HỢP ĐỒNG: NGÀY CHO VAY & THỜI GIAN VAY */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-6">
            <div>
              <span className="text-slate-400 font-medium block">Ngày cho vay (Giải ngân):</span>
              <strong className="text-slate-800 text-sm font-bold">
                {startDate.toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </strong>
            </div>

            <div className="border-l border-slate-200 pl-6">
              <span className="text-slate-400 font-medium block">Thời gian đã vay:</span>
              <strong className="text-indigo-600 text-sm font-bold">
                {daysPassed === 0 ? "Hôm nay (0 ngày)" : `${daysPassed} ngày`}
              </strong>
            </div>

            <div className="border-l border-slate-200 pl-6">
              <span className="text-slate-400 font-medium block">Gói thỏa thuận lãi:</span>
              <strong className="text-slate-800 text-sm font-bold">
                {loan.interestType === "DAILY"
                  ? `${Number(loan.dailyInterestAmount).toLocaleString("vi-VN")} đ/ngày`
                  : `${Number(loan.monthlyInterestRate)}%/tháng (ngày ${loan.paymentDueDay})`}
              </strong>
            </div>
          </div>

          {loan.notes && (
            <div className="w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
              <span className="text-slate-400 font-medium block">Ghi chú hợp đồng:</span>
              <span className="text-slate-600 italic">{loan.notes}</span>
            </div>
          )}
        </div>

        {/* 3 Thẻ Số Dư */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase">1. Tiền Gốc Còn Lại</span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {remPrincipal.toLocaleString("vi-VN")} <span className="text-xs font-normal">đ</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Gốc ban đầu: {Number(loan.originalPrincipal).toLocaleString("vi-VN")} đ
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-amber-500 uppercase">2. Tiền Lãi Đang Nợ</span>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {accInterest.toLocaleString("vi-VN")} <span className="text-xs font-normal">đ</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {loan.interestType === "DAILY"
                ? `Lãi ${Number(loan.dailyInterestAmount).toLocaleString("vi-VN")} đ/ngày`
                : `Lãi ${Number(loan.monthlyInterestRate)}%/tháng`}
            </p>
          </div>

          <div className="bg-indigo-50/80 p-5 rounded-2xl border border-indigo-200 shadow-sm">
            <span className="text-xs font-bold text-indigo-700 uppercase">3. Tổng Tiền Cần Thanh Toán</span>
            <p className="text-2xl font-black text-indigo-700 mt-1">
              {totalDue.toLocaleString("vi-VN")} <span className="text-xs font-normal">đ</span>
            </p>
            <p className="text-xs text-indigo-500 mt-1">Gốc + Lãi tính đến hôm nay</p>
          </div>
        </div>

        {/* Cột Form & Lịch Sử */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Cột Trái: Form Thu Tiền & Vay Thêm */}
          <div className="md:col-span-1 space-y-5">
            <RepaymentForm
              loanId={loan.id}
              originalPrincipal={Number(loan.originalPrincipal)}
              remainingPrincipal={remPrincipal}
              accruedInterest={accInterest}
              totalDue={totalDue}
              interestType={loan.interestType}
              dailyInterestAmount={Number(loan.dailyInterestAmount || 0)}
              monthlyInterestRate={Number(loan.monthlyInterestRate || 0)}
            />

            {loan.status === "PAID_OFF" && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2">
                <p className="text-xs text-rose-700 font-semibold">Khoản vay này đã được thanh toán hết.</p>
                <form action={deletePaidOffLoanAction}>
                  <input type="hidden" name="loanId" value={loan.id} />
                  <button
                    type="submit"
                    className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                  >
                    🗑️ Xóa Vĩnh Viễn Khoản Vay Này
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Cột Phải: Lịch Sử Dòng Tiền & Audit Log */}
          <div className="md:col-span-2 space-y-6">
            {/* Lịch Sử Giao Dịch */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-bold text-slate-800 text-base mb-4">Lịch Sử Biến Động Nợ & Thu Tiền</h2>
              {loan.transactions.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">Chưa có giao dịch nào được ghi nhận.</p>
              ) : (
                <div className="space-y-3">
                  {loan.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-50 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800">
                            {tx.type === "REPAYMENT"
                              ? "Khách trả tiền"
                              : tx.type === "TOP_UP"
                              ? "Vay thêm tiền (+ gốc)"
                              : "Hệ thống cộng lãi"}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            {tx.paymentMethod || "Tự động"}
                          </span>
                        </div>

                        <div className="text-slate-400 text-[11px]">
                          {new Date(tx.createdAt).toLocaleString("vi-VN")}
                        </div>

                        {/* HIỂN THỊ NỔI BẬT GHI CHÚ KHI TRẢ TIỀN */}
                        {tx.notes && (
                          <div className="text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block font-medium">
                            📝 {tx.notes}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div
                          className={`font-black text-sm ${
                            tx.type === "REPAYMENT"
                              ? "text-emerald-600"
                              : tx.type === "TOP_UP"
                              ? "text-blue-600"
                              : "text-amber-600"
                          }`}
                        >
                          {tx.type === "REPAYMENT" ? "-" : "+"}
                          {Number(tx.amount).toLocaleString("vi-VN")} đ
                        </div>
                        {tx.type === "REPAYMENT" && (
                          <div className="text-[11px] text-slate-400">
                            (Gốc: -{Number(tx.deductedPrincipal).toLocaleString("vi-VN")} | Lãi: -
                            {Number(tx.deductedInterest).toLocaleString("vi-VN")})
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nhật Ký Thay Đổi Thỏa Thuận (Audit Log) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-bold text-slate-800 text-base mb-4">Nhật Ký Chỉnh Sửa Thỏa Thuận</h2>
              {loan.auditLogs.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">Chưa có chỉnh sửa nào trên khoản vay này.</p>
              ) : (
                <div className="space-y-2">
                  {loan.auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="font-bold text-slate-700">
                          {log.action === "TOP_UP_PRINCIPAL"
                            ? "Tăng nợ gốc"
                            : log.action === "UPDATE_INTEREST_RATE"
                            ? "Đổi mức lãi"
                            : log.action}
                        </span>
                        <span>{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
                      </div>
                      <div className="text-slate-600">
                        Giá trị: <span className="line-through text-slate-400">{log.oldValue}</span> →{" "}
                        <strong className="text-indigo-600 font-bold">{log.newValue}</strong>
                      </div>
                      {log.reason && <div className="text-slate-400 italic">Lý do: {log.reason}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}