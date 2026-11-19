import type { LkpdAktivitas, LkpdBlock, LkpdMission, LkpdProgress, LkpdSel, LkpdSubtopic, LkpdTopic } from "./types";
import { nowIso, uid } from "./utils";

/** Enam tahap pembelajaran (saintifik) — dipakai sebagai template mission baru. */
export const LKPD_TAHAP = [
  { key: "mengamati", judul: "Mengamati", ikon: "👀", desc: "Mengamati fenomena sebelum definisi atau rumus diberikan." },
  { key: "menanya", judul: "Menanya", ikon: "❓", desc: "Membangun pertanyaan dari apa yang diamati." },
  { key: "mengumpulkan", judul: "Mengumpulkan Informasi", ikon: "🔎", desc: "Mengumpulkan data lewat aktivitas interaktif." },
  { key: "menalar", judul: "Menalar", ikon: "🧠", desc: "Menganalisis dan menemukan pola — konsep formal menyusul." },
  { key: "mengomunikasikan", judul: "Mengomunikasikan", ikon: "💬", desc: "Menjelaskan strategi dan cara penyelesaianmu dengan bahasa sendiri." },
  { key: "mengevaluasi", judul: "Mengevaluasi", ikon: "📝", desc: "Menilai proses & hasil belajarmu sendiri dan menyusun rencana perbaikan." },
] as const;

/** Mission baru dari template tahap (atau tahap kustom bila melebihi 5). */
export function missionBaru(index: number): LkpdMission {
  const tahap = LKPD_TAHAP[index];
  return {
    id: uid("ms"),
    judul: tahap?.judul || `Mission ${index + 1}`,
    ikon: tahap?.ikon || "✏️",
    deskripsi: tahap?.desc || "",
    blok: [],
  };
}

export function cariProgress(list: LkpdProgress[], siswaId: string | undefined, subtopicId: string): LkpdProgress | null {
  if (!siswaId) return null;
  return list.find((p) => p.siswaId === siswaId && p.subtopicId === subtopicId) || null;
}

export interface RingkasProgres {
  selesai: number;
  total: number;
  persen: number;
  status: "kosong" | "jalan" | "selesai";
}

export function progresSubtopic(sub: LkpdSubtopic | undefined, p: LkpdProgress | null): RingkasProgres {
  const total = sub?.missions.length || 0;
  const selesai = p ? p.missions.filter((id) => sub?.missions.some((m) => m.id === id)).length : 0;
  const persen = total ? Math.round((selesai / total) * 100) : 0;
  const status: RingkasProgres["status"] = total === 0 || selesai === 0 ? "kosong" : selesai >= total ? "selesai" : "jalan";
  return { selesai, total, persen, status };
}

/**
 * Nilai per sub-bab — TIDAK menunggu seluruh materi selesai dan TIDAK pernah
 * diambil dari persentase penyelesaian. Urutan sumber nilai:
 *  1. nilai buatan guru (`nilaiGuru`) bila ada;
 *  2. hasil hitungan `nilaiKerja()` (benar/salah jawaban terukur);
 *  3. `p.nilai` tersimpan untuk data sangat lama tanpa blok terukur.
 * `null` = belum dinilai / menunggu pemeriksaan guru.
 */
export function nilaiSubtopic(sub: LkpdSubtopic | undefined, p: LkpdProgress | null): number | null {
  if (!p) return null;
  if (p.nilaiGuru != null) return p.nilaiGuru;
  const k = nilaiKerja(sub, p);
  if (k.nilai != null) return k.nilai;
  return p.nilai ?? null;
}

/** Progres satu topik = rata-rata progres seluruh submaterinya. */
export function progresTopik(topik: LkpdTopic, list: LkpdProgress[], siswaId: string | undefined): RingkasProgres {
  const subs = topik.subtopics;
  const total = subs.reduce((n, s) => n + s.missions.length, 0);
  const selesai = subs.reduce((n, s) => n + progresSubtopic(s, cariProgress(list, siswaId, s.id)).selesai, 0);
  const persen = total ? Math.round((selesai / total) * 100) : 0;
  const status: RingkasProgres["status"] = total === 0 || selesai === 0 ? "kosong" : selesai >= total ? "selesai" : "jalan";
  return { selesai, total, persen, status };
}

