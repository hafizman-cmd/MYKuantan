import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  getAdminEnv,
  issueAdminSessionToken,
  safeComparePassword,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { password } = body;
  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "Access key is required." },
      { status: 400 }
    );
  }

  let env: { password: string; secret: string };
  try {
    env = getAdminEnv();
  } catch {
    return NextResponse.json(
      { error: "Server not configured for admin access." },
      { status: 500 }
    );
  }

  if (!safeComparePassword(password, env.password)) {
    return NextResponse.json({ error: "Invalid access key." }, { status: 401 });
  }

  const token = issueAdminSessionToken(env.secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return res;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ authed: false }, { status: 200 });
  }
  try {
    const { secret } = getAdminEnv();
    const authed = verifyAdminSessionToken(token, secret);
    return NextResponse.json({ authed }, { status: 200 });
  } catch {
    return NextResponse.json({ authed: false }, { status: 200 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}