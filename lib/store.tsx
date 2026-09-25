"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type {
  AcademicEvent,
  Announcement,
  Assignment,
  CheatLog,
  Material,
  Notification,
  Presence,
  Submission,
  User,
} from "./types";
import { AUTH_USERS, SEED_ANNOUNCEMENTS, SEED_ASSIGNMENTS, SEED_EVENTS, SEED_MATERIALS } from "./seed";
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
  addCheatLog: (l: Omit<CheatLog, "id" | "timestamp">) => void;
  upsertUser: (u: Account) => void;
  deleteUser: (id: string) => void;
  upsertEvent: (e: AcademicEvent) => void;
  deleteEvent: (id: string) => void;
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

function load<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function persistShared(resource: string, data: unknown[], role?: string) {
  try {
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource, data, role }),
    });
  } catch {
    // Mode lokal tetap memakai localStorage ketika server tidak tersedia.
  }
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
  const [ready, setReady] = useState(false);

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
    const storedImpersonating = load<User | null>(`${KEY}:imp`, null);
    setImpersonating(storedImpersonating && accs.some((account) => account.id === storedImpersonating.id) ? storedImpersonating : null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    async function syncShared() {
      try {
        const response = await fetch("/api/sync", { cache: "no-store" });
        if (response.ok && active) {
          const result = await response.json();
          if (result.configured && result.data) {
            const data = result.data as Record<string, unknown>;
            if (Array.isArray(data.materials)) setMaterials(data.materials as Material[]);
            if (Array.isArray(data.assignments)) setAssignments(data.assignments as Assignment[]);
            if (Array.isArray(data.submissions)) setSubmissions(data.submissions as Submission[]);
            if (Array.isArray(data.announcements)) setAnnouncements(data.announcements as Announcement[]);
            if (Array.isArray(data.notifications)) setNotifications(data.notifications as Notification[]);
            if (Array.isArray(data.cheatLogs)) setCheatLogs(data.cheatLogs as CheatLog[]);
            if (Array.isArray(data.events)) setEvents(data.events as AcademicEvent[]);
            if (Array.isArray(data.users)) setAccounts(data.users as Account[]);
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
      localStorage.setItem(`${KEY}:imp`, JSON.stringify(impersonating));
    } catch {}
  }, [ready, user, accounts, materials, assignments, submissions, announcements, notifications, cheatLogs, events, impersonating]);

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
      deleteAssignment: (id) => setAssignments((p) => {
        const next = p.filter((x) => x.id !== id);
        void persistShared("assignments", next, effective?.role);
        return next;
      }),
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
        const next = p.map((n) => (n.userId === userId || n.userId === "all" ? { ...n, dibaca: true } : n));
        void persistShared("notifications", next, effective?.role);
        return next;
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
      resetDemo: () => {
        setMaterials(SEED_MATERIALS);
        setAssignments(SEED_ASSIGNMENTS);
        setAnnouncements(SEED_ANNOUNCEMENTS);
        setEvents(SEED_EVENTS);
        setSubmissions([]);
        setCheatLogs([]);
      },
    };
  }, [ready, user, impersonating, accounts, presence, materials, assignments, submissions, announcements, notifications, cheatLogs, events]);

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
