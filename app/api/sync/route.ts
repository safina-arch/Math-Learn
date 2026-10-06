import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase";

/**
 * Data dibaca selalu segar (tanpa cache Next) — 50+ klien yang polling tiap 5 detik
 * tidak boleh memakai hasil cache yang bisa menyimpan status evaluasi/kunci lama.
 */
export const dynamic = "force-dynamic";

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
 * Key wadah ini juga menyimpan `hapus` (tombstone id yang sengaja dihapus guru/admin)
 * supaya tulisan klien lain yang masih basi tidak menghidupkannya lagi.
 */
const WADAH = "presence";
const KEY_WADAH = new Set(["lkpdTopics", "lkpdProgress"]);

type Baris = Record<string, unknown>;

/* ————————————————————————————————————————————
   Gabung antar klien (read-modify-write per key):
   dulu setiap POST menimpa seluruh array (last-write-wins) sehingga kiriman siswa
   bisa hilang permanen dan pembukaan kunci evaluasi bisa tertimpa tulisan basi.
   Kini: union per baris, stempel WAKTU REVISI terbaru menang.
   ———————————————————————————————————————————— */

/** Kunci baris: id biasa, atau `siswaId:subtopicId` untuk progres LKPD. */
function kunciBaris(resource: string, row: unknown): string | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Baris;
  if (resource === "lkpdProgress") {
    return typeof r.siswaId === "string" && typeof r.subtopicId === "string" ? `${r.siswaId}:${r.subtopicId}` : null;
  }
  return typeof r.id === "string" && r.id ? r.id : null;
}

/** Stempel revisi sebuah baris (field opsional — data lama dianggap lama). */
function stempel(row: unknown): string {
  const r = (row || {}) as Baris;
  return String(r.revisiAt || r.submittedAt || r.createdAt || r.timestamp || r.updatedAt || "");
}

/** Batas jumlah baris per resource setelah digabung (menjaga payload tetap ringan). */
const BATAS: Record<string, number> = { notifications: 400, cheatLogs: 800, presence: 200 };

/**
 * Union dua daftar baris:
 *  - id yang ada di salah satu sisi tetap ada (tak ada data hilang);
 *  - bila keduanya punya id sama → stempel revisi TERBARU menang;
 *  - baris yang masuk daftar `hapus` dibuang selama stempelnya tidak lebih baru
 *    dari waktu penghapusan (tombstone → tidak "hidup lagi" dari klien basi).
 */
function gabungBaris(resource: string, lama: unknown, baru: unknown, hapus: Record<string, string> = {}): unknown[] {
  const out = new Map<string, unknown>();
  for (const r of Array.isArray(lama) ? lama : []) {
    const k = kunciBaris(resource, r);
    if (k) out.set(k, r);
  }
  for (const r of Array.isArray(baru) ? baru : []) {
    const k = kunciBaris(resource, r);
    if (!k) continue;
    const ada = out.get(k);
    if (ada && stempel(ada) > stempel(r)) continue; // data tersimpan lebih baru
    out.set(k, r);
  }
  for (const [k, waktu] of Object.entries(hapus)) {
    const r = out.get(k);
    if (r && stempel(r) <= waktu) out.delete(k);
  }
  let hasil = Array.from(out.values());
  const batas = BATAS[resource];
  if (batas && hasil.length > batas) {
    hasil = hasil.slice().sort((a, b) => stempel(b).localeCompare(stempel(a))).slice(0, batas);
  }
  return hasil;
}

/** Isi wadah (objek) — aman bila isinya bukan objek. */
function isiWadah(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

/** Map tombstone `resource → { kunci: waktuHapus }` yang tersimpan di dalam wadah. */
function petaHapus(wadah: Record<string, unknown>): Record<string, Record<string, string>> {
  const h = wadah.hapus;
  return h && typeof h === "object" && !Array.isArray(h) ? (h as Record<string, Record<string, string>>) : {};
}

/** Union progres LKPD: kunci `siswaId+submateriId`, `updatedAt` terbaru menang. */
function gabungProgres(a: unknown, b: unknown, hapus: Record<string, string> = {}): Baris[] {
  const out = new Map<string, Baris>();
  const masuk = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const item of list as Baris[]) {
      const k = kunciBaris("lkpdProgress", item);
      if (!k) continue;
      const ada = out.get(k);
      if (!ada || String(item.updatedAt || "") >= String(ada.updatedAt || "")) out.set(k, item);
    }
  };
  masuk(a);
  masuk(b);
  for (const [k, waktu] of Object.entries(hapus)) {
    const r = out.get(k);
    if (r && String(r.updatedAt || "") <= waktu) out.delete(k);
  }
  return Array.from(out.values());
}

