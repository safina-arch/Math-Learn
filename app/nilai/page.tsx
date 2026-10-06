"use client";

import Link from "next/link";
import { AppShell, Guard } from "@/components/shell";
import { ExportMenu } from "@/components/export-menu";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { barisHasil, statusHasil } from "@/components/lkpd/hasil";
import { HasilKirimanGuru } from "@/components/kiriman-guru";
import { useStore } from "@/lib/store";
import { fmtDateTime, statusTugas, TIPE_LABEL } from "@/lib/utils";

export default function NilaiPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <Content />
      </Guard>
    </AppShell>
  );
}

/**
 * Guru & admin kini memakai panel penilaian yang SAMA dengan "Hasil siswa"
 * (papan langkah Learning Journey + tabel terurut + modal periksa) sehingga
 * tidak ada kiriman yang terlihat di satu halaman tapi tidak di halaman lain.
 */
function AdminGrades() {
  const { submissions, assignments, users } = useStore();
  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader
        title="Nilai siswa"
        desc="Saring per jenis/kelas/tugas, urutkan per kolom, lalu periksa & terbitkan nilai ke siswa."
        right={<ExportMenu submissions={submissions} assignments={assignments} users={users} />}
      />
      <HasilKirimanGuru />
    </div>
  );
}

function Content() {
  const { user, submissions, assignments, users, lkpdTopics, lkpdProgress } = useStore();
  // Guru & admin sama-sama membuka panel "Nilai siswa" (bukan tampilan siswa).
  if (user?.role === "admin" || user?.role === "guru") return <AdminGrades />;

  // Siswa: kiriman miliknya — status membedakan mana yang masih menunggu & mana yang sudah fiks.
  const mine = submissions.filter((s) => s.siswaId === user?.id && assignments.some((a) => a.id === s.assignmentId)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  // "Sudah diperiksa" hanya bila guru/admin benar-benar menerbitkan hasil.
  const graded = mine.filter((s) => statusTugas(s) === "sudah" && s.nilai != null);
  const last = graded[0] || null;
  const lastAssign = last ? assignments.find((a) => a.id === last.assignmentId) : null;
  const lkpdRows = barisHasil(lkpdTopics, lkpdProgress, users).filter((r) => r.siswaId === user?.id);

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader
        title="Nilai & umpan balik"
        desc="Status menandai kiriman mana yang masih Belum diperiksa dan mana yang sudah diperiksa guru beserta nilai & feedback-nya."
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

      {/* Nilai LKPD (learning journey) siswa — lengkap dengan status verifikasi. */}
      {lkpdRows.length ? (
        <div className="card overflow-hidden mb-3">
          <div className="px-4 py-2.5 border-b border-line text-[13px] font-semibold">📊 Nilai LKPD (Learning Journey)</div>
          <div className="divide-y divide-line">
            {lkpdRows.map((r) => {
              const st = statusHasil(r);
              return (
                <div key={r.key} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-medium">{r.submateri}</p>
                      <p className="muted !text-[12.5px]">{r.materi} · {r.progres} · {fmtDateTime(r.updatedAt)}</p>
                    </div>
                    <span className="ml-auto text-[22px] font-bold" title={r.nilai == null ? "Belum dinilai" : undefined}>
                      {r.nilai ?? "—"}
                    </span>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  {r.feedbackGuru ? (
                    <p className="mt-2 text-[13px] bg-wash border border-line rounded-lg px-3 py-2">
                      💬 <b>Feedback guru:</b> {r.feedbackGuru}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Riwayat kiriman — menunggu verifikasi vs sudah fiks. */}
      <div className="card overflow-hidden mb-3">
        <div className="px-4 py-2.5 border-b border-line text-[13px] font-semibold">📋 Riwayat kiriman (latihan · LKPD · evaluasi)</div>
        {mine.length === 0 ? (
          <p className="muted px-4 py-4">Belum ada kiriman — kerjakan latihan atau evaluasi untuk melihat hasilnya di sini.</p>
        ) : (
          <div className="divide-y divide-line">
            {mine.map((s) => {
              const a = assignments.find((x) => x.id === s.assignmentId);
              const st = statusTugas(s);
              return (
                <div key={s.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-medium">{a?.judul || <span className="italic text-ink-faint">Tugas sudah dihapus</span>}</p>
                      <p className="muted !text-[12.5px]">{a ? TIPE_LABEL[a.tipe] : ""} · dikumpulkan {fmtDateTime(s.submittedAt)}</p>
                    </div>
                    <span className="ml-auto text-[20px] font-bold">{s.nilai ?? "—"}</span>
                    <Badge tone={st === "sudah" ? "green" : "amber"}>
                      {st === "sudah" ? "Sudah diperiksa ✓" : "Belum diperiksa"}
                    </Badge>
                  </div>
                  {st === "sudah" && s.feedbackGuru ? (
                    <p className="mt-2 text-[13px] bg-wash border border-line rounded-lg px-3 py-2">
                      💬 <b>Feedback guru:</b> {s.feedbackGuru}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
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
          </div>
          {last.feedbackGuru ? <p className="mt-2 text-[13.5px] bg-wash border border-line rounded-lg px-3 py-2"><b>Catatan guru:</b> {last.feedbackGuru}</p> : null}
          {Object.keys(last.feedbackAi || {}).length ? (
            <details className="mt-2">
              <summary className="text-[13px] text-primary cursor-pointer font-medium">Umpan balik per soal</summary>
              <div className="mt-2 space-y-1.5">
                {Object.entries(last.feedbackAi || {}).map(([qid, f]) => {
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
