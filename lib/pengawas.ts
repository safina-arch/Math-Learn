"use client";

import type { CheatLog, User } from "./types";

export type JenisKegiatan = "evaluasi" | "latihan" | "lkpd";

/**
 * Jenis kejadian yang dicatat — `"blok"` hanya untuk modal peringatan menu
 * dikunci (TIDAK ditulis ke laporan guru karena siswa tidak jadi berpindah).
 */
export type TipeKecurangan = "blur" | "visibility" | "navigasi" | "blok";

/** Baris laporan kecurangan (diseragamkan dengan tipe CheatLog milik store). */
export type BarisCheat = Omit<CheatLog, "id" | "timestamp">;

/** Ref milik halaman pengerjaan (sengaja bertipe longgar agar bisa dari `useRef`). */
type Ref<T> = { current: T };

export type KonteksPengawas = {
  /** pathname halaman pengerjaan — perpindahan ke luar dihitung sebagai pelanggaran. */
  halaman: string;
  evaluationId: string;
  jenis: JenisKegiatan;
  countRef: Ref<number>;
  mulaiRef: Ref<number>;
  soalRef?: Ref<number>;
  graceRef?: Ref<number>;
  selesaiRef?: Ref<boolean>;
  refreshRef?: Ref<boolean>;
  /** Evaluasi & latihan & LKPD: pindah lewat menu/sidebar/internal juga dicatat. */
  catatNavigasi: boolean;
  onCount?: (n: number) => void;
  user: User | null;
  catatLog: (l: BarisCheat) => void;
};

export type KeadaanPengawas = {
  /** true selama pengerjaan berjalan → menu navigasi dikunci oleh AppShell. */
  terkunci: boolean;
  /** Jumlah pelanggaran yang sudah tercatat pada pengerjaan ini. */
  jumlah: number;
  jenis: JenisKegiatan;
  /** Peringatan yang sedang tampil (modal global di AppShell). */
  peringatan: { n: number; tipe: TipeKecurangan; halaman: string } | null;
};

const KEADAAN_AWAL: KeadaanPengawas = { terkunci: false, jumlah: 0, jenis: "latihan", peringatan: null };

let ktx: KonteksPengawas | null = null;
let keadaan: KeadaanPengawas = KEADAAN_AWAL;
let pasang = false;
/** true bila perpindahan tab sedang/sudah tercatat — kejadian berikutnya tidak dihitung lagi. */
let tinggal = false;
let terakhir = 0;
let jeda: number[] = [];
const pendengar = new Set<() => void>();

function umumkan() {
  pendengar.forEach((f) => {
    try {
      f();
    } catch {
      // pendengar rusak diabaikan — penampil lain tetap jalan
    }
  });
}

/** Langganan perubahan keadaan (dipakai AppShell via useSyncExternalStore). */
export function langgananPengawas(f: () => void): () => void {
  pendengar.add(f);
  return () => {
    pendengar.delete(f);
  };
}

/** Nilai keadaan terkini (fungsi selector untuk useSyncExternalStore). */
export function keadaanPengawas(): KeadaanPengawas {
  return keadaan;
}

/** Snapshot untuk server (selalu awal — pengawas hanya berjalan di browser). */
export function keadaanAwalPengawas(): KeadaanPengawas {
  return KEADAAN_AWAL;
}

function perbarui(p: Partial<KeadaanPengawas>) {
  keadaan = { ...keadaan, ...p };
  umumkan();
}

/**
 * Catat satu pelanggaran — **satu kali keluar/pindah tab = satu hitungan**:
 * - penanda `tinggal` menyatukan `blur` + `visibilitychange` dari satu perpindahan;
 * - jeda 1,5 detik antar hitungan mencegah loncatan ganda;
 * - `visibilitychange` ditunda 350 ms agar refresh/tutup tab tidak ikut terhitung;
 * - jendela grasi (dialog foto) dan sesudah dikumpulkan bukan pelanggaran.
 */
