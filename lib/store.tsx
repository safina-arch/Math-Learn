"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type {
  AcademicEvent,
  Announcement,
  Assignment,
  CheatLog,
  Material,
  Notification,
  Submission,
  User,
} from "./types";
import { AUTH_USERS, SEED_ANNOUNCEMENTS, SEED_ASSIGNMENTS, SEED_EVENTS, SEED_MATERIALS } from "./seed";
import { nowIso, uid } from "./utils";

interface Store {
  user: User | null;
  impersonating: User | null;
  users: User[];
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
  upsertUser: (u: User) => void;
  deleteUser: (id: string) => void;
  upsertEvent: (e: AcademicEvent) => void;
  deleteEvent: (id: string) => void;
  resetDemo: () => void;
}

const Ctx = createContext<Store | null>(null);
const KEY = "mathlearn-store-v1";
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

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [impersonating, setImpersonating] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(AUTH_USERS.map(({ password: _p, ...u }) => u));
  const [materials, setMaterials] = useState<Material[]>(SEED_MATERIALS);
  const [assignments, setAssignments] = useState<Assignment[]>(SEED_ASSIGNMENTS);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>(SEED_ANNOUNCEMENTS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cheatLogs, setCheatLogs] = useState<CheatLog[]>([]);
  const [events, setEvents] = useState<AcademicEvent[]>(SEED_EVENTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedUser = load<User | null>(`${KEY}:user`, null);
    const validUser = storedUser && AUTH_USERS.some((account) => account.id === storedUser.id) ? storedUser : null;
    setUser(validUser);
    setUsers(AUTH_USERS.map(({ password: _p, ...u }) => u));
    setMaterials(load<Material[]>(MATERIALS_KEY, SEED_MATERIALS));
    setAssignments(load<Assignment[]>(ASSIGNMENTS_KEY, SEED_ASSIGNMENTS));
    setSubmissions(load<Submission[]>(SUBMISSIONS_KEY, []));
    setAnnouncements(load<Announcement[]>(ANNOUNCEMENTS_KEY, SEED_ANNOUNCEMENTS));
    setNotifications(load<Notification[]>(NOTIFICATIONS_KEY, []));
    setCheatLogs(load<CheatLog[]>(CHEAT_KEY, []));
    setEvents(load<AcademicEvent[]>(EVENTS_KEY, SEED_EVENTS));
    const storedImpersonating = load<User | null>(`${KEY}:imp`, null);
    setImpersonating(storedImpersonating && AUTH_USERS.some((account) => account.id === storedImpersonating.id) ? storedImpersonating : null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(`${KEY}:user`, JSON.stringify(user));
      localStorage.setItem(`${KEY}:users`, JSON.stringify(users));
      localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials));
      localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
      localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
      localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
      localStorage.setItem(CHEAT_KEY, JSON.stringify(cheatLogs));
      localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
      localStorage.setItem(`${KEY}:imp`, JSON.stringify(impersonating));
    } catch {}
  }, [ready, user, users, materials, assignments, submissions, announcements, notifications, cheatLogs, events, impersonating]);

  const value = useMemo<Store>(() => {
    const effective = impersonating || user;
    void effective;
    return {
      user: impersonating || user,
      impersonating,
      users,
      materials,
      assignments,
      submissions,
      announcements,
      notifications,
      cheatLogs,
      events,
      login: (username, password) => {
        const found = AUTH_USERS.find((u) => u.email.toLowerCase() === username.toLowerCase().trim());
        if (found && found.password === password) {
          const u: User = { id: found.id, nama: found.nama, email: found.email, role: found.role, kelas: found.kelas };
          setUser(u);
          setImpersonating(null);
          return null;
        }
        return "Username atau kata sandi salah.";
      },
      register: (nama, email, password, kelas) => {
        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) return "Email sudah terdaftar.";
        const u: User = { id: uid("u"), nama, email, role: "siswa", kelas };
        setUsers((p) => [...p, u]);
        const pw = load<Record<string, string>>(`${KEY}:pw`, {});
        try {
          localStorage.setItem(`${KEY}:pw`, JSON.stringify({ ...pw, [email.toLowerCase()]: password }));
        } catch {}
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
      upsertMaterial: (m) => setMaterials((p) => (p.some((x) => x.id === m.id) ? p.map((x) => (x.id === m.id ? m : x)) : [m, ...p])),
      deleteMaterial: (id) => setMaterials((p) => p.filter((x) => x.id !== id)),
      upsertAssignment: (a) => setAssignments((p) => (p.some((x) => x.id === a.id) ? p.map((x) => (x.id === a.id ? a : x)) : [a, ...p])),
      deleteAssignment: (id) => setAssignments((p) => p.filter((x) => x.id !== id)),
      addSubmission: (s) => setSubmissions((p) => [s, ...p]),
      updateSubmission: (id, patch) => setSubmissions((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x))),
      addAnnouncement: (a) => setAnnouncements((p) => [a, ...p]),
      deleteAnnouncement: (id) => setAnnouncements((p) => p.filter((x) => x.id !== id)),
      addNotification: (n) => setNotifications((p) => [{ ...n, id: uid("n"), createdAt: nowIso(), dibaca: false }, ...p].slice(0, 200)),
      markAllRead: (userId) =>
        setNotifications((p) => p.map((n) => (n.userId === userId || n.userId === "all" ? { ...n, dibaca: true } : n))),
      addCheatLog: (l) => setCheatLogs((p) => [{ ...l, id: uid("c"), timestamp: nowIso() }, ...p]),
      upsertUser: (u) => setUsers((p) => (p.some((x) => x.id === u.id) ? p.map((x) => (x.id === u.id ? u : x)) : [...p, u])),
      deleteUser: (id) => setUsers((p) => p.filter((x) => x.id !== id)),
      upsertEvent: (e) => setEvents((p) => (p.some((x) => x.id === e.id) ? p.map((x) => (x.id === e.id ? e : x)) : [...p, e])),
      deleteEvent: (id) => setEvents((p) => p.filter((x) => x.id !== id)),
      resetDemo: () => {
        setMaterials(SEED_MATERIALS);
        setAssignments(SEED_ASSIGNMENTS);
        setAnnouncements(SEED_ANNOUNCEMENTS);
        setEvents(SEED_EVENTS);
        setSubmissions([]);
        setCheatLogs([]);
      },
    };
  }, [user, impersonating, users, materials, assignments, submissions, announcements, notifications, cheatLogs, events]);

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
