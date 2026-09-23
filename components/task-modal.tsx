"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { QuestionImageUpload } from "@/components/question-image-upload";
import type { Assignment, AssignmentType, MaterialAttachment, Question } from "@/lib/types";
import { nowIso, uid } from "@/lib/utils";

function blankQ(): Question {
  return { id: uid("q"), tipe: "pg", teks: "", opsi: ["", "", "", ""], kunci: "", bobot: 25 };
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
  const [qs, setQs] = useState<Question[]>([]);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setJudul(initial?.judul || "");
    setTipe(initial?.tipe || presetTipe || "latihan");
    setDeskripsi(initial?.deskripsi || "");
    setDeskripsiGambar(initial?.deskripsiGambar || []);
    setDurasi(initial?.durasiMenit ? String(initial.durasiMenit) : "45");
    setQs(initial?.questions?.length ? initial.questions.map((q) => ({ ...q, opsi: q.opsi ? [...q.opsi] : q.opsi })) : [blankQ()]);
  }
  if (!open && wasOpen) setWasOpen(false);
  if (!open) return null;

  function patchQ(id: string, p: Partial<Question>) {
    setQs((all) => all.map((q) => (q.id === id ? { ...q, ...p } : q)));
  }

  const label = TIPE_LABEL[tipe];

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
        {tipe === "evaluasi" ? <div><label className="label">Durasi (menit)</label><input type="number" className="input" value={durasi} onChange={(e) => setDurasi(e.target.value)} /></div> : null}
        <div className="space-y-2.5">
          {qs.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-line p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <b className="text-[13px]">Soal {i + 1}</b>
                <select className="input !w-auto !py-1 !text-[12.5px] ml-auto" value={q.tipe} onChange={(e) => patchQ(q.id, { tipe: e.target.value as Question["tipe"] })}>
                  <option value="pg">Pilihan ganda</option><option value="uraian">Uraian singkat</option><option value="essay">Essay</option>
                </select>
                <input type="number" className="input !w-[76px] !py-1" value={q.bobot} onChange={(e) => patchQ(q.id, { bobot: Number(e.target.value) || 0 })} title="bobot" />
                <button className="text-red-600 text-[12.5px]" onClick={() => setQs((all) => all.filter((x) => x.id !== q.id))}>Hapus</button>
              </div>
              <input className="input" value={q.teks} onChange={(e) => patchQ(q.id, { teks: e.target.value })} placeholder="Teks soal…" />
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
        <button
          className="btn-primary w-full" disabled={!judul.trim() || qs.length === 0}
          onClick={() => onSave({
            id: initial?.id || uid("t"), tipe: tipe, judul: judul.trim(), deskripsi: deskripsi.trim(),
            deskripsiGambar: deskripsiGambar.length ? deskripsiGambar : undefined,
            kelas: initial?.kelas || "VIII-A",
            durasiMenit: tipe === "evaluasi" ? Number(durasi) || 45 : null,
            bukaAt: initial?.bukaAt || nowIso(), tutupAt: initial?.tutupAt || null,
            acakSoal: tipe !== "lkpd", kunciTab: tipe === "evaluasi", createdBy: initial?.createdBy || author,
            questions: qs.filter((q) => q.teks.trim() || (q.gambar && q.gambar.length)),
          }, !initial)}
        >Simpan & publikasikan</button>
      </div>
    </Modal>
  );
}
