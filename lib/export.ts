import * as XLSX from "xlsx";
import type { Assignment, AssignmentType, Submission, User } from "./types";
import { STATUS_TUGAS_META, statusTugas, TIPE_LABEL } from "./utils";

export type FilterEkspor = "semua" | AssignmentType;

export const OPSI_EKSPOR: { key: FilterEkspor; label: string }[] = [
  { key: "semua", label: "Semua jenis" },
  { key: "latihan", label: "Latihan soal" },
  { key: "lkpd", label: "LKPD" },
  { key: "evaluasi", label: "Evaluasi" },
];

/** Label nama file per jenis filter, mis. hasil-siswa-latihan.csv */
function namaFileBase(filter: FilterEkspor): string {
  const tipe = filter === "semua" ? "semua" : filter;
  return `hasil-siswa-${tipe}`;
}

/**
 * Susun data hasil siswa (persis seperti tampilan halaman hasil siswa):
 * dikelompokkan per jenis tugas (latihan → LKPD → evaluasi) lalu urut alfabet nama.
 */
export function dataHasilSiswa(
  submissions: Submission[],
  assignments: Assignment[],
  users: User[],
  filter: FilterEkspor = "semua",
): { header: string[]; rows: (string | number)[][]; jumlah: number } {
  const tipeOf = (sid: string): AssignmentType => assignments.find((a) => a.id === sid)?.tipe || "latihan";
  const urutTipe: Record<AssignmentType, number> = { latihan: 0, lkpd: 1, evaluasi: 2 };
  const rowsData = submissions
    .filter((s) => filter === "semua" || tipeOf(s.assignmentId) === filter)
    .slice()
    .sort((a, b) => {
      const t = urutTipe[tipeOf(a.assignmentId)] - urutTipe[tipeOf(b.assignmentId)];
      if (t) return t;
      const n = a.siswaNama.localeCompare(b.siswaNama, "id");
      return n || b.submittedAt.localeCompare(a.submittedAt);
    });

  const header = ["No", "Nama Siswa", "Kelas", "Jenis Tugas", "Tugas / Evaluasi", "Status", "Nilai", "Dikumpulkan"];
  const rows: (string | number)[][] = rowsData.map((s, i) => {
    const a = assignments.find((x) => x.id === s.assignmentId);
    const siswa = users.find((u) => u.id === s.siswaId);
    const tipe = tipeOf(s.assignmentId);
    const meta = STATUS_TUGAS_META[statusTugas(s)];
    const waktu = s.submittedAt
      ? new Date(s.submittedAt).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "—";
    return [
      i + 1,
      s.siswaNama,
      s.kelas || siswa?.kelas || "—",
      TIPE_LABEL[tipe],
      a?.judul || s.assignmentId,
      meta.label,
      s.nilai ?? "-",
      waktu,
    ];
  });
  return { header, rows, jumlah: rows.length };
}

function unduh(blob: Blob, namaFile: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** Unduh hasil siswa sebagai CSV (UTF-8 BOM agar huruf Indonesia tampil benar di Excel). */
export function unduhCsv(
  submissions: Submission[],
  assignments: Assignment[],
  users: User[],
  filter: FilterEkspor = "semua",
) {
  const { header, rows } = dataHasilSiswa(submissions, assignments, users, filter);
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  unduh(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), `${namaFileBase(filter)}.csv`);
}

/** Unduh hasil siswa sebagai file Excel (.xlsx). */
export function unduhXlsx(
  submissions: Submission[],
  assignments: Assignment[],
  users: User[],
  filter: FilterEkspor = "semua",
) {
  const { header, rows } = dataHasilSiswa(submissions, assignments, users, filter);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  // Lebar kolom yang mudah dibaca.
  ws["!cols"] = [
    { wch: 5 }, { wch: 24 }, { wch: 9 }, { wch: 13 },
    { wch: 32 }, { wch: 17 }, { wch: 7 }, { wch: 18 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hasil siswa");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  unduh(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${namaFileBase(filter)}.xlsx`);
}
