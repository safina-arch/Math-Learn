"use client";

import { useState } from "react";
import type { LkpdAktivitas, LkpdBlock } from "@/lib/types";
import { BLOOM_LABEL } from "@/lib/types";
import { selSama } from "@/lib/lkpd";
import { drivePreviewUrl, isDriveUrl, youtubeEmbed } from "@/lib/utils";
import { Aktivitas } from "./activities";

/** Tooltip ikon tipe blok untuk editor/preview. */
export const BLOCK_LABEL: Record<LkpdBlock["tipe"], string> = {
  teks: "📝 Text",
  gambar: "🖼️ Image",
  video: "🎥 Video",
  animasi: "🎞️ Animation",
  berkas: "📎 File",
  pertanyaan: "❓ Question",
  essay: "✍️ Essay",
  aktivitas: "🧩 Interactive Activity",
  petunjuk: "💡 Hint",
  refleksi: "💬 Reflection",
};

/**
 * Render satu content block persis seperti yang dilihat siswa.
 * - `readOnly` = LKPD sudah dikumpulkan → jawaban ditampilkan apa adanya, tak bisa diubah.
 * - `bukaKunci` = guru/admin MENGIZINKAN kunci/pembahasan tampil (baru aktif setelah
 *   LKPD dikumpulkan). Tanpa izin ini siswa TIDAK melihat benar/salah maupun kunci.
 */
