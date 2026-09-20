"use client";

import Link from "next/link";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, PageHeader, Progress } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/utils";

export default function NilaiPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <Content />
      </Guard>
    </AppShell>
  );
}

function Content() {
  const { user, submissions, assignments } = useStore();
  const mine = submissions.filter((s) => s.siswaId === user?.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const graded = mine.filter((s) => s.nilai != null);
  const avg = graded.length ? Math.round(graded.reduce((t, s) => t + (s.nilai || 0), 0) / graded.length) : 0;

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader
        title="Nilai & umpan balik"
        desc="Nilai final terbit setelah guru memverifikasi draf AI."
        right={<a href="/api/export/nilai" className="btn-ghost text-[13px]">Unduh CSV saya</a>}
      />
      <div className="grid sm:grid-cols-3 gap-3 mb-3">
        <div className="card card-pad"><p className="text-[12.5px] text-ink-muted font-medium">Rata-rata</p><p className="text-[26px] font-bold">{graded.length ? avg : "—"}</p><div className="mt-2"><Progress value={avg} /></div></div>
        <div className="card card-pad"><p className="text-[12.5px] text-ink-muted font-medium">Tugas dinilai</p><p className="text-[26px] font-bold">{graded.length}</p><p className="muted">dari {mine.length} kiriman</p></div>
        <div className="card card-pad"><p className="text-[12.5px] text-ink-muted font-medium">Menunggu verifikasi</p><p className="text-[26px] font-bold">{mine.length - graded.length}</p><p className="muted">draf AI / antrean guru</p></div>
      </div>

      {mine.length === 0 ? <Empty title="Belum ada nilai" desc="Kerjakan latihan atau evaluasi untuk melihat hasilnya di sini." action={<Link href="/tugas" className="btn-primary text-[13px]">Ke tugas</Link>} /> : (
        <div className="space-y-3">
          {mine.map((s) => {
            const a = assignments.find((x) => x.id === s.assignmentId);
            return (
              <div key={s.id} className="card card-pad">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14.5px] font-semibold">{a?.judul || s.assignmentId}</span>
                  <span className="ml-auto text-[12.5px] text-ink-faint">{fmtDateTime(s.submittedAt)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {s.nilai != null ? <span className="text-[22px] font-bold">{s.nilai}</span> : <Badge tone="amber">Menunggu verifikasi guru</Badge>}
                  {s.status === "draf-ai" ? <Badge tone="purple">Draf AI</Badge> : null}
                  {s.cheatCount > 0 ? <Badge tone="red">{s.cheatCount}x pindah tab</Badge> : null}
                </div>
                {s.feedbackGuru ? <p className="mt-2 text-[13.5px] bg-wash border border-line rounded-lg px-3 py-2"><b>Catatan guru:</b> {s.feedbackGuru}</p> : null}
                <details className="mt-2">
                  <summary className="text-[13px] text-primary cursor-pointer font-medium">Umpan balik per soal</summary>
                  <div className="mt-2 space-y-1.5">
                    {Object.entries(s.feedbackAi).map(([qid, f]) => (
                      <div key={qid} className="text-[13px] border border-line rounded-lg px-3 py-2">
                        <b>{qid}</b> · skor {f.skor} {f.draft ? <span className="text-ink-faint">(draf AI)</span> : null}
                        <p className="text-ink-soft">{f.feedback}</p>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
