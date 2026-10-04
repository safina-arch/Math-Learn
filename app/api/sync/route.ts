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
  "lkpdTopics",
  "lkpdProgress",
]);

/**
 * Constraint `app_state.key` (supabase/migration-revisi.sql) hanya mengizinkan 9 key lama —
 * `lkpdTopics` & `lkpdProgress` DITOLAK Postgres (500 "violates check constraint"),
 * sehingga nilai LKPD tidak pernah sampai ke guru/admin.
 * Solusi tanpa menunggu migrasi SQL: dua key LKPD disimpan sebagai objek di dalam
 * satu key yang diizinkan (`presence`), lalu dipecah lagi saat GET.
 * Setelah supabase/migration-lkpd.sql dijalankan, data key langsung (bila ada) ikut digabung.
 */
const WADAH = "presence";
const KEY_WADAH = new Set(["lkpdTopics", "lkpdProgress"]);

type BarisProgres = { siswaId: string; subtopicId: string; updatedAt?: string };

/** Union progres LKPD: kunci `siswaId+submateriId`, `updatedAt` terbaru menang. */
function gabungProgres(a: unknown, b: unknown): BarisProgres[] {
  const out = new Map<string, BarisProgres>();
  for (const list of [a, b]) {
    if (!Array.isArray(list)) continue;
    for (const item of list as BarisProgres[]) {
      if (!item || typeof item.siswaId !== "string" || typeof item.subtopicId !== "string") continue;
      const k = `${item.siswaId}:${item.subtopicId}`;
      const ada = out.get(k);
      if (!ada || String(item.updatedAt || "") >= String(ada.updatedAt || "")) out.set(k, item);
    }
  }
  return Array.from(out.values());
}

/** Union katalog LKPD (tanpa stempel waktu): data wadah menang, id yang hilang ditambahkan. */
function gabungTopik(wadah: unknown, langsung: unknown): unknown[] | undefined {
  const a = Array.isArray(wadah) ? wadah : [];
  const b = Array.isArray(langsung) ? langsung : [];
  if (!b.length) return a.length ? a : undefined;
  if (!a.length) return b;
  const ids = new Set(a.map((t: { id?: string }) => t?.id));
  return [...a, ...b.filter((t: { id?: string }) => !ids.has(t?.id))];
}

/** Baca isi wadah LKPD (objek) — aman bila isinya bukan objek. */
function isiWadah(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

export async function GET() {
  const sb = supabaseServer();
  if (!sb || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ configured: false, data: {} });
  }

  const { data, error } = await sb.from("app_state").select("key,data");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = Object.fromEntries((data || []).map((row: { key: string; data: unknown }) => [row.key, row.data]));
  const wadah = isiWadah(rows[WADAH]);
  const hasil: Record<string, unknown> = { ...rows };
  delete hasil[WADAH];

  // Pecah wadah LKPD → dua key yang dipakai klien; gabung dengan data key langsung bila ada.
  const topik = gabungTopik(wadah.lkpdTopics, rows.lkpdTopics);
  if (topik && topik.length) hasil.lkpdTopics = topik;
  else delete hasil.lkpdTopics;
  const progres = gabungProgres(rows.lkpdProgress, wadah.lkpdProgress);
  if (progres.length) hasil.lkpdProgress = progres;
  else delete hasil.lkpdProgress;

  return NextResponse.json({ configured: true, data: hasil });
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

    const teacherOnly = new Set(["materials", "assignments", "announcements", "events", "lkpdTopics"]);
    if (teacherOnly.has(resource) && role !== "guru" && role !== "admin") {
      return NextResponse.json({ error: "Tidak memiliki izin." }, { status: 403 });
    }

    const waktu = new Date().toISOString();
    if (KEY_WADAH.has(resource)) {
      // Tulis ke wadah (lihat catatan WADAH di atas) — baca-modulis-tulis agar
      // tulisan klien lain tidak hilang: progres digabung per siswa+submateri.
      const { data: row, error: baca } = await sb.from("app_state").select("data").eq("key", WADAH).maybeSingle();
      if (baca) return NextResponse.json({ error: baca.message }, { status: 500 });
      const isi = isiWadah(row?.data);
      isi[resource] = resource === "lkpdProgress" ? gabungProgres(isi.lkpdProgress, body.data) : body.data;
      const { error } = await sb.from("app_state").upsert({ key: WADAH, data: isi, updated_at: waktu }, { onConflict: "key" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const { error } = await sb.from("app_state").upsert(
      { key: resource, data: body.data, updated_at: waktu },
      { onConflict: "key" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyinkronkan data." }, { status: 500 });
  }
}
