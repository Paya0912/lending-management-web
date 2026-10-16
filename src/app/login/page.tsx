"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl mb-3 font-black text-xl">
            $
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Sổ Quản Lý Nợ</h1>
          <p className="text-sm text-slate-500 mt-1">Nhập mật khẩu Admin để truy cập hệ thống</p>
        </div>

        {state?.error && (
          <div className="mb-6 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-600 font-medium text-center">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Mật khẩu quản trị
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••••••"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 tracking-wider"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold transition-all shadow-md shadow-indigo-100"
          >
            {isPending ? "Đang xác thực..." : "Đăng Nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}