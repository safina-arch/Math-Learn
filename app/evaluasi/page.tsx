"use client";

import Link from "next/link";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/utils";

export default function EvaluasiPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <List />
      </Guard>
    </AppShell>
  );
}

function List() {
  const { assignments, submissions, user } = useStore();
  const items = assignments.filter((a) => a.tipe === "evaluasi");
  const mine = new Map(submissions.filter((s) => s.siswaId === user?.id).map((s) => [s.assignmentId, s]));

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader title="Evaluasi" desc="Ujian berdurasi dengan pengawasan sistem. Baca aturan sebelum mulai." right={user?.role === "guru" || user?.role === "admin" ? <Link href="/kelola" className="btn-primary text-[13px]">Buat evaluasi</Link> : undefined} />
      <div className="card card-pad mb-3 !border-amber-200 !bg-amber-50/60">
        <p className="text-[13.5px] font-semibold">Aturan ujian</p>
        <ul className="text-[13px] text-ink-soft list-disc pl-5 mt-1 space-y-0.5">
          <li>Timer berjalan mundur dan otomatis mengumpulkan saat habis.</li>
          <li>Jangan pindah tab / minimize — setiap pelanggaran dicatat + dilaporkan ke guru.</li>
          <li>Satu siswa satu kiriman per evaluasi (kumpulkan ulang menimpa).</li>
        </ul>
      </div>
      {items.length === 0 ? <Empty title="Belum ada evaluasi" /> : (
        <div className="space-y-3">
          {items.map((a) => {
            const s = mine.get(a.id);
            return (
              <Link key={a.id} href={`/evaluasi/${a.id}`} className="card card-pad block hover:border-primary-200 transition-colors">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="red">EVALUASI</Badge>
                  <Badge>{a.durasiMenit} menit</Badge>
                  {user?.role === "siswa" ? (s ? <Badge tone="green">Sudah dikumpulkan{s.cheatCount ? ` · ${s.cheatCount}x pelanggaran` : ""}</Badge> : <Badge tone="amber">Belum dikerjakan</Badge>) : null}
                  <span className="ml-auto text-[12.5px] text-ink-faint">{fmtDateTime(a.bukaAt)} – {fmtDateTime(a.tutupAt)}</span>
                </div>
                <p className="text-[15.5px] font-semibold mt-2">{a.judul}</p>
                <p className="muted mt-0.5 line-clamp-2">{a.deskripsi}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
