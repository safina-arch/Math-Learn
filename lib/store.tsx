"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  AcademicEvent,
  Announcement,
  Assignment,
  CheatLog,
  LkpdProgress,
  LkpdTopic,
  Material,
  MaterialAttachment,
  Notification,
  Presence,
  Submission,
  User,
} from "./types";
import { AUTH_USERS, SEED_ANNOUNCEMENTS, SEED_ASSIGNMENTS, SEED_EVENTS, SEED_MATERIALS } from "./seed";
import { SEED_LKPD_TOPICS } from "./lkpd-seed";
import { nilaiKerja } from "./lkpd";
import { nowIso, uid } from "./utils";

/** Rekaman akun lengkap (password disimpan agar login bisa diverifikasi di client). */
type Account = User & { password?: string };

interface Store {
  /** True setelah data (termasuk sesi user) selesai dimuat dari penyimpanan lokal. */
  ready: boolean;
  user: User | null;
  impersonating: User | null;
  users: User[];
  presence: Presence[];
  materials: Material[];
  assignments: Assignment[];
  submissions: Submission[];
  announcements: Announcement[];
  notifications: Notification[];
  cheatLogs: CheatLog[];
  events: AcademicEvent[];
  /** Katalog LKPD (topik → submateri → mission → blok) — data-driven, lintas materi. */
  lkpdTopics: LkpdTopic[];
  /** Progres pengerjaan LKPD per siswa. */
  lkpdProgress: LkpdProgress[];
  login: (email: string, password: string) => string | null;
  register: (nama: string, email: string, password: string, kelas: string) => string | null;
  logout: () => void;
  impersonate: (id: string) => void;
  stopImpersonate: () => void;
  upsertMaterial: (m: Material) => void;
  deleteMaterial: (id: string) => void;
  upsertAssignment: (a: Assignment) => void;
  deleteAssignment: (id: string) => void;
  addSubmission: (s: Submission) => void;
  updateSubmission: (id: string, patch: Partial<Submission>) => void;
  /** Hapus kiriman (guru/admin) — memberi siswa kesempatan mengerjakan ulang. */
  deleteSubmission: (id: string) => void;
  addAnnouncement: (a: Announcement) => void;
  deleteAnnouncement: (id: string) => void;
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "dibaca">) => void;
  markAllRead: (userId: string) => void;
  /** Bersihkan SELURUH history notifikasi (semua pengguna, dari awal sampai sekarang). */
  bersihkanNotifikasi: () => void;
  addCheatLog: (l: Omit<CheatLog, "id" | "timestamp">) => void;
  upsertUser: (u: Account) => void;
  deleteUser: (id: string) => void;
  upsertEvent: (e: AcademicEvent) => void;
  deleteEvent: (id: string) => void;
  upsertLkpdTopic: (t: LkpdTopic) => void;
  deleteLkpdTopic: (id: string) => void;
  tandaiMissionLkpd: (subtopicId: string, missionId: string) => void;
  simpanJawabanLkpd: (subtopicId: string, blockId: string, teks: string) => void;
  /** Simpan foto jawaban LKPD per kunci (missionId). Ditolak bila LKPD sudah dikumpulkan. */
  simpanLampiranLkpd: (subtopicId: string, kunci: string, files: MaterialAttachment[]) => void;
  /**
   * Hasil pemeriksaan guru: simpan feedback, nilai (manual), dan status periksa.
   * `nilai: null` mengembalikan penilaian ke hitungan sistem.
   */
  periksaLkpd: (
    siswaId: string,
    subtopicId: string,
    patch: { feedback?: string; feedbackBlok?: Record<string, string>; nilai?: number | null; verifikasi?: boolean },
  ) => void;
  /** Guru/admin menetapkan status verifikasi LKPD (nilai dihitung dari benar/salah jawaban). */
  verifikasiLkpd: (siswaId: string, subtopicId: string, verifikasi: boolean) => void;
  /** Verifikasi massal (daftar siswa × sub-bab) — satu tulisan progres + satu notifikasi gabungan. */
  verifikasiLkpdBatch: (daftar: { siswaId: string; subtopicId: string }[], verifikasi: boolean) => void;
  /** Galat sinkronisasi terakhir (mis. HTTP 500) — ditampilkan guru/admin agar kegagalan tidak diam-diam. */
  syncError: string | null;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);
const KEY = "mathlearn-store-v1";
const ACCOUNTS_KEY = `${KEY}:users`;
const MATERIALS_KEY = `${KEY}:materials-v2`;
const ASSIGNMENTS_KEY = `${KEY}:assignments-v2`;
const ANNOUNCEMENTS_KEY = `${KEY}:announcements-v2`;
const EVENTS_KEY = `${KEY}:events-v2`;
const SUBMISSIONS_KEY = `${KEY}:submissions-v2`;
const NOTIFICATIONS_KEY = `${KEY}:notifications-v2`; 
const CHEAT_KEY = `${KEY}:cheat-v2`; 
const LKPD_KEY = `${KEY}:lkpd-v1`;
const LKPD_PROGRESS_KEY = `${KEY}:lkpd-progress-v1`;