/** Label tombol kartu: Mulai / Lanjutkan / Lihat. */
export function ctaProgres(status: RingkasProgres["status"]): string {
  if (status === "selesai") return "Lihat";
  if (status === "jalan") return "Lanjutkan";
  return "Mulai";
}

export const LKPD_STATUS_TONE: Record<RingkasProgres["status"], "gray" | "amber" | "green"> = {
  kosong: "gray",
  jalan: "amber",
  selesai: "green",
};

export const LKPD_STATUS_LABEL: Record<RingkasProgres["status"], string> = {
  kosong: "Belum dimulai",
  jalan: "Sedang dipelajari",
  selesai: "Selesai",
};

/** Indikator per mission: ✓ selesai · ◐ sedang berjalan · ○ belum. */
export function indikatorMission(id: string, p: LkpdProgress | null): "selesai" | "jalan" | "belum" {
  if (p?.missions.includes(id)) return "selesai";
  return "belum";
}

/* ————————————————————————————————————————————————
   PENILAIAN LKPD — satu-satunya sumber benar/salah.
   Sebelumnya nilai = persentase mission ditandai selesai, sehingga jawaban
   salah pun bisa menghasilkan nilai 100. Kini nilai dihitung dari benar/salah
   jawaban yang benar-benar bisa dinilai sistem; jawaban terbuka (essay/refleksi)
   tidak pernah dianggap benar — statusnya "menunggu pemeriksaan guru".
   ———————————————————————————————————————————————— */

/** Perbandingan isi sel terhadap kunci (ketat: tanpa kunci tidak bisa "benar"). */
export function selSama(v: string | undefined, kunci: string | undefined): boolean {
  const nilai = (v || "").trim();
  const acuan = (kunci || "").trim();
  if (!acuan) return false; // tanpa kunci → sistem tidak boleh menyatakan benar
  if (!nilai) return false;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ");
  if (norm(nilai) === norm(acuan)) return true;
  // Hanya bandingkan sebagai angka bila keduanya benar-benar berupa angka
  // ("10.000" ≈ "10000" ok; "10 ribu" ≠ "10").
  const angka = (s: string) => (/^[\d.,%-]+$/.test(s) ? Number(s.replace(/[^\d]/g, "")) : NaN);
  const a = angka(nilai);
  const b = angka(acuan);
  return !Number.isNaN(a) && !Number.isNaN(b) && a === b;
}

type StateAktivitas = {
  diArea?: string[];
  /** seret-slot baru: posisi kartu (kartuId → areaId); absen = masih di pool. */
  posisi?: Record<string, string>;
  pasang?: Record<string, string>;
  val?: Record<string, string>;
  /** urutkan: susunan kartu versi siswa. */
  urutan?: string[];
  /** benar-salah: pilihan per pernyataan ("true"/"false"). */
  pilih?: Record<string, string>;
  dicek?: boolean;
};

/**
 * Kunci jawaban uraian pendamping pada record `jawaban` — satu blok pertanyaan
 * bisa menyimpan PG (`jawaban[blokId]`) DAN uraian (`jawaban[blokId::uraian]`).
 */
export function kunciUraian(blokId: string): string {
  return `${blokId}::uraian`;
}

function parseAktivitas(teks?: string): StateAktivitas | null {
  if (!teks) return null;
  try {
    const o: unknown = JSON.parse(teks);
    return o && typeof o === "object" ? (o as StateAktivitas) : null;
  } catch {
    return null;
  }
}

/**
 * Benar/salah satu blok. `null` = bukan wewenang sistem
 * (seret-slot tanpa kunci & urutkan yang belum diperiksa tidak dinilai otomatis).
 * `uraian` = isi uraian pendamping blok pertanyaan (kunci `kunciUraian(id)`).
 */
