"use client";

import { useEffect, useState } from "react";
import { Badge, Modal } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cariProgress, nilaiSubtopic, progresSubtopic, selSama } from "@/lib/lkpd";
import { fmtDateTime } from "@/lib/utils";
import { BLOCK_LABEL } from "./blocks";
import type { LkpdAktivitas, LkpdBlock } from "@/lib/types";

/** Kunci baris yang sedang dicek guru/admin (data diambil ulang dari store → selalu terkini). */
export type KunciCek = { siswaId: string; subtopicId: string; topikId: string };

type StateAktivitas = {
  diArea?: string[];
  pasang?: Record<string, string>;
  val?: Record<string, string>;
  dicek?: boolean;
};

function parseState(teks?: string): StateAktivitas | null {
  if (!teks) return null;
  try {
    const o: unknown = JSON.parse(teks);
    return o && typeof o === "object" ? (o as StateAktivitas) : null;
  } catch {
    return null;
  }
}

/** Tipe blok yang menampilkan jawaban siswa → layak menerima feedback guru per soal. */
const TIPE_JAWAB: LkpdBlock["tipe"][] = ["pertanyaan", "essay", "refleksi", "aktivitas"];

/** Rapikan spasi lalu potong teks agar ringkasan blok cukup 1–2 baris. */
function potong(teks: string, maks = 170): string {
  const rapi = teks.replace(/\s+/g, " ").trim();
  return rapi.length > maks ? `${rapi.slice(0, maks - 1)}…` : rapi;
}

/** Ringkasan isi blok (teks pertanyaan/instruksi/judul) untuk judul feedback per soal. */
function ringkasBlok(b: LkpdBlock): string {
  if (b.tipe === "pertanyaan" && b.pertanyaan?.teks) return potong(b.pertanyaan.teks);
  if (b.tipe === "aktivitas" && b.aktivitas?.instruksi) return potong(b.aktivitas.instruksi);
  if (b.teks) return potong(b.teks);
  return potong(b.judul || b.namaBerkas || BLOCK_LABEL[b.tipe]);
}

/**
 * Ringkasan jawaban siswa untuk kotak feedback per soal.
 * `adaFoto` dipakai bila tak ada jawaban teks — pekerjaan tertulis ada di lampiran mission.
 */
function ringkasJawaban(b: LkpdBlock, jawaban?: string, adaFoto = false): string {
  const teks = jawaban?.trim();
  if (teks) {
    if (b.tipe === "pertanyaan") {
      const n = Number(teks);
      const q = b.pertanyaan;
      if (q && Number.isInteger(n) && q.opsi[n]) {
        return `Pilihan siswa: ${String.fromCharCode(65 + n)}. ${potong(q.opsi[n].teks, 140)}`;
      }
      return potong(teks, 140);
    }
    if (b.tipe === "aktivitas") return "Jawaban aktivitas tersimpan — lihat ringkasan isi kerja di atas.";
    return potong(teks, 220);
  }
  if (adaFoto) return "📷 Foto jawaban — lihat lampiran mission di bawah.";
  return "Belum dijawab.";
}

/**
 * Satu textarea feedback guru UNTUK SOAL INI — nilai awal dari `progres.feedbackBlok`
 * dan hanya dikirim ke store saat guru menekan "Simpan hasil pemeriksaan".
 */
function FeedbackBlok({ id, nilai, onChange }: { id: string; nilai: string; onChange: (teks: string) => void }) {
  return (
    <>
      <label className="label" htmlFor={`fb-blok-${id}`}>💬 Feedback untuk soal ini</label>
      <textarea
        id={`fb-blok-${id}`}
        className="input min-h-[54px]"
        value={nilai}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Tulis komentar khusus soal ini: bagian yang sudah tepat, yang perlu diperbaiki, langkah berikutnya…"
      />
    </>
  );
}

