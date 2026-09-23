"use client";

import Link from "next/link";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDateTime, STATUS_TUGAS_META, statusTugas } from "@/lib/utils";

export default function NilaiPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <Content />
      </Guard>
    </AppShell>
  );
}

function AdminGrades({ submissions, assignments, users }: { submissions: ReturnType<typeof useStore>["submissions"]; assignments: ReturnType<typeof useStore>["assignments"]; users: ReturnType<typeof useStore>["users"] }) {
  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader title="Nilai siswa" desc="Pantau seluruh kiriman dan nilai siswa." right={<a href="/api/export/nilai" className="btn-ghost text-[13px]">Ekspor CSV</a>} />
      {submissions.length === 0 ? <Empty title="Belum ada nilai siswa" desc="Nilai akan muncul setelah siswa mengumpulkan tugas atau evaluasi." /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[720px]">
              <thead><tr className="text-left text-[12px] text-ink-muted bg-wash/50"><th className="px-4 py-2.5 font-medium">Siswa</th><th className="px-4 py-2.5 font-medium">Tugas / evaluasi</th><th className="px-4 py-2.5 font-medium">Kelas</th><th className="px-4 py-2.5 font-medium">Nilai</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium">Dikumpulkan</th></tr></thead>
              <tbody>{submissions.map((s) => {
                const assignment = assignments.find((a) => a.id === s.assignmentId);
                const siswa = users.find((u) => u.id === s.siswaId);
                const meta = STATUS_TUGAS_META[statusTugas(s)];
                return <tr key={s.id} className="table-row"><td className="px-4 py-2.5 font-medium">{s.siswaNama}<span className="block text-[12px] text-ink-muted">{siswa?.nisn ? `NISN ${siswa.nisn}` : siswa?.email || s.siswaId}</span></td><td className="px-4 py-2.5">{assignment?.judul || s.assignmentId}</td><td className="px-4 py-2.5">{s.kelas}</td><td className="px-4 py-2.5 font-semibold">{s.nilai ?? "—"}</td><td className="px-4 py-2.5"><Badge tone={meta.tone}>{meta.label}</Badge></td><td className="px-4 py-2.5 text-ink-muted">{fmtDateTime(s.submittedAt)}</td></tr>;
              })}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Content() {
  const { user, submissions, assignments, users } = useStore();
  if (user?.role === "admin") return <AdminGrades submissions={submissions} assignments={assignments} users={users} />;

  // Siswa: hanya skor terakhir yang sudah diperiksa guru yang ditampilkan.
  const mine = submissions.filter((s) => s.siswaId === user?.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const graded = mine.filter((s) => s.status === "dinilai" && s.nilai != null);
  const last = graded[0] || null;
  const lastAssign = last ? assignments.find((a) => a.id === last.assignmentId) : null;

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader
        title="Nilai & umpan balik"
        desc="Skor terakhir yang sudah diperiksa guru tampil di sini. Kiriman yang belum diperiksa tidak ditampilkan."
        right={<a href="/api/export/nilai" className="btn-ghost text-[13px]">Unduh CSV saya</a>}
      />
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <div className="card card-pad">
          <p className="text-[12.5px] text-ink-muted font-medium">Skor terakhir (sudah diperiksa)</p>
          <p className="text-[26px] font-bold">{last?.nilai ?? "—"}</p>
          <p className="muted">{lastAssign ? `${lastAssign.judul} · ${fmtDateTime(last.submittedAt)}` : "menunggu guru memeriksa"}</p>
        </div>
        <div className="card card-pad">
          <p className="text-[12.5px] text-ink-muted font-medium">Menunggu pemeriksaan guru</p>
          <p className="text-[26px] font-bold">{mine.length - graded.length}</p>
          <p className="muted">kiriman belum diperiksa</p>
        </div>
      </div>

      {last && lastAssign ? (
        <div className="card card-pad">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-semibold">{lastAssign.judul}</span>
            <Badge tone="green">Sudah diperiksa</Badge>
            <span className="ml-auto text-[12.5px] text-ink-faint">{fmtDateTime(last.submittedAt)}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[26px] font-bold">{last.nilai}</span>
            {last.cheatCount > 0 ? <Badge tone="red">{last.cheatCount}x pindah tab</Badge> : null}
          </div>
          {last.feedbackGuru ? <p className="mt-2 text-[13.5px] bg-wash border border-line rounded-lg px-3 py-2"><b>Catatan guru:</b> {last.feedbackGuru}</p> : null}
          {Object.keys(last.feedbackAi).length ? (
            <details className="mt-2">
              <summary className="text-[13px] text-primary cursor-pointer font-medium">Umpan balik per soal</summary>
              <div className="mt-2 space-y-1.5">
                {Object.entries(last.feedbackAi).map(([qid, f]) => {
                  const qIndex = lastAssign.questions.findIndex((q) => q.id === qid);
                  const qText = qIndex >= 0 ? lastAssign.questions[qIndex].teks : "";
                  return (
                    <div key={qid} className="text-[13px] border border-line rounded-lg px-3 py-2">
                      <b>{qIndex >= 0 ? `Soal ${qIndex + 1}` : qid}</b> · skor {f.skor} {f.draft ? <span className="text-ink-faint">(draf AI)</span> : null}
                      {qText ? <p className="text-ink-faint text-[12.5px] truncate">{qText}</p> : null}
                      <p className="text-ink-soft">{f.feedback}</p>
                    </div>
                  );
                })}
              </div>
            </details>
          ) : null}
        </div>
      ) : (
        <Empty
          title="Belum ada skor yang diperiksa"
          desc={mine.length ? "Kirimanmu sedang menunggu pemeriksaan guru. Skor akan tampil setelah diperiksa." : "Kerjakan latihan atau evaluasi untuk melihat hasilnya di sini."}
          action={<Link href="/latihan" className="btn-primary text-[13px]">Mulai latihan</Link>}
        />
      )}
    </div>
  );
}
