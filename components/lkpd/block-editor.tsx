"use client";

import { useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import type { LkpdAktivitas, LkpdBloom, LkpdBlock, LkpdSel } from "@/lib/types";
import { BLOOM_LABEL } from "@/lib/types";
import { uid } from "@/lib/utils";
import { MediaField } from "@/components/media-field";
import { BLOCK_LABEL } from "./blocks";
import { PALET_PASANGAN } from "./activities";

type Patch = Partial<LkpdBlock>;

/** Editor satu content block: field menyesuaikan tipe (building-block editor). */
export function BlockEditor({
  blok,
  onChange,
  onUp,
  onDown,
  onDelete,
  canUp,
  canDown,
}: {
  blok: LkpdBlock;
  onChange: (p: Patch) => void;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  return (
    <div className="card !border-primary-200">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line bg-wash/50 rounded-t-xl2">
        <span className="text-[13px] font-semibold">{BLOCK_LABEL[blok.tipe]}</span>
        {blok.tipe === "pertanyaan" || blok.tipe === "essay" || blok.tipe === "refleksi" || blok.tipe === "aktivitas" ? (
          <label className="flex items-center gap-1.5 text-[12px] text-ink-muted">
            <span className="hidden sm:inline">Taksonomi Bloom</span>
            <select
              className="input !w-auto !py-1 !text-[12.5px]"
              value={blok.bloom || ""}
              onChange={(e) => onChange({ bloom: (e.target.value || undefined) as LkpdBloom | undefined })}
            >
              <option value="">— pilih level —</option>
              {(Object.keys(BLOOM_LABEL) as LkpdBloom[]).map((k) => (
                <option key={k} value={k}>{BLOOM_LABEL[k]}</option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="ml-auto flex gap-1">
          <button className="btn-ghost !px-2 !py-1 !text-[12px]" disabled={!canUp} onClick={onUp}>↑</button>
          <button className="btn-ghost !px-2 !py-1 !text-[12px]" disabled={!canDown} onClick={onDown}>↓</button>
          <button className="btn-danger !px-2 !py-1 !text-[12px]" onClick={onDelete}>Hapus</button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {(blok.tipe === "teks" || blok.tipe === "petunjuk" || blok.tipe === "refleksi" || blok.tipe === "essay") ? (
          <>
            <div>
              <label className="label">Judul / label blok (opsional)</label>
              <input className="input" value={blok.judul || ""} placeholder={blok.tipe === "essay" ? "mis. Analisis pola" : undefined} onChange={(e) => onChange({ judul: e.target.value })} />
            </div>
            <div>
              <label className="label">
                {blok.tipe === "petunjuk"
                  ? "Isi petunjuk (satu baris = satu petunjuk, tampil progresif)"
                  : blok.tipe === "refleksi"
                    ? "Pertanyaan / instruksi refleksi"
                    : blok.tipe === "essay"
                      ? "Pertanyaan essay (terbuka — HOTS: alasan, strategi, kesimpulan)"
                      : "Teks"}
              </label>
              <textarea className="input min-h-[90px]" value={blok.teks || ""} onChange={(e) => onChange({ teks: e.target.value })} />
            </div>
            {blok.tipe === "essay" || blok.tipe === "refleksi" ? (
              <div>
                <label className="label">Rubrik penilaian (panduan guru — opsional)</label>
                <input
                  className="input"
                  value={blok.rubrik || ""}
                  placeholder="mis. ketepatan langkah · kejelasan alasan · kesimpulan"
                  onChange={(e) => onChange({ rubrik: e.target.value })}
                />
                <p className="text-[12px] text-ink-muted mt-1.5">
                  Jawaban terbuka tidak dinilai otomatis — guru membukanya lewat <b>👁 Periksa</b> lalu mengisi feedback &amp; nilai.
                </p>
              </div>
            ) : null}
          </>
        ) : null}

        {blok.tipe === "gambar" ? (
          <>
            <MediaField
              label="Gambar — tempel tautan ATAU unggah foto dari perangkat"
              url={blok.url || ""}
              onUrl={(url) => onChange({ url: url || undefined })}
              accept="image/png,image/jpeg,image/webp,image/gif"
              acceptHint="Foto: PNG, JPG, WebP, atau GIF · maksimal 10 MB (kosong = placeholder)"
              placeholder="https://… atau unggah file"
              preview="gambar"
            />
            <div>
              <label className="label">Keterangan / deskripsi ilustrasi</label>
              <input className="input" value={blok.teks || ""} placeholder="mis. 🏫 Kelas A — 4 meja · 12 siswa" onChange={(e) => onChange({ teks: e.target.value })} />
            </div>
          </>
        ) : null}

        {blok.tipe === "video" ? (
          <>
            <div>
              <label className="label">Judul</label>
              <input className="input" value={blok.judul || ""} onChange={(e) => onChange({ judul: e.target.value })} />
            </div>
            <MediaField
              label="Video — tautan (YouTube / Drive) ATAU unggah file video"
              url={blok.url || ""}
              onUrl={(url) => onChange({ url: url || undefined })}
              accept="video/mp4,video/webm,video/ogg,video/quicktime"
              acceptHint="Video: MP4, WebM, OGV, atau MOV · maksimal 4 MB — video lebih besar? tempel tautan YouTube/Drive"
              placeholder="https://www.youtube.com/watch?v=… atau unggah file"
              preview="video"
            />
            <div>
              <label className="label">Keterangan bila tautan kosong</label>
              <input className="input" value={blok.teks || ""} onChange={(e) => onChange({ teks: e.target.value })} />
            </div>
          </>
        ) : null}

        {blok.tipe === "animasi" ? (
          <>
            <div>
              <label className="label">Judul</label>
              <input className="input" value={blok.judul || ""} onChange={(e) => onChange({ judul: e.target.value })} />
            </div>
            <MediaField
              label="Animasi — tautan embed ATAU unggah GIF"
              url={blok.url || ""}
              onUrl={(url) => onChange({ url: url || undefined })}
              accept="image/gif,image/webp,image/png,image/jpeg"
              acceptHint="Animasi: GIF (maksimal 10 MB) — atau tautan embed situs animasi (PhET, GeoGebra, dll.)"
              placeholder="https://… (situs embed atau file GIF)"
              preview="gambar"
            />
            <div>
              <label className="label">Keterangan bila tautan kosong</label>
              <input className="input" value={blok.teks || ""} onChange={(e) => onChange({ teks: e.target.value })} />
            </div>
          </>
        ) : null}

        {blok.tipe === "berkas" ? (
          <>
            <div>
              <label className="label">Nama berkas</label>
              <input className="input" value={blok.namaBerkas || ""} placeholder="mis. LKPD-Geometri.pdf" onChange={(e) => onChange({ namaBerkas: e.target.value })} />
            </div>
            <MediaField
              label="Berkas — tempel tautan ATAU unggah file dari perangkat"
              url={blok.url || ""}
              onUrl={(url, nama) => onChange({ url: url || undefined, namaBerkas: blok.namaBerkas || nama || undefined })}
              accept="application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip"
              acceptHint="Berkas: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, CSV, TXT, atau ZIP · maksimal 10 MB"
              placeholder="https://… atau unggah file"
            />
            <div>
              <label className="label">Keterangan</label>
              <input className="input" value={blok.teks || ""} onChange={(e) => onChange({ teks: e.target.value })} />
            </div>
          </>
        ) : null}

        {blok.tipe === "pertanyaan" ? <PertanyaanEditor blok={blok} onChange={onChange} /> : null}
        {blok.tipe === "aktivitas" ? <AktivitasEditor blok={blok} onChange={onChange} /> : null}
      </div>
    </div>
  );
}

/* ————————————————— editor pertanyaan ————————————————— */
function PertanyaanEditor({ blok, onChange }: { blok: LkpdBlock; onChange: (p: Patch) => void }) {
  const q = blok.pertanyaan || { teks: "", opsi: [] };
  const set = (p: Partial<typeof q>) => onChange({ pertanyaan: { ...q, ...p } });
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Pertanyaan *</label>
        <textarea className="input min-h-[60px]" value={q.teks} onChange={(e) => set({ teks: e.target.value })} />
      </div>

      <div>
        <label className="label">Opsi jawaban (centang kunci, tulis feedback edukatif tiap opsi)</label>
        <div className="space-y-2">
          {q.opsi.map((o, i) => (
            <div key={i} className="rounded-lg border border-line p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <input type="radio" name={`kunci-${blok.id}`} checked={o.benar} onChange={() => set({ opsi: q.opsi.map((x, j) => ({ ...x, benar: j === i })) })} />
                <input className="input !py-1.5" placeholder={`Opsi ${String.fromCharCode(65 + i)}`} value={o.teks} onChange={(e) => set({ opsi: q.opsi.map((x, j) => (j === i ? { ...x, teks: e.target.value } : x)) })} />
                <button className="btn-danger !px-2 !py-1 !text-[12px]" onClick={() => set({ opsi: q.opsi.filter((_, j) => j !== i) })}>✕</button>
              </div>
              <input className="input !py-1.5 !text-[13px]" placeholder="Feedback bila opsi ini dipilih (edukatif, bukan hanya benar/salah)" value={o.feedback} onChange={(e) => set({ opsi: q.opsi.map((x, j) => (j === i ? { ...x, feedback: e.target.value } : x)) })} />
            </div>
          ))}
        </div>
        <button className="btn-ghost !py-1.5 !text-[12.5px] mt-2" onClick={() => set({ opsi: [...q.opsi, { teks: "", benar: false, feedback: "" }] })}>+ Tambah opsi</button>
      </div>

      <div>
        <label className="label">Feedback bila jawaban benar</label>
        <input className="input" value={q.feedbackBenar || ""} onChange={(e) => set({ feedbackBenar: e.target.value })} />
      </div>

      <div>
        <label className="label">Petunjuk progresif (satu baris = satu petunjuk)</label>
        <textarea className="input min-h-[60px]" value={(q.petunjuk || []).join("\n")} onChange={(e) => set({ petunjuk: e.target.value.split("\n").filter((x) => x.trim() !== "") })} />
      </div>

      <div className="rounded-lg border border-line bg-wash/50 p-2.5 space-y-2">
        <label className="flex items-center gap-2 text-[13px] font-medium cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 accent-teal-600"
            checked={Boolean(q.uraian)}
            onChange={(e) => set({ uraian: e.target.checked || undefined, teksUraian: e.target.checked ? q.teksUraian || undefined : undefined })}
          />
          ✍️ Sertakan uraian pendamping (essay) — satu blok memuat pilihan ganda + uraian
        </label>
        {q.uraian ? (
          <>
            <input
              className="input !py-1.5 !text-[13px]"
              placeholder="Prompt uraian (mis. Jelaskan alasanmu memilih jawaban itu)"
              value={q.teksUraian || ""}
              onChange={(e) => set({ teksUraian: e.target.value || undefined })}
            />
            <p className="text-[12px] text-ink-muted">
              Pilihan ganda dinilai otomatis; uraian menunggu pemeriksaan guru (tampil pada 👁 Periksa) dan wajib diisi siswa agar mission bisa selesai.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ————————————————— editor aktivitas interaktif ————————————————— */
function AktivitasEditor({ blok, onChange }: { blok: LkpdBlock; onChange: (p: Patch) => void }) {
  const a = blok.aktivitas || { tipe: "seret-slot" as const, instruksi: "" };
  const set = (p: Partial<LkpdAktivitas>) => onChange({ aktivitas: { ...a, ...p } });
  // Daftar area efektif — turunannya SAMA dengan fallback renderer supaya konsisten
  // walau `areas` belum pernah disimpan.
  const areasEfektif = a.areas?.length
    ? a.areas
    : a.area
      ? [{ id: "a0", nama: a.area }]
      : [{ id: "a0", nama: "Area 1" }, { id: "a1", nama: "Area 2" }];

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Jenis aktivitas</label>
          <select
            className="input"
            value={a.tipe}
            onChange={(e) => {
              const tipe = e.target.value as LkpdAktivitas["tipe"];
              const patch: Partial<LkpdAktivitas> = { tipe };
              // Pindah ke isi-tabel tanpa struktur → siapkan kerangka awal
              // (2 kolom × 1 baris) supaya guru langsung bisa mengisi.
              if (tipe === "isi-tabel" && !(a.kolom || []).length) {
                patch.kolom = ["Kolom 1", "Kolom 2"];
                patch.baris = [{ sel: [{ teks: "" }, { teks: "" }] }];
              }
              // Kerangka awal aktivitas baru supaya guru langsung bisa mengisi.
              if (tipe === "benar-salah" && !(a.pernyataan || []).length) {
                patch.pernyataan = [
                  { id: uid("p"), teks: "", kunci: "true" },
                  { id: uid("p"), teks: "", kunci: "false" },
                ];
              }
              if (tipe === "urutkan" && (a.kartu || []).length < 2) {
                patch.kartu = [
                  { id: uid("k"), label: "", hasil: "", feedback: "" },
                  { id: uid("k"), label: "", hasil: "", feedback: "" },
                  { id: uid("k"), label: "", hasil: "", feedback: "" },
                ];
              }
              if (tipe === "seret-slot" && !(a.areas || []).length && !a.area) {
                patch.areas = [
                  { id: "a0", nama: "Area 1" },
                  { id: "a1", nama: "Area 2" },
                ];
              }
              set(patch);
            }}
          >
            <option value="seret-slot">🧩 Seret ke area (drag & drop)</option>
            <option value="cocokkan">🔗 Cocokkan pasangan</option>
            <option value="isi-tabel">📊 Isi tabel / manipulasi angka</option>
            <option value="benar-salah">✅ Benar / Salah</option>
            <option value="urutkan">🔢 Urutkan kartu</option>
          </select>
        </div>
        <div>
          <label className="label">Instruksi untuk siswa (Enter = baris baru)</label>
          <textarea
            className="input min-h-[70px]"
            value={a.instruksi}
            placeholder="mis. Kelompokkan kartu ke area yang sesuai…&#10;Boleh lebih dari satu baris."
            onChange={(e) => set({ instruksi: e.target.value })}
          />
        </div>
      </div>

      {a.tipe === "seret-slot" ? (
        <>
          <div>
            <label className="label">Area tujuan (2 atau lebih — nama & jumlah bebas dicustom)</label>
            <div className="space-y-1.5">
              {(areasEfektif).map((ar, i, list) => (
                <div key={ar.id} className="flex gap-2 items-center">
                  <span className="text-[12px] text-ink-faint w-5 shrink-0">{i + 1}.</span>
                  <input
                    className="input !py-1.5"
                    placeholder={`Area ${i + 1}`}
                    value={ar.nama}
                    aria-label={`Nama area ${i + 1}`}
                    onChange={(e) => set({ areas: list.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)) })}
                  />
                  <button
                    className="btn-danger !px-2 !py-1 !text-[12px] shrink-0"
                    title={list.length <= 2 ? "Minimal 2 area" : "Hapus area ini"}
                    disabled={list.length <= 2}
                    onClick={() => {
                      const sisa = list.filter((_, j) => j !== i).map((x) => ({ ...x }));
                      // Kartu yang terkunci ke area terhapus → kuncinya dilepas.
                      const kartu = (a.kartu || []).map((k) => (k.kunciArea === ar.id ? { ...k, kunciArea: undefined } : k));
                      set({ areas: sisa, kartu });
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
            <button
              className="btn-ghost !py-1.5 !text-[12.5px] mt-2"
              disabled={(areasEfektif).length >= 8}
              onClick={() => {
                const list = areasEfektif;
                set({ areas: [...list, { id: uid("a"), nama: `Area ${list.length + 1}` }] });
              }}
            >+ Tambah area</button>
            <p className="text-[12px] text-ink-faint mt-1">Siswa menyeret/memilih kartu dari pool ke salah satu area ini.</p>
          </div>
          <div>
            <label className="label">Kartu (label · hasil yang muncul · feedback)</label>
            <div className="space-y-2">
              {(a.kartu || []).map((k, i) => {
                const areas = areasEfektif;
                return (
                  <div key={i} className="rounded-lg border border-line p-2.5 space-y-2">
                    <div className="flex gap-2">
                      <input className="input !py-1.5" placeholder="Label (6 pekerja)" value={k.label} onChange={(e) => set({ kartu: (a.kartu || []).map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                      <input className="input !py-1.5" placeholder="Hasil (6 pekerja → 8 hari)" value={k.hasil} onChange={(e) => set({ kartu: (a.kartu || []).map((x, j) => (j === i ? { ...x, hasil: e.target.value } : x)) })} />
                      <button className="btn-danger !px-2 !py-1 !text-[12px]" onClick={() => set({ kartu: (a.kartu || []).filter((_, j) => j !== i) })}>✕</button>
                    </div>
                    <input className="input !py-1.5 !text-[13px]" placeholder="Feedback setelah kartu ditempatkan" value={k.feedback || ""} onChange={(e) => set({ kartu: (a.kartu || []).map((x, j) => (j === i ? { ...x, feedback: e.target.value } : x)) })} />
                    <div className="flex items-center gap-2">
                      <label className="text-[12px] text-ink-muted shrink-0">Kunci area (opsional):</label>
                      <select
                        className="input !py-1 !text-[12.5px]"
                        value={k.kunciArea || ""}
                        aria-label={`Area yang benar untuk kartu ${i + 1}`}
                        onChange={(e) => set({ kartu: (a.kartu || []).map((x, j) => (j === i ? { ...x, kunciArea: e.target.value || undefined } : x)) })}
                      >
                        <option value="">— area bebas (tidak dinilai) —</option>
                        {areas.map((ar) => (
                          <option key={ar.id} value={ar.id}>✓ {ar.nama}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="btn-ghost !py-1.5 !text-[12.5px] mt-2" onClick={() => set({ kartu: [...(a.kartu || []), { id: uid("k"), label: "", hasil: "", feedback: "" }] })}>+ Tambah kartu</button>
            <p className="text-[12px] text-ink-faint mt-1">Isi “kunci area” bila kartu ini punya area yang benar → langsung dinilai hijau/merah saat ditempatkan.</p>
          </div>
          <div>
            <label className="label">Temuan (muncul setelah semua kartu ditempatkan)</label>
            <textarea className="input min-h-[60px]" value={a.temuan || ""} onChange={(e) => set({ temuan: e.target.value })} />
          </div>
        </>
      ) : null}

      {a.tipe === "urutkan" ? (
        <div>
          <label className="label">Kartu — urutan di daftar ini = urutan BENAR (kunci jawaban)</label>
          <div className="space-y-2">
            {(a.kartu || []).map((k, i) => (
              <div key={i} className="rounded-lg border border-line p-2.5 space-y-2">
                <div className="flex gap-2 items-center">
                  <span className="text-[12px] font-semibold text-ink-muted w-5 shrink-0">{i + 1}.</span>
                  <input
                    className="input !py-1.5"
                    placeholder={`Langkah ${i + 1} (urutan benar)`}
                    aria-label={`Langkah ${i + 1}`}
                    value={k.label}
                    onChange={(e) => set({ kartu: (a.kartu || []).map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                  />
                  <button
                    className="btn-danger !px-2 !py-1 !text-[12px]"
                    title={((a.kartu || []).length <= 2) ? "Minimal 2 kartu" : "Hapus kartu"}
                    disabled={(a.kartu || []).length <= 2}
                    onClick={() => set({ kartu: (a.kartu || []).filter((_, j) => j !== i) })}
                  >✕</button>
                </div>
                <input
                  className="input !py-1.5 !text-[13px]"
                  placeholder="Feedback bila urutan kartu ini salah (opsional)"
                  value={k.feedback || ""}
                  onChange={(e) => set({ kartu: (a.kartu || []).map((x, j) => (j === i ? { ...x, feedback: e.target.value } : x)) })}
                />
              </div>
            ))}
          </div>
          <button
            className="btn-ghost !py-1.5 !text-[12.5px] mt-2"
            onClick={() => set({ kartu: [...(a.kartu || []), { id: uid("k"), label: "", hasil: "", feedback: "" }] })}
          >+ Tambah kartu</button>
          <p className="text-[12px] text-ink-faint mt-1">
            Untuk siswa, daftar ini dimulai dalam keadaan <b>dibalik</b> — mereka menyusunnya kembali (seret / tombol ↑▼, ada Undo), lalu menekan “Periksa urutan”.
          </p>
        </div>
      ) : null}

      {a.tipe === "benar-salah" ? (
        <div>
          <label className="label">Pernyataan — tentukan kunci Benar/Salah + feedback</label>
          <div className="space-y-2">
            {(a.pernyataan || []).map((p, i) => (
              <div key={p.id} className="rounded-lg border border-line p-2.5 space-y-2">
                <div className="flex gap-2 items-center">
                  <span className="text-[12px] font-semibold text-ink-muted w-5 shrink-0">{i + 1}.</span>
                  <input
                    className="input !py-1.5"
                    placeholder="Tulis pernyataan…"
                    aria-label={`Pernyataan ${i + 1}`}
                    value={p.teks}
                    onChange={(e) => set({ pernyataan: (a.pernyataan || []).map((x, j) => (j === i ? { ...x, teks: e.target.value } : x)) })}
                  />
                  <button
                    className="btn-danger !px-2 !py-1 !text-[12px]"
                    onClick={() => set({ pernyataan: (a.pernyataan || []).filter((_, j) => j !== i) })}
                  >✕</button>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <label className="text-[12px] text-ink-muted shrink-0">Kunci:</label>
                  <select
                    className="input !py-1 !text-[12.5px] !w-auto"
                    value={p.kunci}
                    aria-label={`Kunci pernyataan ${i + 1}`}
                    onChange={(e) => set({ pernyataan: (a.pernyataan || []).map((x, j) => (j === i ? { ...x, kunci: e.target.value as "true" | "false" } : x)) })}
                  >
                    <option value="true">✓ Benar</option>
                    <option value="false">✗ Salah</option>
                  </select>
                  <input
                    className="input !py-1.5 !text-[13px] flex-1 min-w-[180px]"
                    placeholder="Feedback bila jawaban siswa benar"
                    value={p.feedbackBenar || ""}
                    onChange={(e) => set({ pernyataan: (a.pernyataan || []).map((x, j) => (j === i ? { ...x, feedbackBenar: e.target.value || undefined } : x)) })}
                  />
                </div>
                <input
                  className="input !py-1.5 !text-[13px]"
                  placeholder="Feedback bila jawaban siswa salah (opsional)"
                  value={p.feedbackSalah || ""}
                  onChange={(e) => set({ pernyataan: (a.pernyataan || []).map((x, j) => (j === i ? { ...x, feedbackSalah: e.target.value || undefined } : x)) })}
                />
              </div>
            ))}
            {(a.pernyataan || []).length === 0 ? (
              <p className="text-[13px] text-ink-faint italic">Belum ada pernyataan — klik “+ Tambah pernyataan”.</p>
            ) : null}
          </div>
          <button
            className="btn-ghost !py-1.5 !text-[12.5px] mt-2"
            onClick={() => set({ pernyataan: [...(a.pernyataan || []), { id: uid("p"), teks: "", kunci: "true" }] })}
          >+ Tambah pernyataan</button>
        </div>
      ) : null}

      {a.tipe === "cocokkan" ? (
        <>
          <div>
            <label className="label">Pasangan (kiri → kanan, dijodohkan per baris)</label>
            <div className="space-y-2">
              {(a.kiri || []).map((k, i) => (
                <div key={i} className="rounded-lg border border-line p-2 space-y-1.5">
                  <div className="flex gap-2 items-center">
                    <input
                      className="input !py-1.5"
                      placeholder="Kolom A"
                      value={k.label}
                      onChange={(e) => {
                        const kiri = (a.kiri || []).map((x, j) => (j === i ? { ...x, label: e.target.value } : x));
                        const kanan = a.kanan || [];
                        set({ kiri, pasangan: Object.fromEntries(kiri.map((x, j) => [x.id, kanan[j]?.id || ""])) });
                      }}
                    />
                    <span>→</span>
                    <input
                      className="input !py-1.5"
                      placeholder="Kolom B (pasangan tepat)"
                      value={(a.kanan || [])[i]?.label || ""}
                      onChange={(e) => {
                        const kanan = (a.kanan || []).map((x, j) => (j === i ? { ...x, label: e.target.value } : x));
                        const kiri = a.kiri || [];
                        set({ kanan, pasangan: Object.fromEntries(kiri.map((x, j) => [x.id, kanan[j]?.id || ""])) });
                      }}
                    />
                    <button className="btn-danger !px-2 !py-1 !text-[12px]" onClick={() => {
                      const kiri = (a.kiri || []).filter((_, j) => j !== i);
                      const kanan = (a.kanan || []).filter((_, j) => j !== i);
                      const warna = { ...(a.warnaPasangan || {}) };
                      delete warna[k.id];
                      set({ kiri, kanan, pasangan: Object.fromEntries(kiri.map((x, j) => [x.id, kanan[j]?.id || ""])), warnaPasangan: warna });
                    }}>✕</button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap pl-1">
                    <span className="text-[11.5px] text-ink-faint">Warna pasangan:</span>
                    <button
                      className={`text-[11.5px] px-1.5 py-0.5 rounded border ${!a.warnaPasangan?.[k.id] ? "border-primary bg-primary-50 text-primary font-semibold" : "border-line text-ink-muted hover:border-primary-200"}`}
                      title="Warna otomatis (berurutan)"
                      onClick={() => {
                        const warna = { ...(a.warnaPasangan || {}) };
                        delete warna[k.id];
                        set({ warnaPasangan: Object.keys(warna).length ? warna : undefined });
                      }}
                    >auto</button>
                    {PALET_PASANGAN.map((c) => {
                      const aktif = a.warnaPasangan?.[k.id] === c;
                      return (
                        <button
                          key={c}
                          className={`h-5 w-5 rounded-full border transition-transform ${aktif ? "border-ink ring-2 ring-primary scale-110" : "border-black/10 hover:scale-110"}`}
                          style={{ backgroundColor: c }}
                          title={`Pakai warna ${c}`}
                          aria-label={`Warna ${c}`}
                          onClick={() => set({ warnaPasangan: { ...(a.warnaPasangan || {}), [k.id]: c } })}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="btn-ghost !py-1.5 !text-[12.5px] mt-2"
              onClick={() => {
                const idBaru = `p-${uid("q")}`;
                const kiri = [...(a.kiri || []), { id: idBaru, label: "" }];
                const kanan = [...(a.kanan || []), { id: idBaru, label: "" }];
                set({ kiri, kanan, pasangan: Object.fromEntries(kiri.map((x, j) => [x.id, kanan[j]?.id || ""])) });
              }}
            >+ Tambah pasangan</button>
            <p className="text-[12.5px] text-ink-faint mt-1">Baris ke-N di kolom A dijodohkan dengan baris ke-N di kolom B. Pasangan yang terjodohkan diberi warna — otomatis per urutan, bisa diganti per baris lewat palet.</p>
          </div>
          <div>
            <label className="label">Feedback bila salah pasang</label>
            <input className="input" value={a.feedbackSalah || ""} onChange={(e) => set({ feedbackSalah: e.target.value })} />
          </div>
        </>
      ) : null}

      {a.tipe === "isi-tabel" ? <TabelEditor a={a} set={set} /> : null}
    </div>
  );
}

/* ————————————————— editor tabel isi-tabel ————————————————— */

/**
 * Editor tabel sebagai TABEL sungguhan (bukan kartu-kartu terpisah):
 * rename/pindah/hapus kolom, pindah/duplikat/hapus baris, dan per sel bisa
 * berganti antara **sel teks (terkunci)** ↔ **sel diisi siswa (kunci + feedback)**
 * ↔ **kotak centang benar/salah**.
 * Struktur sel & kolom selalu disinkronkan (bila jumlah sel ≠ jumlah kolom,
 * sel dipotong/ditambah otomatis) supaya tabel siswa selalu rapi sejajar.
 */
function TabelEditor({ a, set }: { a: LkpdAktivitas; set: (p: Partial<LkpdAktivitas>) => void }) {
  const kolom = a.kolom || [];
  const baris = a.baris || [];
  // "Sel diisi siswa" = sel yang di renderer jadi input siswa (teks belum terisi).
  // Dihitung dari MODE sel, bukan isi kunci — supaya ringkasan langsung sinkron
  // begitu guru menekan "jadi sel diisi siswa" (kunci masih kosong saat itu).
  const modeSiswa = (s: LkpdSel) => s.teks === undefined;
  const nKunci = baris.reduce((n, r) => n + r.sel.filter(modeSiswa).length, 0);

  /** Satu jalur semua perubahan struktur: kolom & sel tiap baris ikut menyesuaikan. */
  const setTabel = (k: string[], b: { sel: LkpdSel[] }[]) => {
    const n = k.length;
    set({
      kolom: k,
      baris: b.map((r) => {
        const sel = r.sel.slice(0, n);
        while (sel.length < n) sel.push({ teks: "" });
        return { ...r, sel };
      }),
    });
  };

  const tabelRef = useRef<HTMLDivElement | null>(null);

  /** Fokus ke sel (baris, kolom) — dipakai navigasi Enter ala spreadsheet. */
  const fokusSel = (ri: number, ci: number) => {
    const el = tabelRef.current?.querySelector<HTMLInputElement>(`[data-sel="${ri}-${ci}"]`);
    if (el) {
      el.focus();
      el.select();
    }
  };

  /**
   * Tempel data Excel/CSV (TSV): satu tempelan membangun tabel sekaligus —
   * grid diperluas otomatis dari sel aktif ke bawah & ke kanan.
   */
  const tempelTabel = (e: ClipboardEvent<HTMLInputElement>, ri: number, ci: number) => {
    const teks = e.clipboardData.getData("text/plain");
    if (!/[\t\n]/.test(teks)) return; // tanpa tab / baris baru → tempel biasa
    e.preventDefault();
    const matriks = teks
      .replace(/\r\n?/g, "\n")
      .replace(/\n+$/, "")
      .split("\n")
      .map((b) => b.split("\t"));
    const nKolomBaru = Math.max(...matriks.map((m) => m.length));
    const k = [...kolom];
    while (k.length < ci + nKolomBaru) k.push(`Kolom ${k.length + 1}`);
    const b = baris.map((r) => ({ sel: [...r.sel] }));
    while (b.length < ri + matriks.length) b.push({ sel: [] });
    matriks.forEach((m, di) => {
      const sel = b[ri + di].sel;
      while (sel.length < k.length) sel.push({ teks: "" });
      m.forEach((v, dj) => {
        sel[ci + dj] = { teks: v };
      });
    });
    setTabel(k, b);
    window.setTimeout(() => fokusSel(ri + matriks.length - 1, ci + nKolomBaru - 1), 30);
  };

  /** Enter = pindah ke bawah (di baris terakhir → tambah baris, persis seperti Excel). */
  const enterKeBawah = (e: KeyboardEvent<HTMLInputElement>, ri: number, ci: number) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (ri + 1 < baris.length) {
      fokusSel(ri + 1, ci);
    } else {
      tambahBaris();
      window.setTimeout(() => fokusSel(ri + 1, ci), 30);
    }
  };

  const ubahSel = (ri: number, ci: number, patch: Partial<LkpdSel>) =>
    setTabel(
      kolom,
      baris.map((r, i) => {
        if (i !== ri) return r;
        // Bangun sel sepanjang kolom dulu (data lama bisa kurang/lebih) supaya
        // patch selalu kena — tidak ada klik "sia-sia" pada baris yang belum rapi.
        const sel = Array.from({ length: kolom.length }, (_, j) => ({ ...(r.sel[j] || { teks: "" }) }));
        sel[ci] = { ...(sel[ci] || { teks: "" }), ...patch };
        return { sel };
      })
    );

  const geserKolom = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= kolom.length) return;
    const k = [...kolom];
    [k[i], k[j]] = [k[j], k[i]];
    setTabel(k, baris.map((r) => {
      const s = [...r.sel];
      [s[i], s[j]] = [s[j], s[i]];
      return { sel: s };
    }));
  };

  const hapusKolom = (i: number) => {
    if (kolom.length <= 1 && baris.some((r) => r.sel.some(modeSiswa))) {
      if (!confirm("Hapus kolom terakhir beserta seluruh kunci jawabannya?")) return;
    }
    setTabel(kolom.filter((_, j) => j !== i), baris.map((r) => ({ sel: r.sel.filter((_, j) => j !== i) })));
  };

  const tambahKolom = () => setTabel([...kolom, `Kolom ${kolom.length + 1}`], baris);

  const tambahBaris = () => {
    const k = kolom.length ? kolom : ["Kolom 1"];
    setTabel(k, [...baris, { sel: k.map(() => ({ teks: "" })) }]);
  };

  const hapusBaris = (ri: number) => {
    if ((baris[ri]?.sel || []).some(modeSiswa) && !confirm(`Hapus baris ${ri + 1} beserta kunci & feedback selnya?`)) return;
    setTabel(kolom, baris.filter((_, i) => i !== ri));
  };

  const duplikatBaris = (ri: number) => {
    const asal = baris[ri];
    const salinan = { sel: (asal ? asal.sel : kolom.map(() => ({ teks: "" }))).map((s) => ({ ...s })) };
    const next = [...baris];
    next.splice(ri + 1, 0, salinan);
    setTabel(kolom, next);
  };

  const geserBaris = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= baris.length) return;
    const next = [...baris];
    [next[i], next[j]] = [next[j], next[i]];
    setTabel(kolom, next);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <label className="label !mb-0">Tabel (kolom & baris)</label>
        <span className="text-[12px] text-ink-faint">{kolom.length} kolom · {baris.length} baris · {nKunci} sel diisi siswa</span>
      </div>

      <div ref={tabelRef} className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[620px] text-[13px]">
          <thead>
            <tr className="bg-wash/80 text-left align-bottom">
              <th className="w-7 px-2 py-1.5 text-[11.5px] font-medium text-ink-faint">#</th>
              {kolom.map((c, i) => (
                <th key={i} className="px-1.5 py-1.5 min-w-[150px]">
                  <div className="flex items-center gap-1">
                    <input
                      className="input !py-1 !text-[12.5px] flex-1 min-w-0"
                      value={c}
                      placeholder={`Kolom ${i + 1}`}
                      aria-label={`Nama kolom ${i + 1}`}
                      onChange={(e) => setTabel(kolom.map((x, j) => (j === i ? e.target.value : x)), baris)}
                    />
                    <button className="btn-ghost !px-1.5 !py-0.5 !text-[11px]" title="Pindah kolom ke kiri" disabled={i === 0} onClick={() => geserKolom(i, -1)}>◀</button>
                    <button className="btn-ghost !px-1.5 !py-0.5 !text-[11px]" title="Pindah kolom ke kanan" disabled={i === kolom.length - 1} onClick={() => geserKolom(i, 1)}>▶</button>
                    <button className="btn-ghost !px-1.5 !py-0.5 !text-[11px] !text-red-500 hover:!bg-red-50" title="Hapus kolom" onClick={() => hapusKolom(i)}>✕</button>
                  </div>
                </th>
              ))}
              <th className="w-9" />
            </tr>
          </thead>
          <tbody>
            {baris.map((r, ri) => (
              <tr key={ri} className="border-t border-line align-top">
                <td className="px-2 py-2 text-[11.5px] text-ink-faint">{ri + 1}</td>
                {kolom.map((_, ci) => {
                  const s = r.sel[ci] || { teks: "" };
                  const modeCentang = s.centang === true;
                  const modeKunci = !modeCentang && s.kunci !== undefined;
                  const mode = modeCentang ? "centang" : modeKunci ? "kunci" : "teks";
                  const gantiMode = (v: string) => {
                    if (v === mode) return;
                    if (v === "centang") {
                      ubahSel(ri, ci, {
                        centang: true,
                        kunci: s.kunci === "true" || s.kunci === "false" ? s.kunci : "false",
                        teks: undefined,
                        feedbackBenar: s.feedbackBenar,
                        feedbackSalah: s.feedbackSalah,
                      });
                    } else if (v === "kunci") {
                      ubahSel(ri, ci, {
                        kunci: s.centang ? "" : (s.teks ?? s.kunci ?? ""),
                        teks: undefined,
                        centang: undefined,
                        feedbackBenar: s.feedbackBenar,
                        feedbackSalah: s.feedbackSalah,
                      });
                    } else {
                      ubahSel(ri, ci, {
                        teks: s.centang ? (s.teks || "") : (s.teks ?? s.kunci ?? ""),
                        kunci: undefined,
                        centang: undefined,
                        feedbackBenar: undefined,
                        feedbackSalah: undefined,
                      });
                    }
                  };
                  return (
                    <td key={ci} className="px-1.5 py-1.5">
                      <div className="space-y-1">
                        <select
                          className="input !py-0.5 !px-1 !text-[11.5px] w-full"
                          value={mode}
                          aria-label={`Mode sel baris ${ri + 1} kolom ${ci + 1}`}
                          onChange={(e) => gantiMode(e.target.value)}
                        >
                          <option value="teks">📝 Teks</option>
                          <option value="kunci">🔓 Diisi siswa</option>
                          <option value="centang">☑ Centang</option>
                        </select>
                        {modeCentang ? (
                          <>
                            <label className="flex items-center gap-2 rounded-lg border border-teal-300 bg-teal-50/40 px-2 py-1.5 text-[12.5px] text-ink">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-teal-600"
                                checked={(s.kunci || "false") === "true"}
                                data-sel={`${ri}-${ci}`}
                                aria-label={`Kunci centang baris ${ri + 1} kolom ${ci + 1}`}
                                onChange={(e) => ubahSel(ri, ci, { kunci: e.target.checked ? "true" : "false" })}
                              />
                              <span>Harus dicentang</span>
                            </label>
                            <input className="input !py-1 !text-[12px]" placeholder="✓ feedback bila benar" aria-label="Feedback benar" value={s.feedbackBenar || ""} onChange={(e) => ubahSel(ri, ci, { feedbackBenar: e.target.value })} />
                            <input className="input !py-1 !text-[12px]" placeholder="✗ feedback bila salah" aria-label="Feedback salah" value={s.feedbackSalah || ""} onChange={(e) => ubahSel(ri, ci, { feedbackSalah: e.target.value })} />
                          </>
                        ) : modeKunci ? (
                          <>
                            <input
                              className="input !py-1 !text-[12.5px] !border-amber-300 !bg-amber-50/40"
                              placeholder="kunci jawaban…"
                              aria-label={`Kunci baris ${ri + 1} kolom ${ci + 1}`}
                              data-sel={`${ri}-${ci}`}
                              value={s.kunci || ""}
                              onPaste={(e) => tempelTabel(e, ri, ci)}
                              onKeyDown={(e) => enterKeBawah(e, ri, ci)}
                              onChange={(e) => ubahSel(ri, ci, { kunci: e.target.value })}
                            />
                            <input className="input !py-1 !text-[12px]" placeholder="✓ feedback bila benar" aria-label="Feedback benar" value={s.feedbackBenar || ""} onChange={(e) => ubahSel(ri, ci, { feedbackBenar: e.target.value })} />
                            <input className="input !py-1 !text-[12px]" placeholder="✗ feedback bila salah" aria-label="Feedback salah" value={s.feedbackSalah || ""} onChange={(e) => ubahSel(ri, ci, { feedbackSalah: e.target.value })} />
                          </>
                        ) : (
                          <>
                            <input
                              className="input !py-1 !text-[12.5px]"
                              placeholder="isi teks sel…"
                              aria-label={`Teks baris ${ri + 1} kolom ${ci + 1}`}
                              data-sel={`${ri}-${ci}`}
                              value={s.teks || ""}
                              onPaste={(e) => tempelTabel(e, ri, ci)}
                              onKeyDown={(e) => enterKeBawah(e, ri, ci)}
                              onChange={(e) => ubahSel(ri, ci, { teks: e.target.value })}
                            />
                          </>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="px-1 py-1.5">
                  <div className="flex flex-col items-center gap-0.5">
                    <button className="btn-ghost !px-1.5 !py-0.5 !text-[11px]" title="Naikkan baris" disabled={ri === 0} onClick={() => geserBaris(ri, -1)}>▲</button>
                    <button className="btn-ghost !px-1.5 !py-0.5 !text-[11px]" title="Turunkan baris" disabled={ri === baris.length - 1} onClick={() => geserBaris(ri, 1)}>▼</button>
                    <button className="btn-ghost !px-1.5 !py-0.5 !text-[11px]" title="Duplikat baris" onClick={() => duplikatBaris(ri)}>⧉</button>
                    <button className="btn-ghost !px-1.5 !py-0.5 !text-[11px] !text-red-500 hover:!bg-red-50" title="Hapus baris" onClick={() => hapusBaris(ri)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
            {baris.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-[12.5px] italic text-ink-faint" colSpan={kolom.length + 2}>Belum ada baris — klik “+ Baris”.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={tambahKolom}>+ Kolom</button>
        <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={tambahBaris}>+ Baris</button>
        <span className="text-[11.5px] text-ink-faint">
          💡 <b>Tempel (Ctrl+V)</b> data Excel/CSV dari sel mana pun — tabel menyesuaikan otomatis. <b>Enter</b> = pindah ke bawah (baris terakhir menambah baris) · <b>Tab</b> = ke kanan. Mode sel: 📝 teks terkunci · 🔓 diisi siswa · ☑ centang.
        </span>
      </div>
    </div>
  );
}
