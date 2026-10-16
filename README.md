# 💰 Personal Lending & Debt Management Web App

<p align="center">
  <img src="src/app/favicon.ico" alt="App Logo" width="100" height="100" />
</p>

<p align="center">
  A modern, fully automated, and secure personal debt management web application. Built with Next.js 16, Prisma, PostgreSQL (Neon.tech), and Tailwind CSS, deployed completely free on Vercel Serverless infrastructure.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16%20(App%20Router)-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-6.x-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon.tech-00E599?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel" alt="Vercel" />
</p>

---

## 📖 Overview

Tracking personal loans and credit lines using paper notebooks or complex Excel spreadsheets often leads to errors, forgotten interest charges, and lack of clarity. 

This application introduces a **Separate Balance Accounting Model**: Principal and accrued interest are isolated from each other. Interest is calculated dynamically and automatically without compounding ("interest on interest"), and retroactive interest calculation is supported out-of-the-box if a loan is recorded days after actual disbursement.

---

## ✨ Key Features

### 1. Flexible Loan & Interest Management
- **Daily Fixed Interest:** Input a fixed amount per day (e.g., `50,000 VND/day`), automatically accrued every night.
- **Monthly Percentage Interest:** Calculate interest based on a monthly percentage applied to the original principal, due on a specified day each month.
- **Backdated Interest Accrual:** If a loan is entered days after actual cash disbursement, the system automatically detects the elapsed days and back-calculates missing interest into the balance.

### 2. Smart Repayment & Balance Allocation
- **Principal-Only Repayment:** Deduct directly from the principal balance while keeping accrued interest untouched. Guard rails prevent accidental overpayment exceeding the outstanding principal.
- **Auto Allocation (Interest First, Remaining to Principal):** Pay off outstanding interest first; any remainder automatically reduces the principal balance.
- **Transaction Logs & Notes:** Record payment methods (Cash, Bank Transfer) and custom notes for audit purposes.

### 3. Principal Top-Up & Rate Revision
- Add additional loaned amounts directly into an existing active loan.
- Dynamically adjust the daily fixed interest or monthly interest rate to match updated agreements.

### 4. Retroactive Corrections & Auto-Rebalancing
- **Correction Tab ("Sửa Nhầm"):** Correct misspelled initial principal or interest rates without creating fake payment transactions.
- **Smart Recalculation Engine:** The backend automatically scans historical repayments (`REPAYMENT`) and top-ups (`TOP_UP`) to re-compute the exact remaining principal and retroactive interest from the disbursement date.

### 5. 100% Serverless Automation via Vercel Cron
- A background worker triggers every midnight at **00:00 local time (17:00 UTC)** via Vercel Cron Jobs to accrue interest across active loans without requiring manual intervention or keeping a server running.

### 6. Security & Audit Logging
- **Admin Shield:** Access is protected via HTTP-only session cookies and edge-level middleware checking against a secret administrator password.
- **Audit Logs (`LoanAuditLog`):** Every administrative change to terms, rates, or principal values is recorded with timestamps, old values, new values, and stated reasons.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router)** | Full-stack React framework with Turbopack, Server Actions, & Server Components |
| **Language** | **TypeScript** | Type-safe development across frontend, backend actions, and ORM |
| **Database** | **PostgreSQL (Neon.tech)** | Serverless Postgres database with auto-scaling and zero-idle cost |
| **ORM** | **Prisma ORM (v6)** | Type-safe queries, transaction isolation, and declarative schema migrations |
| **Styling** | **Tailwind CSS** | Responsive UI designed for both mobile and desktop screens |
| **Automation** | **Vercel Cron Jobs** | Daily automated interest calculation tasks |
| **Hosting** | **Vercel** | Serverless edge deployment with automatic HTTPS |

---

## 🗄️ Database Schema

The database model is strictly normalized into 4 core tables:

```mermaid
erDiagram
    BORROWER ||--o{ LOAN : "has"
    LOAN ||--o{ TRANSACTION : "records"
    LOAN ||--o{ LOAN_AUDIT_LOG : "audits"

    BORROWER {
        string id PK
        string fullName
        string phone
        string notes
        datetime createdAt
    }

    LOAN {
        string id PK
        string borrowerId FK
        decimal originalPrincipal
        decimal remainingPrincipal
        enum interestType "DAILY | MONTHLY"
        decimal dailyInterestAmount
        decimal monthlyInterestRate
        int paymentDueDay
        decimal accruedInterest
        datetime startDate
        enum status "ACTIVE | PAID_OFF | BAD_DEBT"
    }

    TRANSACTION {
        string id PK
        string loanId FK
        enum type "INTEREST_ACCRUAL | REPAYMENT | TOP_UP"
        decimal amount
        decimal deductedPrincipal
        decimal deductedInterest
        string paymentMethod
        string notes
        datetime createdAt
    }

    LOAN_AUDIT_LOG {
        string id PK
        string loanId FK
        string action
        string fieldName
        string oldValue
        string newValue
        string reason
        datetime createdAt
    }
🚀 Getting Started (Local Development)
Prerequisites
Node.js: v20.x or v22.x LTS (or later)

Git: Installed on your local machine

Installation Steps
Clone the repository:

Bash
git clone [https://github.com/Paya0912/lending-management-web.git](https://github.com/Paya0912/lending-management-web.git)
cd lending-management-web
Install project dependencies:

Bash
npm install
Configure Environment Variables (.env):
Create a .env file in the root directory based on .env.example:

Đoạn mã
# Neon.tech PostgreSQL connection string
DATABASE_URL="postgresql://user:password@endpoint.neon.tech/neondb?sslmode=require"

# Admin dashboard login password
ADMIN_PASSWORD="your-secure-admin-password"

# Secret token to authorize the daily interest cron job API
CRON_SECRET="your-random-cron-secret-key"
Sync database schema:

Bash
npx prisma generate
npx prisma db push
Start development server:

Bash
npm run dev
Open your browser and navigate to http://localhost:3000.

☁️ Deployment (Vercel)
Push your repository to your personal GitHub account.

Sign in to Vercel and import the project.

Configure the Environment Variables in project settings:

DATABASE_URL

ADMIN_PASSWORD

CRON_SECRET

Set the Build Command under Build and Output Settings:

Bash
prisma generate && next build
Click Deploy. Vercel will build the application and automatically configure the Cron Job defined in vercel.json.
