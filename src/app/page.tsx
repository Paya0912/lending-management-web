import prisma from "@/lib/prisma";
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { syncLoanInterest } from "@/lib/sync-loan-interest";
import { connection } from "next/server";

export const instant = false;

export default async function DashboardPage() {
  await connection();
  await syncLoanInterest();

  const loans = await prisma.loan.findMany({
    include: {
      borrower: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Tính toán số liệu tổng hợp
  const activeLoans = loans.filter((l) => l.status === "ACTIVE");
  
  const totalPrincipal = activeLoans.reduce(
    (sum, l) => sum + Number(l.remainingPrincipal),
    0
  );
  const totalInterest = activeLoans.reduce(
    (sum, l) => sum + Number(l.accruedInterest),
    0
  );
  const totalDue = totalPrincipal + totalInterest;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black">
              $
            </span>
            <h1 className="font-bold text-lg text-slate-800">Sổ Quản Lý Nợ</h1>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/loans/new"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
            >
              + Tạo Khoản Vay
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="px-3 py-2 text-sm text-slate-500 hover:text-rose-600 font-medium transition-colors"
              >
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 pt-8 space-y-8">
        {/* 3 Thẻ Thống Kê Rõ Ràng: Gốc - Lãi - Tổng Cần Thu */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Tiền Gốc Còn Lại</p>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {totalPrincipal.toLocaleString("vi-VN")} <span className="text-xs font-semibold text-slate-400">VNĐ</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Tổng tiền gốc thực tế chưa thu hồi</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">2. Tiền Lãi Đang Nợ</p>
            <p className="text-2xl font-black text-amber-600 mt-2">
              {totalInterest.toLocaleString("vi-VN")} <span className="text-xs font-semibold text-slate-400">VNĐ</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Tiền lãi tích lũy theo ngày/tháng</p>
          </div>

          <div className="bg-indigo-50/60 p-6 rounded-2xl border border-indigo-200 shadow-sm">
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">3. Tổng Cần Thu (Gốc + Lãi)</p>
            <p className="text-2xl font-black text-indigo-700 mt-2">
              {totalDue.toLocaleString("vi-VN")} <span className="text-xs font-semibold text-indigo-500">VNĐ</span>
            </p>
            <p className="text-xs text-indigo-600 mt-1">Tổng tiền khách đang nợ bạn</p>
          </div>
        </div>

        {/* Danh Sách Khoản Vay Chi Tiết */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-lg">Danh Sách Người Vay</h2>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
              {loans.length} khoản vay
            </span>
          </div>

          {loans.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <p className="text-base">Chưa có khoản vay nào trong hệ thống.</p>
              <Link
                href="/admin/loans/new"
                className="inline-block text-sm font-semibold text-indigo-600 hover:underline"
              >
                Tạo khoản vay đầu tiên
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-4">Người Vay</th>
                    <th className="py-3.5 px-4 text-right">Tiền Gốc Còn</th>
                    <th className="py-3.5 px-4 text-right">Tiền Lãi Nợ</th>
                    <th className="py-3.5 px-4 text-right bg-indigo-50/40 text-indigo-900">Tổng Cần Trả</th>
                    <th className="py-3.5 px-4 text-center">Gói Lãi</th>
                    <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                    <th className="py-3.5 px-4 text-center">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loans.map((loan) => {
                    const remPrincipal = Number(loan.remainingPrincipal);
                    const accInterest = Number(loan.accruedInterest);
                    const loanTotalDue = remPrincipal + accInterest;

                    return (
                      <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900">{loan.borrower.fullName}</div>
                          <div className="text-xs text-slate-400">{loan.borrower.phone || "Không có SĐT"}</div>
                        </td>

                        {/* 1. Tiền gốc */}
                        <td className="py-4 px-4 text-right font-semibold text-slate-800">
                          {remPrincipal.toLocaleString("vi-VN")} đ
                          <div className="text-[11px] text-slate-400 font-normal">
                            Gốc đầu: {Number(loan.originalPrincipal).toLocaleString("vi-VN")} đ
                          </div>
                        </td>

                        {/* 2. Tiền lãi */}
                        <td className="py-4 px-4 text-right">
                          <span className={`font-bold ${accInterest > 0 ? "text-amber-600" : "text-slate-400"}`}>
                            {accInterest.toLocaleString("vi-VN")} đ
                          </span>
                        </td>

                        {/* 3. Tổng cần thanh toán */}
                        <td className="py-4 px-4 text-right bg-indigo-50/30 font-black text-indigo-700 text-base">
                          {loanTotalDue.toLocaleString("vi-VN")} đ
                        </td>

                        {/* Gói lãi */}
                        <td className="py-4 px-4 text-center">
                          {loan.interestType === "DAILY" ? (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                              Lãi {Number(loan.dailyInterestAmount).toLocaleString("vi-VN")} đ/ngày
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                              Lãi {Number(loan.monthlyInterestRate)}%/tháng
                            </span>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="py-4 px-4 text-center">
                          {loan.status === "ACTIVE" ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
                              Đang nợ
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                              Đã hết nợ
                            </span>
                          )}
                        </td>

                        {/* Nút hành động */}
                        <td className="py-4 px-4 text-center">
                          <Link
                            href={`/admin/loans/${loan.id}`}
                            className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm inline-block"
                          >
                            Thu tiền / Chi tiết
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}