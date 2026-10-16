# 💰 Personal Lending Manager

A lightweight, automated personal debt and loan management web app built with Next.js, Prisma, and PostgreSQL.

## ✨ Features

- **Daily & Monthly Interest:** Supports fixed daily interest (VND/day) or monthly percentage rates.
- **Backdated Accrual:** Automatically calculates missing interest if a loan is recorded days after disbursement.
- **Smart Repayment:** Pay principal only, or prioritize interest first before reducing principal.
- **Retroactive Adjustments:** Correct initial principal or interest rates; historical balances recalculate automatically.
- **Top-up Loans:** Add extra loaned amounts to existing active loans.
- **Automated Cron Jobs:** Midnight auto-accrual powered by Vercel Cron.
- **Admin Authentication:** Simple, secure password protection via middleware.

## 🛠️ Tech Stack

- **Frontend & Backend:** Next.js 16 (App Router, Server Actions)
- **Database:** PostgreSQL (Neon.tech Serverless)
- **ORM:** Prisma 6
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## 🚀 Quick Setup

1. **Clone & Install:**
   ```bash
   git clone [https://github.com/Paya0912/lending-management-web.git](https://github.com/Paya0912/lending-management-web.git)
   cd lending-management-web
   npm install
2. Configure .env:
  DATABASE_URL="your_neon_postgresql_url"
  ADMIN_PASSWORD="your_admin_password"
  CRON_SECRET="your_random_secret"
3. Sync Database & Run:
  npx prisma db push
  npm run dev
  Open http://localhost:3000
