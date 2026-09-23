"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { TaskModal } from "@/components/task-modal";
import { SubmissionStatus } from "@/components/submission-status";
import { useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/utils";
import type { Assignment } from "@/lib/types";

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
  const { assignments, submissions, user, upsertAssignment, deleteAssignment, addNotification } = useStore();
  const router = useRouter();
  const [tOpen, setTOpen] = useState(false);
  const [editT, setEditT] = useState<Assignment | null>(null);
  const manage = user?.role === "guru" || user?.role === "admin";

  const items = assignments.filter((a) => a.tipe === "evaluasi");
  const mine = new Map(submissions.filter((s) => s.siswaId === user?.id).map((s) => [s.assignmentId, s]));

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader
        title="Evaluasi"
        desc="Ujian berdurasi dengan pengawasan sistem. Baca aturan sebelum mulai."
        right={manage ? <button className="btn-primary text-[13px]" onClick={() => { setEditT(null); setTOpen(true); }}>+ Evaluasi</button> : undefined}
      />
      <div className="card card-pad mb-3 !border-amber-200 !bg-amber-50/60">
        <p className="text-[13.5px] font-semibold">Aturan ujian</p>
        <ul className="text-[13px] text-ink-soft list-disc pl-5 mt-1 space-y-0.5">
          <li>Timer berjalan mundur dan otomatis mengumpulkan saat habis.</li>
          <li>Jangan pindah tab / minimize — setiap pelanggaran dicatat + dilaporkan ke guru.</li>
          <li>Satu siswa satu kiriman per evaluasi (kumpulkan ulang menimpa).</li>
        </ul>
      </div>
      {items.length === 0 ? <Empty title="Belum ada evaluasi" desc={manage ? "Klik \"+ Evaluasi\" untuk membuat yang pertama." : undefined} /> : (
        <div className="space-y-3">
          {items.map((a) => {
            const s = mine.get(a.id);
            return (
              <div
                key={a.id}
                className="card card-pad hover:border-primary-200 transition-colors cursor-pointer"
                onClick={() => router.push(`/evaluasi/${a.id}`)}
                role="link"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="red">EVALUASI</Badge>
                  <Badge>{a.durasiMenit} menit</Badge>
                  {user?.role === "siswa" ? (s ? <Badge tone="green">Sudah dikumpulkan{s.cheatCount ? ` · ${s.cheatCount}x pelanggaran` : ""}</Badge> : <Badge tone="amber">Belum dikerjakan</Badge>) : null}
                  {manage ? <SubmissionStatus assignment={a} /> : null}
                  <span className="ml-auto text-[12.5px] text-ink-faint">{fmtDateTime(a.bukaAt)} – {fmtDateTime(a.tutupAt)}</span>
                </div>
                <p className="text-[15.5px] font-semibold mt-2">{a.judul}</p>
                <p className="muted mt-0.5 line-clamp-2">{a.deskripsi}</p>
                {manage ? (
                  <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => { setEditT(a); setTOpen(true); }}>Ubah</button>
                    <button className="btn-danger !py-1.5 !text-[12.5px]" onClick={() => deleteAssignment(a.id)}>Hapus</button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <TaskModal
        open={tOpen}
        initial={editT}
        presetTipe="evaluasi"
        onClose={() => setTOpen(false)}
        onSave={(a, isNew) => {
          upsertAssignment(a);
          if (isNew) addNotification({ userId: "all-siswa", kategori: "evaluasi", judul: `Evaluasi baru: ${a.judul}`, isi: a.deskripsi.slice(0, 120) });
          setTOpen(false);
        }}
        author={user?.nama || "Guru"}
      />
    </div>
  );
}
