"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell, Guard } from "@/components/shell";
import { Badge } from "@/components/ui";
import { useStore } from "@/lib/store";

function renderInline(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith("`") && p.endsWith("`") ? (
      <code key={i} className="bg-wash border border-line rounded px-1.5 py-0.5 text-[13px] font-mono text-primary-800">{p.slice(1, -1)}</code>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

type Attach = { url: string; name?: string; tipe?: "file" | "link" };

/** Tipe konten lampiran: pdf | gambar | video | tautan | file. */
function kindOf(att: Attach): "pdf" | "gambar" | "video" | "tautan" | "file" {
  const url = (att.url || "").toLowerCase().split("?")[0];
  const name = (att.name || "").toLowerCase();
  const hay = `${url}|${name}`;
  if (att.tipe === "link") return "tautan";
  if (hay.includes(".pdf")) return "pdf";
  if (/\.(png|jpe?g|webp|gif|avif)/.test(hay)) return "gambar";
  if (/\.(mp4|webm|mov|m4v)/.test(hay)) return "video";
  // Data lama: URL murni tanpa nama file → tautan eksternal, bukan file unggahan.
  if (att.tipe === undefined && /^https?:\/\//.test(att.url) && (!att.name || att.name.startsWith("http"))) return "tautan";
  return "file";
}

/** Ubah URL video (YouTube/Drive) ke bentuk embed agar bisa ditampilkan. */
function embedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/embed/")) return url.replace("/shorts/", "/embed/");
      return url;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    return url;
  } catch {
    return url;
  }
}

const KIND_LABEL = { pdf: "Pratinjau PDF", gambar: "Pratinjau gambar", video: "Pratinjau video", tautan: "Pratinjau tautan", file: "" } as const;
const KIND_TONE: Record<string, { box: string; text: string; tag: string }> = {
  pdf: { box: "bg-red-50 border-red-200", text: "text-red-600", tag: "PDF" },
  gambar: { box: "bg-green-50 border-green-200", text: "text-green-700", tag: "IMG" },
  video: { box: "bg-purple-50 border-purple-200", text: "text-purple-700", tag: "VID" },
  tautan: { box: "bg-blue-50 border-blue-200", text: "text-blue-700", tag: "LINK" },
  file: { box: "bg-amber-50 border-amber-200", text: "text-amber-700", tag: "FILE" },
};

export default function MateriDetailPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <Detail />
      </Guard>
    </AppShell>
  );
}

function Detail() {
  const { id } = useParams() as { id: string };
  const { materials } = useStore();
  const m = materials.find((x) => x.id === id);
  if (!m) return <div className="page-wrap !px-0"><p className="muted">Materi tidak ditemukan.</p><Link href="/materi" className="text-primary text-[13px]">Kembali</Link></div>;
  const attachments = m.attachments?.length ? m.attachments : (m.fileUrl || m.fileName ? [{ url: m.fileUrl || "", name: m.fileName || m.fileUrl || "" }] : []);

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <Link href="/materi" className="text-[13px] text-ink-muted hover:text-primary">← Semua materi</Link>
      <div className="mt-2 flex items-center gap-2">
        <Badge tone="purple">{m.kelas}</Badge>
        <span className="text-[12.5px] text-ink-faint">Materi pembelajaran</span>
      </div>
      <h1 className="h1 mt-2 max-w-[720px]">{m.judul}</h1>
      <p className="muted mt-1.5 max-w-[680px]">{m.ringkasan}</p>

      {m.videoUrl ? (
        <div className="card overflow-hidden mt-5">
          <div className="px-4 py-2.5 border-b border-line text-[13px] font-medium">Video pembelajaran</div>
          <div className="aspect-video bg-black">
            <iframe src={m.videoUrl} title={m.judul} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        </div>
      ) : null}

      <article className="card card-pad sm:p-7 mt-3 prose-doc max-w-[760px]">
        {m.konten.split("\n").map((line, i) => {
          if (line.startsWith("## ")) return <h3 key={i}>{line.slice(3)}</h3>;
          if (line.startsWith("- ")) return <ul key={i}><li>{renderInline(line.slice(2))}</li></ul>;
          if (!line.trim()) return <div key={i} className="h-1" />;
          return <p key={i}>{renderInline(line)}</p>;
        })}
      </article>

      {attachments.length > 0 ? (() => {
        /**
         * Revisi: cukup SATU pratinjau per materi — kecuali lampiran berbeda tipe
         * file vs tautan, maka keduanya boleh tampil (maksimal dua pratinjau).
         */
        const fileIdx = attachments.findIndex((f) => kindOf(f) !== "tautan");
        const linkIdx = attachments.findIndex((f) => kindOf(f) === "tautan");
        const previewed = new Set<number>([fileIdx, linkIdx].filter((i) => i >= 0));
        return (
          <div className="mt-3 max-w-[760px] space-y-3">
            {attachments.map((file, index) => {
              const kind = kindOf(file);
              const showPreview = previewed.has(index);
              const tone = KIND_TONE[kind];
              const isTautan = kind === "tautan";
              return (
                <div key={`${file.url}-${index}`}>
                  {showPreview && file.url ? (
                    <div className="card overflow-hidden mb-2">
                      <div className="px-4 py-2.5 border-b border-line text-[13px] font-medium flex items-center gap-2">
                        {KIND_LABEL[kind]}
                        <span className="badge bg-wash text-ink-soft border-line">{file.name?.slice(0, 40) || (isTautan ? "Tautan" : "Lampiran")}</span>
                      </div>
                      {kind === "pdf" ? (
                        <iframe src={file.url} title={file.name || "Lampiran PDF"} className="w-full h-[520px] bg-wash" />
                      ) : kind === "gambar" ? (
                        <div className="bg-wash p-3 flex justify-center">
                          <img src={file.url} alt={file.name || "Gambar materi"} className="max-h-[480px] rounded-lg object-contain" />
                        </div>
                      ) : kind === "video" ? (
                        <video src={file.url} controls className="w-full max-h-[480px] bg-black" />
                      ) : kind === "tautan" ? (
                        <iframe src={embedUrl(file.url)} title={file.name || "Pratinjau tautan"} className="w-full h-[420px] bg-wash" loading="lazy" />
                      ) : null}
                    </div>
                  ) : null}
                  <div className="card card-pad flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg border text-[10px] font-bold ${tone.box} ${tone.text}`}>{tone.tag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate">{file.name || file.url}</p>
                      <p className="muted !text-[12.5px]">
                        {isTautan
                          ? "Tautan eksternal — klik untuk membuka di tab baru."
                          : kind === "gambar"
                            ? "Gambar materi — klik untuk lihat ukuran penuh."
                            : kind === "video"
                              ? "Video materi — klik untuk putar / unduh."
                              : "Lampiran materi — klik untuk buka/unduh."}
                      </p>
                    </div>
                    {file.url ? (
                      <a className={isTautan ? "btn-ghost text-[13px]" : "btn-primary text-[13px]"} href={file.url} target="_blank" rel="noreferrer" download={isTautan ? undefined : true}>{isTautan ? "Buka tautan" : "Buka"}</a>
                    ) : (
                      <a className="btn-ghost text-[13px]" href={`data:text/plain;charset=utf-8,${encodeURIComponent(m.judul + "\n\n" + m.konten)}`} download={`${m.id}.txt`}>Unduh</a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })() : null}
    </div>
  );
}
