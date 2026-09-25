"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { ExportMenu } from "@/components/export-menu";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDateTime, STATUS_TUGAS_META, statusTugas, TIPE_LABEL, TIPE_TONE, TIPEURUT } from "@/lib/utils";
import type { AssignmentType } from "@/lib/types";

type FilterTipe = "semua" | AssignmentType;
type SortKey = "siswa" | "tugas" | "kelas" | "nilai" | "waktu";

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
  const [filter, setFilter] = useState<FilterTipe>("semua");
  /** Sorting kolom — kelompok jenis tugas (latihan/LKPD/evaluasi) selalu dijaga utuh. */
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);

  const tipeOf = (sid: string): AssignmentType => assignments.find((a) => a.id === sid)?.tipe || "latihan";
  const judulDari = (sid: string) => (assignments.find((a) => a.id === sid)?.judul || sid).toLowerCase();
  const kunciSort = (s: (typeof submissions)[number], key: SortKey): string | number => {
    if (key === "siswa") return s.siswaNama.toLowerCase();
    if (key === "tugas") return judulDari(s.assignmentId);
    if (key === "kelas") return s.kelas.toLowerCase();
    if (key === "nilai") return s.nilai ?? -1;
    return s.submittedAt;
  };
  const rows = submissions
    .filter((s) => filter === "semua" || tipeOf(s.assignmentId) === filter)
    .slice()
    .sort((a, b) => {
      // Primer: jenis tugas — agar hasil LKPD, latihan, dan evaluasi tidak tercampur.
      const t = TIPEURUT[tipeOf(a.assignmentId)] - TIPEURUT[tipeOf(b.assignmentId)];
      if (t) return t;
      // Sekunder: kolom yang diklik (default: nama siswa alfabet).
      if (sort) {
        const va = kunciSort(a, sort.key);
        const vb = kunciSort(b, sort.key);
        if (va < vb) return -sort.dir;
        if (va > vb) return sort.dir;
        return a.siswaNama.localeCompare(b.siswaNama, "id");
      }
      return a.siswaNama.localeCompare(b.siswaNama, "id") || b.submittedAt.localeCompare(a.submittedAt);
    });
  const klikSort = (key: SortKey) => setSort((p) => (p?.key === key ? { key, dir: p.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const panah = (key: SortKey) => (sort?.key === key ? (sort.dir === 1 ? "▲" : "▼") : "↕");
  const th = (key: SortKey, label: string) => (
    <th className="px-4 py-2.5 font-medium">
      <button type="button" className={`inline-flex items-center gap-1 hover:text-ink ${sort?.key === key ? "text-ink font-semibold" : ""}`} onClick={() => klikSort(key)}>
        {label}<span className="text-[10px] text-ink-faint">{panah(key)}</span>
      </button>
    </th>
  );
  const hitung = (t: AssignmentType) => submissions.filter((s) => tipeOf(s.assignmentId) === t).length;
  const chips: { key: FilterTipe; label: string }[] = [
    { key: "semua", label: `Semua (${submissions.length})` },
    ...(["latihan", "lkpd", "evaluasi"] as AssignmentType[]).map((t) => ({ key: t, label: `${TIPE_LABEL[t]} (${hitung(t)})` })),
  ];

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader title="Nilai siswa" desc="Pantau seluruh kiriman dan nilai siswa, terkelompok per jenis tugas." right={<ExportMenu submissions={submissions} assignments={assignments} users={users} />} />
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {chips.map((c) => (
          <button
            key={c.key}
            className={`btn !py-1.5 !px-3 !text-[12.5px] ${filter === c.key ? "bg-ink text-white border border-ink" : "btn-ghost"}`}
            onClick={() => setFilter(c.key)}
          >{c.label}</button>
        ))}
        <span className="text-[12px] text-ink-faint ml-auto">
          Urut: per jenis tugas → alfabet nama siswa {sort ? <button className="text-primary font-medium" onClick={() => setSort(null)}>reset</button> : null}
        </span>
      </div>
      {submissions.length === 0 ? <Empty title="Belum ada nilai siswa" desc="Nilai akan muncul setelah siswa mengumpulkan tugas atau evaluasi." /> : rows.length === 0 ? (
        <Empty title="Tidak ada nilai pada jenis ini" desc="Pilih jenis tugas lain pada filter di atas." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[760px]">
              <thead><tr className="text-left text-[12px] text-ink-muted bg-wash/50">{th("siswa", "Siswa")}<th className="px-4 py-2.5 font-medium">Jenis</th>{th("tugas", "Tugas / evaluasi")}{th("kelas", "Kelas")}{th("nilai", "Nilai")}<th className="px-4 py-2.5 font-medium">Status</th>{th("waktu", "Dikumpulkan")}</tr></thead>
              <tbody>{(() => {
                let lastTipe: AssignmentType | null = null;
                return rows.map((s) => {
                  const assignment = assignments.find((a) => a.id === s.assignmentId);
                  const siswa = users.find((u) => u.id === s.siswaId);
                  const meta = STATUS_TUGAS_META[statusTugas(s)];
                  const tipe = tipeOf(s.assignmentId);
                  // Kelompok jenis tugas selalu ditampilkan agar LKPD, latihan, dan evaluasi tidak tercampur.
                  const showHead = filter === "semua" && tipe !== lastTipe;
                  lastTipe = tipe;
                  return (
                    <Fragment key={s.id}>
                      {showHead ? (
                        <tr><td colSpan={7} className="px-4 pt-3 pb-1 text-[12px] font-semibold uppercase tracking-wide text-ink-faint bg-wash/40">{TIPE_LABEL[tipe]} · {rows.filter((x) => tipeOf(x.assignmentId) === tipe).length} data</td></tr>
                      ) : null}
                      <tr className="table-row">
                        <td className="px-4 py-2.5 font-medium">{s.siswaNama}<span className="block text-[12px] text-ink-muted">{siswa?.nisn ? `NISN ${siswa.nisn}` : siswa?.email || s.siswaId}</span></td>
                        <td className="px-4 py-2.5"><Badge tone={TIPE_TONE[tipe]}>{TIPE_LABEL[tipe]}</Badge></td>
                        <td className="px-4 py-2.5">{assignment?.judul || s.assignmentId}</td>
                        <td className="px-4 py-2.5">{s.kelas}</td>
                        <td className="px-4 py-2.5 font-semibold">{s.nilai ?? "—"}</td>
                        <td className="px-4 py-2.5"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                        <td className="px-4 py-2.5 text-ink-muted">{fmtDateTime(s.submittedAt)}</td>
                      </tr>
                    </Fragment>
                  );
                });
              })()}</tbody>
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
