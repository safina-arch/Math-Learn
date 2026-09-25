"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { TaskModal } from "@/components/task-modal";
import { SubmissionStatus } from "@/components/submission-status";
import { useStore } from "@/lib/store";
import { fmtDateTime, JENDELA_META, jendelaEvaluasi } from "@/lib/utils";
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

  // Tick tiap 30 detik agar status buka/kunci otomatis ikut berubah tanpa refresh.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  void tick;

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
          <li>Satu kesempatan — evaluasi hanya bisa dikerjakan satu kali.</li>
          <li>Jangan pindah tab / minimize — setiap pelanggaran dicatat + dilaporkan ke guru.</li>
          <li>Evaluasi <b>otomatis terbuka &amp; terkunci</b> sesuai jadwal waktu yang ditentukan guru/admin.</li>
        </ul>
      </div>
      {items.length === 0 ? <Empty title="Belum ada evaluasi" desc={manage ? "Klik \"+ Evaluasi\" untuk membuat yang pertama." : undefined} /> : (
        <div className="space-y-3">
          {items.map((a) => {
            const s = mine.get(a.id);
            const jendela = jendelaEvaluasi(a);
            const meta = JENDELA_META[jendela];
            const clickable = user?.role === "siswa";
            return (
              <div
                key={a.id}
                className={`card card-pad transition-colors ${clickable ? "hover:border-primary-200 cursor-pointer" : ""}`}
                onClick={clickable ? () => router.push(`/evaluasi/${a.id}`) : undefined}
                role={clickable ? "link" : undefined}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="red">EVALUASI</Badge>
                  <Badge>{a.durasiMenit} menit</Badge>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                  {user?.role === "siswa" ? (s ? <Badge tone="green">Sudah dikerjakan</Badge> : jendela === "buka" ? <Badge tone="amber">Belum dikerjakan</Badge> : null) : null}
                  {manage ? <SubmissionStatus assignment={a} /> : null}
                  <span className="ml-auto text-[12.5px] text-ink-faint">
                    {a.bukaAt ? `Buka ${fmtDateTime(a.bukaAt)}` : "Buka kapan saja"}{a.tutupAt ? ` · Tutup ${fmtDateTime(a.tutupAt)}` : ""}
                  </span>
                </div>
                <p className="text-[15.5px] font-semibold mt-2">{a.judul}</p>
                <p className="muted mt-0.5 line-clamp-2">{a.deskripsi}</p>
                {manage ? (
                  <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => { setEditT(a); setTOpen(true); }}>Ubah</button>
                    {user?.role === "admin" ? (
                      <button
                        className={`!py-1.5 !text-[12.5px] rounded-md border px-3 font-medium ${a.terkunci ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}
                        onClick={() => upsertAssignment({ ...a, terkunci: !a.terkunci })}
                      >{a.terkunci ? "Buka kunci" : "Kunci evaluasi"}</button>
                    ) : null}
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
