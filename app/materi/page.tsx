"use client";

import Link from "next/link";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";

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
  const { materials, user } = useStore();
  const items = materials.filter((m) => user?.role !== "siswa" || m.kelas === user.kelas || m.kelas === "VIII");
  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader
        title="Materi"
        desc="Ruang baca interaktif: teks, video, dan lampiran dalam satu halaman."
        right={user?.role === "guru" || user?.role === "admin" ? <Link href="/kelola" className="btn-primary text-[13px]">Tambah materi</Link> : undefined}
      />
      {items.length === 0 ? <Empty title="Belum ada materi" desc="Guru dapat menambah materi dari halaman Kelola." /> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((m) => (
            <Link key={m.id} href={`/materi/${m.id}`} className="card card-pad hover:border-primary-200 transition-colors block">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge tone="purple">{m.kelas}</Badge>
                {m.videoUrl ? <Badge>Video</Badge> : null}
                {(m.attachments?.length || m.fileUrl || m.fileName) ? <Badge>{m.attachments?.length ? `${m.attachments.length} file` : "PDF"}</Badge> : null}
              </div>
              <p className="text-[15px] font-semibold leading-snug">{m.judul}</p>
              <p className="muted mt-1 line-clamp-2">{m.ringkasan}</p>
              <p className="text-[12.5px] text-ink-faint mt-2">Materi pembelajaran · {m.kelas}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
