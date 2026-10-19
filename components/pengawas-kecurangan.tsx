"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { daftarPengawas, lepasPengawas, perbaruiKonteks, type JenisKegiatan } from "@/lib/pengawas";

export type { JenisKegiatan };

interface PengawasProps {
  /** true selama pengerjaan masih berjalan (belum dikumpulkan / belum selesai). */
  aktif: boolean;
  /** Id kegiatan untuk laporan: assignmentId, atau `lkpd:<subtopicId>` untuk LKPD. */
  evaluationId: string;
  /** Jenis kegiatan — untuk keterangan laporan & pesan peringatan. */
  jenis: JenisKegiatan;
  /** Penghitung pelanggaran (dimiliki halaman, dikirim saat mengumpulkan). */
  countRef: React.MutableRefObject<number>;
  /** Waktu mulai pengerjaan (ms epoch) → kolom "menit ke-N" pada laporan. */
  mulaiRef: React.MutableRefObject<number>;
  /** Nomor soal aktif (opsional) → konteks kejadian. */
  soalRef?: React.MutableRefObject<number>;
  /** Jendela grasi saat dialog foto terbuka — kehilangan fokus sesaat bukan pelanggaran. */
  graceRef?: React.MutableRefObject<number>;
  /** true setelah dikumpulkan/selesai → listener berhenti menghitung. */
  selesaiRef?: React.MutableRefObject<boolean>;
  /** true saat refresh/tutup tab → perpindahan itu bukan pelanggaran. */
  refreshRef?: React.MutableRefObject<boolean>;
  /**
   * Pindah lewat menu sidebar/internal ikut dicatat (baku: **true untuk SEMUA
   * kegiatan** — evaluasi, latihan, dan LKPD). Selama aktif, AppShell mengunci
   * menu navigasi (siswa tidak bisa berpindah halaman).
   */
  catatNavigasi?: boolean;
  /** Dipanggil tiap kali hitungan bertambah (untuk tampilan jumlah di halaman). */
  onCount?: (n: number) => void;
}

/**
 * Pengawas kecurangan bersama (evaluasi · latihan · LKPD).
 *
 * Komponen ini hanya MENDAFTARKAN konteks pengerjaan ke modul `lib/pengawas.ts`.
 * Perhitungan (satu kali keluar/pindah tab = satu hitungan), penguncian menu
 * sidebar, dan **modal peringatan real-time** dikerjakan AppShell — sehingga
 * peringatan tetap tampil walau siswa sudah berpindah halaman.
 */
export function PengawasKecurangan({
  aktif,
  evaluationId,
  jenis,
  countRef,
  mulaiRef,
  soalRef,
  graceRef,
  selesaiRef,
  refreshRef,
  catatNavigasi = true,
  onCount,
}: PengawasProps) {
  const { user, addCheatLog } = useStore();

  // Daftarkan saat pengerjaan mulai; lepas saat selesai/unmount.
  useEffect(() => {
    if (!aktif) {
      lepasPengawas();
      return;
    }
    daftarPengawas({
      // URL sudah diperbarui saat halaman unmount → dipakai untuk menghitung pindah menu.
      halaman: window.location.pathname,
      evaluationId,
      jenis,
      countRef,
      mulaiRef,
      soalRef,
      graceRef,
      selesaiRef,
      refreshRef,
      catatNavigasi,
      user,
      onCount,
      catatLog: addCheatLog,
    });
    return () => lepasPengawas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktif, evaluationId, jenis, countRef, mulaiRef, catatNavigasi]);

  // Segarkan referensi store/prop tiap render TANPA mengulang pendaftaran
  // (pendaftaran ulang akan mematikan modal peringatan yang sedang tampil).
  useEffect(() => {
    if (!aktif) return;
    perbaruiKonteks({ user, onCount, catatLog: addCheatLog });
  });

  return null;
}
