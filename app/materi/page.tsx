"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { MaterialModal } from "@/components/material-modal";
import { useStore } from "@/lib/store";
import type { Material } from "@/lib/types";

export default function MateriPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <List />
      </Guard>
    </AppShell>
  );
}

function List() {
  const { materials, user, upsertMaterial, deleteMaterial } = useStore();
  const router = useRouter();
  const [mOpen, setMOpen] = useState(false);
  const [editM, setEditM] = useState<Material | null>(null);
  const manage = user?.role === "guru" || user?.role === "admin";
  const items = materials.filter((m) => user?.role !== "siswa" || m.kelas === user.kelas || m.kelas === "VIII");

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader
        title="Materi"
        desc="Ruang baca interaktif: teks, video, dan lampiran dalam satu halaman."
        right={manage ? (
          <>
            <button className="btn-primary text-[13px]" onClick={() => { setEditM(null); setMOpen(true); }}>+ Materi</button>
          </>
        ) : undefined}
      />
      {items.length === 0 ? <Empty title="Belum ada materi" desc={manage ? "Klik \"+ Materi\" untuk menambahkan materi pertama." : undefined} /> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((m) => (
            <div
              key={m.id}
              className="card card-pad hover:border-primary-200 transition-colors cursor-pointer"
              onClick={() => router.push(`/materi/${m.id}`)}
              role="link"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Badge tone="purple">{m.kelas}</Badge>
                {m.videoUrl ? <Badge>Video</Badge> : null}
                {(m.attachments?.length || m.fileUrl || m.fileName) ? <Badge>{m.attachments?.length ? `${m.attachments.length} file` : "PDF"}</Badge> : null}
              </div>
              <p className="text-[15px] font-semibold leading-snug">{m.judul}</p>
              <p className="muted mt-1 line-clamp-2">{m.ringkasan}</p>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-[12.5px] text-ink-faint">Materi pembelajaran · {m.kelas}</p>
                {manage ? (
                  <div className="ml-auto flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => { setEditM(m); setMOpen(true); }}>Ubah</button>
                    <button className="btn-danger !py-1.5 !text-[12.5px]" onClick={() => deleteMaterial(m.id)}>Hapus</button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <MaterialModal
        open={mOpen}
        initial={editM}
        onClose={() => setMOpen(false)}
        onSave={(m) => { upsertMaterial(m); setMOpen(false); }}
      />
    </div>
  );
}
