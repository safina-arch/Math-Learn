"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Material, MaterialAttachment } from "@/lib/types";
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

export function MaterialModal({ open, initial, onClose, onSave }: { open: boolean; initial: Material | null; onClose: () => void; onSave: (m: Material) => void }) {
  const [judul, setJudul] = useState("");
  const [kelas, setKelas] = useState("VIII-A");
  const [ringkasan, setRingkasan] = useState("");
  const [konten, setKonten] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [attachments, setAttachments] = useState<MaterialAttachment[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setJudul(initial?.judul || ""); setKelas(initial?.kelas || "VIII-A"); setRingkasan(initial?.ringkasan || ""); setKonten(initial?.konten || ""); setVideoUrl(initial?.videoUrl || "");
    setAttachments(initial?.attachments || (initial?.fileUrl || initial?.fileName ? [{ url: initial.fileUrl || "", name: initial.fileName || initial.fileUrl || "" }] : [])); setUploadErr(null);
    setLinkInput(""); setLinkErr(null);
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
  function addLink() {
    const url = linkInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) { setLinkErr("Tautan harus diawali https://"); return; }
    if (attachments.some((f) => f.url === url)) { setLinkErr("Tautan ini sudah ditambahkan."); return; }
    let name = url;
    try { name = new URL(url).hostname.replace(/^www\./, "") + new URL(url).pathname; } catch {}
    setAttachments((current) => [...current, { url, name, tipe: "link" }]);
    setLinkInput(""); setLinkErr(null);
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
            {attachments.length > 0 ? <span className="text-[12px] font-medium text-primary">{attachments.length} lampiran dipilih</span> : null}
          </div>
          {attachments.length > 0 ? (
            <div className="rounded-xl border border-line bg-wash/40 p-2.5 space-y-2 mb-2.5">
              {attachments.map((file, index) => (
                <div key={`${file.url}-${index}`} className="group flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5 shadow-sm">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-[9px] font-bold shrink-0 ${file.tipe === "link" ? "bg-blue-50 border border-blue-200 text-blue-700" : "bg-primary-50 border border-primary-100 text-primary"}`}>{file.tipe === "link" ? "LINK" : attachmentType(file.name)}</span>
                  <div className="min-w-0 flex-1">
                    {/* Nama tampilan bisa dikustom — inilah nama yang dilihat siswa di materi. */}
                    <input
                      className="input !py-1 !text-[13px] font-medium"
                      value={file.name || ""}
                      onChange={(e) => setAttachments((current) => current.map((f, i) => (i === index ? { ...f, name: e.target.value } : f)))}
                      placeholder={file.tipe === "link" ? "Nama tautan (opsional)" : "Nama file (bisa dikustom)"}
                      aria-label="Nama tampilan lampiran"
                    />
                    <p className="text-[11.5px] text-ink-faint mt-1 flex items-center gap-2">
                      <span>{file.tipe === "link" ? "Tautan eksternal" : formatFileSize(file.size)}</span>
                      <a href={file.url} target="_blank" rel="noreferrer" className="hover:text-primary underline-offset-2">Buka ↗</a>
                    </p>
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
          <div className="flex gap-2 mt-2">
            <input
              className="input"
              value={linkInput}
              onChange={(e) => { setLinkInput(e.target.value); setLinkErr(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
              placeholder="https://… (tempel tautan, mis. Google Drive)"
              aria-label="Tautan lampiran"
            />
            <button type="button" className="btn-ghost text-[13px] shrink-0" onClick={addLink}>+ Tambah tautan</button>
          </div>
          {linkErr ? <p role="alert" className="text-[12.5px] text-red-600 mt-1.5">{linkErr}</p> : null}
          {uploadErr ? <p role="alert" className="text-[12.5px] text-red-600 mt-1.5">{uploadErr}</p> : null}
          <p className="text-[12px] text-ink-faint mt-2">
            {isSupabaseConfigured()
              ? <>File disimpan di penyimpanan cloud (Supabase) — dapat dibuka dari perangkat mana pun.</>
              : <>⚠ Supabase belum dikonfigurasi — file hanya dapat dibuka dari device/server ini.</>}
          </p>
        </div>
        <button
          className="btn-primary w-full" disabled={!judul.trim() || uploading}
          onClick={() => onSave({ id: initial?.id || uid("m"), judul: judul.trim(), kelas, ringkasan: ringkasan.trim(), konten: konten.trim(), videoUrl: videoUrl.trim() || undefined, attachments: attachments.length ? attachments : undefined, fileUrl: attachments[0]?.url || undefined, fileName: attachments[0]?.name || undefined, createdBy: initial?.createdBy || "Guru", createdAt: initial?.createdAt || nowIso() })}
        >Simpan materi</button>
      </div>
    </Modal>
  );
}
