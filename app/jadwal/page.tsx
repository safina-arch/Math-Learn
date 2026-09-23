"use client";

import { useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtTanggal, KATEGORI_AGENDA, kategoriTone, uid } from "@/lib/utils";
import type { AcademicEvent } from "@/lib/types";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;

export default function JadwalPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <Content />
      </Guard>
    </AppShell>
  );
}

function Content() {
  const { events, user, upsertEvent, deleteEvent } = useStore();
  const isAdmin = user?.role === "admin";

  const jadwal = events.filter((e) => e.jenis === "jadwal");
  const agenda = events
    .filter((e) => e.jenis !== "jadwal")
    .slice()
    .sort((a, b) => (a.tanggal || "").localeCompare(b.tanggal || ""));

  const [editJadwal, setEditJadwal] = useState<AcademicEvent | null>(null);
  const [jFormOpen, setJFormOpen] = useState(false);
  const [jHari, setJHari] = useState<string>("Senin");
  const [jJamMulai, setJJamMulai] = useState("07:00");
  const [jJamSelesai, setJJamSelesai] = useState("08:30");
  const [jMapel, setJMapel] = useState("");
  const [jCatatan, setJCatatan] = useState("");

  const [editAgenda, setEditAgenda] = useState<AcademicEvent | null>(null);
  const [aFormOpen, setAFormOpen] = useState(false);
  const [aJudul, setAJudul] = useState("");
  const [aTanggal, setATanggal] = useState("");
  const [aKategori, setAKategori] = useState<string>("Kegiatan");
  const [aDeskripsi, setADeskripsi] = useState("");

  function openJadwal(e: AcademicEvent | null) {
    setEditJadwal(e);
    setJFormOpen(true);
    setJHari(e?.hari || "Senin");
    setJJamMulai(e?.jamMulai || "07:00");
    setJJamSelesai(e?.jamSelesai || "08:30");
    setJMapel(e?.judul || "");
    setJCatatan(e?.deskripsi || "");
  }

  function saveJadwal() {
    if (!jMapel.trim()) return;
    upsertEvent({
      id: editJadwal?.id || uid("ev"),
      jenis: "jadwal",
      judul: jMapel.trim(),
      hari: jHari,
      jamMulai: jJamMulai,
      jamSelesai: jJamSelesai,
      deskripsi: jCatatan.trim(),
      tanggal: "",
    });
    setJFormOpen(false);
    setEditJadwal(null);
  }

  function closeJadwal() {
    setJFormOpen(false);
    setEditJadwal(null);
  }

  function openAgenda(e: AcademicEvent | null) {
    setEditAgenda(e);
    setAFormOpen(true);
    setAJudul(e?.judul || "");
    setATanggal(e?.tanggal || "");
    setAKategori(e?.kategori || "Kegiatan");
    setADeskripsi(e?.deskripsi || "");
  }

  function saveAgenda() {
    if (!aJudul.trim() || !aTanggal) return;
    upsertEvent({
      id: editAgenda?.id || uid("ev"),
      jenis: "agenda",
      judul: aJudul.trim(),
      tanggal: aTanggal,
      kategori: aKategori,
      deskripsi: aDeskripsi.trim(),
      hari: "",
      jamMulai: "",
      jamSelesai: "",
    });
    setAFormOpen(false);
    setEditAgenda(null);
  }

  function closeAgenda() {
    setAFormOpen(false);
    setEditAgenda(null);
  }

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader
        title="Jadwal & Kalender Akademik"
        desc="Jadwal mata pelajaran mingguan beserta jamnya, dan agenda penting seperti UTS, UAS, libur, serta hari besar."
      />

      <div className="card overflow-hidden mb-3">
        <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="h2">Jadwal pelajaran</p>
            <p className="muted mt-0.5">{isAdmin ? "Atur mata pelajaran, hari, dan jam untuk setiap kelas." : "Jadwal mengajar mingguan kelas VIII-A."}</p>
          </div>
          {isAdmin ? (
            <button className="btn-primary text-[13px]" onClick={() => openJadwal(null)}>+ Tambah jadwal</button>
          ) : null}
        </div>

        {jadwal.length === 0 ? (
          <Empty title="Belum ada jadwal" desc={isAdmin ? "Tambahkan jadwal mata pelajaran agar siswa dan guru bisa melihatnya." : "Guru/admin belum menambahkan jadwal pelajaran."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[640px]">
              <thead>
                <tr className="text-left text-[12px] text-ink-muted bg-wash/50">
                  <th className="px-4 py-2.5 font-medium">Hari</th>
                  <th className="px-4 py-2.5 font-medium">Jam</th>
                  <th className="px-4 py-2.5 font-medium">Mata pelajaran</th>
                  <th className="px-4 py-2.5 font-medium">Catatan</th>
                  {isAdmin ? <th className="px-4 py-2.5" /> : null}
                </tr>
              </thead>
              <tbody>
                {HARI.flatMap((h) =>
                  jadwal
                    .filter((e) => e.hari === h)
                    .sort((a, b) => (a.jamMulai || "").localeCompare(b.jamMulai || ""))
                    .map((e) => (
                      <tr key={e.id} className="table-row">
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap">{h}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-ink-muted">{e.jamMulai || "—"} – {e.jamSelesai || "—"}</td>
                        <td className="px-4 py-2.5"><b>{e.judul}</b></td>
                        <td className="px-4 py-2.5 text-ink-muted">{e.deskripsi || "—"}</td>
                        {isAdmin ? (
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            <button className="btn-ghost !py-1 !text-[12.5px]" onClick={() => openJadwal(e)}>Ubah</button>{" "}
                            <button className="text-red-600 text-[12.5px]" onClick={() => deleteEvent(e.id)}>Hapus</button>
                          </td>
                        ) : null}
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {isAdmin && jFormOpen ? (
          <div className="px-4 py-3 border-t border-line bg-wash/40 space-y-2">
            <p className="text-[13px] font-semibold">{editJadwal ? "Ubah jadwal" : "Jadwal baru"}</p>
            <div className="grid sm:grid-cols-4 gap-2">
              <select className="input" value={jHari} onChange={(e) => setJHari(e.target.value)} aria-label="Hari">
                {HARI.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <input type="time" className="input" value={jJamMulai} onChange={(e) => setJJamMulai(e.target.value)} aria-label="Jam mulai" />
              <input type="time" className="input" value={jJamSelesai} onChange={(e) => setJJamSelesai(e.target.value)} aria-label="Jam selesai" />
              <input className="input" value={jMapel} onChange={(e) => setJMapel(e.target.value)} placeholder="Mata pelajaran (cth. Matematika)" />
            </div>
            <input className="input" value={jCatatan} onChange={(e) => setJCatatan(e.target.value)} placeholder="Catatan / ruang kelas (opsional)" />
            <div className="flex gap-2">
              <button className="btn-primary text-[13px]" disabled={!jMapel.trim()} onClick={saveJadwal}>{editJadwal ? "Simpan perubahan" : "Tambah jadwal"}</button>
              <button className="btn-ghost text-[13px]" onClick={closeJadwal}>Batal</button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="h2">Kalender akademik</p>
            <p className="muted mt-0.5">Agenda penting: UTS, UAS, libur, dan hari penting.</p>
          </div>
          {isAdmin ? (
            <button className="btn-primary text-[13px]" onClick={() => openAgenda(null)}>+ Tambah agenda</button>
          ) : null}
        </div>

        {agenda.length === 0 ? (
          <Empty title="Belum ada agenda" desc={isAdmin ? "Tambahkan agenda UTS, UAS, libur, atau hari penting." : "Admin belum menambahkan agenda akademik."} />
        ) : (
          <div className="divide-y divide-line">
            {agenda.map((e) => (
              <div key={e.id} className="px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="badge bg-wash text-ink-soft border-line shrink-0 tabular-nums">{fmtTanggal(e.tanggal)}</span>
                <Badge tone={kategoriTone(e.kategori)}>{e.kategori || "Kegiatan"}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{e.judul}</p>
                  {e.deskripsi ? <p className="muted mt-0.5">{e.deskripsi}</p> : null}
                </div>
                {isAdmin ? (
                  <div className="shrink-0">
                    <button className="btn-ghost !py-1 !text-[12.5px]" onClick={() => openAgenda(e)}>Ubah</button>{" "}
                    <button className="text-red-600 text-[12.5px]" onClick={() => deleteEvent(e.id)}>Hapus</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {isAdmin && aFormOpen ? (
          <div className="px-4 py-3 border-t border-line bg-wash/40 space-y-2">
            <p className="text-[13px] font-semibold">{editAgenda ? "Ubah agenda" : "Agenda baru"}</p>
            <div className="grid sm:grid-cols-3 gap-2">
              <input className="input" value={aJudul} onChange={(e) => setAJudul(e.target.value)} placeholder="Judul agenda (cth. UTS Semester Ganjil)" />
              <input type="date" className="input" value={aTanggal} onChange={(e) => setATanggal(e.target.value)} aria-label="Tanggal agenda" />
              <select className="input" value={aKategori} onChange={(e) => setAKategori(e.target.value)} aria-label="Kategori">
                {KATEGORI_AGENDA.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <input className="input" value={aDeskripsi} onChange={(e) => setADeskripsi(e.target.value)} placeholder="Deskripsi (opsional)" />
            <div className="flex gap-2">
              <button className="btn-primary text-[13px]" disabled={!aJudul.trim() || !aTanggal} onClick={saveAgenda}>{editAgenda ? "Simpan perubahan" : "Tambah agenda"}</button>
              <button className="btn-ghost text-[13px]" onClick={closeAgenda}>Batal</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
