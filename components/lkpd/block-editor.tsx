"use client";

import type { LkpdAktivitas, LkpdBlock, LkpdSel } from "@/lib/types";
import { uid } from "@/lib/utils";
import { BLOCK_LABEL } from "./blocks";

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
        <div className="ml-auto flex gap-1">
          <button className="btn-ghost !px-2 !py-1 !text-[12px]" disabled={!canUp} onClick={onUp}>↑</button>
          <button className="btn-ghost !px-2 !py-1 !text-[12px]" disabled={!canDown} onClick={onDown}>↓</button>
          <button className="btn-danger !px-2 !py-1 !text-[12px]" onClick={onDelete}>Hapus</button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {(blok.tipe === "teks" || blok.tipe === "petunjuk" || blok.tipe === "refleksi") ? (
          <>
            {blok.tipe === "teks" || blok.tipe === "petunjuk" ? (
              <div>
                <label className="label">Judul (opsional)</label>
                <input className="input" value={blok.judul || ""} onChange={(e) => onChange({ judul: e.target.value })} />
              </div>
            ) : null}
            <div>
              <label className="label">{blok.tipe === "petunjuk" ? "Isi petunjuk (satu baris = satu petunjuk, tampil progresif)" : blok.tipe === "refleksi" ? "Pertanyaan / instruksi refleksi" : "Teks"}</label>
              <textarea className="input min-h-[90px]" value={blok.teks || ""} onChange={(e) => onChange({ teks: e.target.value })} />
            </div>
          </>
        ) : null}

        {blok.tipe === "gambar" ? (
          <>
            <div>
              <label className="label">URL gambar (opsional — kosong = placeholder)</label>
              <input className="input" value={blok.url || ""} placeholder="https://…" onChange={(e) => onChange({ url: e.target.value })} />
            </div>
            <div>
              <label className="label">Keterangan / deskripsi ilustrasi</label>
              <input className="input" value={blok.teks || ""} placeholder="mis. 🏫 Kelas A — 4 meja · 12 siswa" onChange={(e) => onChange({ teks: e.target.value })} />
            </div>
          </>
        ) : null}

        {blok.tipe === "video" || blok.tipe === "animasi" ? (
          <>
            <div>
              <label className="label">Judul</label>
              <input className="input" value={blok.judul || ""} onChange={(e) => onChange({ judul: e.target.value })} />
            </div>
            <div>
              <label className="label">URL / embed (YouTube, GIF, dll. — kosong = placeholder)</label>
              <input className="input" value={blok.url || ""} placeholder="https://…" onChange={(e) => onChange({ url: e.target.value })} />
            </div>
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
            <div>
              <label className="label">URL berkas (opsional)</label>
              <input className="input" value={blok.url || ""} placeholder="https://…" onChange={(e) => onChange({ url: e.target.value })} />
            </div>
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
    </div>
  );
}

