"use client";

import { useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Modal, PageHeader } from "@/components/ui";
import type { Assignment, Material, MaterialAttachment, Question } from "@/lib/types";
import { useStore } from "@/lib/store";
import { nowIso, uid } from "@/lib/utils";

function attachmentType(name: string) {
  const extension = name.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 4 ? extension : "FILE";
}

function formatFileSize(size?: number) {
  if (!size) return "Ukuran tidak tersedia";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KelolaPage() {
  return (
    <AppShell>
      <Guard allow={["guru", "admin"]}>
        <Content />
      </Guard>
    </AppShell>
  );
}

function Content() {
  const { materials, upsertMaterial, deleteMaterial, assignments, upsertAssignment, deleteAssignment, user, addNotification } = useStore();
  const [tab, setTab] = useState<"materi" | "tugas">("materi");
  const [mOpen, setMOpen] = useState(false);
  const [tOpen, setTOpen] = useState(false);
  const [editM, setEditM] = useState<Material | null>(null);
  const [editT, setEditT] = useState<Assignment | null>(null);

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader
        title="Kelola konten"
        desc="Tambah, ubah, dan hapus materi, LKPD, latihan, dan evaluasi."
        right={<><button className="btn-ghost text-[13px]" onClick={() => { setEditM(null); setMOpen(true); }}>+ Materi</button><button className="btn-primary text-[13px]" onClick={() => { setEditT(null); setTOpen(true); }}>+ Tugas / Evaluasi</button></>}
      />
      <div className="flex gap-1.5 mb-4">
        {(["materi", "tugas"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn text-[13px] ${tab === t ? "bg-ink text-white" : "btn-ghost"}`}>{t === "materi" ? `Materi (${materials.length})` : `Tugas & evaluasi (${assignments.length})`}</button>
        ))}
      </div>

      {tab === "materi" ? (
        <div className="space-y-2.5">
          {materials.map((m) => (
            <div key={m.id} className="card card-pad flex gap-3 items-center">
              <div className="min-w-0 flex-1"><p className="text-[14.5px] font-semibold truncate">{m.judul}</p><p className="muted !text-[12.5px]">{m.kelas} · materi pembelajaran</p></div>
              <Badge tone="purple">{m.kelas}</Badge>
              <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => { setEditM(m); setMOpen(true); }}>Ubah</button>
              <button className="btn-danger !py-1.5 !text-[12.5px]" onClick={() => deleteMaterial(m.id)}>Hapus</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {assignments.map((a) => (
            <div key={a.id} className="card card-pad flex gap-3 items-center">
              <div className="min-w-0 flex-1"><p className="text-[14.5px] font-semibold truncate">{a.judul}</p><p className="muted !text-[12.5px]">{a.tipe} · {a.questions.length} soal · {a.kelas}</p></div>
              <Badge tone={a.tipe === "evaluasi" ? "red" : "blue"}>{a.tipe}</Badge>
              <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => { setEditT(a); setTOpen(true); }}>Ubah</button>
              <button className="btn-danger !py-1.5 !text-[12.5px]" onClick={() => deleteAssignment(a.id)}>Hapus</button>
            </div>
          ))}
        </div>
      )}

      <MaterialModal open={mOpen} initial={editM} onClose={() => setMOpen(false)} onSave={(m) => { upsertMaterial(m); setMOpen(false); }} />
      <TaskModal
        open={tOpen} initial={editT} onClose={() => setTOpen(false)}
        onSave={(a, isNew) => {
          upsertAssignment(a);
          if (isNew) addNotification({ userId: "all-siswa", kategori: "tugas", judul: `${a.tipe === "evaluasi" ? "Evaluasi baru" : "Tugas baru"}: ${a.judul}`, isi: a.deskripsi.slice(0, 120) });
          setTOpen(false);
        }}
        author={user?.nama || "Guru"}
      />
    </div>
  );
}

function MaterialModal({ open, initial, onClose, onSave }: { open: boolean; initial: Material | null; onClose: () => void; onSave: (m: Material) => void }) {
  const [judul, setJudul] = useState("");
  const [kelas, setKelas] = useState("VIII-A");
  const [ringkasan, setRingkasan] = useState("");
  const [konten, setKonten] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [attachments, setAttachments] = useState<MaterialAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setJudul(initial?.judul || ""); setKelas(initial?.kelas || "VIII-A"); setRingkasan(initial?.ringkasan || ""); setKonten(initial?.konten || ""); setVideoUrl(initial?.videoUrl || "");
    setAttachments(initial?.attachments || (initial?.fileUrl || initial?.fileName ? [{ url: initial.fileUrl || "", name: initial.fileName || initial.fileUrl || "" }] : [])); setUploadErr(null);
  }
  if (!open && wasOpen) setWasOpen(false);
  if (!open) return null;

  async function handleFiles(selected: FileList | null) {
    if (!selected?.length) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const form = new FormData();
      Array.from(selected).forEach((file) => form.append("file", file));
      const r = await fetch("/api/upload", { method: "POST", body: form });
      const j = await r.json();
      if (!r.ok) {
        setUploadErr(j.error || "Gagal mengunggah.");
        return;
      }
      setAttachments((current) => [...current, ...(j.files || [{ url: j.url, name: j.name, size: j.size }])]);
    } catch {
      setUploadErr("Gagal mengunggah. Coba lagi.");
    } finally {
      setUploading(false);
    }
  }
  return (
    <Modal open onClose={onClose} title={initial ? "Ubah materi" : "Materi baru"} wide>
      <div className="space-y-3">
        <div><label className="label">Judul</label><input className="input" value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="cth. Aljabar: Operasi Hitung" /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Kelas</label><select className="input" value={kelas} onChange={(e) => setKelas(e.target.value)}>{["VII-A", "VII-B", "VIII-A", "VIII-B", "IX-A", "IX-B"].map((k) => <option key={k}>{k}</option>)}</select></div>
          <div><label className="label">URL video (embed YouTube, opsional)</label><input className="input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/embed/…" /></div>
        </div>
        <div><label className="label">Ringkasan</label><input className="input" value={ringkasan} onChange={(e) => setRingkasan(e.target.value)} placeholder="Satu kalimat isi materi" /></div>
        <div><label className="label">Konten (mendukung ## judul, - list, `kode`)</label><textarea className="input min-h-[160px] font-mono !text-[13px]" value={konten} onChange={(e) => setKonten(e.target.value)} placeholder="## Tujuan&#10;- point…" /></div>
        <div>
          <div className="flex items-end justify-between gap-3 mb-1.5">
            <div>
              <label className="label !mb-0">Lampiran materi</label>
              <p className="text-[12px] text-ink-faint">PDF, PNG, JPG, atau WebP · maksimal 10 MB per file</p>
            </div>
            {attachments.length > 0 ? <span className="text-[12px] font-medium text-primary">{attachments.length} file dipilih</span> : null}
          </div>
          {attachments.length > 0 ? (
            <div className="rounded-xl border border-line bg-wash/40 p-2.5 space-y-2 mb-2.5">
              {attachments.map((file, index) => (
                <div key={`${file.url}-${index}`} className="group flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5 shadow-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 border border-primary-100 text-primary text-[9px] font-bold shrink-0">{attachmentType(file.name)}</span>
                  <div className="min-w-0 flex-1">
                    <a href={file.url} target="_blank" rel="noreferrer" className="block text-[13px] font-medium truncate hover:text-primary">{file.name || file.url}</a>
                    <p className="text-[11.5px] text-ink-faint">{formatFileSize(file.size)}</p>
                  </div>
                  <button type="button" aria-label={`Hapus ${file.name}`} className="rounded-md px-2 py-1 text-[12px] text-ink-muted hover:bg-red-50 hover:text-red-600" onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))}>Hapus</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-wash/30 px-4 py-3 text-center mb-2.5">
              <p className="text-[13px] font-medium text-ink-soft">Belum ada lampiran</p>
              <p className="text-[12px] text-ink-faint mt-0.5">Tambahkan file agar siswa dapat mengunduh materi.</p>
            </div>
          )}
          <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary-200 bg-primary-50/40 px-3 py-3 text-[13px] font-medium text-primary-700 hover:border-primary-300 hover:bg-primary-50 transition-colors ${uploading ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}>
            <input type="file" multiple accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} onChange={(e) => { handleFiles(e.target.files); e.currentTarget.value = ""; }} />
            <span className="text-base leading-none">+</span>{uploading ? "File sedang diunggah…" : "Tambah satu atau beberapa file"}
          </label>
          {uploadErr ? <p role="alert" className="text-[12.5px] text-red-600 mt-1.5">{uploadErr}</p> : null}
          <p className="text-[12px] text-ink-faint mt-2">File lokal disimpan di <code className="bg-wash border border-line rounded px-1">public/uploads</code>.</p>
        </div>
        <button
          className="btn-primary w-full" disabled={!judul.trim() || uploading}
          onClick={() => onSave({ id: initial?.id || uid("m"), judul: judul.trim(), kelas, ringkasan: ringkasan.trim(), konten: konten.trim(), videoUrl: videoUrl.trim() || undefined, attachments: attachments.length ? attachments : undefined, fileUrl: attachments[0]?.url || undefined, fileName: attachments[0]?.name || undefined, createdBy: initial?.createdBy || "Guru", createdAt: initial?.createdAt || nowIso() })}
        >Simpan materi</button>
      </div>
    </Modal>
  );
}

function blankQ(): Question {
  return { id: uid("q"), tipe: "pg", teks: "", opsi: ["", "", "", ""], kunci: "", bobot: 25 };
}

function TaskModal({ open, initial, onClose, onSave, author }: { open: boolean; initial: Assignment | null; onClose: () => void; onSave: (a: Assignment, isNew: boolean) => void; author: string }) {
  const [judul, setJudul] = useState("");
  const [tipe, setTipe] = useState<Assignment["tipe"]>("latihan");
  const [deskripsi, setDeskripsi] = useState("");
  const [durasi, setDurasi] = useState("45");
  const [qs, setQs] = useState<Question[]>([]);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setJudul(initial?.judul || ""); setTipe(initial?.tipe || "latihan"); setDeskripsi(initial?.deskripsi || "");
    setDurasi(initial?.durasiMenit ? String(initial.durasiMenit) : "45");
    setQs(initial?.questions?.length ? initial.questions : [blankQ()]);
  }
  if (!open && wasOpen) setWasOpen(false);
  if (!open) return null;

  function patchQ(id: string, p: Partial<Question>) {
    setQs((all) => all.map((q) => (q.id === id ? { ...q, ...p } : q)));
  }

  return (
    <Modal open onClose={onClose} title={initial ? "Ubah tugas / evaluasi" : "Tugas / evaluasi baru"} wide>
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Judul</label><input className="input" value={judul} onChange={(e) => setJudul(e.target.value)} /></div>
          <div><label className="label">Tipe</label><select className="input" value={tipe} onChange={(e) => setTipe(e.target.value as Assignment["tipe"])}><option value="lkpd">LKPD</option><option value="latihan">Latihan</option><option value="evaluasi">Evaluasi</option></select></div>
        </div>
        <div><label className="label">Deskripsi</label><input className="input" value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} /></div>
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
            id: initial?.id || uid("t"), tipe: tipe, judul: judul.trim(), deskripsi: deskripsi.trim(), kelas: "VIII-A",
            durasiMenit: tipe === "evaluasi" ? Number(durasi) || 45 : null,
            bukaAt: initial?.bukaAt || nowIso(), tutupAt: initial?.tutupAt || null,
            acakSoal: tipe !== "lkpd", kunciTab: tipe === "evaluasi", createdBy: author,
            questions: qs.filter((q) => q.teks.trim()),
          }, !initial)}
        >Simpan & publikasikan</button>
      </div>
    </Modal>
  );
}
