"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import type { LkpdSubtopic, LkpdTopic } from "@/lib/types";
import { uid } from "@/lib/utils";

/** Buat id ramah-URL dari judul; jadikan unik bila bentrok. */
function slug(judul: string, existing: string[]): string {
  const base = judul.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "topik";
  let out = base;
  let i = 2;
  while (existing.includes(out)) { out = `${base}-${i}`; i += 1; }
  return out;
}

/** Modal tambah/ubah materi (topik) LKPD — guru & admin. */
export function TopikModal({
  open,
  initial,
  existingIds,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: LkpdTopic | null;
  existingIds: string[];
  onClose: () => void;
  onSave: (t: LkpdTopic) => void;
}) {
  const [judul, setJudul] = useState(initial?.judul || "");
  const [deskripsi, setDeskripsi] = useState(initial?.deskripsi || "");
  const [ikon, setIkon] = useState(initial?.ikon || "📐");
  const [thumb, setThumb] = useState(initial?.thumbnail || "");
  const [err, setErr] = useState("");

  // Reset saat modal dibuka untuk objek berbeda.
  const [buka, setBuka] = useState(false);
  if (open !== buka) {
    setBuka(open);
    if (open) {
      setJudul(initial?.judul || "");
      setDeskripsi(initial?.deskripsi || "");
      setIkon(initial?.ikon || "📐");
      setThumb(initial?.thumbnail || "");
      setErr("");
    }
  }

  const simpan = () => {
    if (!judul.trim()) { setErr("Nama materi wajib diisi."); return; }
    const id = initial?.id || slug(judul, existingIds);
    onSave({
      id,
      judul: judul.trim(),
      deskripsi: deskripsi.trim(),
      ikon: ikon.trim() || "📐",
      thumbnail: thumb.trim() || undefined,
      subtopics: initial?.subtopics || [],
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Ubah materi LKPD" : "Tambah materi baru"}>
      <div className="space-y-3">
        <div>
          <label className="label">Nama materi / topik *</label>
          <input className="input" value={judul} placeholder="mis. Geometri" onChange={(e) => setJudul(e.target.value)} />
        </div>
        <div>
          <label className="label">Deskripsi</label>
          <textarea className="input min-h-[70px]" value={deskripsi} placeholder="Apa yang dipelajari siswa pada materi ini?" onChange={(e) => setDeskripsi(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Icon (emoji)</label>
            <input className="input" value={ikon} placeholder="📐" onChange={(e) => setIkon(e.target.value)} />
          </div>
          <div>
            <label className="label">Thumbnail (URL, opsional)</label>
            <input className="input" value={thumb} placeholder="https://…" onChange={(e) => setThumb(e.target.value)} />
          </div>
        </div>
        {err ? <p className="text-[13px] text-red-600">{err}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn-primary" onClick={simpan}>Simpan</button>
        </div>
      </div>
    </Modal>
  );
}

/** Modal tambah/ubah submateri di dalam satu topik. */
export function SubtopikModal({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: LkpdSubtopic | null;
  onClose: () => void;
  onSave: (s: LkpdSubtopic) => void;
}) {
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [err, setErr] = useState("");
  const [buka, setBuka] = useState(false);
  if (open !== buka) {
    setBuka(open);
    if (open) { setJudul(initial?.judul || ""); setDeskripsi(initial?.deskripsi || ""); setErr(""); }
  }

  const simpan = () => {
    if (!judul.trim()) { setErr("Nama submateri wajib diisi."); return; }
    onSave({
      id: initial?.id || uid("sub"),
      judul: judul.trim(),
      deskripsi: deskripsi.trim(),
      missions: initial?.missions || [],
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Ubah submateri" : "Tambah submateri"}>
      <div className="space-y-3">
        <div>
          <label className="label">Nama submateri *</label>
          <input className="input" value={judul} placeholder="mis. Bangun Datar" onChange={(e) => setJudul(e.target.value)} />
        </div>
        <div>
          <label className="label">Deskripsi singkat</label>
          <textarea className="input min-h-[60px]" value={deskripsi} placeholder="Fokus belajar submateri ini…" onChange={(e) => setDeskripsi(e.target.value)} />
        </div>
        {err ? <p className="text-[13px] text-red-600">{err}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn-primary" onClick={simpan}>Simpan</button>
        </div>
      </div>
    </Modal>
  );
}