export function BlokRenderer({
  blok,
  jawaban,
  onSimpan,
  readOnly = false,
  bukaKunci = false,
}: {
  blok: LkpdBlock;
  jawaban?: string;
  onSimpan?: (teks: string) => void;
  readOnly?: boolean;
  bukaKunci?: boolean;
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
          {blok.url && isDriveUrl(blok.url) ? (
            <a href={blok.url} target="_blank" rel="noreferrer" className="flex h-[170px] w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-primary-50 to-wash border-b border-line text-center px-6">
              <span className="text-[26px]">🖼️</span>
              <span className="text-[13.5px] text-ink-muted">Pratinjau Drive memerlukan izin pemilik — klik untuk membuka di tab baru</span>
            </a>
          ) : blok.url ? (
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
            isDriveUrl(blok.url) ? (
              // Tautan Drive: preview iframe hanya bila izin "siapa pun dengan tautan".
              // Jika tidak, siswa tetap bisa membuka di tab baru.
              <div className="space-y-2">
                <div className="aspect-video w-full rounded-lg overflow-hidden border border-line bg-wash">
                  <iframe src={drivePreviewUrl(blok.url)} className="w-full h-full border-0" allowFullScreen title={blok.judul || "Berkas Drive"} />
                </div>
                <a href={blok.url} target="_blank" rel="noreferrer" className="btn-ghost !py-1.5 !text-[12.5px] inline-flex">
                  📂 Buka di Google Drive (tab baru) — bila pratinjau kosong, izin berkas dibatasi pemilik
                </a>
              </div>
            ) : (
              <div className="aspect-video w-full rounded-lg overflow-hidden border border-line">
                <iframe src={youtubeEmbed(blok.url)} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={blok.judul || "Video"} />
              </div>
            )
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
      return <Refleksi blok={blok} jawaban={jawaban} onSimpan={readOnly ? undefined : onSimpan} readOnly={readOnly} />;

    case "essay":
      return <Refleksi blok={blok} jawaban={jawaban} onSimpan={readOnly ? undefined : onSimpan} readOnly={readOnly} essay />;

    case "pertanyaan":
      return <Pertanyaan blok={blok} jawaban={jawaban} onSimpan={readOnly ? undefined : onSimpan} readOnly={readOnly} bukaKunci={bukaKunci} />;

    case "aktivitas":
      return blok.aktivitas ? (
        <div>
          {blok.judul ? <p className="text-[14.5px] font-semibold mb-1.5">{blok.judul}</p> : null}
          <BloomTag bloom={blok.bloom} />
          {readOnly ? (
            <RingkasAktivitas a={blok.aktivitas} nilai={jawaban} tampilkanKunci={bukaKunci} />
          ) : (
            <Aktivitas a={blok.aktivitas} nilai={jawaban} onNilai={onSimpan} />
          )}
        </div>
      ) : null;

    default:
      return null;
  }
}

/** Penanda level Taksonomi Bloom revisi pada sebuah blok. */
export function BloomTag({ bloom }: { bloom?: LkpdBlock["bloom"] }) {
  if (!bloom) return null;
  return (
    <span className="inline-flex items-center rounded-md border border-primary-100 bg-primary-50 px-2 py-0.5 text-[11.5px] font-medium text-primary">
      {BLOOM_LABEL[bloom]}
    </span>
  );
}

/**
 * Ringkasan aktivitas dalam mode terkunci (LKPD sudah dikumpulkan).
 * Jawaban siswa ditampilkan apa adanya; benar/salah & kunci hanya bila guru mengizinkan.
 */
function RingkasAktivitas({ a, nilai, tampilkanKunci }: { a: LkpdAktivitas; nilai?: string; tampilkanKunci: boolean }) {
  type StateRingkas = { diArea?: string[]; pasang?: Record<string, string>; val?: Record<string, string> };
  let st: StateRingkas | null = null;
  try {
    const o: unknown = nilai ? JSON.parse(nilai) : null;
    if (o && typeof o === "object") st = o as StateRingkas;
  } catch {}

  if (a.tipe === "seret-slot") {
    const kartu = a.kartu || [];
    const di = (st?.diArea || []).filter((id) => kartu.some((k) => k.id === id));
    const sisa = kartu.filter((k) => !di.includes(k.id));
    return (
      <div className="rounded-xl border border-line bg-wash/50 card-pad !p-3.5">
        <p className="text-[13px] font-semibold mb-1">🧩 {a.instruksi}</p>
        {di.length ? (
          <ul className="space-y-1.5 mt-2">
            {di.map((id) => {
              const k = kartu.find((x) => x.id === id);
              return k ? (
                <li key={id} className="text-[13px] rounded-lg border border-line bg-white px-3 py-1.5">
                  <b>{k.label}</b> → {k.hasil}
                </li>
              ) : null;
            })}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-faint italic mt-1">Belum ada kartu yang dipindahkan</p>
        )}
        {sisa.length ? <p className="text-[12.5px] text-ink-faint mt-2">Belum dipindahkan: {sisa.map((k) => k.label).join(" · ")}</p> : null}
        {tampilkanKunci && di.length && a.temuan ? <p className="text-[13px] text-green-700 mt-2">🎉 {a.temuan}</p> : null}
      </div>
    );
  }

  if (a.tipe === "cocokkan") {
    const kiri = a.kiri || [];
    const kanan = a.kanan || [];
    const pasang = st?.pasang || {};
    const terpasang = kiri.filter((k) => pasang[k.id]);
    return (
      <div className="rounded-xl border border-line bg-wash/50 card-pad !p-3.5">
        <p className="text-[13px] font-semibold mb-1">🧩 {a.instruksi}</p>
        <p className="text-[13px] text-ink-muted mt-1">{terpasang.length} dari {kiri.length} pasangan sudah dibuat.</p>
        {tampilkanKunci && terpasang.length ? (
          <ul className="space-y-1.5 mt-2">
            {terpasang.map((k) => (
              <li key={k.id} className="text-[13px] rounded-lg border border-line bg-white px-3 py-1.5">
                {k.label} ↔ <b>{kanan.find((n) => n.id === pasang[k.id])?.label || "?"}</b>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  const val = st?.val || {};
  const kolom = a.kolom || [];
  const baris = a.baris || [];
  const terisi = Object.values(val).filter((v) => String(v).trim() !== "").length;
  return (
    <div className="rounded-xl border border-line bg-wash/50 card-pad !p-3.5">
      <p className="text-[13px] font-semibold mb-2">📊 {a.instruksi}</p>
      {terisi === 0 ? (
        <p className="text-[13px] text-ink-faint italic">Belum ada sel yang diisi</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[380px]">
            <thead>
              <tr className="text-left text-[12px] text-ink-muted">
                {kolom.map((c) => (
                  <th key={c} className="px-2 py-1.5 font-medium">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {baris.map((r, ri) => (
                <tr key={ri}>
                  {r.sel.map((s, ci) => {
                    if (s.teks !== undefined) return <td key={ci} className="px-2 py-1.5 text-ink-soft">{s.teks}</td>;
                    const kunci = (s.kunci || "").trim();
                    const v = val[`${ri}-${ci}`] || "";
                    const benar = tampilkanKunci && kunci && selSama(v, kunci);
                    return (
                      <td key={ci} className="px-2 py-1.5">
                        <span className={`block rounded border px-2 py-1 text-[13px] ${benar ? "border-green-300 bg-green-50 text-green-800" : "border-line bg-white"}`}>
                          {v || <span className="text-ink-faint">—</span>}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tampilkanKunci ? <p className="text-[12.5px] text-ink-muted mt-2">Hijau = sesuai kunci.</p> : null}
    </div>
  );
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

function Refleksi({
  blok,
  jawaban,
  onSimpan,
  readOnly = false,
  essay = false,
}: {
  blok: LkpdBlock;
  jawaban?: string;
  onSimpan?: (t: string) => void;
  readOnly?: boolean;
  essay?: boolean;
}) {
  const [v, setV] = useState(jawaban || "");
  const [tersimpan, setTersimpan] = useState(true);
  return (
    <div className="card card-pad">
      <p className="text-[14.5px] font-semibold mb-1">
        {essay ? "✍️" : "💬"} {blok.judul || (essay ? "Pertanyaan essay" : "Refleksi")}
      </p>
      <div className="mb-2">
        <BloomTag bloom={blok.bloom} />
      </div>
      {blok.teks ? <p className="muted mb-2 whitespace-pre-wrap">{blok.teks}</p> : null}
      {blok.rubrik ? <p className="text-[12.5px] text-ink-muted mb-2">📌 Rubrik penilaian: {blok.rubrik}</p> : null}
      <textarea
        className="input min-h-[110px]"
        value={v}
        readOnly={readOnly}
        placeholder={essay ? "Jelaskan proses berpikirmu: strategi, alasan, dan kesimpulan…" : "Tulis jawaban / refleksimu di sini…"}
        onChange={(e) => {
          if (readOnly) return;
          setV(e.target.value);
          // Simpan otomatis — jawaban tetap ada walau siswa berpindah mission lalu kembali.
          onSimpan?.(e.target.value);
          setTersimpan(true);
        }}
      />
      {readOnly ? (
        <p className="mt-2 text-[12.5px] text-ink-muted">🔒 Jawaban terkunci — LKPD sudah dikumpulkan.</p>
      ) : (
        <p className={`mt-2 text-[12.5px] ${tersimpan ? "text-green-700" : "text-ink-faint"}`}>
          {tersimpan ? "✓ Jawaban tersimpan otomatis — aman berpindah mission" : "Menyimpan…"}
        </p>
      )}
      {essay ? (
        <p className="mt-1 text-[12.5px] text-ink-muted">
          Jawaban terbuka ini <b>tidak dinilai otomatis</b> — menunggu pemeriksaan guru setelah kamu mengumpulkan.
        </p>
      ) : null}
    </div>
  );
}

/** Pertanyaan pilihan ganda — kunci/feedback HANYA tampil bila guru mengizinkan (`bukaKunci`).
 *  Pilihan siswa ikut tersimpan di progres → bolak-balik mission tidak menghapusnya. */
function Pertanyaan({
  blok,
  jawaban,
  onSimpan,
  readOnly = false,
  bukaKunci = false,
}: {
  blok: LkpdBlock;
  jawaban?: string;
  onSimpan?: (t: string) => void;
  readOnly?: boolean;
  bukaKunci?: boolean;
}) {
  const q = blok.pertanyaan;
  const awalPilih = (() => {
    if (jawaban === undefined || jawaban === "") return null;
    const n = Number(jawaban);
    return Number.isInteger(n) && n >= 0 ? n : null;
  })();
  const [pilih, setPilih] = useState<number | null>(awalPilih);
  const [hint, setHint] = useState(0);
  if (!q) return null;
  const pilihDanSimpan = (i: number) => {
    if (readOnly) return;
    setPilih(i);
    onSimpan?.(String(i));
  };
  const dipilih = pilih !== null ? q.opsi[pilih] : null;
  const benar = Boolean(dipilih?.benar);
  const hints = q.petunjuk || [];
  // Benar/salah & kunci hanya setelah LKPD dikumpulkan DAN guru mengizinkan.
  const tampilKunci = bukaKunci;

  return (
    <div className="card card-pad">
      {blok.judul ? <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint mb-1.5">❓ {blok.judul}</p> : null}
      <div className="mb-2">
        <BloomTag bloom={blok.bloom} />
      </div>
      <p className="text-[14.5px] font-medium mb-3 whitespace-pre-line">{q.teks}</p>
      <div className="space-y-2">
        {q.opsi.map((o, i) => {
          const dipilihIni = pilih === i;
          const setelah = pilih !== null;
          const gaya = !setelah
            ? "border-line bg-white hover:border-primary-200"
            : tampilKunci
              ? dipilihIni
                ? o.benar ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
                : o.benar ? "border-green-200 bg-green-50/50" : "border-line bg-white opacity-70"
              : // Kunci tertutup: tandai hanya pilihan siswa, tanpa menyebut benar/salah.
                dipilihIni
                  ? "border-primary-200 bg-primary-50/70"
                  : "border-line bg-white opacity-80";
          return (
            <button key={i} className={`w-full text-left rounded-lg border px-3.5 py-2.5 text-[13.5px] transition-colors ${gaya}`} onClick={() => pilihDanSimpan(i)}>
              <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {o.teks}
              {setelah && dipilihIni && tampilKunci && o.benar ? <span className="text-green-700 font-semibold"> ✓</span> : null}
              {setelah && dipilihIni && !tampilKunci ? <span className="text-primary font-semibold"> ✓ pilihanmu</span> : null}
            </button>
          );
        })}
      </div>

      {!dipilih ? null : tampilKunci ? (
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
        <p className="mt-3 rounded-lg border border-line bg-wash px-3.5 py-2.5 text-[13px] text-ink-muted">
          ✓ Pilihan tersimpan. Benar/salah dan pembahasan dibuka setelah LKPD dikumpulkan (bila guru mengizinkan).
        </p>
      )}
    </div>
  );
}
