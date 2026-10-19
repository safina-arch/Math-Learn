import { NextResponse } from "next/server";

/**
 * Identitas build berjalan — dipakai klien untuk mendeteksi bahwa ada versi baru.
 * Nilainya stabil selama satu deployment dan berganti tiap deploy, sehingga tab
 * lama (bundle usang) bisa menawarkan reload otomatis.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const t =
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_URL ||
    "lokal";
  return NextResponse.json({ t }, { headers: { "cache-control": "no-store" } });
}
