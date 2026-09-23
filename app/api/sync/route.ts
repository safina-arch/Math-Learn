import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase";

const RESOURCES = new Set([
  "materials",
  "assignments",
  "submissions",
  "announcements",
  "notifications",
  "cheatLogs",
  "events",
  "users",
  "presence",
]);

export async function GET() {
  const sb = supabaseServer();
  if (!sb || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ configured: false, data: {} });
  }

  const { data, error } = await sb.from("app_state").select("key,data");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    configured: true,
    data: Object.fromEntries((data || []).map((row: { key: string; data: unknown }) => [row.key, row.data])),
  });
}

export async function POST(req: Request) {
  const sb = supabaseServer();
  if (!sb || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase production belum dikonfigurasi." }, { status: 503 });
  }

  try {
    const body = await req.json();
    const resource = String(body.resource || "");
    const role = String(body.role || "");
    if (!RESOURCES.has(resource) || !Array.isArray(body.data)) {
      return NextResponse.json({ error: "Data sinkronisasi tidak valid." }, { status: 400 });
    }

    const teacherOnly = new Set(["materials", "assignments", "announcements", "events"]);
    if (teacherOnly.has(resource) && role !== "guru" && role !== "admin") {
      return NextResponse.json({ error: "Tidak memiliki izin." }, { status: 403 });
    }

    const { error } = await sb.from("app_state").upsert(
      { key: resource, data: body.data, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyinkronkan data." }, { status: 500 });
  }
}
