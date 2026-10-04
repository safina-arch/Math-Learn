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
  Notification,
  Presence,
  Submission,
  User,
} from "./types";
import { AUTH_USERS, SEED_ANNOUNCEMENTS, SEED_ASSIGNMENTS, SEED_EVENTS, SEED_MATERIALS } from "./seed";
import { SEED_LKPD_TOPICS } from "./lkpd-seed";
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
  /** Guru/admin menetapkan nilai LKPD: set/clear verifikasi (nilai dihitung dari penyelesaian mission). */
  verifikasiLkpd: (siswaId: string, subtopicId: string, verifikasi: boolean) => void;
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
 */
const antreanTulis: Record<string, { data: unknown[]; role?: string }> = {};

async function persistShared(resource: string, data: unknown[], role?: string) {
  pendingUntil[resource] = Date.now() + 5000;
  const kirim = () =>
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource, data, role }),
      keepalive: true,
    });
  try {
    let res: Response | null = null;
    for (let i = 0; i < 2; i++) {
      res = await kirim().catch(() => null);
      if (res?.ok) break;
      await new Promise((r) => setTimeout(r, 800));
    }
    if (res?.ok) {
      // PERPANJANG: GET yang sudah terlanjur berangkat sebelum POST selesai
      // tiba 1–2 detik kemudian dengan data lama — jangan sampai menimpa edit.
      pendingUntil[resource] = Date.now() + 3000;
      // Hapus dari antrean hanya bila yang baru saja sukses adalah payload yang
      // sama — tulisan lebih baru (antrean berbeda) tetap dipertahankan.
      if (antreanTulis[resource]?.data === data) delete antreanTulis[resource];
    } else if (!res || res.status >= 500) {
      antreanTulis[resource] = { data, role };
    }
  } catch {
    antreanTulis[resource] = { data, role };
  }
}