function catat(tipe: Exclude<TipeKecurangan, "blok">) {
  const s = ktx;
  if (!s) return;
  if (s.selesaiRef?.current || !s.user) return;
  if (s.refreshRef?.current) return; // refresh / tutup tab — bukan pelanggaran
  const now = Date.now();
  if (s.graceRef && now < s.graceRef.current) return; // dialog foto
  if (tinggal) return;
  if (now - terakhir < 1500) return;
  tinggal = true;
  terakhir = now;
  s.countRef.current += 1;
  s.onCount?.(s.countRef.current);
  const menit = Math.max(1, Math.round((now - (s.mulaiRef.current || now)) / 60000));
  const baris: BarisCheat = {
    evaluationId: s.evaluationId,
    siswaId: s.user.id,
    siswaNama: s.user.nama,
    tipe,
    soal: s.soalRef?.current,
    menit,
  };
  s.catatLog(baris);
  void fetch("/api/cheat-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...baris, count: s.countRef.current }),
  }).catch(() => {});
  perbarui({ jumlah: s.countRef.current, peringatan: { n: s.countRef.current, tipe, halaman: s.halaman } });
}

/**
 * Upaya pindah menu yang DIBLOKIR (menu dikunci selama pengerjaan).
 * Bukan pelanggaran hitungan — siswa tidak jadi berpindah — hanya peringatan.
 */
export function upayaBlok() {
  const s = ktx;
  if (!s) return;
  perbarui({ peringatan: { n: s.countRef.current, tipe: "blok", halaman: s.halaman } });
}

/** Tutup modal peringatan dan siapkan penanda untuk perpindahan berikutnya. */
export function tutupPeringatan() {
  tinggal = false;
  perbarui({ peringatan: null });
}

let handlers: { onHide: () => void; onBlur: () => void; onFocus: () => void } | null = null;

function pasangListener() {
  if (pasang || typeof document === "undefined") return;
  pasang = true;
  const onHide = () => {
    if (document.hidden) {
      // Tunda sejenak: bila ternyata refresh/tutup tab (pagehide terdeteksi),
      // kejadian ini dibatalkan — hanya pindah tab sungguhan yang dihitung.
      const t = window.setTimeout(() => catat("visibility"), 350);
      jeda.push(t);
    } else {
      tinggal = false; // kembali ke tab → siap mencatat perpindahan berikutnya
    }
  };
  const onBlur = () => catat("blur");
  const onFocus = () => {
    tinggal = false;
  };
  handlers = { onHide, onBlur, onFocus };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
}

function lepasListener() {
  if (!pasang || typeof document === "undefined" || !handlers) return;
  pasang = false;
  document.removeEventListener("visibilitychange", handlers.onHide);
  window.removeEventListener("blur", handlers.onBlur);
  window.removeEventListener("focus", handlers.onFocus);
  handlers = null;
  jeda.forEach((t) => window.clearTimeout(t));
  jeda = [];
}

/** Daftarkan pengerjaan yang sedang berjalan → kunci menu + aktifkan penghitungan. */
export function daftarPengawas(k: KonteksPengawas) {
  ktx = k;
  tinggal = false;
  pasangListener();
  perbarui({ terkunci: true, jumlah: k.countRef.current, jenis: k.jenis, peringatan: null });
}

/**
 * Segarkan referensi store/prop (user, perekam log, onCount) tanpa menyentuh
 * keadaan — pendaftaran ulang akan menutup modal peringatan yang sedang tampil.
 */
export function perbaruiKonteks(p: Pick<KonteksPengawas, "user" | "catatLog" | "onCount">) {
  if (!ktx) return;
  ktx = { ...ktx, ...p };
}

/**
 * Lepas pengerjaan. Bila perpindahan terjadi saat komponen dilepas (halaman
 * pengerjaan unmount saat siswa pindah menu), hitung sekali sebagai `navigasi`.
 */
export function lepasPengawas() {
  const s = ktx;
  if (!s) return;
  const jalan = typeof window !== "undefined" ? window.location.pathname : "";
  if (s.catatNavigasi && jalan && jalan !== s.halaman && !s.selesaiRef?.current && !s.refreshRef?.current) {
    catat("navigasi"); // siswa berpindah halaman → halaman pengerjaan unmount
  }
  ktx = null;
  lepasListener();
  // `peringatan` TIDAK direset: peringatan yang baru terjadi saat berpindah halaman
  // harus tetap tampil (modal global di AppShell) sampai siswa menutupnya.
  perbarui({ terkunci: false });
}

/**
 * Pantau perubahan pathname dari AppShell (cadangan bila komponen pengerjaan
 * tidak unmount, mis. perubahan query pada rute yang sama).
 */
export function pantauHalaman(path: string) {
  const s = ktx;
  if (!s) return;
  if (!s.catatNavigasi) return;
  if (path === s.halaman) {
    tinggal = false; // kembali ke halaman pengerjaan → penanda disiapkan lagi
    return;
  }
  if (s.selesaiRef?.current || s.refreshRef?.current) return;
  catat("navigasi");
}
