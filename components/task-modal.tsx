"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { QuestionImageUpload } from "@/components/question-image-upload";
import type { Assignment, AssignmentType, MaterialAttachment, Question } from "@/lib/types";
import { nowIso, uid } from "@/lib/utils";

function blankQ(): Question {
  return { id: uid("q"), tipe: "pg", teks: "", opsi: ["", "", "", ""], kunci: "", bobot: 0 };
}

/** Format ISO → value input datetime-lokal (yyyy-MM-ddTHH:mm) tanpa konversi zona. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const TIPE_LABEL: Record<AssignmentType, string> = {
  lkpd: "LKPD",
  latihan: "Latihan soal",
  evaluasi: "Evaluasi",
};

export function TaskModal({
  open,
  initial,
  presetTipe,
  onClose,
  onSave,
  author,
}: {
  open: boolean;
  initial: Assignment | null;
  /** Kunci tipe saat dibuka dari halaman LKPD/Latihan/Evaluasi tertentu. */
  presetTipe?: AssignmentType;
  onClose: () => void;
  onSave: (a: Assignment, isNew: boolean) => void;
  author: string;
}) {
  const [judul, setJudul] = useState("");
  const [tipe, setTipe] = useState<AssignmentType>("latihan");
  const [deskripsi, setDeskripsi] = useState("");
  const [deskripsiGambar, setDeskripsiGambar] = useState<MaterialAttachment[]>([]);
  const [durasi, setDurasi] = useState("45");
  const [bukaLokal, setBukaLokal] = useState("");
  const [tutupLokal, setTutupLokal] = useState("");
  const [qs, setQs] = useState<Question[]>([]);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setJudul(initial?.judul || "");
    setTipe(initial?.tipe || presetTipe || "latihan");
    setDeskripsi(initial?.deskripsi || "");
    setDeskripsiGambar(initial?.deskripsiGambar || []);
    setDurasi(initial?.durasiMenit ? String(initial.durasiMenit) : "45");
    setBukaLokal(toLocalInput(initial?.bukaAt || null));
    setTutupLokal(toLocalInput(initial?.tutupAt || null));
    setQs(initial?.questions?.length ? initial.questions.map((q) => ({ ...q, opsi: q.opsi ? [...q.opsi] : q.opsi })) : [blankQ()]);
  }
  if (!open && wasOpen) setWasOpen(false);
  if (!open) return null;

  function patchQ(id: string, p: Partial<Question>) {
    setQs((all) => all.map((q) => (q.id === id ? { ...q, ...p } : q)));
  }

  const label = TIPE_LABEL[tipe];
  /** Durasi tidak boleh minus/nol; dibatasi 1–600 menit. */
  const durasiBersih = Math.min(600, Math.max(1, Math.round(Number(durasi) || 0) || 45));
  /** Total bobot seluruh soal, maksimal 100 (penilaian skala 0–100). */
  const totalBobot = qs.reduce((s, q) => s + (Number.isFinite(q.bobot) ? q.bobot : 0), 0);
  const bobotLebih = totalBobot > 100;
  const waktuInvalid = !!(bukaLokal && tutupLokal && new Date(tutupLokal).getTime() <= new Date(bukaLokal).getTime());
  const bisaSimpan = !!judul.trim() && qs.length > 0 && !bobotLebih && !waktuInvalid;

  return (
    <Modal open onClose={onClose} title={initial ? `Ubah ${label.toLowerCase()}` : `${label} baru`} wide>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Judul</label><input className="input" value={judul} onChange={(e) => setJudul(e.target.value)} /></div>
          <div>
            <label className="label">Tipe</label>
            <select className="input" value={tipe} disabled={!!presetTipe} onChange={(e) => setTipe(e.target.value as AssignmentType)}>
              <option value="lkpd">LKPD</option><option value="latihan">Latihan</option><option value="evaluasi">Evaluasi</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Deskripsi / instruksi</label>
          <textarea className="input min-h-[72px]" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Instruksi pengerjaan…" />
          <QuestionImageUpload attachments={deskripsiGambar} onChange={setDeskripsiGambar} label="Foto instruksi / gambar pendukung" />
        </div>
        {tipe === "evaluasi" ? (
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Durasi (menit)</label>
              <input type="number" min={1} max={600} className="input" value={durasi} onChange={(e) => {
                // Tolak nilai minus/nol: dikosongkan dulu, hasilkan minimal 1 saat disimpan.
                const v = Number(e.target.value);
                setDurasi(e.target.value === "" ? "" : String(Math.min(600, Math.max(1, Math.round(v) || 1))));
              }} onBlur={() => setDurasi(String(durasiBersih))} />
            </div>
            <div>
              <label className="label">Dibuka otomatis pada</label>
              <input type="datetime-local" className="input" value={bukaLokal} onChange={(e) => setBukaLokal(e.target.value)} placeholder="—" />
            </div>
            <div>
              <label className="label">Dikunci otomatis pada</label>
              <input type="datetime-local" className="input" value={tutupLokal} onChange={(e) => setTutupLokal(e.target.value)} placeholder="—" />
            </div>
            <p className="sm:col-span-3 text-[12px] text-ink-faint -mt-1">
              Kosongkan bila tidak perlu. Evaluasi otomatis terbuka saat waktu <b>buka</b> tiba dan otomatis terkunci setelah waktu <b>tutup</b> lewat.
            </p>
            {waktuInvalid ? (
              <p role="alert" className="sm:col-span-3 text-[12.5px] text-red-600">⚠ Waktu dikunci harus setelah waktu dibuka.</p>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-2.5">
          {qs.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-line p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <b className="text-[13px]">Soal {i + 1}</b>
                <select className="input !w-auto !py-1 !text-[12.5px] ml-auto" value={q.tipe} onChange={(e) => patchQ(q.id, { tipe: e.target.value as Question["tipe"] })}>
                  <option value="pg">Pilihan ganda</option><option value="uraian">Uraian singkat</option><option value="essay">Essay</option>
                </select>
                <input type="number" min={0} max={100} className="input !w-[76px] !py-1" value={q.bobot} onChange={(e) => {
                  // Bobot tidak boleh minus dan tidak melebihi 100 per soal.
                  const v = Number(e.target.value);
                  patchQ(q.id, { bobot: Math.min(100, Math.max(0, Math.round(v) || 0)) });
                }} title="bobot" aria-label={`Bobot soal ${i + 1}`} />
                <span className="text-[11.5px] text-ink-faint shrink-0">bobot</span>
                <button className="text-red-600 text-[12.5px]" onClick={() => setQs((all) => all.filter((x) => x.id !== q.id))}>Hapus</button>
              </div>
              <textarea className="input min-h-[68px]" value={q.teks} onChange={(e) => patchQ(q.id, { teks: e.target.value })} placeholder="Teks soal… (Enter untuk baris baru)" />
              <QuestionImageUpload attachments={q.gambar || []} onChange={(files) => patchQ(q.id, { gambar: files })} label="Foto soal" />
              {q.tipe === "pg" ? (
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {(q.opsi || []).map((op, oi) => (
                    <input key={oi} className="input" value={op} onChange={(e) => { const o = [...(q.opsi || [])]; o[oi] = e.target.value; patchQ(q.id, { opsi: o }); }} placeholder={`Opsi ${oi + 1}`} />
                  ))}
                </div>
              ) : null}
              <div className="grid sm:grid-cols-2 gap-2">
                <input className="input" value={q.kunci || ""} onChange={(e) => patchQ(q.id, { kunci: e.target.value })} placeholder="Kunci jawaban" />
                <input className="input" value={q.rubrik || ""} onChange={(e) => patchQ(q.id, { rubrik: e.target.value })} placeholder="Rubrik (untuk AI grading)" />
              </div>
            </div>
          ))}
          <button className="btn-ghost text-[13px]" onClick={() => setQs((p) => [...p, blankQ()])}>+ Tambah soal</button>
        </div>

        {/* Indikator total bobot: penilaian skala 0–100. */}
        <div className={`rounded-xl border px-3.5 py-2.5 text-[13px] flex flex-wrap items-center gap-2 ${bobotLebih ? "border-red-300 bg-red-50 text-red-700" : totalBobot > 0 && totalBobot < 100 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-line bg-wash/50 text-ink-soft"}`}>
          <b>Total bobot: {totalBobot}/100</b>
          {bobotLebih ? (
            <span>— melebihi 100. Kurangi bobot salah satu soal.</span>
          ) : totalBobot > 0 && totalBobot < 100 ? (
            <span>— nilai maksimal hanya {totalBobot}.</span>
          ) : (
            <button
              type="button"
              className="text-primary font-medium ml-auto"
              onClick={() => setQs((all) => {
                if (!all.length) return all;
                const rata = Math.floor(100 / all.length);
                const sisa = 100 - rata * all.length;
                return all.map((q, idx) => ({ ...q, bobot: rata + (idx < sisa ? 1 : 0) }));
              })}
            >Distribusikan rata sampai 100</button>
          )}
          {bobotLebih || (totalBobot > 0 && totalBobot < 100) ? (
            <button type="button" className="text-primary font-medium ml-auto" onClick={() => setQs((all) => {
              if (!all.length) return all;
              const rata = Math.floor(100 / all.length);
              const sisa = 100 - rata * all.length;
              return all.map((q, idx) => ({ ...q, bobot: rata + (idx < sisa ? 1 : 0) }));
            })}>Distribusikan rata 100</button>
          ) : null}
        </div>

        {!judul.trim() ? <p className="text-[12.5px] text-ink-faint">Judul wajib diisi sebelum disimpan.</p> : null}
        <button
          className="btn-primary w-full" disabled={!bisaSimpan}
          onClick={() => {
            // Jika guru belum mengisi bobot sama sekali, bagi rata otomatis agar tetap bernilai 100.
            const bobotAkhir = totalBobot === 0 && qs.length
              ? qs.map((q, idx) => ({ ...q, bobot: Math.floor(100 / qs.length) + (idx < 100 - Math.floor(100 / qs.length) * qs.length ? 1 : 0) }))
              : qs;
            onSave({
              id: initial?.id || uid("t"), tipe: tipe, judul: judul.trim(), deskripsi: deskripsi.trim(),
              deskripsiGambar: deskripsiGambar.length ? deskripsiGambar : undefined,
              kelas: initial?.kelas || "VIII-A",
              durasiMenit: tipe === "evaluasi" ? durasiBersih : null,
              bukaAt: bukaLokal ? new Date(bukaLokal).toISOString() : (initial?.bukaAt || nowIso()),
              tutupAt: tutupLokal ? new Date(tutupLokal).toISOString() : null,
              acakSoal: tipe !== "lkpd", kunciTab: tipe === "evaluasi", terkunci: initial?.terkunci, createdBy: initial?.createdBy || author,
              questions: bobotAkhir.filter((q) => q.teks.trim() || (q.gambar && q.gambar.length)),
            }, !initial);
          }}
        >Simpan & publikasikan</button>
      </div>
    </Modal>
  );
}
