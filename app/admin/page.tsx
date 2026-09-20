"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, PageHeader, Stat } from "@/components/ui";
import { useStore } from "@/lib/store";
import { nowIso, uid } from "@/lib/utils";

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
  const { users, upsertUser, deleteUser, impersonate, events, upsertEvent, deleteEvent, submissions, assignments, addNotification } = useStore();
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("siswa");
  const [kelas, setKelas] = useState("VIII-A");
  const [evJudul, setEvJudul] = useState("");
  const [evTanggal, setEvTanggal] = useState("");
  const [evDeskripsi, setEvDeskripsi] = useState("");

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader title="Administrasi" desc="Kelola akun, impersonasi, statistik global, dan kalender akademik." />
      <div className="grid sm:grid-cols-4 gap-3 mb-3">
        <Stat label="Pengguna aktif" value={String(users.length)} />
        <Stat label="Ujian berjalan" value={String(assignments.filter((a) => a.tipe === "evaluasi").length)} />
        <Stat label="Kiriman" value={String(submissions.length)} />
        <Stat label="Beban penyimpanan" value="~1 MB" sub="mode demo lokal" />
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-3">
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-line"><p className="h2">Manajemen akun</p></div>
          <form
            className="p-4 grid sm:grid-cols-[1fr_1fr_120px_100px_auto] gap-2 border-b border-line bg-wash/50"
            onSubmit={(e) => {
              e.preventDefault();
              if (!nama.trim() || !email.trim()) return;
              upsertUser({ id: uid("u"), nama: nama.trim(), email: email.trim(), role: role as "siswa" | "guru" | "admin", kelas });
              addNotification({ userId: "all", kategori: "sistem", judul: "Pengguna baru terdaftar", isi: `${nama} (${role})` });
              setNama(""); setEmail("");
            }}
          >
            <input className="input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama" />
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}><option value="siswa">siswa</option><option value="guru">guru</option><option value="admin">admin</option></select>
            <select className="input" value={kelas} onChange={(e) => setKelas(e.target.value)}>{["VIII-A", "VIII-B", "VII-A", "IX-A", "-"].map((k) => <option key={k}>{k}</option>)}</select>
            <button className="btn-primary text-[13px]" type="submit">Tambah</button>
          </form>
          <div className="divide-y divide-line">
            {users.map((u) => (
              <div key={u.id} className="px-4 py-2.5 flex items-center gap-2.5">
                <div className="min-w-0 flex-1"><p className="text-[14px] font-medium truncate">{u.nama}</p><p className="text-[12.5px] text-ink-muted">{u.email} · {u.kelas}</p></div>
                <Badge tone={u.role === "admin" ? "red" : u.role === "guru" ? "purple" : "gray"}>{u.role}</Badge>
                <button className="btn-ghost !py-1 !text-[12.5px]" onClick={() => { impersonate(u.id); router.push("/dashboard"); }}>Masuk sebagai</button>
                <button className="text-red-600 text-[12.5px]" onClick={() => deleteUser(u.id)}>Hapus</button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="card card-pad">
            <p className="h2 mb-2">Kalender akademik</p>
            <div className="space-y-2 mb-3">
              {events.map((e) => (
                <div key={e.id} className="flex gap-2 items-start text-[13px]">
                  <span className="badge bg-wash text-ink-soft border-line shrink-0">{e.tanggal}</span>
                  <div className="flex-1"><b>{e.judul}</b><p className="text-ink-muted">{e.deskripsi}</p></div>
                  <button className="text-red-600" onClick={() => deleteEvent(e.id)}>×</button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <input className="input" value={evJudul} onChange={(e) => setEvJudul(e.target.value)} placeholder="Judul agenda" />
              <input type="date" className="input" value={evTanggal} onChange={(e) => setEvTanggal(e.target.value)} />
              <input className="input" value={evDeskripsi} onChange={(e) => setEvDeskripsi(e.target.value)} placeholder="Deskripsi" />
              <button
                className="btn-ghost w-full text-[13px]"
                onClick={() => {
                  if (!evJudul.trim() || !evTanggal) return;
                  upsertEvent({ id: uid("e"), judul: evJudul.trim(), tanggal: evTanggal, deskripsi: evDeskripsi.trim() || "-" });
                  setEvJudul(""); setEvTanggal(""); setEvDeskripsi("");
                  void nowIso;
                }}
              >Tambah agenda</button>
            </div>
          </div>
          <div className="card card-pad">
            <p className="h2">Impersonation</p>
            <p className="muted mt-1">Beralih tampilan sebagai guru atau siswa untuk verifikasi dan bantuan teknis. Banner ungu menandai mode aktif.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
