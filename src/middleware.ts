import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cho phép đi qua nếu là trang login, cron API hoặc tài nguyên tĩnh
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get("admin_session");

  // Nếu chưa đăng nhập hoặc mật khẩu trong cookie không khớp .env -> chuyển hướng về /login
  if (!session || session.value !== process.env.ADMIN_PASSWORD) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};