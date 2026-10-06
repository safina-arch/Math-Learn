"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui";
import { useStore } from "@/lib/store";

export type JenisKegiatan = "evaluasi" | "latihan" | "lkpd";

interface PengawasProps {
  /** true selama pengerjaan masih berjalan (belum dikumpulkan / belum selesai). */
  aktif: boolean;
  /** Id kegiatan untuk laporan: assignmentId, atau `lkpd:<subtopicId>` untuk LKPD. */
  evaluationId: string;
  /** Jenis kegiatan — hanya untuk keterangan laporan. */
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
  /** Evaluasi: pindah lewat menu sidebar/internal juga dicatat. */
  catatNavigasi?: boolean;
  /** Dipanggil tiap kali hitungan bertambah (untuk tampilan jumlah di halaman). */
  onCount?: (n: number) => void;
}

/**
 * Pengawas kecurangan bersama (evaluasi · latihan · LKPD).
 *
 * Aturan hitungan — **satu kali keluar/pindah tab = satu hitungan**:
 *  - `blur` dan `visibilitychange` untuk satu perpindahan disatukan oleh penanda
 *    `tinggal` (tidak dobel) dan di-reset saat kembali ke tab;
 *  - jeda minimal 1,5 detik antar hitungan mencegah loncatan ganda;
 *  - kejadian `visibilitychange` ditunda 350 ms agar refresh/tutup tab
 *    (`pagehide`) tidak ikut dihitung;
 *  - membuka dialog foto (grace) bukan pelanggaran.
 *
 * Peringatan tampil LANGSUNG saat kejadian terjadi (bukan setelah submit).
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
  catatNavigasi = false,
  onCount,
}: PengawasProps) {
  const { user, addCheatLog } = useStore();
  const [warn, setWarn] = useState<number | null>(null);
  /** true bila perpindahan tab sedang/sudah tercatat — kejadian berikutnya tidak dihitung lagi. */
  const tinggal = useRef(false);
  const terakhir = useRef(0);
  const jeda = useRef<number[]>([]);
  /** Ref identitas store & prop agar listener tidak dibuat ulang tiap render. */
  const catatRef = useRef(addCheatLog);
  catatRef.current = addCheatLog;
  const p = useRef({ evaluationId, jenis, graceRef, selesaiRef, refreshRef, mulaiRef, soalRef, user, onCount });
  p.current = { evaluationId, jenis, graceRef, selesaiRef, refreshRef, mulaiRef, soalRef, user, onCount };

  /** Cetak satu pelanggaran ke store + server + tampilkan peringatan real-time. */
  function catat(tipe: "blur" | "visibility" | "navigasi") {
    const s = p.current;
    if (s.selesaiRef?.current || !s.user) return;
    if (s.refreshRef?.current) return; // refresh / tutup tab — bukan pelanggaran
    const now = Date.now();
    if (s.graceRef && now < s.graceRef.current) return; // dialog foto
    if (tinggal.current) return; // satu perpindahan = satu hitungan
    if (now - terakhir.current < 1500) return;
    tinggal.current = true;
    terakhir.current = now;
    countRef.current += 1;
    s.onCount?.(countRef.current);
    const menit = Math.max(1, Math.round((now - (s.mulaiRef.current || now)) / 60000));
    const baris = {
      evaluationId: s.evaluationId,
      siswaId: s.user.id,
      siswaNama: s.user.nama,
      tipe,
      soal: s.soalRef?.current,
      menit,
    };
    catatRef.current(baris);
    void fetch("/api/cheat-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...baris, count: countRef.current }),
    }).catch(() => {});
    setWarn(countRef.current);
  }

  useEffect(() => {
    if (!aktif) return;
    const onHide = () => {
      if (document.hidden) {
        // Tunda sejenak: bila ternyata refresh/tutup tab (pagehide terdeteksi),
        // kejadian ini dibatalkan — hanya pindah tab sungguhan yang dihitung.
        const t = window.setTimeout(() => catat("visibility"), 350);
        jeda.current.push(t);
      } else {
        tinggal.current = false; // kembali ke tab → siap mencatat perpindahan berikutnya
      }
    };
    const onBlur = () => catat("blur");
    const onFocus = () => { tinggal.current = false; };

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      jeda.current.forEach((t) => window.clearTimeout(t));
      jeda.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktif, countRef]);

  // Pindah halaman lewat menu sidebar/internal saat pengerjaan berjalan = pelanggaran
  // (hanya evaluasi). Refresh/tutup tab ditandai `pagehide` sehingga tidak dihitung.
  useEffect(() => {
    if (!aktif || !catatNavigasi) return;
    return () => {
      if (tinggal.current) return;
      catat("navigasi");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktif, catatNavigasi, countRef]);

  return (
    <Modal open={warn !== null} onClose={() => setWarn(null)} title="Peringatan sistem">
      <p className="text-[14px]">
        Kamu terdeteksi <b>meninggalkan tab/halaman {jenis === "evaluasi" ? "ujian" : "pengerjaan"}</b> — total{" "}
        <b>{warn ?? 0}×</b>. Setiap satu kali keluar/pindah tab dihitung <b>satu kali</b>, langsung dicatat beserta
        waktunya, dan dilaporkan ke guru.
      </p>
      <p className="muted mt-2">
        Tetap di halaman ini sampai kamu menekan tombol kumpulkan. Pelanggaran berulang dapat memengaruhi penilaian.
      </p>
      <button className="btn-primary mt-4 w-full" onClick={() => setWarn(null)}>Saya mengerti, kembali mengerjakan</button>
    </Modal>
  );
}
