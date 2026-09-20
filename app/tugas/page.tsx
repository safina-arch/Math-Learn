"use client";

import Link from "next/link";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/utils";

export default function TugasPage() {
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
  const items = assignments.filter((a) => a.tipe !== "evaluasi");
  const done = new Set(submissions.filter((s) => s.siswaId === user?.id).map((s) => s.assignmentId));

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader title="Tugas" desc="LKPD eksploratif dan latihan untuk memperkuat pemahaman." right={user?.role === "guru" || user?.role === "admin" ? <Link href="/kelola" className="btn-primary text-[13px]">Buat tugas</Link> : undefined} />
      {items.length === 0 ? <Empty title="Belum ada tugas" /> : (
        <div className="space-y-3">
          {items.map((a) => (
            <Link key={a.id} href={`/tugas/${a.id}`} className="card card-pad block hover:border-primary-200 transition-colors">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={a.tipe === "lkpd" ? "purple" : "blue"}>{a.tipe.toUpperCase()}</Badge>
                <Badge>{a.kelas}</Badge>
                {user?.role === "siswa" ? (done.has(a.id) ? <Badge tone="green">Selesai</Badge> : <Badge tone="amber">Belum dikerjakan</Badge>) : null}
                <span className="ml-auto text-[12.5px] text-ink-faint">Tutup {fmtDateTime(a.tutupAt)}</span>
              </div>
              <p className="text-[15.5px] font-semibold mt-2">{a.judul}</p>
              <p className="muted mt-0.5 line-clamp-2">{a.deskripsi}</p>
              <p className="text-[12.5px] text-ink-faint mt-1.5">{a.questions.length} soal · PG dinilai otomatis</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
