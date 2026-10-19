import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

/**
 * Kehadiran user (heartbeat) **sekaligus kunci sesi perangkat**.
 *
 * GET  → daftar { userId, nama, role, lastSeen } untuk halaman admin.
 * POST → update kehadiran user; { offline: true } untuk menandai keluar;
 *        { claim: true } untuk mengklaim sesi saat LOGIN — ditolak (blocked)
 *        bila perangkat LAIN masih aktif (heartbeat < 60 detik lalu).
 *
 * Id perangkat disimpan dalam kolom `role` dengan pemisah `|` (`guru|dev-abc`)
 * agar tidak butuh kolom baru; GET selalu mengembalikan role aslinya saja.
 */
const JENDELA_AKTIF_MS = 60_000;

/** Pisahkan `role|deviceId` dari kolom `role` (data lama tanpa pemisah = tanpa perangkat). */
function bacaRole(role: string): { role: string; deviceId: string } {
  const s = String(role || "");
  const i = s.indexOf("|");
  if (i < 0) return { role: s, deviceId: "" };
  return { role: s.slice(0, i), deviceId: s.slice(i + 1) };
}

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
      role: bacaRole(row.role).role,
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

    const deviceId = String(body.deviceId || "").slice(0, 64);

    // Klaim sesi saat login: perangkat lain yang masih aktif memblokir login baru.
    if (body.claim) {
      const { data: lama } = await sb
        .from("presence")
        .select("last_seen,role")
        .eq("user_id", userId)
        .maybeSingle();
      if (lama) {
        const devLama = bacaRole(lama.role || "").deviceId;
        const last = Date.parse(String(lama.last_seen || ""));
        const lewat = last ? Date.now() - last : Number.POSITIVE_INFINITY;
        if (devLama && deviceId && devLama !== deviceId && lewat < JENDELA_AKTIF_MS) {
          return NextResponse.json({
            ok: false,
            blocked: true,
            sisaDetik: Math.max(1, Math.ceil((JENDELA_AKTIF_MS - lewat) / 1000)),
            aktifPada: lama.last_seen,
          });
        }
      }
    }

    const roleAsli = String(body.role || "");
    const { error } = await sb.from("presence").upsert(
      {
        user_id: userId,
        nama: String(body.nama || ""),
        role: deviceId ? `${roleAsli}|${deviceId}` : roleAsli,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan kehadiran." }, { status: 500 });
  }
}
