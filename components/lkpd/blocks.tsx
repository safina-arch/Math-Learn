"use client";

import { useState } from "react";
import type { LkpdBlock } from "@/lib/types";
import { Aktivitas } from "./activities";

/** Tooltip ikon tipe blok untuk editor/preview. */
export const BLOCK_LABEL: Record<LkpdBlock["tipe"], string> = {
  teks: "📝 Text",
  gambar: "🖼️ Image",
  video: "🎥 Video",
  animasi: "🎞️ Animation",
  berkas: "📎 File",
  pertanyaan: "❓ Question",
  aktivitas: "🧩 Interactive Activity",
  petunjuk: "💡 Hint",
  refleksi: "💬 Reflection",
};

/** Render satu content block persis seperti yang dilihat siswa. */
export function BlokRenderer({
  blok,
  jawaban,
  onSimpan,
}: {
  blok: LkpdBlock;
  jawaban?: string;
  onSimpan?: (teks: string) => void;
}) {
  switch (blok.tipe) {
    case "teks":
      return (
        <div className="card card-pad">
          {blok.judul ? <p className="text-[15px] font-semibold mb-1.5">{blok.judul}</p> : null}
          <p className="text-[14px] text-ink-soft whitespace-pre-line leading-relaxed">{blok.teks}</p>
        </div>
      );

    case "gambar":
      return (
        <figure className="card overflow-hidden">
          {blok.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={blok.url} alt={blok.teks || "Gambar"} className="w-full max-h-[340px] object-cover" />
          ) : (
            <div className="h-[170px] w-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-wash border-b border-line">
              <span className="text-[13.5px] text-ink-muted text-center px-6">🖼️ {blok.teks || "Gambar ilustrasi"}</span>
            </div>
          )}
          {blok.teks ? <figcaption className="px-4 py-2.5 text-[13px] text-ink-muted">{blok.teks}</figcaption> : null}
        </figure>
      );

    case "video":
      return (
        <div className="card card-pad">
          {blok.judul ? <p className="text-[14.5px] font-semibold mb-2">🎥 {blok.judul}</p> : null}
          {blok.url ? (
            <div className="aspect-video w-full rounded-lg overflow-hidden border border-line">
              <iframe src={blok.url} className="w-full h-full" allowFullScreen title={blok.judul || "Video"} />
            </div>
          ) : (
            <div className="aspect-video w-full rounded-lg border border-dashed border-line bg-wash flex items-center justify-center">
              <span className="text-[13px] text-ink-faint">🎬 Video — tautan belum dipasang</span>
            </div>
          )}
        </div>
      );

    case "animasi":
      return (
        <div className="card card-pad">
          {blok.judul ? <p className="text-[14.5px] font-semibold mb-2">🎞️ {blok.judul}</p> : null}
          {blok.url ? (
            <iframe src={blok.url} className="w-full aspect-video rounded-lg border border-line" title={blok.judul || "Animasi"} />
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-wash px-4 py-8 text-center">
              <span className="inline-block text-[34px] animate-bounce">🧲</span>
              <p className="text-[13px] text-ink-faint mt-2">{blok.teks || "Animasi — tautan belum dipasang"}</p>
            </div>
          )}
        </div>
      );

    case "berkas":
      return (
        <div className="card card-pad flex items-center gap-3">
          <span className="text-[22px]">📎</span>
          <div className="min-w-0">
            <p className="text-[14px] font-medium truncate">{blok.namaBerkas || blok.judul || "Berkas pendukung"}</p>
            {blok.teks ? <p className="text-[12.5px] text-ink-muted truncate">{blok.teks}</p> : null}
          </div>
          {blok.url ? (
            <a href={blok.url} target="_blank" rel="noreferrer" className="btn-ghost !py-1.5 !text-[12.5px] ml-auto">Buka</a>
          ) : null}
        </div>
      );

    case "petunjuk":
      return <Petunjuk blok={blok} />;

    case "refleksi":
      return <Refleksi blok={blok} jawaban={jawaban} onSimpan={onSimpan} />;

    case "pertanyaan":
      return <Pertanyaan blok={blok} />;

    case "aktivitas":
      return blok.aktivitas ? (
        <div>
          {blok.judul ? <p className="text-[14.5px] font-semibold mb-1.5">{blok.judul}</p> : null}
          <Aktivitas a={blok.aktivitas} />
        </div>
      ) : null;

    default:
      return null;
  }
}