function load<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Jendela waktu "penulisan sedang berjalan" per resource — data dari GET tidak
 * boleh menimpa state lokal selama jendela ini, agar edit guru/admin tidak
 * tergeser oleh respons server yang berangkat sebelum POST selesai.
 */
const pendingUntil: Record<string, number> = {};

/** true bila resource ini baru saja ditulis → GET harus mengabaikan datanya. */
function sedangDitulis(resource: string): boolean {
  return Date.now() < (pendingUntil[resource] || 0);
}

/**
 * Antrean tulis ulang: POST yang gagal karena jaringan tidak boleh hilang diam-diam
 * (penyebab nilai siswa tidak sampai ke guru/admin). Resource dicoba lagi pada
 * siklus sinkron berikutnya. Gagal permanen (400/403) tidak diulang.
 * `hapus` = id yang sengaja dihapus guru/admin (tombstone) supaya tidak hidup lagi.
 */
type Kiriman = { data: unknown[]; role?: string; hapus?: string[] };
const antreanTulis: Record<string, Kiriman> = {};
/** true bila POST untuk resource ini sedang berjalan — mencegah tulisan menumpuk & datang terbalik. */
const sedangKirim: Record<string, boolean> = {};
/** Jumlah kegagalan beruntun per resource → jeda kirim (backoff) agar server tidak dibanjiri. */
const gagalBeruntun: Record<string, number> = {};

/** Lapor galat sinkronisasi terakhir ke provider (agar gagal POST tidak diam-diam). */
let laporSync: ((pesan: string | null) => void) | null = null;

const tidur = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Kirim perubahan ke server. Payload SELALU yang terbaru (tulis lama tidak pernah
 * menimpa tulisan baru) dan hanya ada satu POST per resource pada satu waktu —
 * penting saat >50 pengguna menulis bersamaan.
 */
async function persistShared(resource: string, data: unknown[], role?: string, hapus?: string[]) {
  const payload: Kiriman = { data, role, hapus };
  antreanTulis[resource] = payload;
  if (sedangKirim[resource]) return;
  sedangKirim[resource] = true;
  try {
    while (antreanTulis[resource]) {
      const kiriman = antreanTulis[resource]!;
      delete antreanTulis[resource];
      pendingUntil[resource] = Date.now() + 5000;
      // Backoff ringan: makin sering gagal, makin lama jeda → tidak membanjiri server.
      const mundur = gagalBeruntun[resource] || 0;
      if (mundur) await tidur(Math.min(8000, 500 * 2 ** Math.min(mundur, 4)));
      let res: Response | null = null;
      let sukses = false;
      for (let i = 0; i < 2 && !sukses; i++) {
        res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resource, data: kiriman.data, role: kiriman.role, hapus: kiriman.hapus }),
          keepalive: true,
        }).catch(() => null);
        sukses = Boolean(res?.ok);
        if (!sukses && res && res.status >= 400 && res.status < 500 && res.status !== 429) break; // ditolak permanen
        if (!sukses) await tidur(800);
      }
      if (sukses) {
        gagalBeruntun[resource] = 0;
        // PERPANJANG: GET yang sudah terlanjur berangkat sebelum POST selesai
        // tiba 1–2 detik kemudian dengan data lama — jangan sampai menimpa edit.
        pendingUntil[resource] = Date.now() + 3000;
        laporSync?.(null);
      } else {
        gagalBeruntun[resource] = (gagalBeruntun[resource] || 0) + 1;
        antreanTulis[resource] = kiriman; // dicoba ulang pada siklus sinkron berikutnya
        laporSync?.(`${resource}: ${res ? `HTTP ${res.status}` : "jaringan gagal"}`);
        break;
      }
    }
  } catch {
    laporSync?.(`${resource}: gagal terhubung ke server`);
  } finally {
    sedangKirim[resource] = false;
  }
}

/** Coba ulang seluruh resource yang gagal tadi — dipanggil tiap siklus sinkron. */
function tulisGagal() {
  for (const [resource, w] of Object.entries(antreanTulis)) void persistShared(resource, w.data, w.role, w.hapus);
}

