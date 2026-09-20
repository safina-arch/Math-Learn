"use client";

import { useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDateTime, nowIso, uid } from "@/lib/utils";

export default function PengumumanPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <Content />
      </Guard>
    </AppShell>
  );
}

function Content() {
  const { announcements, user, addAnnouncement, deleteAnnouncement, addNotification } = useStore();
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const canPost = user?.role === "guru" || user?.role === "admin";

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader title="Pengumuman" desc="Info resmi kelas dari guru dan admin." />
      {canPost ? (
        <form
          className="card card-pad mb-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!judul.trim() || !isi.trim() || !user) return;
            addAnnouncement({ id: uid("a"), judul: judul.trim(), isi: isi.trim(), targetKelas: user.role === "guru" ? user.kelas : "VIII-A", createdBy: user.nama, createdAt: nowIso() });
            addNotification({ userId: "all-siswa", kategori: "pengumuman", judul: judul.trim(), isi: isi.trim().slice(0, 120) });
            setJudul("");
            setIsi("");
          }}
        >
          <p className="h2">Buat pengumuman</p>
          <input className="input" value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Judul pengumuman" />
          <textarea className="input min-h-[84px]" value={isi} onChange={(e) => setIsi(e.target.value)} placeholder="Isi pengumuman…" />
          <button className="btn-primary text-[13px]" type="submit">Publikasikan</button>
        </form>
      ) : null}
      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="card card-pad">
            <div className="flex items-center gap-2">
              <Badge tone="purple">{a.targetKelas}</Badge>
              <span className="text-[12.5px] text-ink-faint ml-auto">{fmtDateTime(a.createdAt)}</span>
            </div>
            <p className="text-[15px] font-semibold mt-1.5">{a.judul}</p>
            <p className="text-[14px] text-ink-soft mt-1">{a.isi}</p>
            <p className="text-[12.5px] text-ink-faint mt-2">Oleh {a.createdBy} {canPost ? <button className="text-red-600 ml-2" onClick={() => deleteAnnouncement(a.id)}>Hapus</button> : null}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
