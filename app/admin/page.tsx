"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, PageHeader, Stat } from "@/components/ui";
import { UserModal } from "@/components/user-modal";
import { useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/utils";
import type { Role, User } from "@/lib/types";

type AccountInput = User & { password?: string };
type Tab = "siswa" | "guru" | "admin";

const TAB_LABEL: Record<Tab, string> = { siswa: "Siswa", guru: "Guru", admin: "Akun admin" };

export default function AdminPage() {
  return (
    <AppShell>
      <Guard allow={["admin"]}>
        <Content />
      </Guard>
    </AppShell>
  );
}

function Content() {
  const { users, presence, upsertUser, deleteUser, impersonate, events, submissions, assignments, addNotification } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("siswa");
  const [uOpen, setUOpen] = useState(false);
  const [editU, setEditU] = useState<AccountInput | null>(null);

  const role: Role = tab;
  const list = users.filter((u) => u.role === role);
  const now = Date.now();
  const activeNow = presence.filter((p) => now - Date.parse(p.lastSeen) < 60_000);
  const activeIds = new Set(activeNow.map((p) => p.userId));
  const inactiveCount = Math.max(0, users.length - activeNow.length);

  function saveUser(u: AccountInput) {
    const isNew = !users.some((x) => x.id === u.id);
    upsertUser(u);
    if (isNew) addNotification({ userId: "all", kategori: "sistem", judul: "Pengguna baru terdaftar", isi: `${u.nama} (${u.role})` });
    setUOpen(false);
    setEditU(null);
  }

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader
        title="Administrasi"
        desc="Manajemen siswa & guru terpisah, kehadiran pengguna, statistik global, dan akses jadwal/kalender akademik."
        right={<button className="btn-primary text-[13px]" onClick={() => { setEditU(null); setUOpen(true); }}>{`+ Tambah ${tab}`}</button>}
      />
      <div className="grid sm:grid-cols-4 gap-3 mb-3">
        <Stat label="Total pengguna" value={String(users.length)} sub={`${users.filter((u) => u.role === "siswa").length} siswa · ${users.filter((u) => u.role === "guru").length} guru`} />
        <Stat label="Aktif sekarang" value={String(activeNow.length)} sub={presence.length ? "heartbeat < 60 detik" : "butuh Supabase"} />
        <Stat label="Ujian tersedia" value={String(assignments.filter((a) => a.tipe === "evaluasi").length)} />
        <Stat label="Kiriman" value={String(submissions.length)} />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-3">
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
            <p className="h2">Manajemen akun</p>
            <div className="flex gap-1">
              {(["siswa", "guru", "admin"] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`btn !py-1.5 !px-3 !text-[12.5px] ${tab === t ? "bg-ink text-white" : "btn-ghost"}`}>{TAB_LABEL[t]} ({users.filter((u) => u.role === t).length})</button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-line">
            {list.length === 0 ? (
              <p className="muted p-4">Belum ada {TAB_LABEL[tab].toLowerCase()} terdaftar.</p>
            ) : list.map((u) => {
              const isActive = activeIds.has(u.id);
              return (
                <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                  {u.fotoProfil ? (
                    <img src={u.fotoProfil} alt={u.nama} className="h-10 w-10 rounded-full object-cover border border-line shrink-0" />
                  ) : (
                    <span className="h-10 w-10 rounded-full bg-wash border border-line flex items-center justify-center text-[15px] font-semibold text-ink-soft shrink-0">{u.nama.slice(0, 1).toUpperCase()}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium truncate flex items-center gap-1.5">
                      {u.nama}
                      {isActive ? <span className="inline-block h-2 w-2 rounded-full bg-green-500" title="Aktif sekarang" /> : null}
                    </p>
                    <p className="text-[12.5px] text-ink-muted truncate">
                      {u.email}{u.kelas && u.kelas !== "-" ? ` · ${u.kelas}` : ""}{u.nisn ? ` · NISN ${u.nisn}` : ""}
                      {u.ttl ? ` · Lahir ${u.ttl}` : ""}
                    </p>
                  </div>
                  <Badge tone={u.role === "admin" ? "red" : u.role === "guru" ? "purple" : "gray"}>{u.role}</Badge>
                  <button className="btn-ghost !py-1 !text-[12.5px]" onClick={() => { impersonate(u.id); router.push("/dashboard"); }}>Masuk sebagai</button>
                  <button className="btn-ghost !py-1 !text-[12.5px]" onClick={() => { setEditU(u); setUOpen(true); }}>Ubah</button>
                  <button className="text-red-600 text-[12.5px]" onClick={() => deleteUser(u.id)}>Hapus</button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="card card-pad">
            <p className="h2 mb-2">Pengguna aktif sekarang ({activeNow.length})</p>
            {presence.length === 0 ? (
              <p className="muted">Belum ada data kehadiran. Fitur ini aktif setelah Supabase dikonfigurasi dan user masuk.</p>
            ) : activeNow.length === 0 ? (
              <p className="muted">Tidak ada pengguna yang aktif saat ini.</p>
            ) : (
              <div className="space-y-1.5">
                {activeNow.map((p) => {
                  const seconds = Math.max(0, Math.round((now - Date.parse(p.lastSeen)) / 1000));
                  return (
                    <div key={p.userId} className="flex items-center gap-2 text-[13px]">
                      <span className="inline-block h-2 w-2 rounded-full bg-green-500 shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-medium">{p.nama || p.userId}</span>
                      <Badge tone={p.role === "admin" ? "red" : p.role === "guru" ? "purple" : "gray"}>{p.role || "-"}</Badge>
                      <span className="text-[11.5px] text-ink-faint shrink-0">{seconds < 60 ? `${seconds}d lalu` : fmtDateTime(p.lastSeen)}</span>
                    </div>
                  );
                })}
                {inactiveCount > 0 ? <p className="text-[12px] text-ink-faint pt-1">{inactiveCount} pengguna lain tidak aktif.</p> : null}
              </div>
            )}
          </div>

          <div className="card card-pad">
            <p className="h2 mb-2">Jadwal &amp; kalender akademik</p>
            <p className="muted mb-2">Atur jadwal per pertemuan (tanggal, jam, materi, kelas) serta agenda UTS/UAS, libur, dan hari penting di halaman khusus — tampil langsung untuk siswa &amp; guru.</p>
            <div className="space-y-1.5 mb-3">
              <p className="text-[13px] font-semibold">Agenda terdekat</p>
              {events.filter((e) => e.jenis !== "jadwal").slice(0, 4).map((e) => (
                <div key={e.id} className="flex gap-2 items-baseline text-[13px]">
                  <span className="badge bg-wash text-ink-soft border-line shrink-0">{e.tanggal}</span>
                  <span className="min-w-0 flex-1 truncate">{e.judul}</span>
                </div>
              ))}
              {events.filter((e) => e.jenis !== "jadwal").length === 0 ? <p className="muted">Belum ada agenda.</p> : null}
            </div>
            <button className="btn-primary w-full text-[13px]" onClick={() => router.push("/jadwal")}>Kelola jadwal &amp; kalender</button>
          </div>
          <div className="card card-pad">
            <p className="h2">Impersonation</p>
            <p className="muted mt-1">Beralih tampilan sebagai guru atau siswa untuk verifikasi dan bantuan teknis. Banner ungu menandai mode aktif.</p>
          </div>
        </div>
      </div>

      <UserModal
        open={uOpen}
        initial={editU}
        role={role}
        onClose={() => { setUOpen(false); setEditU(null); }}
        onSave={saveUser}
      />
    </div>
  );
}