/** Satu content block pada sudut pandang pemeriksa: isi kerja siswa, bukan alur interaktif. */
function BlokCek({ blok, jawaban }: { blok: LkpdBlock; jawaban?: string }) {
  switch (blok.tipe) {
    case "refleksi":
    case "essay":
      return (
        <div className="rounded-lg border border-line px-3.5 py-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-1">
            {blok.tipe === "essay" ? "✍️" : "💬"} {blok.judul || (blok.tipe === "essay" ? "Essay" : "Refleksi")}
            {blok.bloom ? <span className="ml-2 normal-case tracking-normal text-primary">{blok.bloom}</span> : null}
          </p>
          {blok.rubrik ? <p className="text-[12.5px] text-ink-muted mb-1.5">📌 Rubrik: {blok.rubrik}</p> : null}
          {jawaban ? (
            <p className="text-[13.5px] text-ink-soft whitespace-pre-wrap bg-wash border border-line rounded-lg px-3 py-2 leading-relaxed">{jawaban}</p>
          ) : (
            <p className="text-[13px] text-ink-faint italic">Belum dijawab</p>
          )}
          <p className="text-[12px] text-ink-faint mt-1.5">Dinilai manual — tentukan nilainya di panel bawah.</p>
        </div>
      );

    case "pertanyaan": {
      const q = blok.pertanyaan;
      if (!q) return null;
      const pilih = jawaban !== undefined && jawaban !== "" && Number.isInteger(Number(jawaban)) ? Number(jawaban) : null;
      const dipilih = pilih !== null ? q.opsi[pilih] : null;
      return (
        <div className="rounded-lg border border-line px-3.5 py-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-1">❓ {blok.judul || "Pertanyaan"}</p>
          <p className="text-[13.5px] font-medium whitespace-pre-line mb-2">{q.teks}</p>
          <ul className="space-y-1.5">
            {q.opsi.map((o, i) => {
              const iniDipilih = pilih === i;
              const gaya = iniDipilih
                ? o.benar
                  ? "border-green-300 bg-green-50"
                  : "border-red-300 bg-red-50"
                : o.benar
                  ? "border-green-200 bg-green-50/60"
                  : "border-line bg-white";
              return (
                <li key={i} className={`rounded-lg border px-3 py-2 text-[13px] ${gaya}`}>
                  <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {o.teks}
                  {iniDipilih ? (
                    <span className={`ml-1.5 font-semibold ${o.benar ? "text-green-700" : "text-red-600"}`}>
                      · pilihan siswa ({o.benar ? "benar ✓" : "belum tepat ✗"})
                    </span>
                  ) : o.benar ? (
                    <span className="ml-1.5 text-[12px] font-medium text-green-700">kunci ✓</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {pilih === null ? (
            <p className="mt-2 text-[13px] text-ink-faint italic">Belum dijawab</p>
          ) : dipilih && !dipilih.benar ? (
            <p className="mt-2 text-[13px] text-ink-soft bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <b>Umpan balik untuk siswa:</b> {dipilih.feedback}
            </p>
          ) : null}
        </div>
      );
    }

    case "aktivitas": {
      const a = blok.aktivitas;
      if (!a) return null;
      const st = parseState(jawaban);
      return (
        <div className="rounded-lg border border-line px-3.5 py-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-1">🧩 {blok.judul || "Aktivitas"}</p>
          <p className="text-[13px] text-ink-muted mb-2">{a.instruksi}</p>
          <IsiAktivitas a={a} st={st} />
        </div>
      );
    }

    case "teks":
      return (
        <details className="rounded-lg border border-line bg-wash/40 px-3.5 py-2 text-[13px]">
          <summary className="cursor-pointer font-medium">📝 {blok.judul || "Teks"} <span className="font-normal text-ink-faint">(materi)</span></summary>
          <p className="mt-2 text-ink-soft whitespace-pre-line leading-relaxed">{blok.teks}</p>
        </details>
      );

    default:
      return (
        <p className="text-[12.5px] text-ink-faint">
          {BLOCK_LABEL[blok.tipe]} — {blok.judul || blok.namaBerkas || "konten pendukung"}
          {blok.url ? <span className="ml-1">(ada tautan)</span> : null}
        </p>
      );
  }
}

/** Ringkasan jawaban aktivitas interaktif sesuai tipenya. */
function IsiAktivitas({ a, st }: { a: LkpdAktivitas; st: StateAktivitas | null }) {
  if (a.tipe === "seret-slot") {
    const kartu = a.kartu || [];
    const di = (st?.diArea || []).filter((id) => kartu.some((k) => k.id === id));
    const sisa = kartu.filter((k) => !di.includes(k.id));
    return (
      <div>
        {di.length === 0 ? (
          <p className="text-[13px] text-ink-faint italic">Belum ada kartu yang dipindahkan</p>
        ) : (
          <ul className="space-y-1.5">
            {di.map((id) => {
              const k = kartu.find((x) => x.id === id);
              if (!k) return null;
              return (
                <li key={id} className="text-[13px] bg-wash border border-line rounded-lg px-3 py-1.5">
                  👷 <b>{k.label}</b> → {k.hasil}
                </li>
              );
            })}
          </ul>
        )}
        {sisa.length ? <p className="text-[12.5px] text-ink-faint mt-2">Belum dipindahkan: {sisa.map((k) => k.label).join(" · ")}</p> : null}
        {di.length > 0 && a.temuan ? <p className="text-[13px] text-green-700 mt-2">🎉 {a.temuan}</p> : null}
      </div>
    );
  }

  if (a.tipe === "cocokkan") {
    const kiri = a.kiri || [];
    const kanan = a.kanan || [];
    const pasang = st?.pasang || {};
    const terpasang = kiri.filter((k) => pasang[k.id]);
    const belum = kiri.filter((k) => !pasang[k.id]);
    return (
      <div>
        {terpasang.length === 0 ? (
          <p className="text-[13px] text-ink-faint italic">Belum ada pasangan yang tersimpan</p>
        ) : (
          <ul className="space-y-1.5">
            {terpasang.map((k) => {
              const n = kanan.find((x) => x.id === pasang[k.id]);
              return (
                <li key={k.id} className="text-[13px] bg-wash border border-line rounded-lg px-3 py-1.5">
                  {k.label} ↔ <b>{n?.label || "?"}</b> <span className="text-green-700 font-semibold">✓</span>
                </li>
              );
            })}
          </ul>
        )}
        {belum.length ? <p className="text-[12.5px] text-ink-faint mt-2">Belum terpasang: {belum.map((k) => k.label).join(" · ")}</p> : null}
        {terpasang.length > 0 && belum.length === 0 ? <p className="text-[13px] text-green-700 mt-2">🎉 Semua pasangan benar.</p> : null}
      </div>
    );
  }

  // isi-tabel
  const val = st?.val || {};
  const dicek = Boolean(st?.dicek);
  const kolom = a.kolom || [];
  const baris = a.baris || [];
  const terisi = Object.values(val).filter((v) => String(v).trim() !== "").length;
  return (
    <div>
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
                    const key = `${ri}-${ci}`;
                    const v = val[key] || "";
                    const benar = dicek && selSama(v, s.kunci);
                    const salah = dicek && !selSama(v, s.kunci);
                    return (
                      <td key={ci} className="px-2 py-1.5">
                        <span
                          className={`block rounded border px-2 py-1 text-[13px] ${
                            benar ? "border-green-300 bg-green-50 text-green-800" : salah ? "border-red-300 bg-red-50 text-red-700" : "border-line bg-white"
                          }`}
                        >
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
      <p className="text-[12.5px] mt-2 text-ink-muted">
        {dicek ? "Siswa sudah menekan “Periksa jawaban” — hijau = benar, merah = perlu diperbaiki." : "Siswa belum menekan “Periksa jawaban” — nilai sel belum dihitung otomatis."}
      </p>
    </div>
  );
}

/**
 * Modal cek hasil pekerjaan siswa LKPD — dipanggil guru/admin dari tabel penilaian.
 * Alur pemeriksaan: (1) buka isi kerja per mission (refleksi/essay, jawaban pertanyaan,
 * hasil aktivitas, foto) → (2) tulis feedback KESULURUHAN + feedback PER SOAL/BLOK
 * (kotak 💬 di bawah tiap jawaban siswa) & nilai → (3) simpan hasil pemeriksaan
 * yang sekaligus menandai LKPD "sudah diperiksa". Verifikasi tidak lagi sekali klik
 * dari tabel.
 */
export function CekKerjaLkpd({ kunci, onClose }: { kunci: KunciCek | null; onClose: () => void }) {
  const { lkpdTopics, lkpdProgress, users, periksaLkpd } = useStore();

  const topik = kunci ? lkpdTopics.find((t) => t.id === kunci.topikId) : undefined;
  const sub = topik?.subtopics.find((s) => s.id === kunci?.subtopicId);
  const siswa = kunci ? users.find((u) => u.id === kunci.siswaId) : undefined;
  const progres = kunci && sub ? cariProgress(lkpdProgress, kunci.siswaId, sub.id) : null;
  const ringkas = progresSubtopic(sub, progres);
  const nilai = nilaiSubtopic(sub, progres);
  const verifikasi = Boolean(progres?.verifikasi);

  const [fb, setFb] = useState(progres?.feedbackGuru || "");
  const [nilaiTeks, setNilaiTeks] = useState(progres?.nilaiGuru != null ? String(progres.nilaiGuru) : "");
  // Feedback per soal/blok — kunci = id blok, dikirim utuh saat tombol simpan ditekan.
  const [fbBlok, setFbBlok] = useState<Record<string, string>>(progres?.feedbackBlok || {});
  // Isi ulang form saat baris yang dicek berganti.
  useEffect(() => {
    setFb(progres?.feedbackGuru || "");
    setNilaiTeks(progres?.nilaiGuru != null ? String(progres.nilaiGuru) : "");
    setFbBlok(progres?.feedbackBlok || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunci?.siswaId, kunci?.subtopicId]);

  // Jaring pengaman: bila progres baru terbaca setelah modal terbuka (mis. sinkron
  // menyusul), isi feedback per soal ikut disinkronkan selama form belum disentuh.
  useEffect(() => {
    const tersimpan = progres?.feedbackBlok || {};
    if (progres && Object.keys(fbBlok).length === 0 && Object.keys(tersimpan).length > 0) {
      setFbBlok(tersimpan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progres?.siswaId, progres?.subtopicId, progres?.feedbackBlok]);

  const fbKotor = fb.trim() !== (progres?.feedbackGuru || "").trim();
  const nilaiKotor =
    nilaiTeks.trim() === ""
      ? progres?.nilaiGuru != null
      : progres?.nilaiGuru == null || String(progres.nilaiGuru) !== nilaiTeks.trim();
  // Ada isian feedback per soal yang berbeda dari yang tersimpan (diisi/dihapus)?
  const fbBlokKotor = (() => {
    const lama = progres?.feedbackBlok || {};
    // Gabungan kunci (lama + isian terbaru) tanpa iterasi Set agar kompatibel target build.
    const semuaKunci = Object.keys({ ...lama, ...fbBlok });
    return semuaKunci.some((k) => (lama[k] || "").trim() !== (fbBlok[k] || "").trim());
  })();
  const adaPerubahan = fbKotor || nilaiKotor || fbBlokKotor;

  const simpan = () => {
    if (!kunci) return;
    const n = nilaiTeks.trim();
    // Feedback per soal: gabung yang tersimpan dengan isian terbaru (kosong = hapus).
    const blokBaru: Record<string, string> = { ...(progres?.feedbackBlok || {}) };
    for (const [k, v] of Object.entries(fbBlok)) {
      if (v.trim()) blokBaru[k] = v.trim();
      else delete blokBaru[k];
    }
    periksaLkpd(kunci.siswaId, kunci.subtopicId, {
      feedback: fb.trim(),
      feedbackBlok: blokBaru,
      nilai: n === "" ? null : Math.max(0, Math.min(100, Math.round(Number(n) || 0))),
      verifikasi: true,
    });
    setFb(fb.trim());
    setNilaiTeks(n === "" ? "" : n);
    setFbBlok(blokBaru);
  };

  if (!kunci || !topik || !sub) return null;

  return (
    <Modal open onClose={onClose} title={`Cek kerja LKPD — ${siswa?.nama || "Siswa"}`} wide>
      {/* Ringkasan pemeriksaan */}
      <div className="rounded-xl border border-line bg-wash/60 px-3.5 py-3 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
        <span className="font-semibold">{topik.judul} › {sub.judul}</span>
        <span className="text-ink-muted">{siswa?.kelas || "—"}</span>
        <span>
          Nilai <b className="text-[16px] align-middle">{nilai ?? "—"}</b>
        </span>
        <span className="text-ink-muted">{ringkas.selesai}/{ringkas.total} mission · {ringkas.persen}%</span>
        {progres?.dikumpulkan ? (
          <Badge tone="blue">Sudah dikumpulkan 🔒</Badge>
        ) : progres ? (
          <Badge tone="gray">Sedang dikerjakan</Badge>
        ) : null}
        {verifikasi ? (
          <Badge tone="green">Sudah diperiksa ✓</Badge>
        ) : progres?.dikumpulkan ? (
          <Badge tone="amber">Belum diperiksa</Badge>
        ) : null}
        {progres?.menungguPemeriksaan ? <Badge tone="amber">Ada essay menunggu nilai</Badge> : null}
        <span className="text-ink-muted ml-auto">Terakhir: {fmtDateTime(progres?.updatedAt || null)}</span>
      </div>

      {sub.missions.length === 0 ? (
        <p className="muted">Sub bab ini belum punya mission.</p>
      ) : !progres ? (
        <p className="muted">Siswa belum mengerjakan sub bab ini — belum ada progres tersimpan.</p>
      ) : (
        <p className="muted mb-3">
          💬 Tulis <b>feedback per soal</b> pada kotak di bawah tiap jawaban siswa — feedback per blok &amp; keseluruhan
          tersimpan bersama tombol <b>💾 Simpan hasil pemeriksaan</b> di bawah.
        </p>
      )}

      {/* Isi kerja per mission */}
      <div className="space-y-3">
        {sub.missions.map((m, i) => {
          const selesai = Boolean(progres?.missions.includes(m.id));
          return (
            <div key={m.id} className="rounded-xl border border-line overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 bg-wash/70 border-b border-line">
                <span className="text-[15px]">{m.ikon || "🔹"}</span>
                <span className="text-[14px] font-semibold">Mission {i + 1} · {m.judul}</span>
                <span className="ml-auto">
                  <Badge tone={selesai ? "green" : "gray"}>{selesai ? "Selesai ✓" : "Belum dikerjakan"}</Badge>
                </span>
              </div>
              <div className="p-3.5 space-y-2.5">
                {m.blok.length === 0 ? (
                  <p className="text-[13px] text-ink-faint">Mission tanpa konten.</p>
                ) : (
                  m.blok.map((b) => {
                    const jawab = progres?.jawaban[b.id];
                    const adaFoto = (progres?.lampiran?.[m.id]?.length || 0) > 0;
                    const fbTersimpan = progres?.feedbackBlok?.[b.id] || "";
                    const adaJawabTeks = Boolean(jawab && jawab.trim());
                    // Feedback per soal hanya untuk blok yang menampilkan jawaban siswa —
                    // atau blok yang sudah pernah diberi feedback guru (agar bisa diedit ulang).
                    if (!adaJawabTeks && !fbTersimpan && !(adaFoto && TIPE_JAWAB.includes(b.tipe))) {
                      return <BlokCek key={b.id} blok={b} jawaban={jawab} />;
                    }
                    return (
                      <div key={b.id}>
                        <BlokCek blok={b} jawaban={jawab} />
                        <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50/40 px-3.5 py-2.5">
                          <p className="text-[12.5px] font-medium text-ink-soft line-clamp-2 mb-1.5">
                            🧾 <span className="text-ink-faint">Ringkasan soal:</span> {ringkasBlok(b)}
                          </p>
                          <p className="text-[12.5px] text-ink-muted bg-white border border-line rounded-lg px-3 py-1.5 mb-2">
                            <b>Jawaban siswa:</b> {ringkasJawaban(b, jawab, adaFoto)}
                          </p>
                          <FeedbackBlok
                            id={b.id}
                            nilai={fbBlok[b.id] ?? fbTersimpan}
                            onChange={(teks) => setFbBlok((prev) => ({ ...prev, [b.id]: teks }))}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
                {(progres?.lampiran?.[m.id]?.length || 0) > 0 ? (
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-1.5">📷 Foto jawaban siswa</p>
                    <div className="flex flex-wrap gap-2">
                      {progres?.lampiran?.[m.id].map((f, i) => (
                        <a key={`${f.url}-${i}`} href={f.url} target="_blank" rel="noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={f.url}
                            alt={f.name || "Foto jawaban"}
                            className="h-24 w-24 rounded-lg border border-line object-cover bg-wash hover:opacity-90"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Panel hasil pemeriksaan: feedback + nilai + simpan */}
      <div className="mt-4 rounded-xl border border-line bg-wash/50 px-3.5 py-3 border-t-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <p className="text-[13.5px] font-semibold">📝 Hasil pemeriksaan</p>
          {fbBlokKotor ? <Badge tone="amber">💬 Feedback per soal belum disimpan</Badge> : null}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <div>
            <label className="label" htmlFor="nilai-guru-lkpd">Nilai (0–100)</label>
            <input
              id="nilai-guru-lkpd"
              type="number"
              min={0}
              max={100}
              className="input !w-[96px]"
              value={nilaiTeks}
              onChange={(e) => setNilaiTeks(e.target.value)}
              placeholder={nilai != null ? String(nilai) : "—"}
            />
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="label" htmlFor="fb-guru-lkpd">Feedback untuk siswa</label>
            <textarea
              id="fb-guru-lkpd"
              className="input min-h-[76px]"
              value={fb}
              onChange={(e) => setFb(e.target.value)}
              placeholder="Tulis komentar: bagian yang sudah tepat, yang perlu diperbaiki, dan langkah berikutnya…"
            />
          </div>
        </div>
        <p className="text-[12.5px] text-ink-muted mt-2">
          Kosongkan nilai bila ingin memakai nilai hitungan sistem <b>{nilai ?? "—"}</b>. Feedback keseluruhan <b>dan feedback
          per soal</b> tampil di siswa setelah disimpan; menyimpan hasil pemeriksaan menandai LKPD <b>sudah diperiksa</b>.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <p className="text-[13px] text-ink-muted">
            {verifikasi
              ? `Sudah diperiksa${progres?.diperiksaPada ? ` (${fmtDateTime(progres.diperiksaPada)})` : ""}${adaPerubahan ? " · ada perubahan belum disimpan" : ""}.`
              : progres?.dikumpulkan
                ? `Belum diperiksa — isi kerja di atas belum diberi keputusan.${adaPerubahan ? " · ada perubahan belum disimpan" : ""}`
                : `Siswa masih mengerjakan — keputusan bisa disimpan nanti.${adaPerubahan ? " · ada perubahan belum disimpan" : ""}`}
          </p>
          <div className="ml-auto flex flex-wrap gap-2">
            <button className="btn-ghost !py-2 !text-[13px]" onClick={onClose}>Tutup</button>
            {verifikasi ? (
              <button
                className="btn-ghost !py-2 !text-[13px]"
                onClick={() => kunci && periksaLkpd(kunci.siswaId, kunci.subtopicId, { verifikasi: false })}
              >
                Batalkan pemeriksaan
              </button>
            ) : null}
            <button className="btn-primary !py-2 !text-[13px]" onClick={simpan} disabled={!progres}>
              💾 Simpan hasil pemeriksaan {verifikasi ? "(perbarui)" : "& tandai sudah diperiksa"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