export function nilaiBlok(blok: LkpdBlock, jawaban?: string, uraian?: string): boolean | null {
  if (blok.tipe === "pertanyaan") {
    const q = blok.pertanyaan;
    if (!q || q.opsi.length === 0) return null;
    // Uraian pendamping belum terisi → blok belum lengkap (menunggu), jangan dinilai dulu.
    if (q.uraian && !(uraian || "").trim()) return null;
    const n = Number(jawaban);
    if (jawaban == null || jawaban === "" || !Number.isInteger(n) || n < 0 || n >= q.opsi.length) return false;
    return Boolean(q.opsi[n]?.benar);
  }
  if (blok.tipe !== "aktivitas" || !blok.aktivitas) return null;
  const a = blok.aktivitas;
  const st = parseAktivitas(jawaban);
  if (a.tipe === "isi-tabel") {
    // Sel bernilai: berkunci (isi teks) ATAU kotak centang (kunci "true"/"false").
    const bernilai = (s: LkpdSel) => s.centang || (s.kunci || "").trim() !== "";
    const kunciEfektif = (s: LkpdSel) => (s.centang ? s.kunci || "false" : s.kunci);
    const semua = (a.baris || []).flatMap((r) => r.sel);
    if (!semua.some(bernilai)) return null;
    const val = st?.val || {};
    // Sel isi teks harus terisi; sel centang selalu terjawab (default = tak tercentang = false).
    const isi = (a.baris || []).flatMap((r, ri) => r.sel.map((s, ci) => ({ s, v: val[`${ri}-${ci}`] }))).filter((x) => bernilai(x.s));
    if (isi.some((x) => !x.s.centang && !(x.v || "").trim())) return false;
    return isi.every((x) => selSama(x.s.centang ? (x.v || "false") : x.v, kunciEfektif(x.s)));
  }
  if (a.tipe === "cocokkan") {
    const kiri = a.kiri || [];
    const pasangan = a.pasangan || {};
    if (!kiri.length) return null;
    const pasang = st?.pasang || {};
    if (kiri.some((k) => !pasang[k.id])) return false; // belum semua terpasang
    return kiri.every((k) => pasang[k.id] === pasangan[k.id]);
  }
  if (a.tipe === "seret-slot") {
    // Dinilai hanya bila guru menandai kunci area pada kartu; tanpa kunci = proses menemukan pola.
    const kartu = a.kartu || [];
    const berkunci = kartu.filter((k) => (k.kunciArea || "").trim());
    if (!berkunci.length) return null;
    const posisi = posisiKartu(a, st);
    if (kartu.some((k) => !posisi[k.id])) return null; // belum semua kartu ditempatkan
    return berkunci.every((k) => posisi[k.id] === k.kunciArea);
  }
  if (a.tipe === "benar-salah") {
    const pernyataan = a.pernyataan || [];
    if (!pernyataan.length) return null;
    const pilih = st?.pilih || {};
    if (pernyataan.some((p) => !pilih[p.id])) return false; // belum semua dijawab
    return pernyataan.every((p) => pilih[p.id] === p.kunci);
  }
  if (a.tipe === "urutkan") {
    const kartu = a.kartu || [];
    if (kartu.length < 2) return null;
    if (!st?.dicek) return null; // belum diperiksa siswa → nilai belum dihitung
    const urutan = st.urutan || [];
    if (urutan.length !== kartu.length) return false;
    return kartu.every((k, i) => urutan[i] === k.id);
  }
  return null; // tipe tak dikenal — jangan pernah dinilai otomatis
}

/** Posisi kartu seret-slot dari state baru (`posisi`) atau state lama (`diArea` → area pertama). */
function posisiKartu(a: LkpdAktivitas, st: StateAktivitas | null): Record<string, string> {
  if (st?.posisi) return st.posisi;
  const areaAwal = a.areas?.[0]?.id || "a0";
  return Object.fromEntries((st?.diArea || []).map((id) => [id, areaAwal]));
}

/** Blok terbuka (essay/refleksi) — jawabannya tidak bisa dinilai otomatis dengan aman. */
export function blokTerbuka(blok: LkpdBlock): boolean {
  return blok.tipe === "essay" || blok.tipe === "refleksi";
}

/**
 * Nilai kerja satu sub-bab dari mission yang sudah ditandai selesai.
 * `nilai` null = tidak ada blok terukur sama sekali → semuanya menunggu guru.
 */