/** Union katalog LKPD (stempel revisi terbaru menang; id hilang dari payload tetap dipertahankan). */
function gabungTopik(wadah: unknown, langsung: unknown, hapus: Record<string, string> = {}): unknown[] | undefined {
  const gabung = gabungBaris("lkpdTopics", wadah, langsung, hapus);
  return gabung.length ? gabung : undefined;
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
  const hapus = petaHapus(wadah);
  const hasil: Record<string, unknown> = { ...rows };
  delete hasil[WADAH];

  // Saring baris yang sudah dihapus (tombstone) agar tidak "hidup lagi" di klien.
  for (const [resource, daftarHapus] of Object.entries(hapus)) {
    if (KEY_WADAH.has(resource)) continue;
    if (Array.isArray(hasil[resource])) hasil[resource] = gabungBaris(resource, hasil[resource], [], daftarHapus);
  }

  // Pecah wadah LKPD → dua key yang dipakai klien; gabung dengan data key langsung bila ada.
  const topik = gabungTopik(wadah.lkpdTopics, rows.lkpdTopics, hapus.lkpdTopics || {});
  if (topik && topik.length) hasil.lkpdTopics = topik;
  else delete hasil.lkpdTopics;
  const progres = gabungProgres(rows.lkpdProgress, wadah.lkpdProgress, hapus.lkpdProgress || {});
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
    // Key `presence` dipakai sebagai wadah data LKPD + daftar tombstone —
    // menimpanya langsung akan menghapus katalog & progres LKPD.
    if (resource === WADAH) {
      return NextResponse.json({ error: "Data sinkronisasi tidak valid." }, { status: 400 });
    }

    const teacherOnly = new Set(["materials", "assignments", "announcements", "events", "lkpdTopics"]);
    if (teacherOnly.has(resource) && role !== "guru" && role !== "admin") {
      return NextResponse.json({ error: "Tidak memiliki izin." }, { status: 403 });
    }

    const waktu = new Date().toISOString();
    const hapusBaru = Array.isArray(body.hapus) ? (body.hapus as unknown[]).filter((x) => typeof x === "string") as string[] : [];

    // Baca wadah sekali: menyimpan merge LKPD + tombstone hapus semua resource.
    const { data: rowWadah, error: bacaWadah } = await sb.from("app_state").select("data").eq("key", WADAH).maybeSingle();
    if (bacaWadah) return NextResponse.json({ error: bacaWadah.message }, { status: 500 });
    const wadah = isiWadah(rowWadah?.data);
    const hapus = petaHapus(wadah);

    if (hapusBaru.length) {
      hapus[resource] = { ...(hapus[resource] || {}) };
      for (const k of hapusBaru) hapus[resource][k] = waktu;
      wadah.hapus = hapus;
    }

    if (KEY_WADAH.has(resource)) {
      // Tulis ke wadah (lihat catatan WADAH di atas) — baca-modulis-tulis agar
      // tulisan klien lain tidak hilang: progres digabung per siswa+submateri.
      wadah[resource] =
        resource === "lkpdProgress"
          ? gabungProgres(wadah.lkpdProgress, body.data, hapus.lkpdProgress || {})
          : gabungTopik(wadah.lkpdTopics, body.data, hapus.lkpdTopics || {}) || [];
    }

    const { data: barisLama, error: baca } = await sb.from("app_state").select("data").eq("key", resource).maybeSingle();
    if (baca) return NextResponse.json({ error: baca.message }, { status: 500 });
    const akhir = gabungBaris(resource, barisLama?.data, body.data, hapus[resource] || {});

    // Wadah hanya disentuh bila ada perubahan di dalamnya (data LKPD / tombstone baru)
    // — mengurangi antrean tulis yang saling menimpa saat 50+ klien aktif.
    const perluWadah = KEY_WADAH.has(resource) || hapusBaru.length > 0;
    const target = perluWadah
      ? [
          { key: resource, data: akhir, updated_at: waktu },
          { key: WADAH, data: wadah, updated_at: waktu },
        ]
      : [{ key: resource, data: akhir, updated_at: waktu }];
    const { error } = await sb.from("app_state").upsert(target, { onConflict: "key" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Gagal menyinkronkan data." }, { status: 500 });
  }
}