/** Perbandingan data ringan: setState hanya saat isi benar-benar berubah (hemat render 50+ klien). */
function isiSama(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Gabung progres LKPD dari server & lokal: kunci `siswaId+submateriId`, entri
 * `updatedAt` terbaru menang — tulisan perangkat lain tidak saling menghapus.
 */
function gabungProgress(server: LkpdProgress[], lokal: LkpdProgress[]): LkpdProgress[] {
  const out = new Map<string, LkpdProgress>();
  for (const p of server) out.set(`${p.siswaId}:${p.subtopicId}`, p);
  for (const p of lokal) {
    const k = `${p.siswaId}:${p.subtopicId}`;
    const ada = out.get(k);
    if (!ada || (p.updatedAt || "") > (ada.updatedAt || "")) out.set(k, p);
  }
  return Array.from(out.values());
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [impersonating, setImpersonating] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>(AUTH_USERS);
  const [presence, setPresence] = useState<Presence[]>([]);
  const [materials, setMaterials] = useState<Material[]>(SEED_MATERIALS);
  const [assignments, setAssignments] = useState<Assignment[]>(SEED_ASSIGNMENTS);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>(SEED_ANNOUNCEMENTS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cheatLogs, setCheatLogs] = useState<CheatLog[]>([]);
  const [events, setEvents] = useState<AcademicEvent[]>(SEED_EVENTS);
  const [lkpdTopics, setLkpdTopics] = useState<LkpdTopic[]>(SEED_LKPD_TOPICS);
  const [lkpdProgress, setLkpdProgress] = useState<LkpdProgress[]>([]);
  const [ready, setReady] = useState(false);
  /** Galat sinkronisasi terakhir (HTTP 500 / jaringan) — ditampilkan ke guru/admin. */
  const [syncError, setSyncError] = useState<string | null>(null);

  // Pasang pelapor galat sinkronisasi (module-level) selama provider hidup.
  useEffect(() => {
    laporSync = (pesan) => setSyncError(pesan);
    return () => {
      laporSync = null;
    };
  }, []);

  /**
   * Snapshot data lokal terkini (progres/katalog LKPD + peran) untuk efek sinkron —
   * sengaja pakai ref agar interval 5-detik tidak dibuat ulang tiap perubahan state.
   */
  const lokalRef = useRef<{ progress: LkpdProgress[]; topik: LkpdTopic[]; role?: string }>({ progress: [], topik: [], role: undefined });
  useEffect(() => {
    lokalRef.current = { progress: lkpdProgress, topik: lkpdTopics, role: (impersonating || user)?.role };
  });

  useEffect(() => {
    const storedAccounts = load<Account[]>(ACCOUNTS_KEY, AUTH_USERS);
    const accs = storedAccounts.length ? storedAccounts : AUTH_USERS;
    setAccounts(accs);

    const storedUser = load<User | null>(`${KEY}:user`, null);
    const validUser = storedUser && accs.some((account) => account.id === storedUser.id) ? storedUser : null;
    setUser(validUser);

    setMaterials(load<Material[]>(MATERIALS_KEY, SEED_MATERIALS));
    setAssignments(load<Assignment[]>(ASSIGNMENTS_KEY, SEED_ASSIGNMENTS));
    setSubmissions(load<Submission[]>(SUBMISSIONS_KEY, []));
    setAnnouncements(load<Announcement[]>(ANNOUNCEMENTS_KEY, SEED_ANNOUNCEMENTS));
    setNotifications(load<Notification[]>(NOTIFICATIONS_KEY, []));
    setCheatLogs(load<CheatLog[]>(CHEAT_KEY, []));
    setEvents(load<AcademicEvent[]>(EVENTS_KEY, SEED_EVENTS));
    setLkpdTopics(load<LkpdTopic[]>(LKPD_KEY, SEED_LKPD_TOPICS));
    setLkpdProgress(load<LkpdProgress[]>(LKPD_PROGRESS_KEY, []));
    const storedImpersonating = load<User | null>(`${KEY}:imp`, null);
    setImpersonating(storedImpersonating && accs.some((account) => account.id === storedImpersonating.id) ? storedImpersonating : null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    let siklus = 0;
    async function syncShared() {
      // Tab di latar belakang tidak perlu membanjiri server (uji serentak >50 siswa):
      // begitu tab aktif kembali, sinkron langsung dijalankan satu kali.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      siklus += 1;
      tulisGagal(); // resource yang POST-nya gagal tadi dicoba ulang
      try {
        const response = await fetch("/api/sync", { cache: "no-store" });
        if (response.ok && active) {
          const result = await response.json();
          if (result.configured && result.data) {
            const data = result.data as Record<string, unknown>;
            // setState hanya bila isi berubah → tidak ada render ulang tiap 5 detik.
            if (Array.isArray(data.materials) && !sedangDitulis("materials")) setMaterials((p) => (isiSama(p, data.materials) ? p : (data.materials as Material[])));
            if (Array.isArray(data.assignments) && !sedangDitulis("assignments")) setAssignments((p) => (isiSama(p, data.assignments) ? p : (data.assignments as Assignment[])));
            if (Array.isArray(data.submissions) && !sedangDitulis("submissions")) setSubmissions((p) => (isiSama(p, data.submissions) ? p : (data.submissions as Submission[])));
            if (Array.isArray(data.announcements) && !sedangDitulis("announcements")) setAnnouncements((p) => (isiSama(p, data.announcements) ? p : (data.announcements as Announcement[])));
            if (Array.isArray(data.notifications) && !sedangDitulis("notifications")) setNotifications((p) => (isiSama(p, data.notifications) ? p : (data.notifications as Notification[])));
            if (Array.isArray(data.cheatLogs) && !sedangDitulis("cheatLogs")) setCheatLogs((p) => (isiSama(p, data.cheatLogs) ? p : (data.cheatLogs as CheatLog[])));
            if (Array.isArray(data.events) && !sedangDitulis("events")) setEvents((p) => (isiSama(p, data.events) ? p : (data.events as AcademicEvent[])));
            if (Array.isArray(data.users) && !sedangDitulis("users")) setAccounts((p) => (isiSama(p, data.users) ? p : (data.users as Account[])));
            // Katalog LKPD: server menang — tapi bila barisnya belum pernah ada,
            // guru/admin mengunggah miliknya agar edit tidak terkunci di localStorage.
            if (Array.isArray(data.lkpdTopics) && !sedangDitulis("lkpdTopics")) {
              setLkpdTopics((p) => (isiSama(p, data.lkpdTopics) ? p : (data.lkpdTopics as LkpdTopic[])));
            } else if (!Array.isArray(data.lkpdTopics) && !sedangDitulis("lkpdTopics") && lokalRef.current.role !== "siswa" && lokalRef.current.topik.length) {
              void persistShared("lkpdTopics", lokalRef.current.topik, lokalRef.current.role);
            }
            // Progres & nilai LKPD: gabung server ∪ lokal (updatedAt terbaru menang) lalu
            // tulis balik bila ada data lokal yang belum sampai — inilah sinkronisasi
            // nilai siswa ke halaman guru/admin.
            if (Array.isArray(data.lkpdProgress) && !sedangDitulis("lkpdProgress")) {
              const serverRows = data.lkpdProgress as LkpdProgress[];
              const gabung = gabungProgress(serverRows, lokalRef.current.progress);
              if (!isiSama(gabung, serverRows)) {
                setLkpdProgress(gabung);
                if (JSON.stringify(gabung) !== JSON.stringify(serverRows)) {
                  void persistShared("lkpdProgress", gabung, lokalRef.current.role);
                }
              }
            } else if (!Array.isArray(data.lkpdProgress) && !sedangDitulis("lkpdProgress") && lokalRef.current.progress.length) {
              void persistShared("lkpdProgress", lokalRef.current.progress, lokalRef.current.role);
            }
          }
        }
      } catch {
        // Fallback localStorage digunakan saat offline atau Supabase belum tersedia.
      }
      // Presence cukup tiap 3 siklus (15 detik) — heartbeat sudah mengirim juga.
      if (siklus % 3 === 1) {
        try {
          const p = await fetch("/api/presence", { cache: "no-store" });
          if (p.ok && active) {
            const pj = await p.json();
            if (pj.configured && Array.isArray(pj.data)) setPresence((prev) => (isiSama(prev, pj.data) ? prev : (pj.data as Presence[])));
          }
        } catch {
          // Presence hanya tersedia bila Supabase dikonfigurasi.
        }
      }
    }
    void syncShared();
    const timer = window.setInterval(syncShared, 5000);
    // Tab kembali aktif → sinkron langsung (tanpa menunggu 5 detik) agar jendela
    // evaluasi/kunci yang baru dibuka guru segera terbaca siswa.
    const onVis = () => { if (document.visibilityState === "visible") void syncShared(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ready]);

  /** Tulis localStorage per kunci: hanya saat isinya berubah & gagal per kunci tidak mematikan sisanya. */
  const localTerakhir = useRef<Record<string, string>>({});
  const simpanLocal = (k: string, v: unknown) => {
    try {
      const s = JSON.stringify(v);
      if (localTerakhir.current[k] === s) return;
      localTerakhir.current[k] = s;
      localStorage.setItem(k, s);
    } catch {
      // Kuota penuh → data terbaru tetap ada di memori & terkirim ke server.
    }
  };

  /**
   * Bekas "buang kiriman yatim" DIHAPUS: efek itu menyaring submissions/cheatLogs
   * memakai daftar tugas SEBELUM data server masuk (masa muat awal), lalu menuliskan
   * daftar yang terpotong kembali ke server — hasil latihan siswa hilang permanen
   * (terutama saat >50 perangkat menulis bersamaan). Kiriman kini disimpan utuh;
   * baris tanpa tugas ditampilkan dengan label "Tugas sudah dihapus" di halaman guru.
   */

  // Heartbeat kehadiran → ditampilkan sebagai "pengguna aktif" di halaman admin.
  useEffect(() => {
    if (!ready || !user) return;
    const beat = (offline = false) => {
      try {
        void fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(offline ? { userId: user.id, offline: true } : { userId: user.id, nama: user.nama, role: user.role }),
          keepalive: true,
        });
      } catch {}
    };
    beat();
    const timer = window.setInterval(() => beat(), 15000);
    const bye = () => beat(true);
    window.addEventListener("pagehide", bye);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", bye);
      bye();
    };
  }, [ready, user]);

  useEffect(() => {
    if (!ready) return;
    simpanLocal(`${KEY}:user`, user);
    simpanLocal(ACCOUNTS_KEY, accounts);
    simpanLocal(MATERIALS_KEY, materials);
    simpanLocal(ASSIGNMENTS_KEY, assignments);
    simpanLocal(SUBMISSIONS_KEY, submissions);
    simpanLocal(ANNOUNCEMENTS_KEY, announcements);
    simpanLocal(NOTIFICATIONS_KEY, notifications);
    simpanLocal(CHEAT_KEY, cheatLogs);
    simpanLocal(EVENTS_KEY, events);
    simpanLocal(LKPD_KEY, lkpdTopics);
    simpanLocal(LKPD_PROGRESS_KEY, lkpdProgress);
    simpanLocal(`${KEY}:imp`, impersonating);
  }, [ready, user, accounts, materials, assignments, submissions, announcements, notifications, cheatLogs, events, lkpdTopics, lkpdProgress, impersonating]);

  const value = useMemo<Store>(() => {
    const effective = impersonating || user;
    const users: User[] = accounts.map(({ password: _p, ...u }) => u);
    const syncUsers = (next: Account[], hapus?: string[]) => {
      void persistShared("users", next, effective?.role, hapus);
      return next;
    };
    return {
      ready,
      user: impersonating || user,
      impersonating,
      users,
      presence,
      materials,
      assignments,
      submissions,
      announcements,
      notifications,
      cheatLogs,
      events,
      lkpdTopics,
      lkpdProgress,
      syncError,
      login: (username, password) => {
        const found = accounts.find((u) => u.email.toLowerCase() === username.toLowerCase().trim());
        if (found && found.password === password) {
          const { password: _p, ...u } = found;
          setUser(u);
          setImpersonating(null);
          return null;
        }
        return "Username atau kata sandi salah.";
      },
      register: (nama, email, password, kelas) => {
        if (accounts.some((u) => u.email.toLowerCase() === email.toLowerCase())) return "Email sudah terdaftar.";
        const acc: Account = { id: uid("u"), nama, email, password, role: "siswa", kelas, revisiAt: nowIso() };
        setAccounts((p) => syncUsers([...p, acc]));
        const { password: _p, ...u } = acc;
        setUser(u);
        return null;
      },
      logout: () => {
        setUser(null);
        setImpersonating(null);
      },
      impersonate: (id) => {
        const t = users.find((u) => u.id === id);
        if (t) setImpersonating(t);
      },
      stopImpersonate: () => setImpersonating(null),
      upsertMaterial: (m) => setMaterials((p) => {
        const baris = { ...m, revisiAt: nowIso() };
        const next = p.some((x) => x.id === baris.id) ? p.map((x) => (x.id === baris.id ? baris : x)) : [baris, ...p];
        void persistShared("materials", next, effective?.role);
        return next;
      }),
      deleteMaterial: (id) => setMaterials((p) => {
        const next = p.filter((x) => x.id !== id);
        void persistShared("materials", next, effective?.role, [id]);
        return next;
      }),
      upsertAssignment: (a) => setAssignments((p) => {
        // revisiAt → server menggabungkan per id: edit terbaru menang, sehingga
        // pembukaan kunci evaluasi tidak lagi tertimpa tulisan basi klien lain.
        const baris = { ...a, revisiAt: nowIso() };
        const next = p.some((x) => x.id === baris.id) ? p.map((x) => (x.id === baris.id ? baris : x)) : [baris, ...p];
        void persistShared("assignments", next, effective?.role);
        return next;
      }),
      deleteAssignment: (id) => {
        // Hasil siswa dan laporan kecurangan terikat pada tugasnya:
        // menghapus latihan/LKPD/evaluasi ikut menghapus kiriman & laporannya.
        // Id yang dihapus dikirim sebagai `hapus` (tombstone) supaya tidak "hidup lagi"
        // dari klien lain yang masih menyimpan array lama.
        setAssignments((p) => {
          const next = p.filter((x) => x.id !== id);
          void persistShared("assignments", next, effective?.role, [id]);
          return next;
        });
        setSubmissions((p) => {
          const buang = p.filter((s) => s.assignmentId === id).map((s) => s.id);
          if (!buang.length) return p;
          const next = p.filter((s) => s.assignmentId !== id);
          void persistShared("submissions", next, effective?.role, buang);
          return next;
        });
        setCheatLogs((p) => {
          const buang = p.filter((c) => c.evaluationId === id).map((c) => c.id);
          if (!buang.length) return p;
          const next = p.filter((c) => c.evaluationId !== id);
          void persistShared("cheatLogs", next, effective?.role, buang);
          return next;
        });
      },
      addSubmission: (s) => setSubmissions((p) => {
        const baris = { ...s, revisiAt: nowIso() };
        const next = [baris, ...p.filter((x) => x.id !== baris.id)];
        void persistShared("submissions", next, effective?.role);
        return next;
      }),
      updateSubmission: (id, patch) => setSubmissions((p) => {
        const next = p.map((x) => (x.id === id ? { ...x, ...patch, revisiAt: nowIso() } : x));
        void persistShared("submissions", next, effective?.role);
        return next;
      }),
      deleteSubmission: (id) => setSubmissions((p) => {
        // Dipakai guru/admin untuk memberi kesempatan ulang (mis. evaluasi yang
        // terlanjur terkumpul saat ujian belum dibuka).
        if (!p.some((x) => x.id === id)) return p;
        const next = p.filter((x) => x.id !== id);
        void persistShared("submissions", next, effective?.role, [id]);
        return next;
      }),
      addAnnouncement: (a) => setAnnouncements((p) => {
        const next = [a, ...p];
        void persistShared("announcements", next, effective?.role);
        return next;
      }),
      deleteAnnouncement: (id) => setAnnouncements((p) => {
        const next = p.filter((x) => x.id !== id);
        void persistShared("announcements", next, effective?.role, [id]);
        return next;
      }),
      addNotification: (n) => setNotifications((p) => {
        const next = [{ ...n, id: uid("n"), createdAt: nowIso(), dibaca: false }, ...p].slice(0, 200);
        void persistShared("notifications", next, effective?.role);
        return next;
      }),
      markAllRead: (userId) => setNotifications((p) => {
        // Tandai semua notifikasi yang bisa dilihat user ini — termasuk siaran
        // "all", "all-siswa", dan "all-guru" yang sebelumnya tidak ikut tercentang.
        const next = p.map((n) =>
          n.userId === userId ||
          n.userId === "all" ||
          (effective?.role === "siswa" && n.userId === "all-siswa") ||
          (effective?.role === "guru" && n.userId === "all-guru")
            ? { ...n, dibaca: true }
            : n,
        );
        void persistShared("notifications", next, effective?.role);
        return next;
      }),
      bersihkanNotifikasi: () => setNotifications((p) => {
        // Kosongkan seluruh history (semua pengguna). Id lama ikut dikirim sebagai
        // `hapus` (tombstone) sehingga kiriman basi klien lain tidak menghidupkannya lagi.
        const hapus = p.map((n) => n.id);
        void persistShared("notifications", [], effective?.role, hapus);
        return [];
      }),
      addCheatLog: (l) => setCheatLogs((p) => {
        // Batasi panjang riwayat: 800 entri terbaru cukup untuk laporan kecurangan
        // dan menjaga payload sinkron tetap ringan saat dipakai banyak siswa.
        const next = [{ ...l, id: uid("c"), timestamp: nowIso() }, ...p].slice(0, 800);
        void persistShared("cheatLogs", next, effective?.role);
        return next;
      }),
      upsertUser: (u) => setAccounts((p) => {
        const prev = p.find((x) => x.id === u.id);
        const merged: Account = { ...prev, ...u, password: u.password || prev?.password || "", revisiAt: nowIso() };
        return syncUsers(p.some((x) => x.id === u.id) ? p.map((x) => (x.id === u.id ? merged : x)) : [...p, merged]);
      }),
      deleteUser: (id) => setAccounts((p) => syncUsers(p.filter((x) => x.id !== id), [id])),
      upsertEvent: (e) => setEvents((p) => {
        const baris = { ...e, revisiAt: nowIso() };
        const next = p.some((x) => x.id === baris.id) ? p.map((x) => (x.id === baris.id ? baris : x)) : [...p, baris];
        void persistShared("events", next, effective?.role);
        return next;
      }),
      deleteEvent: (id) => setEvents((p) => {
        const next = p.filter((x) => x.id !== id);
        void persistShared("events", next, effective?.role, [id]);
        return next;
      }),
      upsertLkpdTopic: (t) => setLkpdTopics((p) => {
        const baris = { ...t, revisiAt: nowIso() };
        const next = p.some((x) => x.id === baris.id) ? p.map((x) => (x.id === baris.id ? baris : x)) : [...p, baris];
        void persistShared("lkpdTopics", next, effective?.role);
        return next;
      }),
      deleteLkpdTopic: (id) => {
        // Topik dihapus → progres siswa pada submaterinya ikut dibuang agar tidak yatim.
        const topic = lkpdTopics.find((x) => x.id === id);
        const subIds = new Set((topic?.subtopics || []).map((s) => s.id));
        setLkpdTopics((p) => {
          const next = p.filter((x) => x.id !== id);
          void persistShared("lkpdTopics", next, effective?.role, [id]);
          return next;
        });
        setLkpdProgress((p) => {
          const buang = p.filter((x) => subIds.has(x.subtopicId)).map((x) => `${x.siswaId}:${x.subtopicId}`);
          if (!buang.length) return p;
          const next = p.filter((x) => !subIds.has(x.subtopicId));
          void persistShared("lkpdProgress", next, effective?.role, buang);
          return next;
        });
      },
      tandaiMissionLkpd: (subtopicId, missionId) => {
        const sid = effective?.id;
        if (!sid) return;
        setLkpdProgress((p) => {
          const idx = p.findIndex((x) => x.siswaId === sid && x.subtopicId === subtopicId);
          const base: LkpdProgress = idx >= 0 ? p[idx] : { siswaId: sid, subtopicId, missions: [], jawaban: {}, updatedAt: nowIso() };
          if (base.missions.includes(missionId)) return p;
          if (base.dikumpulkan) return p; // sekali kerja: tak ada misi baru setelah finalisasi
          const missions = [...base.missions, missionId];
          const updated: LkpdProgress = { ...base, missions, updatedAt: nowIso() };
          const sub = lkpdTopics.flatMap((t) => t.subtopics).find((s) => s.id === subtopicId);
          // Nilai SEJAK mission pertama, tetapi dihitung dari BENAR/SALAH jawaban
          // terukur — bukan persentase mission ditandai (bug: jawaban salah = nilai 100).
          const hasil = nilaiKerja(sub, updated);
          if (hasil.nilai != null) {
            if (hasil.nilai !== (base.nilai ?? -1)) updated.verifikasi = false;
            updated.nilai = hasil.nilai;
          } else {
            delete updated.nilai;
          }
          // Ada jawaban terbuka (essay/refleksi) → nilai akhir menunggu guru.
          updated.menungguPemeriksaan = hasil.nilai == null || hasil.terbuka > 0;
          const total = sub?.missions.length || 0;
          if (total > 0 && missions.length >= total) {
            // Mission terakhir → finalisasi: LKPD dikumpulkan, terkunci, tak bisa dikerjakan ulang.
            updated.dikumpulkan = true;
          }
          const next = idx >= 0 ? p.map((x, i) => (i === idx ? updated : x)) : [updated, ...p];
          void persistShared("lkpdProgress", next, effective?.role);
          return next;
        });
      },
      simpanJawabanLkpd: (subtopicId, blockId, teks) => {
        const sid = effective?.id;
        if (!sid) return;
        setLkpdProgress((p) => {
          const idx = p.findIndex((x) => x.siswaId === sid && x.subtopicId === subtopicId);
          const base: LkpdProgress = idx >= 0 ? p[idx] : { siswaId: sid, subtopicId, missions: [], jawaban: {}, updatedAt: nowIso() };
          // Setelah dikumpulkan jawaban dikunci — data pengerjaan pertama tetap tersimpan.
          if (base.dikumpulkan) return p;
          if (base.jawaban[blockId] === teks) return p;
          const updated: LkpdProgress = { ...base, jawaban: { ...base.jawaban, [blockId]: teks }, updatedAt: nowIso() };
          const next = idx >= 0 ? p.map((x, i) => (i === idx ? updated : x)) : [updated, ...p];
          void persistShared("lkpdProgress", next, effective?.role);
          return next;
        });
      },
      simpanLampiranLkpd: (subtopicId, kunci, files) => {
        const sid = effective?.id;
        if (!sid) return;
        setLkpdProgress((p) => {
          const idx = p.findIndex((x) => x.siswaId === sid && x.subtopicId === subtopicId);
          const base: LkpdProgress = idx >= 0 ? p[idx] : { siswaId: sid, subtopicId, missions: [], jawaban: {}, updatedAt: nowIso() };
          if (base.dikumpulkan) return p;
          const lampiran = { ...(base.lampiran || {}) };
          if (files.length) lampiran[kunci] = files;
          else delete lampiran[kunci];
          const updated: LkpdProgress = { ...base, lampiran, updatedAt: nowIso() };
          const next = idx >= 0 ? p.map((x, i) => (i === idx ? updated : x)) : [updated, ...p];
          void persistShared("lkpdProgress", next, effective?.role);
          return next;
        });
      },
      periksaLkpd: (siswaId, subtopicId, patch) => {
        const role = effective?.role;
        if (role !== "guru" && role !== "admin") return;
        setLkpdProgress((p) => {
          const next = p.map((x) => {
            if (x.siswaId !== siswaId || x.subtopicId !== subtopicId) return x;
            const updated: LkpdProgress = { ...x, updatedAt: nowIso() };
            if (patch.feedback !== undefined) updated.feedbackGuru = patch.feedback;
            if (patch.feedbackBlok !== undefined) updated.feedbackBlok = patch.feedbackBlok;
            if (patch.nilai !== undefined) {
              if (patch.nilai === null) delete updated.nilaiGuru;
              else updated.nilaiGuru = patch.nilai;
            }
            if (patch.verifikasi !== undefined) {
              updated.verifikasi = patch.verifikasi;
              updated.diperiksaPada = patch.verifikasi ? nowIso() : "";
            }
            return updated;
          });
          void persistShared("lkpdProgress", next, role);
          return next;
        });
        // Notifikasi ke siswa: LKPD sudah diperiksa (feedback + nilai tersimpan).
        if (patch.verifikasi === true) {
          const sub = lkpdTopics.flatMap((t) => t.subtopics).find((s) => s.id === subtopicId);
          const lama = lkpdProgress.find((x) => x.siswaId === siswaId && x.subtopicId === subtopicId);
          const nilai = patch.nilai !== undefined ? patch.nilai : (lama?.nilaiGuru ?? lama?.nilai ?? null);
          setNotifications((prev) => {
            const next = [
              {
                id: uid("n"),
                userId: siswaId,
                kategori: "nilai",
                judul: "LKPD sudah diperiksa guru",
                isi: `${sub?.judul || "LKPD"}: status "Sudah diperiksa" · nilai ${nilai ?? "—"}${patch.feedback ? ` · feedback: ${patch.feedback.slice(0, 90)}` : ""}. Lihat pada menu Nilai.`,
                dibaca: false,
                createdAt: nowIso(),
              },
              ...prev,
            ].slice(0, 200);
            void persistShared("notifications", next, effective?.role);
            return next;
          });
        }
      },
      verifikasiLkpd: (siswaId, subtopicId, verifikasi) => {
        const role = effective?.role;
        if (role !== "guru" && role !== "admin") return;
        setLkpdProgress((p) => {
          const next = p.map((x) => {
            if (x.siswaId !== siswaId || x.subtopicId !== subtopicId) return x;
            if (x.nilai == null && x.nilaiGuru == null) return x;
            return { ...x, verifikasi, diperiksaPada: verifikasi ? nowIso() : "", updatedAt: nowIso() };
          });
          void persistShared("lkpdProgress", next, role);
          return next;
        });
        // Notifikasi tersbar ke siswa: nilai LKPD sudah diverifikasi guru.
        if (verifikasi) {
          const sub = lkpdTopics.flatMap((t) => t.subtopics).find((s) => s.id === subtopicId);
          const nilai = lkpdProgress.find((x) => x.siswaId === siswaId && x.subtopicId === subtopicId)?.nilai;
          setNotifications((p) => {
            const next = [
              {
                id: uid("n"),
                userId: siswaId,
                kategori: "nilai",
                judul: "LKPD sudah diperiksa guru",
                isi: `${sub?.judul || "LKPD"}: status "Sudah diperiksa" · nilai ${nilai ?? "—"}. Lihat pada menu Nilai.`,
                dibaca: false,
                createdAt: nowIso(),
              },
              ...p,
            ].slice(0, 200);
            void persistShared("notifications", next, effective?.role);
            return next;
          });
        }
      },
      verifikasiLkpdBatch: (daftar, verifikasi) => {
        const role = effective?.role;
        if ((role !== "guru" && role !== "admin") || daftar.length === 0) return;
        const kunci = new Set(daftar.map((d) => `${d.siswaId}:${d.subtopicId}`));
        // Satu tulisan progres untuk seluruh daftar (bukan N tulisan).
        setLkpdProgress((p) => {
          const next = p.map((x) =>
            kunci.has(`${x.siswaId}:${x.subtopicId}`) && (x.nilai != null || x.nilaiGuru != null)
              ? { ...x, verifikasi, diperiksaPada: verifikasi ? nowIso() : "", updatedAt: nowIso() }
              : x,
          );
          void persistShared("lkpdProgress", next, role);
          return next;
        });
        if (!verifikasi) return;
        // Notifikasi ke tiap siswa yang terverifikasi — digabung jadi satu tulisan.
        const judul = new Map(lkpdTopics.flatMap((t) => t.subtopics).map((s) => [s.id, s.judul]));
        const nilai = new Map(lkpdProgress.map((x) => [`${x.siswaId}:${x.subtopicId}`, x.nilai]));
        const berkas = daftar.filter((d) => nilai.has(`${d.siswaId}:${d.subtopicId}`));
        if (!berkas.length) return;
        setNotifications((p) => {
          const baru = berkas.map((d) => ({
            id: uid("n"),
            userId: d.siswaId,
            kategori: "nilai",
            judul: "LKPD sudah diperiksa guru",
            isi: `${judul.get(d.subtopicId) || "LKPD"}: status "Sudah diperiksa" · nilai ${nilai.get(`${d.siswaId}:${d.subtopicId}`) ?? "—"}. Lihat pada menu Nilai.`,
            dibaca: false,
            createdAt: nowIso(),
          }));
          const next = [...baru, ...p].slice(0, 400);
          void persistShared("notifications", next, role);
          return next;
        });
      },
      resetDemo: () => {
        setMaterials(SEED_MATERIALS);
        setAssignments(SEED_ASSIGNMENTS);
        setAnnouncements(SEED_ANNOUNCEMENTS);
        setEvents(SEED_EVENTS);
        setSubmissions([]);
        setCheatLogs([]);
        setLkpdTopics(SEED_LKPD_TOPICS);
        setLkpdProgress([]);
      },
    };
  }, [ready, user, impersonating, accounts, presence, materials, assignments, submissions, announcements, notifications, cheatLogs, events, lkpdTopics, lkpdProgress, syncError]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore harus di dalam StoreProvider");
  return v;
}

export function visibleNotifications(all: Notification[], u: User | null): Notification[] {
  if (!u) return [];
  return all.filter(
    (n) =>
      n.userId === u.id ||
      n.userId === "all" ||
      (u.role === "siswa" && n.userId === "all-siswa") ||
      (u.role === "guru" && n.userId === "all-guru")
  );
}
