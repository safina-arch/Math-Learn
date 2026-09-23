"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/shell";
import { Badge, PageHeader, Progress, Stat } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDateTime, STATUS_TUGAS_META, todayIso } from "@/lib/utils";

function SiswaDash() {
  const { user, assignments, submissions, announcements, materials, events } = useStore();
  const mine = submissions.filter((s) => s.siswaId === user?.id);
  const doneIds = new Set(mine.map((s) => s.assignmentId));
  const upcoming = assignments.filter((a) => !doneIds.has(a.id) && !(a.tipe === "evaluasi" && a.terkunci)).slice(0, 4);
  const graded = mine.filter((s) => s.status === "dinilai" && s.nilai != null).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const last = graded[0] || null;
  const lastAssign = last ? assignments.find((a) => a.id === last.assignmentId) : null;
  const progress = assignments.length ? Math.round((doneIds.size / assignments.length) * 100) : 0;

  // Jadwal hari ini (per pertemuan, cocok tanggal) + pertemuan terdekat bila hari ini kosong.
  // Data lama tanpa tanggal dianggap jadwal mingguan → cocokkan nama hari.
  const hariIni = todayIso();
  const namaHari = new Date().toLocaleDateString("id-ID", { weekday: "long" }).toLowerCase();
  const cocokHariIni = (e: (typeof events)[number]) =>
    e.tanggal === hariIni || (!e.tanggal && (e.hari || "").toLowerCase() === namaHari);
  const jadwalHariIni = events
    .filter((e) => e.jenis === "jadwal" && cocokHariIni(e))
    .sort((a, b) => (a.jamMulai || "").localeCompare(b.jamMulai || ""));
  const pertemuanBerikut = jadwalHariIni.length === 0
    ? events
        .filter((e) => e.jenis === "jadwal" && e.tanggal >= hariIni)
        .sort((a, b) => (a.tanggal || "").localeCompare(b.tanggal || ""))
        .slice(0, 3)
    : [];
  const agendaList = events.filter((e) => e.jenis !== "jadwal").sort((a, b) => (a.tanggal || "").localeCompare(b.tanggal || "")).slice(0, 3);

  return (
    <div>
      <PageHeader title={`Halo, ${user?.nama || "Siswa"}`} desc="Ringkasan belajarmu hari ini. Fokus ke satu tugas dalam satu waktu." />
      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Tugas mendatang" value={String(upcoming.length)} sub="belum dikumpulkan" />
        <Stat label="Skor terakhir" value={last?.nilai != null ? String(last.nilai) : "—"} sub={lastAssign?.judul.slice(0, 34) || "belum ada yang diperiksa"} />
        <Stat label="Progres materi" value={`${progress}%`} sub={`${doneIds.size} dari ${assignments.length} tugas`} />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-3 mt-3">
        <div className="space-y-3">
          <div className="card card-pad">
            <div className="flex items-center justify-between mb-2">
              <p className="h2">Tugas mendatang</p>
              <Link href="/lkpd" className="text-[13px] text-primary font-medium">Lihat semua</Link>
            </div>
            {upcoming.length === 0 ? <p className="muted">Semua tugas selesai. Kerja bagus.</p> : (
              <div className="divide-y divide-line -mx-1">
                {upcoming.map((a) => (
                  <Link key={a.id} href={a.tipe === "evaluasi" ? `/evaluasi/${a.id}` : `/tugas/${a.id}`} className="flex items-center gap-3 py-2.5 px-1 hover:bg-wash/60 rounded-lg">
                    <span className={`badge ${a.tipe === "evaluasi" ? "bg-red-50 text-red-700 border-red-200" : a.tipe === "latihan" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-primary-50 text-primary border-primary-100"}`}>{a.tipe.toUpperCase()}</span>
                    <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium truncate">{a.judul}</span><span className="muted !text-[12.5px]">Tutup {fmtDateTime(a.tutupAt)}</span></span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card card-pad">
            <p className="h2 mb-2">Lanjut membaca</p>
            <div className="space-y-2">
              {materials.slice(0, 3).map((m) => (
                <Link key={m.id} href={`/materi/${m.id}`} className="block rounded-xl border border-line p-3.5 hover:border-primary-200 hover:bg-primary-50/30 transition-colors">
                  <p className="text-[14px] font-semibold">{m.judul}</p>
                  <p className="muted mt-0.5 line-clamp-2">{m.ringkasan}</p>
                </Link>
              ))}
            </div>
            <div className="mt-3"><Progress value={progress} /></div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="card card-pad">
            <div className="flex items-center justify-between mb-2">
              <p className="h2">{jadwalHariIni.length ? "Jadwal hari ini" : "Pertemuan berikutnya"}</p>
              <Link href="/jadwal" className="text-[13px] text-primary font-medium">Lihat jadwal</Link>
            </div>
            {jadwalHariIni.length === 0 && pertemuanBerikut.length === 0 ? <p className="muted">Belum ada pertemuan terjadwal.</p> : (
              <div className="divide-y divide-line -mx-1">
                {(jadwalHariIni.length ? jadwalHariIni : pertemuanBerikut).map((e) => (
                  <div key={e.id} className="flex items-center gap-3 py-2.5 px-1">
                    <span className="badge bg-wash text-ink-soft border-line shrink-0 tabular-nums">{e.tanggal ? `${Number(e.tanggal.slice(8, 10))}/${Number(e.tanggal.slice(5, 7))}` : "—"} · {e.jamMulai || "—"}–{e.jamSelesai || "—"}</span>
                    <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium truncate">{e.judul}</span>{e.deskripsi ? <span className="muted !text-[12.5px]">{e.deskripsi}</span> : null}</span>
                    {e.kelas ? <span className="badge bg-primary-50 text-primary border-primary-100 shrink-0">{e.kelas}</span> : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card card-pad">
            <div className="flex items-center justify-between mb-2">
              <p className="h2">Kalender akademik</p>
              <Link href="/jadwal" className="text-[13px] text-primary font-medium">Semua agenda</Link>
            </div>
            {agendaList.length === 0 ? <p className="muted">Belum ada agenda (UTS/UAS/libur).</p> : (
              <div className="divide-y divide-line -mx-1">
                {agendaList.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 py-2.5 px-1">
                    <span className="badge bg-wash text-ink-soft border-line shrink-0">{e.tanggal}</span>
                    <span className="min-w-0 flex-1 text-[14px] font-medium truncate">{e.judul}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card card-pad">
            <p className="h2 mb-2">Pengumuman penting</p>
            {announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="py-2 border-t border-line first:border-0 first:pt-0">
                <p className="text-[13.5px] font-semibold">{a.judul}</p>
                <p className="text-[12.5px] text-ink-muted line-clamp-2 mt-0.5">{a.isi}</p>
              </div>
            ))}
            <Link href="/pengumuman" className="text-[13px] text-primary font-medium mt-2 inline-block">Semua pengumuman</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuruDash() {
  const { user, submissions, assignments, announcements, events, materials } = useStore();
  const pending = submissions.filter((s) => s.status !== "dinilai");
  const activeEval = assignments.filter((a) => a.tipe === "evaluasi");
  // Jadwal hari ini — pertemuan tanggal sama hari ini; data lama (mingguan) cocok nama hari.
  const hariIni = todayIso();
  const namaHari = new Date().toLocaleDateString("id-ID", { weekday: "long" }).toLowerCase();
  const jadwalHariIni = events
    .filter((e) => e.jenis === "jadwal" && (e.tanggal === hariIni || (!e.tanggal && (e.hari || "").toLowerCase() === namaHari)))
    .sort((a, b) => (a.jamMulai || "").localeCompare(b.jamMulai || ""));

  return (
    <div>
      <PageHeader
        title={`Halo, ${user?.nama || "Guru"}`}
        desc="Periksa kiriman, pantau evaluasi berjalan, dan kelola konten kelas."
        right={<><Link href="/materi" className="btn-ghost text-[13px]">Kelola materi</Link><Link href="/periksa" className="btn-primary text-[13px]">Periksa ({pending.length})</Link></>}
      />
      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Perlu diperiksa" value={String(pending.length)} sub="kiriman menunggu keputusan" />
        <Stat label="Evaluasi aktif" value={String(activeEval.length)} sub="jadwal berjalan" />
        <Stat label="Materi dipublikasikan" value={String(materials.length)} sub="bahan bacaan kelas" />
      </div>
      <div className="grid lg:grid-cols-2 gap-3 mt-3">
        <div className="card card-pad">
          <div className="flex items-center justify-between mb-1"><p className="h2">Antrian penilaian</p><Link href="/periksa" className="text-[13px] text-primary font-medium">Buka</Link></div>
          {pending.length === 0 ? <p className="muted mt-2">Tidak ada antrean. Semua sudah dinilai.</p> :
            pending.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2.5 border-t border-line first:border-0">
                <div className="min-w-0 flex-1"><p className="text-[14px] font-medium truncate">{s.siswaNama}</p><p className="muted !text-[12.5px]">{s.kelas} · {assignments.find((a) => a.id === s.assignmentId)?.judul || "Tugas"}</p></div>
                <Badge tone={STATUS_TUGAS_META["belum-diperiksa"].tone}>{STATUS_TUGAS_META["belum-diperiksa"].label}</Badge>
              </div>
            ))}
        </div>
        <div className="card card-pad">
          <div className="flex items-center justify-between mb-1"><p className="h2">Jadwal hari ini</p><Link href="/jadwal" className="text-[13px] text-primary font-medium">Detail</Link></div>
          {jadwalHariIni.length === 0 ? <p className="muted mt-2">Tidak ada pertemuan hari ini.</p> :
            jadwalHariIni.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2 border-t border-line first:border-0 text-[13px]">
                <span className="badge bg-wash text-ink-soft border-line shrink-0 tabular-nums">{e.jamMulai || "—"}–{e.jamSelesai || "—"}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{e.judul}</span>
                {e.kelas ? <span className="badge bg-primary-50 text-primary border-primary-100 shrink-0">{e.kelas}</span> : null}
              </div>
            ))}
          <div className="divider my-3" />
          <p className="h2 mb-1">Pengumuman terkirim ({announcements.length})</p>
          <p className="muted">Kelola pengumuman kelas dari halaman Pengumuman.</p>
        </div>
      </div>
    </div>
  );
}

function AdminDash() {
  const { user, users, assignments, submissions, events } = useStore();
  return (
    <div>
      <PageHeader title={`Halo, ${user?.nama || "Admin"}`} desc="Kesehatan sistem, pengguna, dan kalender akademik." right={<Link href="/admin" className="btn-primary text-[13px]">Kelola sistem</Link>} />
      <div className="grid sm:grid-cols-4 gap-3">
        <Stat label="Total pengguna" value={String(users.length)} sub={`${users.filter((u) => u.role === "siswa").length} siswa`} />
        <Stat label="Guru" value={String(users.filter((u) => u.role === "guru").length)} />
        <Stat label="Tugas & ujian" value={String(assignments.length)} />
        <Stat label="Kiriman masuk" value={String(submissions.length)} />
      </div>
      <div className="card card-pad mt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="h2">Kalender akademik</p>
          <Link href="/jadwal" className="text-[13px] text-primary font-medium">Kelola jadwal &amp; kalender</Link>
        </div>
        <div className="divide-y divide-line">
          {events.filter((e) => e.jenis !== "jadwal").map((e) => (
            <div key={e.id} className="py-2.5 flex gap-3 items-baseline">
              <span className="badge bg-wash text-ink-soft border-line shrink-0">{e.tanggal}</span>
              <div><p className="text-[14px] font-medium">{e.judul}</p><p className="muted !text-[12.5px]">{e.deskripsi}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  return (
    <AppShell>
      <div className="page-wrap !px-0 !pb-0 !max-w-none">
        {!user ? <p className="muted">Memuat…</p> : user.role === "siswa" ? <SiswaDash /> : user.role === "guru" ? <GuruDash /> : <AdminDash />}
      </div>
    </AppShell>
  );
}
