"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, PageHeader, Progress } from "@/components/ui";
import { SubtopikModal } from "@/components/lkpd/modals";
import { barisHasil } from "@/components/lkpd/hasil";
import { useStore } from "@/lib/store";
import {
  LKPD_STATUS_LABEL,
  LKPD_STATUS_TONE,
  cariProgress,
  ctaProgres,
  nilaiSubtopic,
  progresSubtopic,
} from "@/lib/lkpd";
import type { LkpdSubtopic } from "@/lib/types";

/** Daftar submateri satu topik — "Pilih submateri, lalu mulai perjalanan misi". */
export default function TopikPage() {
  const params = useParams<{ topik: string }>();
  const router = useRouter();
  const { lkpdTopics, lkpdProgress, users, user, upsertLkpdTopic, addNotification, ready } = useStore();
  const topik = lkpdTopics.find((t) => t.id === params.topik);
  const [modal, setModal] = useState<null | "baru" | LkpdSubtopic>(null);
  const manage = user?.role === "guru" || user?.role === "admin";
  const jumlahSiswa = users.filter((u) => u.role === "siswa").length;
  /** Penilaian LKPD per sub-bab: satu baris hasil per siswa × submateri. */
  const rowsNilai = manage ? barisHasil(lkpdTopics, lkpdProgress, users) : [];

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
    // Notifikasi tersbar ke seluruh siswa saat submateri baru terbit.
    if (!ada) {
      addNotification({
        userId: "all-siswa",
        kategori: "pengumuman",
        judul: `Submateri baru: ${s.judul}`,
        isi: `Ditambahkan pada materi ${topik.judul}. Buka menu LKPD untuk mengerjakan learning journey-nya.`,
      });
    }
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
                const pr = cariProgress(lkpdProgress, user?.id, s.id);
                const p = progresSubtopic(s, pr);
                /** Nilai sub-bab siswa: muncul sejak mission pertama (tanpa menunggu materi penuh). */
                const nilaiSendiri = nilaiSubtopic(s, pr);
                // Rekap penilaian sub-bab ini (khusus tampilan guru/admin).
                const subRows = rowsNilai.filter((r) => r.subtopicId === s.id);
                const dinilai = subRows.filter((r) => r.nilai != null);
                const rata = dinilai.length ? Math.round(dinilai.reduce((n, r) => n + (r.nilai || 0), 0) / dinilai.length) : null;
                const menunggu = dinilai.filter((r) => !r.verifikasi).length;
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

                    {/* Penilaian per sub-bab — nilai muncul per submateri, bukan per materi. */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-wash/50 px-3 py-2">
                      <span className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-faint">Nilai sub-bab</span>
                      {manage ? (
                        <>
                          <span className="text-[17px] font-bold">{rata ?? "—"}</span>
                          <span className="text-[12.5px] text-ink-muted">
                            {dinilai.length ? `rata-rata · ${dinilai.length} dari ${jumlahSiswa || dinilai.length} siswa dinilai` : "belum ada nilai"}
                          </span>
                          {menunggu ? <Badge tone="amber">{menunggu} belum diperiksa</Badge> : null}
                        </>
                      ) : (
                        <>
                          <span className="text-[17px] font-bold">{nilaiSendiri ?? "—"}</span>
                          {nilaiSendiri != null ? (
                            <Badge tone={pr?.verifikasi ? "green" : "amber"}>{pr?.verifikasi ? "Sudah diperiksa ✓" : "Belum diperiksa"}</Badge>
                          ) : (
                            <span className="text-[12.5px] text-ink-faint">nilai terisi sejak mission pertama selesai</span>
                          )}
                        </>
                      )}
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