function Petunjuk({ blok }: { buka?: boolean; blok: LkpdBlock }) {
  const [n, setN] = useState(0);
  const baris = (blok.teks || "").split("\n").filter(Boolean);
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 card-pad !p-3.5">
      <p className="text-[13.5px] font-semibold text-amber-800 mb-1">💡 {blok.judul || "Petunjuk"}</p>
      {baris.slice(0, n).map((t, i) => (
        <p key={i} className="text-[13.5px] text-amber-900/90 mt-1">{t}</p>
      ))}
      {n < baris.length ? (
        <button className="btn-ghost !py-1.5 !text-[12.5px] mt-2 bg-white" onClick={() => setN((v) => v + 1)}>
          {n === 0 ? "Tampilkan petunjuk" : "Petunjuk berikutnya"}
        </button>
      ) : (
        <p className="text-[12.5px] text-amber-700 mt-2">Itu semua petunjuknya — percayalah pada proses berpikirmu 👍</p>
      )}
    </div>
  );
}

function Refleksi({ blok, jawaban, onSimpan }: { blok: LkpdBlock; jawaban?: string; onSimpan?: (t: string) => void }) {
  const [v, setV] = useState(jawaban || "");
  const [tersimpan, setTersimpan] = useState(false);
  return (
    <div className="card card-pad">
      <p className="text-[14.5px] font-semibold mb-1">💬 {blok.judul || "Refleksi"}</p>
      {blok.teks ? <p className="muted mb-2">{blok.teks}</p> : null}
      <textarea
        className="input min-h-[110px]"
        value={v}
        placeholder="Tulis jawaban / refleksimu di sini…"
        onChange={(e) => { setV(e.target.value); setTersimpan(false); }}
      />
      <div className="flex items-center gap-2 mt-2">
        <button className="btn-primary !py-1.5 !text-[13px]" onClick={() => { onSimpan?.(v); setTersimpan(true); }}>Simpan jawaban</button>
        {tersimpan ? <span className="text-[12.5px] text-green-700">Tersimpan ✓</span> : null}
      </div>
    </div>
  );
}

/** Pertanyaan pilihan ganda dengan feedback edukatif + petunjuk progresif. */
function Pertanyaan({ blok }: { blok: LkpdBlock }) {
  const q = blok.pertanyaan;
  const [pilih, setPilih] = useState<number | null>(null);
  const [hint, setHint] = useState(0);
  if (!q) return null;
  const dipilih = pilih !== null ? q.opsi[pilih] : null;
  const benar = Boolean(dipilih?.benar);
  const hints = q.petunjuk || [];

  return (
    <div className="card card-pad">
      {blok.judul ? <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint mb-1.5">❓ {blok.judul}</p> : null}
      <p className="text-[14.5px] font-medium mb-3 whitespace-pre-line">{q.teks}</p>
      <div className="space-y-2">
        {q.opsi.map((o, i) => {
          const dipilihIni = pilih === i;
          const setelah = pilih !== null;
          const gaya = !setelah
            ? "border-line bg-white hover:border-primary-200"
            : dipilihIni
              ? o.benar ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
              : o.benar ? "border-green-200 bg-green-50/50" : "border-line bg-white opacity-70";
          return (
            <button key={i} className={`w-full text-left rounded-lg border px-3.5 py-2.5 text-[13.5px] transition-colors ${gaya}`} onClick={() => setPilih(i)}>
              <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {o.teks}
              {setelah && dipilihIni && o.benar ? <span className="text-green-700 font-semibold"> ✓</span> : null}
            </button>
          );
        })}
      </div>

      {dipilih ? (
        <div className={`mt-3 rounded-lg px-3.5 py-2.5 text-[13.5px] ${benar ? "bg-green-50 border border-green-200 text-green-800" : "bg-amber-50 border border-amber-200 text-amber-900"}`}>
          <p className="font-semibold mb-0.5">{benar ? "🎉 Benar — pemahamanmu tepat!" : "Belum tepat — mari kita pikirkan lagi."}</p>
          <p>{benar ? q.feedbackBenar || dipilih.feedback : dipilih.feedback}</p>
          {!benar && hints.length > 0 ? (
            <div className="mt-2">
              {hints.slice(0, hint).map((h, i) => (
                <p key={i} className="text-[13px] mt-1 border-l-2 border-amber-300 pl-2">💡 {h}</p>
              ))}
              {hint < hints.length ? (
                <button className="btn-ghost !py-1 !text-[12.5px] mt-2 bg-white" onClick={() => setHint((n) => n + 1)}>
                  {hint === 0 ? "Minta petunjuk" : "Petunjuk berikutnya"}
                </button>
              ) : (
                <p className="text-[12.5px] mt-2">Coba pilihan lain dengan petunjuk tadi — jawabanmu pasti bisa 😊</p>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        hints.length > 0 && pilih !== null ? null : null
      )}
    </div>
  );
}
