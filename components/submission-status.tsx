"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Modal } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDateTime, STATUS_TUGAS_META, statusTugas } from "@/lib/utils";
import type { Assignment } from "@/lib/types";

/**
 * Badge "x/y mengumpulkan" + modal daftar siswa yang sudah / belum submit.
 * Hanya tampil untuk guru & admin.
 */
export function SubmissionStatus({ assignment }: { assignment: Assignment }) {
  const { submissions, users, user } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!user || (user.role !== "guru" && user.role !== "admin")) return null;

  const subs = submissions.filter((s) => s.assignmentId === assignment.id);
  const submittedIds = new Set(subs.map((s) => s.siswaId));
  const roster = users.filter((u) => u.role === "siswa" && u.kelas === assignment.kelas);
  const extra = subs.filter((s) => !roster.some((r) => r.id === s.siswaId));
  const rows: { id: string; nama: string; kelas: string; nisn?: string; foto?: string; sub?: (typeof subs)[number] }[] = [
    ...roster.map((u) => ({ id: u.id, nama: u.nama, kelas: u.kelas, nisn: u.nisn, foto: u.fotoProfil, sub: subs.find((s) => s.siswaId === u.id) })),
    ...extra.map((s) => ({ id: s.siswaId, nama: s.siswaNama, kelas: s.kelas, sub: s })),
  ];
  const total = Math.max(roster.length, submittedIds.size);
  const submittedCount = submittedIds.size;
  const ringkas = { belum: 0, blm: 0, sdh: 0 };
  rows.forEach((r) => {
    const st = statusTugas(r.sub);
    if (st === "belum") ringkas.belum += 1;
    else if (st === "belum-diperiksa") ringkas.blm += 1;
    else ringkas.sdh += 1;
  });

  return (
    <>
      <button
        type="button"
        title="Lihat daftar pengumpul"
        className="badge bg-primary-50 text-primary border-primary-100 hover:border-primary-300"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
      >
        {submittedCount}/{total} mengumpulkan
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Pengumpul — ${assignment.judul}`} wide>
        <p className="text-[12.5px] text-ink-muted mb-2">{ringkas.belum} belum mengerjakan · {ringkas.blm} belum diperiksa · {ringkas.sdh} sudah diperiksa</p>
        <div className="space-y-1.5">
          {rows.length === 0 ? <p className="muted">Belum ada daftar siswa untuk kelas {assignment.kelas}.</p> : rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
              {r.foto ? (
                <img src={r.foto} alt={r.nama} className="h-8 w-8 rounded-full object-cover shrink-0" />
              ) : (
                <span className="h-8 w-8 rounded-full bg-wash border border-line flex items-center justify-center text-[12px] font-semibold text-ink-soft shrink-0">{r.nama.slice(0, 1).toUpperCase()}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium truncate">{r.nama}</p>
                <p className="text-[12px] text-ink-faint">{r.kelas}{r.nisn ? ` · NISN ${r.nisn}` : ""}</p>
              </div>
              {(() => {
                const st = statusTugas(r.sub);
                const meta = STATUS_TUGAS_META[st];
                return (
                  <div className="text-right shrink-0">
                    <Badge tone={meta.tone}>{meta.label}{st === "sudah" && r.sub?.nilai != null ? ` · ${r.sub.nilai}` : ""}</Badge>
                    {r.sub ? <p className="text-[11.5px] text-ink-faint mt-0.5">{fmtDateTime(r.sub.submittedAt)}</p> : null}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary flex-1" onClick={() => { setOpen(false); router.push("/periksa"); }}>Buka halaman periksa</button>
          <button className="btn-ghost" onClick={() => setOpen(false)}>Tutup</button>
        </div>
      </Modal>
    </>
  );
}