/* ————————————————— editor aktivitas interaktif ————————————————— */
function AktivitasEditor({ blok, onChange }: { blok: LkpdBlock; onChange: (p: Patch) => void }) {
  const a = blok.aktivitas || { tipe: "seret-slot" as const, instruksi: "" };
  const set = (p: Partial<LkpdAktivitas>) => onChange({ aktivitas: { ...a, ...p } });

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Jenis aktivitas</label>
          <select className="input" value={a.tipe} onChange={(e) => set({ tipe: e.target.value as LkpdAktivitas["tipe"] })}>
            <option value="seret-slot">🧩 Seret ke area (drag & drop)</option>
            <option value="cocokkan">🔗 Cocokkan pasangan</option>
            <option value="isi-tabel">📊 Isi tabel / manipulasi angka</option>
          </select>
        </div>
        <div>
          <label className="label">Instruksi untuk siswa</label>
          <input className="input" value={a.instruksi} onChange={(e) => set({ instruksi: e.target.value })} />
        </div>
      </div>

      {a.tipe === "seret-slot" ? (
        <>
          <div>
            <label className="label">Nama area jatuh</label>
            <input className="input" value={a.area || ""} placeholder="Area kondisi baru" onChange={(e) => set({ area: e.target.value })} />
          </div>
          <div>
            <label className="label">Kartu (label · hasil yang muncul · feedback)</label>
            <div className="space-y-2">
              {(a.kartu || []).map((k, i) => (
                <div key={i} className="rounded-lg border border-line p-2.5 space-y-2">
                  <div className="flex gap-2">
                    <input className="input !py-1.5" placeholder="Label (6 pekerja)" value={k.label} onChange={(e) => set({ kartu: (a.kartu || []).map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                    <input className="input !py-1.5" placeholder="Hasil (6 pekerja → 8 hari)" value={k.hasil} onChange={(e) => set({ kartu: (a.kartu || []).map((x, j) => (j === i ? { ...x, hasil: e.target.value } : x)) })} />
                    <button className="btn-danger !px-2 !py-1 !text-[12px]" onClick={() => set({ kartu: (a.kartu || []).filter((_, j) => j !== i) })}>✕</button>
                  </div>
                  <input className="input !py-1.5 !text-[13px]" placeholder="Feedback setelah kartu ditempatkan" value={k.feedback || ""} onChange={(e) => set({ kartu: (a.kartu || []).map((x, j) => (j === i ? { ...x, feedback: e.target.value } : x)) })} />
                </div>
              ))}
            </div>
            <button className="btn-ghost !py-1.5 !text-[12.5px] mt-2" onClick={() => set({ kartu: [...(a.kartu || []), { id: uid("k"), label: "", hasil: "", feedback: "" }] })}>+ Tambah kartu</button>
          </div>
          <div>
            <label className="label">Temuan (muncul setelah semua kartu ditempatkan)</label>
            <textarea className="input min-h-[60px]" value={a.temuan || ""} onChange={(e) => set({ temuan: e.target.value })} />
          </div>
        </>
      ) : null}

      {a.tipe === "cocokkan" ? (
        <>
          <div>
            <label className="label">Pasangan (kiri → kanan, dijodohkan per baris)</label>
            <div className="space-y-2">
              {(a.kiri || []).map((k, i) => (
                <div key={i} className="flex gap-2 items-center">
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
                    set({ kiri, kanan, pasangan: Object.fromEntries(kiri.map((x, j) => [x.id, kanan[j]?.id || ""])) });
                  }}>✕</button>
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
            <p className="text-[12.5px] text-ink-faint mt-1">Baris ke-N di kolom A dijodohkan dengan baris ke-N di kolom B.</p>
          </div>
          <div>
            <label className="label">Feedback bila salah pasang</label>
            <input className="input" value={a.feedbackSalah || ""} onChange={(e) => set({ feedbackSalah: e.target.value })} />
          </div>
        </>
      ) : null}

      {a.tipe === "isi-tabel" ? (
        <>
          <div>
            <label className="label">Kolom tabel</label>
            <div className="flex flex-wrap gap-2 items-center">
              {(a.kolom || []).map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-lg border border-line bg-wash px-2 py-1 text-[13px]">
                  {c || `Kolom ${i + 1}`}
                  <button className="text-red-500" onClick={() => set({ kolom: (a.kolom || []).filter((_, j) => j !== i), baris: (a.baris || []).map((r) => ({ sel: r.sel.filter((_, j) => j !== i) })) })}>✕</button>
                </span>
              ))}
              <button className="btn-ghost !py-1 !text-[12.5px]" onClick={() => {
                const n = (a.kolom || []).length;
                set({ kolom: [...(a.kolom || []), `Kolom ${n + 1}`], baris: (a.baris || []).map((r) => ({ sel: [...r.sel, { teks: "" }] })) });
              }}>+ Kolom</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(a.kolom || []).map((c, i) => (
                <input key={i} className="input !py-1 !text-[13px] !w-[150px]" value={c} onChange={(e) => set({ kolom: (a.kolom || []).map((x, j) => (j === i ? e.target.value : x)) })} />
              ))}
            </div>
          </div>

          <div>
            <label className="label">Baris — sel kosong (tanpa teks) berarti diisi siswa</label>
            <div className="space-y-2">
              {(a.baris || []).map((r, ri) => (
                <div key={ri} className="rounded-lg border border-line p-2.5 space-y-2">
                  <div className="flex gap-2 items-start">
                    <span className="text-[12px] text-ink-faint pt-1.5">Baris {ri + 1}</span>
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {r.sel.map((s, ci) => (
                        <SelEditor
                          key={ci}
                          sel={s}
                          label={a.kolom?.[ci] || `Kol ${ci + 1}`}
                          onChange={(patch) => set({ baris: (a.baris || []).map((rr, j) => (j === ri ? { sel: rr.sel.map((ss, k) => (k === ci ? { ...ss, ...patch } : ss)) } : rr)) })}
                        />
                      ))}
                    </div>
                    <button className="btn-danger !px-2 !py-1 !text-[12px]" onClick={() => set({ baris: (a.baris || []).filter((_, j) => j !== ri) })}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-ghost !py-1.5 !text-[12.5px] mt-2" onClick={() => set({ baris: [...(a.baris || []), { sel: (a.kolom || ["Kolom 1"]).map(() => ({ teks: "" })) }] })}>+ Baris</button>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Editor satu sel tabel: teks (fakta) ATAU kunci (untuk sel yang diisi siswa). */
function SelEditor({ sel, label, onChange }: { sel: LkpdSel; label: string; onChange: (p: Partial<LkpdSel>) => void }) {
  const isi = Boolean(sel.kunci);
  return (
    <div className="rounded-lg border border-line bg-wash/40 p-2 space-y-1.5">
      <p className="text-[11.5px] font-medium text-ink-muted truncate" title={label}>{label}</p>
      <label className="flex items-center gap-1.5 text-[12px]">
        <input
          type="checkbox"
          checked={isi}
          onChange={(e) => onChange(e.target.checked ? { kunci: "", teks: undefined } : { teks: "", kunci: undefined, feedbackBenar: undefined, feedbackSalah: undefined })}
        />
        Diisi siswa
      </label>
      {isi ? (
        <>
          <input className="input !py-1 !text-[12.5px]" placeholder="kunci jawaban" value={sel.kunci || ""} onChange={(e) => onChange({ kunci: e.target.value })} />
          <input className="input !py-1 !text-[12.5px]" placeholder="feedback benar" value={sel.feedbackBenar || ""} onChange={(e) => onChange({ feedbackBenar: e.target.value })} />
          <input className="input !py-1 !text-[12.5px]" placeholder="feedback salah" value={sel.feedbackSalah || ""} onChange={(e) => onChange({ feedbackSalah: e.target.value })} />
        </>
      ) : (
        <input className="input !py-1 !text-[12.5px]" placeholder="teks sel" value={sel.teks || ""} onChange={(e) => onChange({ teks: e.target.value })} />
      )}
    </div>
  );
}
