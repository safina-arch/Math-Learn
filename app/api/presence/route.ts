import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

/**
 * Kehadiran user (heartbeat).
 * GET  → daftar { userId, nama, role, lastSeen } untuk halaman admin.
 * POST → update kehadiran user; { offline: true } untuk menandai keluar.
 */
export async function GET() {
  const sb = supabaseServer();
  if (!sb || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ configured: false, data: [] });
  }

  const { data, error } = await sb
    .from("presence")
    .select("user_id,nama,role,last_seen")
    .order("last_seen", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    configured: true,
    data: (data || []).map((row: { user_id: string; nama: string; role: string; last_seen: string }) => ({
      userId: row.user_id,
      nama: row.nama,
      role: row.role,
      lastSeen: row.last_seen,
    })),
  });
}

export async function POST(req: Request) {
  const sb = supabaseServer();
  if (!sb || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });
  }

  try {
    const body = await req.json();
    const userId = String(body.userId || "");
    if (!userId) return NextResponse.json({ error: "userId wajib diisi." }, { status: 400 });

    if (body.offline) {
      await sb.from("presence").delete().eq("user_id", userId);
      return NextResponse.json({ ok: true });
    }

    const { error } = await sb.from("presence").upsert(
      { user_id: userId, nama: String(body.nama || ""), role: String(body.role || ""), last_seen: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan kehadiran." }, { status: 500 });
  }
}
