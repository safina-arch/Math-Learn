"use client";

import { useState } from "react";
import type { MaterialAttachment } from "@/lib/types";

/**
 * Upload foto oleh guru untuk soal / instruksi (LKPD, latihan, evaluasi).
 * Menyimpan hasil ke Supabase Storage (atau fallback lokal di mode dev).
 */
export function QuestionImageUpload({
  attachments,
  onChange,
  label = "Foto soal",
}: {
  attachments: MaterialAttachment[];
  onChange: (files: MaterialAttachment[]) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(selected: FileList | null) {
    if (!selected?.length) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      Array.from(selected).forEach((file) => form.append("file", file));
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Foto gagal diunggah.");
        return;
      }
      onChange([...attachments, ...(result.files || [{ url: result.url, name: result.name, size: result.size }])]);
    } catch {
      setError("Foto gagal diunggah. Coba lagi.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-dashed border-line bg-wash/40 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[12.5px] font-medium text-ink-soft">{label} <span className="font-normal text-ink-faint">(opsional)</span></p>
          <p className="text-[11.5px] text-ink-faint mt-0.5">JPG, PNG, atau WebP · maksimal 10 MB</p>
        </div>
        <label className={`btn-ghost !py-1.5 !px-2.5 !text-[12px] shrink-0 ${uploading ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}>
          <input type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} onChange={(event) => { handleFiles(event.target.files); event.currentTarget.value = ""; }} />
          {uploading ? "Mengunggah…" : "+ Foto"}
        </label>
      </div>
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-2 mt-2.5">
          {attachments.map((file, index) => (
            <div key={`${file.url}-${index}`} className="relative group">
              <a href={file.url} target="_blank" rel="noreferrer" title={file.name}>
                <img src={file.url} alt={file.name || label} className="h-16 w-16 rounded-md border border-line object-cover bg-white" />
              </a>
              <button type="button" aria-label={`Hapus ${file.name || "foto"}`} onClick={() => onChange(attachments.filter((_, i) => i !== index))} className="absolute -right-1.5 -top-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-[12px] leading-none shadow-sm sm:flex">×</button>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p role="alert" className="text-[12px] text-red-600 mt-2">{error}</p> : null}
    </div>
  );
}
