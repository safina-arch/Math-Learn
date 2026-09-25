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
  const [err, setErr] = useState<string[]>([]);
  const canPost = user?.role === "guru" || user?.role === "admin";

  // Kolom wajib yang harus diisi (kolom opsional tidak ditampilkan pada peringatan).
  const kolomKosong = [
    !judul.trim() ? "Judul pengumuman" : null,
    !isi.trim() ? "Isi pengumuman" : null,
  ].filter(Boolean) as string[];

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader title="Pengumuman" desc="Info resmi kelas dari guru dan admin." />
      {canPost ? (
        <form
          className="card card-pad mb-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!user) return;
            if (kolomKosong.length) {
              setErr(kolomKosong);
              return;
            }
            setErr([]);
            addAnnouncement({ id: uid("a"), judul: judul.trim(), isi: isi.trim(), targetKelas: user.role === "guru" ? user.kelas : "VIII-A", createdBy: user.nama, createdAt: nowIso() });
            addNotification({ userId: "all-siswa", kategori: "pengumuman", judul: judul.trim(), isi: isi.trim().slice(0, 120) });
            setJudul("");
            setIsi("");
          }}
        >
          <p className="h2">Buat pengumuman</p>
          <input className={`input ${err.includes("Judul pengumuman") && !judul.trim() ? "!border-red-400" : ""}`} value={judul} onChange={(e) => { setJudul(e.target.value); setErr([]); }} placeholder="Judul pengumuman (wajib)" />
          <textarea className={`input min-h-[84px] ${err.includes("Isi pengumuman") && !isi.trim() ? "!border-red-400" : ""}`} value={isi} onChange={(e) => { setIsi(e.target.value); setErr([]); }} placeholder="Isi pengumuman… (wajib)" />
          {err.length ? (
            <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
              <b>⚠ Pengumuman belum bisa dipublikasikan.</b> Kolom berikut belum diisi: <b>{err.join(", ")}</b>. Kolom opsional boleh dikosongkan.
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <button className="btn-primary text-[13px]" type="submit">Publikasikan</button>
            <span className="text-[12px] text-ink-faint">Kolom bertanda <b>wajib</b> harus diisi.</span>
          </div>
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