export function nilaiKerja(
  sub: LkpdSubtopic | undefined,
  p: LkpdProgress | null,
): { nilai: number | null; uji: number; benar: number; terbuka: number; kurang: string[] } {
  let uji = 0;
  let benar = 0;
  let terbuka = 0;
  const kurang: string[] = [];
  if (!sub || !p) return { nilai: null, uji: 0, benar: 0, terbuka: 0, kurang };
  for (const m of sub.missions) {
    if (!p.missions.includes(m.id)) continue;
    for (const b of m.blok) {
      const jwb = p.jawaban[b.id];
      if (blokTerbuka(b)) {
        terbuka += 1;
        if (!(jwb || "").trim()) kurang.push(`${m.judul} · ${b.judul || "jawaban terbuka"}`);
        continue;
      }
      // PG + uraian pendamping: PG dinilai otomatis, uraian menunggu pemeriksaan guru.
      if (b.tipe === "pertanyaan" && b.pertanyaan?.uraian) {
        terbuka += 1;
        if (!(p.jawaban[kunciUraian(b.id)] || "").trim()) kurang.push(`${m.judul} · ${b.judul || "uraian pendamping"}`);
      }
      const hasil = nilaiBlok(b, jwb, p.jawaban[kunciUraian(b.id)]);
      if (hasil === null) continue;
      uji += 1;
      if (hasil) benar += 1;
      else kurang.push(`${m.judul} · ${b.judul || "jawaban"}`);
    }
  }
  return { nilai: uji ? Math.round((benar / uji) * 100) : null, uji, benar, terbuka, kurang };
}

/**
 * Syarat sebuah mission boleh ditandai selesai: seluruh blok yang mengharuskan
 * jawaban sudah diisi. `kurang` berisi daftar judul yang belum terjawab.
 */
export function missionTerjawab(
  mission: LkpdMission | undefined,
  jawaban: Record<string, string>,
): { boleh: boolean; kurang: string[] } {
  const kurang: string[] = [];
  if (!mission) return { boleh: false, kurang: ["Mission tidak ditemukan"] };
  for (const b of mission.blok) {
    const jwb = jawaban[b.id];
    const teks = (jwb || "").trim();
    if (b.tipe === "pertanyaan") {
      const n = Number(jwb);
      const opsiOk = teks && Number.isInteger(n) && Boolean(b.pertanyaan?.opsi[n]);
      if (!opsiOk) kurang.push(b.judul || "Pertanyaan");
      // Uraian pendamping (PG + essay dalam satu blok) juga wajib terisi.
      else if (b.pertanyaan?.uraian && !(jawaban[kunciUraian(b.id)] || "").trim()) kurang.push(b.judul || "Uraian pendamping");
      continue;
    }
    if (b.tipe === "essay" || b.tipe === "refleksi") {
      if (!teks) kurang.push(b.judul || (b.tipe === "essay" ? "Essay" : "Refleksi"));
      continue;
    }
    if (b.tipe !== "aktivitas" || !b.aktivitas) continue;
    const a = b.aktivitas;
    const st = parseAktivitas(jwb);
    if (a.tipe === "isi-tabel") {
      const val = st?.val || {};
      // Sel bernilai: berkunci ATAU kotak centang (centang selalu terjawab — default tak tercentang).
      const bernilai = (s: LkpdSel) => s.centang || (s.kunci || "").trim() !== "";
      const ada = (a.baris || []).some((r, ri) => r.sel.some((s, ci) => bernilai(s) && (s.centang || (val[`${ri}-${ci}`] || "").trim())));
      const lengkap = (a.baris || []).every((r, ri) =>
        r.sel.every((s, ci) => !bernilai(s) || s.centang || (val[`${ri}-${ci}`] || "").trim() !== ""),
      );
      if (!ada || !lengkap) kurang.push(b.judul || "Aktivitas tabel");
      continue;
    }
    if (a.tipe === "cocokkan") {
      const kiri = a.kiri || [];
      const pasang = st?.pasang || {};
      if (!kiri.length || kiri.some((k) => !pasang[k.id])) kurang.push(b.judul || "Aktivitas cocokkan");
      continue;
    }
    if (a.tipe === "benar-salah") {
      const pernyataan = a.pernyataan || [];
      const pilih = st?.pilih || {};
      if (!pernyataan.length || pernyataan.some((p) => !pilih[p.id])) kurang.push(b.judul || "Aktivitas benar/salah");
      continue;
    }
    if (a.tipe === "urutkan") {
      const kartu = a.kartu || [];
      const urutan = st?.urutan || [];
      // Wajib menekan "Periksa urutan" (dicek) supaya susunan benar-benar diperiksa.
      if (kartu.length < 2 || !st?.dicek || urutan.length !== kartu.length) kurang.push(b.judul || "Aktivitas urutkan");
      continue;
    }
    // seret-slot — posisi baru (`posisi`) atau state lama (`diArea`)
    const kartu = a.kartu || [];
    const posisi = posisiKartu(a, st);
    if (!kartu.length || kartu.some((k) => !posisi[k.id])) kurang.push(b.judul || "Aktivitas seret");
  }
  return { boleh: kurang.length === 0, kurang };
}

