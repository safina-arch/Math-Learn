"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Deteksi versi usang: tab yang terbuka jauh sebelum deploy terakhir masih
 * menjalankan bundle lama (status/hitungan anti-cheat ikut lama). Banner ini
 * menawarkan reload begitu identitas build berubah.
 *
 * Cek dijalankan saat mulai, tiap 5 menit, dan setiap tab kembali aktif.
 */
export function UpdateBanner() {
  const t0 = useRef<string | null>(null);
  const [sedia, setSedia] = useState(false);

  useEffect(() => {
    let hidup = true;
    const cek = async () => {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const j = (await r.json()) as { t?: string };
        const t = String(j.t || "");
        if (!hidup || !t) return;
        if (t0.current === null) t0.current = t;
        else if (t !== t0.current) setSedia(true);
      } catch {
        // Offline / endpoint belum ada → tidak mengganggu.
      }
    };
    void cek();
    const timer = window.setInterval(cek, 300000);
    const onVis = () => {
      if (document.visibilityState === "visible") void cek();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      hidup = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  if (!sedia) return null;

  return (
    <div className="bg-primary-50 border-b border-primary-200 text-[12.5px] text-primary-800 px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
      <span>
        🔄 Ada versi baru aplikasi — <b>muat ulang halaman</b> agar perbaikan terbaru (status pemeriksaan, anti-cheat,
        penilaian) ikut aktif.
      </span>
      <button className="btn-ghost !py-1 !px-2.5 !text-[12.5px] shrink-0" onClick={() => window.location.reload()}>
        Muat ulang
      </button>
    </div>
  );
}
