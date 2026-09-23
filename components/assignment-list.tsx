"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { TaskModal } from "@/components/task-modal";
import { SubmissionStatus } from "@/components/submission-status";
import { useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/utils";
import type { Assignment } from "@/lib/types";

const META = {
  lkpd: {
    title: "LKPD",
    desc: "Lembar kerja peserta didik eksploratif — kerjakan, unggah foto bila perlu, lalu kumpulkan.",
    create: "Buat LKPD",
    empty: "Belum ada LKPD",
  },
  latihan: {
    title: "Latihan soal",
    desc: "Latihan soal untuk memperkuat pemahaman. PG dinilai otomatis, uraian & essay diverifikasi guru.",
    create: "Buat latihan",
    empty: "Belum ada latihan soal",
  },
} as const;

/** Daftar LKPD / Latihan — termasuk aksi kelola (guru/admin) & status pengumpulan. */
export function AssignmentList({ tipe }: { tipe: "lkpd" | "latihan" }) {
  const { assignments, submissions, user, upsertAssignment, deleteAssignment, addNotification } = useStore();
  const router = useRouter();
  const [tOpen, setTOpen] = useState(false);
  const [editT, setEditT] = useState<Assignment | null>(null);

  const meta = META[tipe];
  const manage = user?.role === "guru" || user?.role === "admin";
  const items = assignments.filter((a) => a.tipe === tipe);
  const done = new Set(submissions.filter((s) => s.siswaId === user?.id).map((s) => s.assignmentId));

  return (
    <div>
      <PageHeader
        title={meta.title}
        desc={meta.desc}
        right={manage ? <button className="btn-primary text-[13px]" onClick={() => { setEditT(null); setTOpen(true); }}>{meta.create}</button> : undefined}
      />
      {items.length === 0 ? (
        <Empty title={meta.empty} desc={manage ? `Klik "${meta.create}" untuk membuat yang pertama.` : undefined} />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div
              key={a.id}
              className="card card-pad hover:border-primary-200 transition-colors cursor-pointer"
              onClick={() => router.push(`/tugas/${a.id}`)}
              role="link"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={tipe === "lkpd" ? "purple" : "blue"}>{tipe.toUpperCase()}</Badge>
                <Badge>{a.kelas}</Badge>
                {user?.role === "siswa" ? (done.has(a.id) ? <Badge tone="green">Selesai</Badge> : <Badge tone="amber">Belum dikerjakan</Badge>) : null}
                {manage ? <SubmissionStatus assignment={a} /> : null}
                <span className="ml-auto text-[12.5px] text-ink-faint">Tutup {fmtDateTime(a.tutupAt)}</span>
              </div>
              <p className="text-[15.5px] font-semibold mt-2">{a.judul}</p>
              <p className="muted mt-0.5 line-clamp-2">{a.deskripsi}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <p className="text-[12.5px] text-ink-faint">{a.questions.length} soal · PG dinilai otomatis</p>
                {manage ? (
                  <div className="ml-auto flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => { setEditT(a); setTOpen(true); }}>Ubah</button>
                    <button className="btn-danger !py-1.5 !text-[12.5px]" onClick={() => deleteAssignment(a.id)}>Hapus</button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskModal
        open={tOpen}
        initial={editT}
        presetTipe={tipe}
        onClose={() => setTOpen(false)}
        onSave={(a, isNew) => {
          upsertAssignment(a);
          if (isNew) addNotification({ userId: "all-siswa", kategori: "tugas", judul: `${a.tipe === "evaluasi" ? "Evaluasi baru" : "Tugas baru"}: ${a.judul}`, isi: a.deskripsi.slice(0, 120) });
          setTOpen(false);
        }}
        author={user?.nama || "Guru"}
      />
    </div>
  );
}
