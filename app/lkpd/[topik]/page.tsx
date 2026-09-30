"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, PageHeader, Progress } from "@/components/ui";
import { SubtopikModal } from "@/components/lkpd/modals";
import { useStore } from "@/lib/store";
import {
  LKPD_STATUS_LABEL,
  LKPD_STATUS_TONE,
  cariProgress,
  ctaProgres,
  progresSubtopic,
} from "@/lib/lkpd";
import type { LkpdSubtopic } from "@/lib/types";

/** Daftar submateri satu topik — "Pilih submateri, lalu mulai perjalanan misi". */
export default function TopikPage() {
  const params = useParams<{ topik: string }>();
  const router = useRouter();
  const { lkpdTopics, lkpdProgress, user, upsertLkpdTopic, ready } = useStore();
  const topik = lkpdTopics.find((t) => t.id === params.topik);
  const [modal, setModal] = useState<null | "baru" | LkpdSubtopic>(null);
  const manage = user?.role === "guru" || user?.role === "admin";

  if (!ready) return null;

  if (!topik) {
    return (
      <AppShell>
        <Guard allow={["siswa", "guru", "admin"]}>
          <Empty title="Materi tidak ditemukan" desc="Materi mungkin sudah dihapus oleh guru/admin." action={<Link href="/lkpd" className="btn-ghost">← Kembali ke LKPD</Link>} />
        </Guard>
      </AppShell>
    );
  }

  const simpanSub = (s: LkpdSubtopic) => {
    const ada = topik.subtopics.some((x) => x.id === s.id);
    upsertLkpdTopic({
      ...topik,
      subtopics: ada ? topik.subtopics.map((x) => (x.id === s.id ? s : x)) : [...topik.subtopics, s],
    });
  };

  const hapusSub = (s: LkpdSubtopic) => {
    if (!confirm(`Hapus submateri "${s.judul}" beserta seluruh mission & progresnya?`)) return;
    upsertLkpdTopic({ ...topik, subtopics: topik.subtopics.filter((x) => x.id !== s.id) });
  };

  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <div>
          <Link href="/lkpd" className="text-[13px] text-ink-muted hover:text-primary">← Semua materi LKPD</Link>

          <PageHeader
            title={`${topik.ikon || "📘"} ${topik.judul}`}
            desc={topik.deskripsi}
            right={manage ? <button className="btn-primary text-[13px]" onClick={() => setModal("baru")}>+ Tambah Submateri</button> : undefined}
          />

          {topik.subtopics.length === 0 ? (
            <Empty
              title="Belum ada submateri"
              desc={manage ? 'Klik "+ Tambah Submateri" untuk menambahkan submateri pertama (mis. Bangun Datar untuk topik Geometri).' : "Submateri sedang disiapkan guru."}
            />
          ) : (
            <div className="space-y-3">
              {topik.subtopics.map((s, i) => {
                const p = progresSubtopic(s, cariProgress(lkpdProgress, user?.id, s.id));
                return (
                  <div key={s.id} className="card card-pad hover:border-primary-200 transition-colors">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="purple">Submateri {i + 1}</Badge>
                      <Badge tone={LKPD_STATUS_TONE[p.status]}>{LKPD_STATUS_LABEL[p.status]}</Badge>
                      <span className="ml-auto text-[12.5px] text-ink-faint">{p.total} mission</span>
                    </div>
                    <p className="text-[15.5px] font-semibold mt-2">{s.judul}</p>
                    <p className="muted mt-0.5 line-clamp-2">{s.deskripsi || "Perjalanan belajar berbasis mission."}</p>

                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[12.5px] text-ink-muted">
                        <span>✓ {p.selesai} dari {p.total} mission selesai</span>
                        <span>{p.persen}%</span>
                      </div>
                      <Progress value={p.persen} />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-3.5">
                      <button className="btn-primary !py-1.5 !text-[13px]" onClick={() => router.push(`/lkpd/${topik.id}/${s.id}`)}>
                        {ctaProgres(p.status)}
                      </button>
                      {manage ? (
                        <div className="ml-auto flex flex-wrap gap-2">
                          <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => setModal(s)}>Ubah</button>
                          <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => router.push(`/lkpd/${topik.id}/${s.id}/kelola`)}>Kelola mission</button>
                          <button className="btn-danger !py-1.5 !text-[12.5px]" onClick={() => hapusSub(s)}>Hapus</button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <SubtopikModal open={modal !== null} initial={modal === "baru" ? null : modal} onClose={() => setModal(null)} onSave={simpanSub} />
        </div>
      </Guard>
    </AppShell>
  );
}
