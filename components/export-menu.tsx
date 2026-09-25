"use client";

import { useState } from "react";
import type { Assignment, Submission, User } from "@/lib/types";
import { OPSI_EKSPOR, unduhCsv, unduhXlsx, type FilterEkspor } from "@/lib/export";

/**
 * Menu ekspor hasil siswa (guru & admin): pilih jenis tugas
 * (semua / latihan / LKPD / evaluasi) lalu unduh CSV atau XLSX.
 */
export function ExportMenu({
  submissions,
  assignments,
  users,
  label = "Ekspor hasil",
}: {
  submissions: Submission[];
  assignments: Assignment[];
  users: User[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterEkspor>("semua");
  const [peserta, setPeserta] = useState(0);

  function hitung(f: FilterEkspor) {
    const tipeOf = (sid: string) => assignments.find((a) => a.id === sid)?.tipe;
    return submissions.filter((s) => f === "semua" || tipeOf(s.assignmentId) === f).length;
  }

  return (
    <div className="relative inline-block text-left">
      <button className="btn-ghost text-[13px]" onClick={() => setOpen((v) => !v)} aria-haspopup="dialog" aria-expanded={open}>
        {label} ▾
      </button>
      {open ? (
        <>
          <button className="fixed inset-0 z-30 cursor-default" aria-label="Tutup menu ekspor" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="Ekspor hasil siswa" className="absolute right-0 z-40 mt-2 w-[268px] card shadow-pop p-3.5 space-y-3">
            <div>
              <p className="text-[13px] font-semibold">Ekspor hasil siswa</p>
              <p className="text-[12px] text-ink-faint mt-0.5">Data mengikuti tampilan halaman ini (per jenis tugas, urut alfabet).</p>
            </div>
            <div className="space-y-1">
              <p className="text-[12px] font-medium text-ink-muted">Pilih jenis tugas</p>
              {OPSI_EKSPOR.map((o) => {
                const n = hitung(o.key);
                return (
                  <label key={o.key} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px] cursor-pointer ${filter === o.key ? "border-primary-300 bg-primary-50" : "border-line hover:bg-wash"}`}>
                    <input
                      type="radio"
                      name="ekspor-tipe"
                      className="accent-primary"
                      checked={filter === o.key}
                      onChange={() => { setFilter(o.key); setPeserta(0); }}
                    />
                    <span className="flex-1">{o.label}</span>
                    <span className="text-[12px] text-ink-faint tabular-nums">{n} data</span>
                  </label>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                className="btn-primary !py-2 text-[13px]"
                onClick={() => { if (hitung(filter) > 0) { unduhCsv(submissions, assignments, users, filter); setPeserta(hitung(filter)); } }}
                disabled={hitung(filter) === 0}
              >Unduh CSV</button>
              <button
                className="btn-primary !py-2 text-[13px]"
                onClick={() => { if (hitung(filter) > 0) { unduhXlsx(submissions, assignments, users, filter); setPeserta(hitung(filter)); } }}
                disabled={hitung(filter) === 0}
              >Unduh XLSX</button>
            </div>
            {peserta ? <p className="text-[12px] text-green-700">✓ {peserta} baris berhasil diunduh.</p> : null}
            {hitung(filter) === 0 ? <p className="text-[12px] text-ink-faint">Belum ada data pada jenis ini.</p> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
