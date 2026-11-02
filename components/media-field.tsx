"use client";

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";

/**
 * Kotak media untuk editor guru/admin: **tempel tautan ATAU unggah langsung**
 * dari perangkat (foto · video · dokumen), lengkap dengan pratinjau, tombol
 * hapus, dan pesan galat. Dipakai di editor blok LKPD & modal topik LKPD
 * agar pengalaman menambah media seragam (link, foto, video, file).
 */
export function MediaField({
  url,
  onUrl,
  accept,
  acceptHint,
  placeholder,
  preview,
  label,
}: {
  /** URL media saat ini (kosong = belum ada). */
  url: string;
  /** Dipanggil saat URL berubah (input tautan, hasil unggah, atau hapus). */
  onUrl: (url: string, namaFile?: string) => void;
  /** `accept` input file, mis. `image/png,image/jpeg,image/webp`. */
  accept: string;
  /** Keterangan format & batas ukuran yang diterima. */
  acceptHint: string;
  placeholder?: string;
  /** Jenis pratinjau saat URL terpasang — gambar/GIF atau video. */
  preview?: "gambar" | "video";
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(selected: FileList | null) {
    const file = selected?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: form });
      const j = await r.json().catch(() => ({} as Record<string, string>));
      if (!r.ok) {
        setErr(j.error || "Gagal mengunggah. Coba lagi.");
        return;
      }
      onUrl(j.url, j.name);
    } catch {
      setErr("Gagal mengunggah — periksa jaringan lalu coba lagi.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {label ? <label className="label">{label}</label> : null}
      <div className="flex flex-wrap gap-2">
        <input
          className="input flex-1 min-w-[180px]"
          value={url}
          onChange={(e) => { setErr(null); onUrl(e.target.value); }}
          placeholder={placeholder || "https://…"}
          aria-label={label || "Tautan media"}
        />
        <label
          className={`btn-ghost !text-[12.5px] shrink-0 whitespace-nowrap ${uploading ? "opacity-60 pointer-events-none" : ""}`}
          title={acceptHint}
        >
          <input
            type="file"
            className="hidden"
            accept={accept}
            disabled={uploading}
            onChange={(e) => { void handleFile(e.target.files); e.currentTarget.value = ""; }}
          />
          {uploading ? "⏳ Mengunggah…" : "📤 Unggah dari perangkat"}
        </label>
      </div>
      {url && preview ? (
        <div className="flex items-start gap-3 rounded-lg border border-line bg-wash/40 p-2">
          {preview === "gambar" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Pratinjau media" className="h-20 max-w-[160px] rounded-md border border-line bg-white object-cover" />
          ) : (
            <video src={url} controls preload="metadata" className="h-24 w-44 rounded-md border border-line bg-black" />
          )}
          <div className="min-w-0 flex-1 text-[12px] text-ink-muted space-y-1">
            <p className="font-medium text-ink truncate" title={namaDariUrl(url)}>{namaDariUrl(url)}</p>
            <a href={url} target="_blank" rel="noreferrer" className="hover:text-primary underline-offset-2">Buka ↗</a>
            <button type="button" className="block text-red-600 hover:underline" onClick={() => { setErr(null); onUrl(""); }}>Hapus media</button>
          </div>
        </div>
      ) : url ? (
        <p className="text-[12px] text-ink-faint truncate">
          Tautan terpasang — <a href={url} target="_blank" rel="noreferrer" className="hover:text-primary underline-offset-2">buka ↗</a>
          {" · "}
          <button type="button" className="text-red-600 hover:underline" onClick={() => { setErr(null); onUrl(""); }}>hapus</button>
        </p>
      ) : null}
      <p className="text-[12px] text-ink-faint">{acceptHint}</p>
      {err ? <p role="alert" className="text-[12.5px] text-red-600">{err}</p> : null}
      {!isSupabaseConfigured() ? (
        <p className="text-[11.5px] text-ink-faint">⚠ Supabase belum dikonfigurasi — file hanya terbuka dari perangkat ini (mode lokal).</p>
      ) : null}
    </div>
  );
}

/** Nama file dari URL (untuk label pratinjau). */
function namaDariUrl(url: string): string {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.split("/").pop() || u.hostname);
  } catch {
    return url;
  }
}
