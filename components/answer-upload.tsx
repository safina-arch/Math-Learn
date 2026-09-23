"use client";

import { useEffect, useRef, useState } from "react";
import type { MaterialAttachment } from "@/lib/types";

export function AnswerUpload({
  attachments,
  onChange,
  onActivity,
}: {
  attachments: MaterialAttachment[];
  onChange: (files: MaterialAttachment[]) => void;
  /** Dipanggil saat dialog foto dibuka — dipakai halaman evaluasi menahan deteksi pelanggaran. */
  onActivity?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [camOpen, setCamOpen] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function uploadFiles(files: File[]) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      files.forEach((file) => form.append("file", file));
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

  async function handleFiles(selected: FileList | null) {
    if (!selected?.length) return;
    await uploadFiles(Array.from(selected));
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Kamera perangkat (getUserMedia): pratinjau langsung → jepret → unggah.
  useEffect(() => {
    if (!camOpen) return;
    setCamError(null);
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        if (!cancelled) setCamError("Kamera tidak dapat diakses. Izinkan akses kamera di browser, atau gunakan \"+ Foto\".");
      }
    })();
    return () => { cancelled = true; stopStream(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camOpen]);

  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;
    const file = new File([blob], `kamera-${Date.now()}.jpg`, { type: "image/jpeg" });
    stopStream();
    setCamOpen(false);
    await uploadFiles([file]);
  }

  return (
    <div className="mt-2.5 rounded-lg border border-dashed border-line bg-wash/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[12.5px] font-medium text-ink-soft">Lampirkan foto jawaban <span className="font-normal text-ink-faint">(opsional)</span></p>
          <p className="text-[11.5px] text-ink-faint mt-0.5">JPG, PNG, atau WebP · maksimal 10 MB</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            className={`btn-ghost !py-1.5 !px-2.5 !text-[12px] ${uploading ? "opacity-60 pointer-events-none" : ""}`}
            disabled={uploading}
            onClick={() => { onActivity?.(); setCamOpen(true); }}
          >
            📷 Kamera
          </button>
          <label className={`btn-ghost !py-1.5 !px-2.5 !text-[12px] shrink-0 ${uploading ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}>
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploading}
              onFocus={() => onActivity?.()}
              onClick={() => onActivity?.()}
              onChange={(event) => { onActivity?.(); handleFiles(event.target.files); event.currentTarget.value = ""; }}
            />
            {uploading ? "Mengunggah…" : "+ Foto"}
          </label>
        </div>
      </div>
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-2 mt-2.5">
          {attachments.map((file, index) => (
            <div key={`${file.url}-${index}`} className="relative group">
              <a href={file.url} target="_blank" rel="noreferrer" title={file.name}>
                <img src={file.url} alt={file.name || "Foto jawaban"} className="h-16 w-16 rounded-md border border-line object-cover" />
              </a>
              <button type="button" aria-label={`Hapus ${file.name || "foto"}`} onClick={() => onChange(attachments.filter((_, i) => i !== index))} className="absolute -right-1.5 -top-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-[12px] leading-none shadow-sm sm:flex">×</button>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p role="alert" className="text-[12px] text-red-600 mt-2">{error}</p> : null}

      {camOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true" aria-label="Kamera">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-line shadow-pop overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-center justify-between">
              <p className="text-[14.5px] font-semibold">Ambil foto jawaban</p>
              <button className="btn-ghost !py-1.5 !text-[13px]" onClick={() => setCamOpen(false)}>Tutup</button>
            </div>
            <div className="bg-black">
              {camError ? (
                <p className="text-[13px] text-white/90 text-center px-6 py-10">{camError}</p>
              ) : (
                <video ref={videoRef} playsInline muted className="w-full max-h-[60vh] object-cover" />
              )}
            </div>
            <div className="p-4 flex gap-2">
              <button className="btn-primary flex-1" disabled={!!camError || uploading} onClick={() => void capture()}>
                {uploading ? "Mengunggah…" : "Ambil & gunakan foto"}
              </button>
              <button className="btn-ghost" onClick={() => setCamOpen(false)}>Batal</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
