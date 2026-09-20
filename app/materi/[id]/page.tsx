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

      {attachments.length > 0 ? (
        <div className="mt-3 max-w-[760px] space-y-3">
          {attachments.map((file, index) => (
            <div key={`${file.url}-${index}`}>
              {file.url && (file.url.toLowerCase().endsWith(".pdf") || file.name.toLowerCase().endsWith(".pdf")) ? (
                <div className="card overflow-hidden mb-2">
                  <div className="px-4 py-2.5 border-b border-line text-[13px] font-medium">Pratinjau dokumen</div>
                  <iframe src={file.url} title={file.name || "Lampiran"} className="w-full h-[520px] bg-wash" />
                </div>
              ) : null}
              <div className="card card-pad flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold">FILE</span>
                <div className="flex-1 min-w-0"><p className="text-[14px] font-medium truncate">{file.name || file.url}</p><p className="muted !text-[12.5px]">{file.url ? "Lampiran materi — klik untuk buka/unduh." : "Lampiran materi."}</p></div>
                {file.url ? <a className="btn-primary text-[13px]" href={file.url} target="_blank" rel="noreferrer" download>Buka</a> : <a className="btn-ghost text-[13px]" href={`data:text/plain;charset=utf-8,${encodeURIComponent(m.judul + "\n\n" + m.konten)}`} download={`${m.id}.txt`}>Unduh</a>}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
