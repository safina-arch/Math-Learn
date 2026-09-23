"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/shell";
import { Badge, PageHeader, Progress, Stat } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/utils";

function SiswaDash() {
  const { user, assignments, submissions, announcements, materials } = useStore();
  const mine = submissions.filter((s) => s.siswaId === user?.id);
  const doneIds = new Set(mine.map((s) => s.assignmentId));
  const upcoming = assignments.filter((a) => !doneIds.has(a.id)).slice(0, 4);
  const last = mine.find((s) => s.nilai != null);
  const lastAssign = last ? assignments.find((a) => a.id === last.assignmentId) : null;
  const progress = assignments.length ? Math.round((doneIds.size / assignments.length) * 100) : 0;

  return (
    <div>
      <PageHeader title={`Halo, ${user?.nama || "Siswa"}`} desc="Ringkasan belajarmu hari ini. Fokus ke satu tugas dalam satu waktu." />
      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="Tugas mendatang" value={String(upcoming.length)} sub="belum dikumpulkan" />
        <Stat label="Nilai terakhir" value={last?.nilai != null ? String(last.nilai) : "—"} sub={lastAssign?.judul.slice(0, 34) || "belum ada nilai"} />
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
            <p className="h2 mb-2">Pengumuman penting</p>
            {announcements.slice(0, 3).map((a) => (
              <div key={a.id} className="py-2 border-t border-line first:border-0 first:pt-0">
                <p className="text-[13.5px] font-semibold">{a.judul}</p>
                <p className="text-[12.5px] text-ink-muted line-clamp-2 mt-0.5">{a.isi}</p>
              </div>
            ))}
            <Link href="/pengumuman" className="text-[13px] text-primary font-medium mt-2 inline-block">Semua pengumuman</Link>
          </div>
          {last ? (
            <div className="card card-pad">
              <p className="h2">Umpan balik terakhir</p>
              <p className="text-[26px] font-bold mt-1">{last.nilai}</p>
              <p className="muted">{last.feedbackGuru || "Menunggu catatan guru."}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function GuruDash() {
  const { user, submissions, assignments, cheatLogs, announcements } = useStore();
  const pending = submissions.filter((s) => s.status !== "dinilai");
  const activeEval = assignments.filter((a) => a.tipe === "evaluasi");

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
        <Stat label="Peringatan kecurangan" value={String(cheatLogs.length)} sub="total deteksi pindah tab" />
      </div>
      <div className="grid lg:grid-cols-2 gap-3 mt-3">
        <div className="card card-pad">
          <div className="flex items-center justify-between mb-1"><p className="h2">Antrian penilaian</p><Link href="/periksa" className="text-[13px] text-primary font-medium">Buka</Link></div>
          {pending.length === 0 ? <p className="muted mt-2">Tidak ada antrean. Semua sudah dinilai.</p> :
            pending.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2.5 border-t border-line first:border-0">
                <div className="min-w-0 flex-1"><p className="text-[14px] font-medium truncate">{s.siswaNama}</p><p className="muted !text-[12.5px]">{s.kelas} · {s.cheatCount > 0 ? `${s.cheatCount}x pindah tab` : "tanpa pelanggaran"}</p></div>
                <Badge tone={s.status === "draf-ai" ? "purple" : "amber"}>{s.status === "draf-ai" ? "Draf AI" : "Menunggu"}</Badge>
              </div>
            ))}
        </div>
        <div className="card card-pad">
          <div className="flex items-center justify-between mb-1"><p className="h2">Peringatan kecurangan terbaru</p><Link href="/periksa" className="text-[13px] text-primary font-medium">Detail</Link></div>
          {cheatLogs.length === 0 ? <p className="muted mt-2">Belum ada pelanggaran tercatat.</p> :
            cheatLogs.slice(0, 5).map((c) => (
              <div key={c.id} className="py-2 border-t border-line first:border-0 text-[13px]">
                <b>{c.siswaNama}</b> <span className="text-ink-muted">pindah tab ({c.tipe}) · {fmtDateTime(c.timestamp)}</span>
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
        <p className="h2 mb-2">Kalender akademik</p>
        <div className="divide-y divide-line">
          {events.map((e) => (
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
