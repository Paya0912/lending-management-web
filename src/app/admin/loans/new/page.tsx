import prisma from "@/lib/prisma";
import LoanForm from "./LoanForm";

// Khai báo để Next.js 16 không chặn Dynamic Prerender
export const instant = false;

export default async function NewLoanPage() {
  // Lấy danh sách những người đã từng vay để chọn nhanh
  const borrowers = await prisma.borrower.findMany({
    select: {
      id: true,
      fullName: true,
      phone: true,
    },
    orderBy: { fullName: "asc" },
  });

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <LoanForm borrowers={borrowers} />
    </div>
  );
}