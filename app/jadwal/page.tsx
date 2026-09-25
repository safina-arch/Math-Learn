"use client";

import { useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtTanggal, KATEGORI_AGENDA, kategoriTone, todayIso, uid } from "@/lib/utils";
import type { AcademicEvent } from "@/lib/types";

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"] as const;
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"] as const;
const KELAS_LIST = ["VII-A", "VII-B", "VIII-A", "VIII-B", "IX-A", "IX-B"];

export default function JadwalPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <Content />
      </Guard>
    </AppShell>
  );
}

/** Urutkan pertemuan: tanggal terisi dulu (menaik), data lama tanpa tanggal di akhir per hari. */
function urutPertemuan(a: AcademicEvent, b: AcademicEvent): number {
  if (a.tanggal && b.tanggal) return a.tanggal.localeCompare(b.tanggal) || (a.jamMulai || "").localeCompare(b.jamMulai || "");
  if (a.tanggal) return -1;
  if (b.tanggal) return 1;
  const ha = HARI.indexOf((a.hari || "") as (typeof HARI)[number]);
  const hb = HARI.indexOf((b.hari || "") as (typeof HARI)[number]);
  return (ha < 0 ? 9 : ha) - (hb < 0 ? 9 : hb);
}

function Content() {
  const { events, user, upsertEvent, deleteEvent } = useStore();
  const isAdmin = user?.role === "admin";
  const today = todayIso();

  const semuaJadwal = events.filter((e) => e.jenis === "jadwal").slice().sort(urutPertemuan);
  const daftarKelas = Array.from(new Set(semuaJadwal.map((e) => e.kelas).filter(Boolean))) as string[];
  const [kelasFilter, setKelasFilter] = useState("semua");
  const jadwal = kelasFilter === "semua" ? semuaJadwal : semuaJadwal.filter((e) => e.kelas === kelasFilter);

  const agenda = events
    .filter((e) => e.jenis !== "jadwal")
    .slice()
    .sort((a, b) => (a.tanggal || "").localeCompare(b.tanggal || ""));

  const [editPertemuan, setEditPertemuan] = useState<AcademicEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [materi, setMateri] = useState("");
  /** Mode isian jadwal: "tanggal" = pertemuan sekali, "hari" = berulang tiap hari pilihan. */
  const [modeTanggal, setModeTanggal] = useState<"tanggal" | "hari">("tanggal");
  const [tanggal, setTanggal] = useState("");
  const [hari, setHari] = useState("Senin");
  const [jamMulai, setJamMulai] = useState("07:00");
  const [jamSelesai, setJamSelesai] = useState("08:30");
  const [kelas, setKelas] = useState("VIII-A");
  const [catatan, setCatatan] = useState("");
  const [formErr, setFormErr] = useState<string[]>([]);
  const [agendaErr, setAgendaErr] = useState<string[]>([]);

  const [editAgenda, setEditAgenda] = useState<AcademicEvent | null>(null);
  const [aFormOpen, setAFormOpen] = useState(false);
  const [aJudul, setAJudul] = useState("");
  const [aTanggal, setATanggal] = useState("");
  const [aKategori, setAKategori] = useState<string>("Kegiatan");
  const [aDeskripsi, setADeskripsi] = useState("");

  function openPertemuan(e: AcademicEvent | null) {
    setEditPertemuan(e);
    setFormOpen(true);
    setFormErr([]);
    setMateri(e?.judul || "");
    setModeTanggal(e ? (e.tanggal ? "tanggal" : "hari") : "tanggal");
    setTanggal(e?.tanggal || "");
    setHari(e?.hari || "Senin");
    setJamMulai(e?.jamMulai || "07:00");
    setJamSelesai(e?.jamSelesai || "08:30");
    setKelas(e?.kelas || "VIII-A");
    setCatatan(e?.deskripsi || "");
  }

  function savePertemuan() {
    // Kolom wajib dicek dulu; kolom opsional (catatan) bebas dikosongkan.
    const kosong = [
      !materi.trim() ? "Materi" : null,
      modeTanggal === "tanggal" && !tanggal ? "Tanggal" : null,
      modeTanggal === "hari" && !hari ? "Hari" : null,
    ].filter(Boolean) as string[];
    if (kosong.length) {
      setFormErr(kosong);
      return;
    }
    setFormErr([]);
    upsertEvent({
      id: editPertemuan?.id || uid("ev"),
      jenis: "jadwal",
      judul: materi.trim(),
      tanggal: modeTanggal === "tanggal" ? tanggal : "",
      jamMulai,
      jamSelesai,
      kelas,
      deskripsi: catatan.trim(),
      hari: modeTanggal === "hari" ? hari : "",
    });
    setFormOpen(false);
    setEditPertemuan(null);
  }

  function closePertemuan() {
    setFormOpen(false);
    setEditPertemuan(null);
  }

  function openAgenda(e: AcademicEvent | null) {
    setEditAgenda(e);
    setAFormOpen(true);
    setAgendaErr([]);
    setAJudul(e?.judul || "");
    setATanggal(e?.tanggal || "");
    setAKategori(e?.kategori || "Kegiatan");
    setADeskripsi(e?.deskripsi || "");
  }

  function saveAgenda() {
    const kosong = [
      !aJudul.trim() ? "Judul agenda" : null,
      !aTanggal ? "Tanggal" : null,
    ].filter(Boolean) as string[];
    if (kosong.length) {
      setAgendaErr(kosong);
      return;
    }
    setAgendaErr([]);
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
        title="Jadwal Pertemuan"
        desc={
          isAdmin
            ? "Daftar tiap pertemuan: materi, tanggal, jam, dan kelas. Atur sesuai kebutuhan mengajar."
            : "Daftar pertemuan beserta materi, tanggal, jam, dan kelasnya."
        }
        right={isAdmin && !formOpen ? <button className="btn-primary text-[13px]" onClick={() => openPertemuan(null)}>+ Tambah pertemuan</button> : undefined}
      />

      <div className="card overflow-hidden mb-3">
        <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="h2">Daftar pertemuan ({jadwal.length})</p>
            <p className="muted mt-0.5">{isAdmin ? "Klik \"Ubah\" pada pertemuan untuk menyunting, atau tambah pertemuan baru." : "Tampilan read-only — diperbarui oleh admin."}</p>
          </div>
          {daftarKelas.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {["semua", ...daftarKelas].map((k) => (
                <button key={k} onClick={() => setKelasFilter(k)} className={`btn !py-1.5 !px-3 !text-[12.5px] ${kelasFilter === k ? "bg-ink text-white" : "btn-ghost"}`}>
                  {k === "semua" ? "Semua kelas" : k}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {jadwal.length === 0 ? (
          <Empty title="Belum ada pertemuan" desc={isAdmin ? "Klik \"+ Tambah pertemuan\" untuk membuat jadwal pertama." : "Admin belum menambahkan jadwal pertemuan."} />
        ) : (
          <ol className="px-4 py-2">
            {jadwal.map((e, i) => {
              const dated = !!e.tanggal;
              const status = !dated ? "lama" : e.tanggal < today ? "selesai" : e.tanggal === today ? "hari-ini" : "akan";
              const [dd, mm] = dated ? [e.tanggal.slice(8, 10), e.tanggal.slice(5, 7)] : ["", ""];
              return (
                <li key={e.id} className="relative flex gap-3 sm:gap-4 py-3">
                  {/* Rail kiri: tanggal + garis pertemuan */}
                  <div className="flex flex-col items-center w-[58px] shrink-0">
                    <div
                      className={`w-[54px] rounded-xl border text-center py-1.5 ${
                        status === "hari-ini"
                          ? "border-amber-300 bg-amber-50"
                          : status === "selesai"
                            ? "border-line bg-wash"
                            : "border-primary-100 bg-primary-50"
                      }`}
                    >
                      {dated ? (
                        <>
                          <p className="text-[16px] font-bold leading-none">{Number(dd)}</p>
                          <p className="text-[10.5px] text-ink-muted mt-0.5">{BULAN[Number(mm) - 1] || mm}</p>
                        </>
                      ) : (
                        <p className="text-[11px] font-semibold text-ink-muted py-1">{(e.hari || "?").slice(0, 3)}</p>
                      )}
                    </div>
                    {i < jadwal.length - 1 ? <span className="w-px flex-1 bg-line mt-2 min-h-[24px]" aria-hidden /> : null}
                  </div>

                  {/* Kartu isi pertemuan */}
                  <div className={`flex-1 min-w-0 card card-pad !py-3.5 ${status === "hari-ini" ? "!border-amber-300" : ""}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="purple">Pertemuan {i + 1}</Badge>
                      {e.kelas ? <Badge tone="blue">{e.kelas}</Badge> : null}
                      <span className="badge bg-wash text-ink-soft border-line tabular-nums">{e.jamMulai || "—"}–{e.jamSelesai || "—"}</span>
                      {status === "hari-ini" ? <Badge tone="amber">Hari ini</Badge> : status === "selesai" ? <Badge tone="green">Selesai</Badge> : status === "akan" ? <Badge tone="gray">Mendatang</Badge> : null}
                      {isAdmin ? (
                        <span className="ml-auto flex gap-2 shrink-0">
                          <button className="btn-ghost !py-1 !text-[12.5px]" onClick={() => openPertemuan(e)}>Ubah</button>
                          <button className="text-red-600 text-[12.5px]" onClick={() => deleteEvent(e.id)}>Hapus</button>
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[15px] font-semibold mt-2 leading-snug">{e.judul}</p>
                    <p className="muted !text-[12.5px] mt-0.5">{dated ? fmtTanggal(e.tanggal) : `Setiap ${e.hari || "—"}`}</p>
                    {e.deskripsi ? <p className="text-[13px] text-ink-soft mt-1 whitespace-pre-wrap">{e.deskripsi}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {isAdmin && formOpen ? (
          <div className="px-4 py-3 border-t border-line bg-wash/40 space-y-2">
            <p className="text-[13px] font-semibold">{editPertemuan ? "Ubah pertemuan" : "Pertemuan baru"}</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <input className={`input ${formErr.includes("Materi") ? "!border-red-400" : ""}`} value={materi} onChange={(e) => { setMateri(e.target.value); setFormErr([]); }} placeholder="Materi pertemuan (wajib, cth. Bilangan bulat)" />
              <select className="input" value={kelas} onChange={(e) => setKelas(e.target.value)} aria-label="Kelas">
                {KELAS_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            {/* Pilihan cara mengisi jadwal: tanggal sekali, atau berulang tiap hari + jam. */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] text-ink-muted font-medium">Jadwalkan berdasarkan:</span>
              <div className="inline-flex rounded-xl border border-line overflow-hidden bg-white">
                <button type="button" className={`px-3 py-1.5 text-[12.5px] ${modeTanggal === "tanggal" ? "bg-ink text-white" : "text-ink-soft"}`} onClick={() => { setModeTanggal("tanggal"); setFormErr([]); }}>📅 Tanggal tertentu</button>
                <button type="button" className={`px-3 py-1.5 text-[12.5px] border-l border-line ${modeTanggal === "hari" ? "bg-ink text-white" : "text-ink-soft"}`} onClick={() => { setModeTanggal("hari"); setFormErr([]); }}>🔁 Hari &amp; jam (berulang)</button>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              {modeTanggal === "tanggal" ? (
                <input type="date" className={`input ${formErr.includes("Tanggal") ? "!border-red-400" : ""}`} value={tanggal} onChange={(e) => { setTanggal(e.target.value); setFormErr([]); }} aria-label="Tanggal" />
              ) : (
                <select className={`input ${formErr.includes("Hari") ? "!border-red-400" : ""}`} value={hari} onChange={(e) => { setHari(e.target.value); setFormErr([]); }} aria-label="Hari berulang">
                  {HARI.map((h) => <option key={h} value={h}>{h} (tiap minggu)</option>)}
                </select>
              )}
              <input type="time" className="input" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} aria-label="Jam mulai" />
              <input type="time" className="input" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} aria-label="Jam selesai" />
            </div>
            <textarea className="input min-h-[64px]" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan / ruang kelas (opsional)" />
            {formErr.length ? (
              <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
                <b>⚠ Jadwal belum tersimpan.</b> Kolom berikut belum diisi: <b>{formErr.join(", ")}</b>. Kolom bertanda <i>opsional</i> boleh dikosongkan.
              </div>
            ) : null}
            <div className="flex gap-2">
              <button className="btn-primary text-[13px]" onClick={savePertemuan}>{editPertemuan ? "Simpan perubahan" : "Tambah pertemuan"}</button>
              <button className="btn-ghost text-[13px]" onClick={closePertemuan}>Batal</button>
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
                  {e.deskripsi ? <p className="muted mt-0.5 whitespace-pre-wrap">{e.deskripsi}</p> : null}
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
              <input className={`input ${agendaErr.includes("Judul agenda") ? "!border-red-400" : ""}`} value={aJudul} onChange={(e) => { setAJudul(e.target.value); setAgendaErr([]); }} placeholder="Judul agenda (wajib, cth. UTS Semester Ganjil)" />
              <input type="date" className={`input ${agendaErr.includes("Tanggal") ? "!border-red-400" : ""}`} value={aTanggal} onChange={(e) => { setATanggal(e.target.value); setAgendaErr([]); }} aria-label="Tanggal agenda" />
              <select className="input" value={aKategori} onChange={(e) => setAKategori(e.target.value)} aria-label="Kategori">
                {KATEGORI_AGENDA.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <input className="input" value={aDeskripsi} onChange={(e) => setADeskripsi(e.target.value)} placeholder="Deskripsi (opsional)" />
            {agendaErr.length ? (
              <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
                <b>⚠ Agenda belum tersimpan.</b> Kolom berikut belum diisi: <b>{agendaErr.join(", ")}</b>. Deskripsi opsional boleh dikosongkan.
              </div>
            ) : null}
            <div className="flex gap-2">
              <button className="btn-primary text-[13px]" onClick={saveAgenda}>{editAgenda ? "Simpan perubahan" : "Tambah agenda"}</button>
              <button className="btn-ghost text-[13px]" onClick={closeAgenda}>Batal</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