/* ————————————————————————————————————————————————
   MIGRASI GEL. 14 — "Mengomunikasikan & Mengevaluasi" dipecah jadi dua
   mission terpisah: "Mengomunikasikan" (diperbarui di tempat) + mission
   baru "Mengevaluasi" (blok refleksi & essay — dinilai guru).
   Idempoten: begitu mission "Mengevaluasi" ada, submateri tidak diubah lagi.
   ———————————————————————————————————————————————— */

/** Id mission "Mengevaluasi" hasil pemisahan (deterministik per submateri). */
export function idMissionEvaluasi(subtopicId: string): string {
  return `ms-evaluasi-${subtopicId}`;
}

/** Mission "Mengevaluasi" bawaan: dua blok terbuka (dinilai langsung guru). */
export function missionMengevaluasi(idMission: string): LkpdMission {
  return {
    id: idMission,
    judul: "Mengevaluasi",
    ikon: "📝",
    deskripsi: "Nilai proses & hasil belajarmu sendiri sebelum lanjut ke materi berikutnya.",
    blok: [
      {
        id: `${idMission}-b1`,
        tipe: "refleksi",
        judul: "Evaluasi dirimu",
        teks: "Bagian mana yang sudah kamu kuasai dan bagian mana yang masih perlu dilatih? Jelaskan dengan bahasamu sendiri (2–3 kalimat).",
      },
      {
        id: `${idMission}-b2`,
        tipe: "essay",
        judul: "Rencana tindak lanjut",
        teks: "Tuliskan satu langkah konkret yang akan kamu lakukan minggu ini untuk memperkuat materi ini.",
      },
    ],
  };
}

/** Pola judul mission lama hasil gabungan ("Mengomunikasikan & Mengevaluasi"). */
const JUDUL_GABUNGAN = /mengomunikasikan\s*&\s*mengevaluasi/i;

/**
 * Pecah tahap gabungan pada data lama (idempoten).
 * Mengembalikan daftar topik BARU bila ada perubahan, atau `null` bila tidak ada
 * apa pun untuk diubah. Blok/jawaban lama tidak disentuh → aman untuk progres siswa.
 */
export function pisahTahapEvaluasi(list: LkpdTopic[]): LkpdTopic[] | null {
  let berubah = false;
  const hasil = list.map((t) => {
    let sentuh = false;
    const subtopics = t.subtopics.map((s) => {
      const sudahAda = s.missions.some((m) => m.id === idMissionEvaluasi(s.id));
      const idx = s.missions.findIndex((m) => JUDUL_GABUNGAN.test(m.judul));
      if (sudahAda || idx < 0) return s;
      sentuh = true;
      const missions = s.missions.slice();
      missions[idx] = {
        ...missions[idx],
        judul: "Mengomunikasikan",
        deskripsi: "Jelaskan temuan dan strategi penyelesaianmu dengan bahasa sendiri.",
      };
      missions.splice(idx + 1, 0, missionMengevaluasi(idMissionEvaluasi(s.id)));
      return { ...s, missions };
    });
    if (!sentuh) return t;
    berubah = true;
    // Stempel revisi BARU: baris legacy lama di server (key `lkpdTopics` langsung)
    // memakai stempel lama — versi terpecah harus memenangkan merge saat id sama.
    return { ...t, revisiAt: nowIso(), subtopics };
  });
  return berubah ? hasil : null;
}
