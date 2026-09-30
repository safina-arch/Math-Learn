"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Empty, PageHeader, Progress } from "@/components/ui";
import { TopikModal } from "./modals";
import { useStore } from "@/lib/store";
import {
  LKPD_STATUS_LABEL,
  LKPD_STATUS_TONE,
  ctaProgres,
  progresTopik,
} from "@/lib/lkpd";
import type { LkpdTopic } from "@/lib/types";

/**
 * LKPD Hub — daftar materi/topik secara data-driven.
 * Menambahkan Geometri/Aljabar/Statistika cukup menambah data topik;
 * tidak ada daftar materi yang di-hard-code di sini.
 */
export function LkpdHub() {
  const { lkpdTopics, lkpdProgress, user, upsertLkpdTopic, deleteLkpdTopic } = useStore();
  const router = useRouter();
  const [modal, setModal] = useState<null | "baru" | LkpdTopic>(null);
  const manage = user?.role === "guru" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  return (
    <div>
      <PageHeader
        title="📚 LKPD — Learning Journey"
        desc="Pilih materi yang ingin kamu pelajari. Setiap materi berisi submateri dengan perjalanan misi 5 tahap berpikir."
        right={manage ? <button className="btn-primary text-[13px]" onClick={() => setModal("baru")}>+ Tambah Materi</button> : undefined}
      />

      {lkpdTopics.length === 0 ? (
        <Empty
          title="Belum ada materi LKPD"
          desc={manage ? 'Klik "+ Tambah Materi" untuk membuat materi pertama — mis. Perbandingan, Geometri, atau Aljabar.' : "Materi LKPD sedang disiapkan guru."}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {lkpdTopics.map((t) => {
            const p = progresTopik(t, lkpdProgress, user?.id);
            const cta = ctaProgres(p.status);
            return (
              <div key={t.id} className="card card-pad hover:border-primary-200 transition-colors flex flex-col">
                <div className="flex items-start gap-3">
                  <span className="text-[30px] leading-none">{t.ikon || "📘"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold">{t.judul}</p>
                    <p className="muted mt-0.5 line-clamp-2">{t.deskripsi}</p>
                  </div>
                  <Badge tone={LKPD_STATUS_TONE[p.status]}>{LKPD_STATUS_LABEL[p.status]}</Badge>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[12.5px] text-ink-muted">
                    <span>{t.subtopics.length} LKPD tersedia</span>
                    <span>{p.selesai}/{p.total} mission · {p.persen}%</span>
                  </div>
                  <Progress value={p.persen} />
                </div>

                <div className="flex items-center gap-2 mt-3.5">
                  <button className="btn-primary !py-1.5 !text-[13px]" onClick={() => router.push(`/lkpd/${t.id}`)}>{cta}</button>
                  {manage ? (
                    <div className="ml-auto flex gap-2">
                      <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => setModal(t)}>Ubah</button>
                      {isAdmin ? (
                        <button
                          className="btn-danger !py-1.5 !text-[12.5px]"
                          onClick={() => { if (confirm(`Hapus materi "${t.judul}" beserta seluruh submateri & progresnya?`)) deleteLkpdTopic(t.id); }}
                        >Hapus</button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TopikModal
        open={modal !== null}
        initial={modal === "baru" ? null : modal}
        existingIds={lkpdTopics.map((t) => t.id)}
        onClose={() => setModal(null)}
        onSave={upsertLkpdTopic}
      />
    </div>
  );
}