/** Coba ulang seluruh resource yang gagal tadi — dipanggil tiap siklus sinkron. */
function tulisGagal() {
  for (const [resource, w] of Object.entries(antreanTulis)) void persistShared(resource, w.data, w.role);
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
    async function syncShared() {
      tulisGagal(); // resource yang POST-nya gagal tadi dicoba ulang
      try {
        const response = await fetch("/api/sync", { cache: "no-store" });
        if (response.ok && active) {
          const result = await response.json();
          if (result.configured && result.data) {
            const data = result.data as Record<string, unknown>;
            if (Array.isArray(data.materials) && !sedangDitulis("materials")) setMaterials(data.materials as Material[]);
            if (Array.isArray(data.assignments) && !sedangDitulis("assignments")) setAssignments(data.assignments as Assignment[]);
            if (Array.isArray(data.submissions) && !sedangDitulis("submissions")) setSubmissions(data.submissions as Submission[]);
            if (Array.isArray(data.announcements) && !sedangDitulis("announcements")) setAnnouncements(data.announcements as Announcement[]);
            if (Array.isArray(data.notifications) && !sedangDitulis("notifications")) setNotifications(data.notifications as Notification[]);
            if (Array.isArray(data.cheatLogs) && !sedangDitulis("cheatLogs")) setCheatLogs(data.cheatLogs as CheatLog[]);
            if (Array.isArray(data.events) && !sedangDitulis("events")) setEvents(data.events as AcademicEvent[]);
            if (Array.isArray(data.users) && !sedangDitulis("users")) setAccounts(data.users as Account[]);
            // Katalog LKPD: server menang — tapi bila barisnya belum pernah ada,
            // guru/admin mengunggah miliknya agar edit tidak terkunci di localStorage.
            if (Array.isArray(data.lkpdTopics) && !sedangDitulis("lkpdTopics")) {
              setLkpdTopics(data.lkpdTopics as LkpdTopic[]);
            } else if (!Array.isArray(data.lkpdTopics) && !sedangDitulis("lkpdTopics") && lokalRef.current.role !== "siswa" && lokalRef.current.topik.length) {
              void persistShared("lkpdTopics", lokalRef.current.topik, lokalRef.current.role);
            }
            // Progres & nilai LKPD: gabung server ∪ lokal (updatedAt terbaru menang) lalu
            // tulis balik bila ada data lokal yang belum sampai — inilah sinkronisasi
            // nilai siswa ke halaman guru/admin.
            if (Array.isArray(data.lkpdProgress) && !sedangDitulis("lkpdProgress")) {
              const serverRows = data.lkpdProgress as LkpdProgress[];
              const gabung = gabungProgress(serverRows, lokalRef.current.progress);
              setLkpdProgress(gabung);
              if (JSON.stringify(gabung) !== JSON.stringify(serverRows)) {
                void persistShared("lkpdProgress", gabung, lokalRef.current.role);
              }
            } else if (!Array.isArray(data.lkpdProgress) && !sedangDitulis("lkpdProgress") && lokalRef.current.progress.length) {
              void persistShared("lkpdProgress", lokalRef.current.progress, lokalRef.current.role);
            }
          }
        }
      } catch {
        // Fallback localStorage digunakan saat offline atau Supabase belum tersedia.
      }
      try {
        const p = await fetch("/api/presence", { cache: "no-store" });
        if (p.ok && active) {
          const pj = await p.json();
          if (pj.configured && Array.isArray(pj.data)) setPresence(pj.data as Presence[]);
        }
      } catch {
        // Presence hanya tersedia bila Supabase dikonfigurasi.
      }
    }
    void syncShared();
    const timer = window.setInterval(syncShared, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [ready]);

  // Hasil siswa & laporan kecurangan wajib terkait dengan tugasnya. Data lama yang
  // tugasnya sudah dihapus (mis. evaluasi dihapus sebelum aturan ini) ikut dibuang
  // agar tidak muncul sebagai baris tanpa judul di halaman hasil.
  useEffect(() => {
    if (!ready || assignments.length === 0) return;
    const role = (impersonating || user)?.role;
    const ids = new Set(assignments.map((a) => a.id));
    const subNext = submissions.filter((s) => ids.has(s.assignmentId));
    if (subNext.length !== submissions.length) {
      setSubmissions(subNext);
      void persistShared("submissions", subNext, role);
    }
    const cheatNext = cheatLogs.filter((c) => ids.has(c.evaluationId));
    if (cheatNext.length !== cheatLogs.length) {
      setCheatLogs(cheatNext);
      void persistShared("cheatLogs", cheatNext, role);
    }
  }, [ready, assignments, submissions, cheatLogs, user, impersonating]);

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
    try {
      localStorage.setItem(`${KEY}:user`, JSON.stringify(user));
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
      localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
      localStorage.setItem(CHEAT_KEY, JSON.stringify(cheatLogs));
      localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
      localStorage.setItem(LKPD_KEY, JSON.stringify(lkpdTopics));
      localStorage.setItem(LKPD_PROGRESS_KEY, JSON.stringify(lkpdProgress));
      localStorage.setItem(`${KEY}:imp`, JSON.stringify(impersonating));
    } catch {}
  }, [ready, user, accounts, materials, assignments, submissions, announcements, notifications, cheatLogs, events, lkpdTopics, lkpdProgress, impersonating]);

  const value = useMemo<Store>(() => {
    const effective = impersonating || user;
    const users: User[] = accounts.map(({ password: _p, ...u }) => u);
    const syncUsers = (next: Account[]) => {
      void persistShared("users", next, effective?.role);
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
        const acc: Account = { id: uid("u"), nama, email, password, role: "siswa", kelas };
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
        const next = p.some((x) => x.id === m.id) ? p.map((x) => (x.id === m.id ? m : x)) : [m, ...p];
        void persistShared("materials", next, effective?.role);
        return next;
      }),
      deleteMaterial: (id) => setMaterials((p) => {
        const next = p.filter((x) => x.id !== id);
        void persistShared("materials", next, effective?.role);
        return next;
      }),
      upsertAssignment: (a) => setAssignments((p) => {
        const next = p.some((x) => x.id === a.id) ? p.map((x) => (x.id === a.id ? a : x)) : [a, ...p];
        void persistShared("assignments", next, effective?.role);
        return next;
      }),
      deleteAssignment: (id) => {
        // Hasil siswa dan laporan kecurangan terikat pada tugasnya:
        // menghapus latihan/LKPD/evaluasi ikut menghapus kiriman & laporannya.
        setAssignments((p) => {
          const next = p.filter((x) => x.id !== id);
          void persistShared("assignments", next, effective?.role);
          return next;
        });
        setSubmissions((p) => {
          const next = p.filter((s) => s.assignmentId !== id);
          if (next.length !== p.length) void persistShared("submissions", next, effective?.role);
          return next;
        });
        setCheatLogs((p) => {
          const next = p.filter((c) => c.evaluationId !== id);
          if (next.length !== p.length) void persistShared("cheatLogs", next, effective?.role);
          return next;
        });
      },
      addSubmission: (s) => setSubmissions((p) => {
        const next = [s, ...p.filter((x) => x.id !== s.id)];
        void persistShared("submissions", next, effective?.role);
        return next;
      }),
      updateSubmission: (id, patch) => setSubmissions((p) => {
        const next = p.map((x) => (x.id === id ? { ...x, ...patch } : x));
        void persistShared("submissions", next, effective?.role);
        return next;
      }),
      addAnnouncement: (a) => setAnnouncements((p) => {
        const next = [a, ...p];
        void persistShared("announcements", next, effective?.role);
        return next;
      }),
      deleteAnnouncement: (id) => setAnnouncements((p) => {
        const next = p.filter((x) => x.id !== id);
        void persistShared("announcements", next, effective?.role);
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
      bersihkanNotifikasi: () => setNotifications(() => {
        // Kosongkan seluruh history (semua pengguna). Array kosong ikut ditulis ke
        // server sehingga perangkat lain ikut bersih pada siklus GET berikutnya.
        void persistShared("notifications", [], effective?.role);
        return [];
      }),
      addCheatLog: (l) => setCheatLogs((p) => {
        const next = [{ ...l, id: uid("c"), timestamp: nowIso() }, ...p];
        void persistShared("cheatLogs", next, effective?.role);
        return next;
      }),
      upsertUser: (u) => setAccounts((p) => {
        const prev = p.find((x) => x.id === u.id);
        const merged: Account = { ...prev, ...u, password: u.password || prev?.password || "" };
        return syncUsers(p.some((x) => x.id === u.id) ? p.map((x) => (x.id === u.id ? merged : x)) : [...p, merged]);
      }),
      deleteUser: (id) => setAccounts((p) => syncUsers(p.filter((x) => x.id !== id))),
      upsertEvent: (e) => setEvents((p) => {
        const next = p.some((x) => x.id === e.id) ? p.map((x) => (x.id === e.id ? e : x)) : [...p, e];
        void persistShared("events", next, effective?.role);
        return next;
      }),
      deleteEvent: (id) => setEvents((p) => {
        const next = p.filter((x) => x.id !== id);
        void persistShared("events", next, effective?.role);
        return next;
      }),
      upsertLkpdTopic: (t) => setLkpdTopics((p) => {
        const next = p.some((x) => x.id === t.id) ? p.map((x) => (x.id === t.id ? t : x)) : [...p, t];
        void persistShared("lkpdTopics", next, effective?.role);
        return next;
      }),
      deleteLkpdTopic: (id) => {
        // Topik dihapus → progres siswa pada submaterinya ikut dibuang agar tidak yatim.
        const topic = lkpdTopics.find((x) => x.id === id);
        const subIds = new Set((topic?.subtopics || []).map((s) => s.id));
        setLkpdTopics((p) => {
          const next = p.filter((x) => x.id !== id);
          void persistShared("lkpdTopics", next, effective?.role);
          return next;
        });
        setLkpdProgress((p) => {
          const next = p.filter((x) => !subIds.has(x.subtopicId));
          if (next.length !== p.length) void persistShared("lkpdProgress", next, effective?.role);
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
          const missions = [...base.missions, missionId];
          const updated: LkpdProgress = { ...base, missions, updatedAt: nowIso() };
          // Selesai seluruh mission → nilai pengerjaan LKPD terisi (0–100) & menunggu verifikasi guru.
          const sub = lkpdTopics.flatMap((t) => t.subtopics).find((s) => s.id === subtopicId);
          if (sub && sub.missions.length > 0 && sub.missions.every((m) => missions.includes(m.id)) && updated.nilai == null) {
            updated.nilai = Math.round((missions.filter((id) => sub.missions.some((m) => m.id === id)).length / sub.missions.length) * 100);
            updated.verifikasi = false;
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
          if (base.jawaban[blockId] === teks) return p;
          const updated: LkpdProgress = { ...base, jawaban: { ...base.jawaban, [blockId]: teks }, updatedAt: nowIso() };
          const next = idx >= 0 ? p.map((x, i) => (i === idx ? updated : x)) : [updated, ...p];
          void persistShared("lkpdProgress", next, effective?.role);
          return next;
        });
      },
      verifikasiLkpd: (siswaId, subtopicId, verifikasi) => {
        const role = effective?.role;
        if (role !== "guru" && role !== "admin") return;
        setLkpdProgress((p) => {
          const next = p.map((x) => {
            if (x.siswaId !== siswaId || x.subtopicId !== subtopicId) return x;
            if (x.nilai == null) return x;
            return { ...x, verifikasi, updatedAt: nowIso() };
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
                judul: "Nilai LKPD telah diverifikasi",
                isi: `${sub?.judul || "LKPD"}: nilai ${nilai ?? "—"} — sudah fiks. Lihat pada menu Nilai.`,
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
  }, [ready, user, impersonating, accounts, presence, materials, assignments, submissions, announcements, notifications, cheatLogs, events, lkpdTopics, lkpdProgress]);

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
