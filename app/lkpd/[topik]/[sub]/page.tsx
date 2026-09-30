"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, Progress } from "@/components/ui";
import { BlokRenderer } from "@/components/lkpd/blocks";
import { useStore } from "@/lib/store";
import { cariProgress, progresSubtopic } from "@/lib/lkpd";

/** Perjalanan misi 5 tahap: Mission 1 → … → 5 → refleksi → selesai. */
export default function JourneyPage() {
  const params = useParams<{ topik: string; sub: string }>();
  const router = useRouter();
  const { lkpdTopics, lkpdProgress, user, tandaiMissionLkpd, simpanJawabanLkpd, ready } = useStore();

  const topik = lkpdTopics.find((t) => t.id === params.topik);
  const sub = topik?.subtopics.find((s) => s.id === params.sub);
  const prog = cariProgress(lkpdProgress, user?.id, params.sub);

  const [idx, setIdx] = useState(0);
  const [raya, setRaya] = useState(false);
  const initRef = useRef(false);

  // Mulai dari mission pertama yang belum selesai (pengalaman "Lanjutkan") — cukup sekali.
  useEffect(() => {
    if (!ready || initRef.current || !sub) return;
    initRef.current = true;
    const pertama = sub.missions.findIndex((m) => !prog?.missions.includes(m.id));
    setIdx(pertama >= 0 ? pertama : 0);
  }, [ready, sub, prog]);

  if (!ready) return null;

  if (!topik || !sub) {
    return (
      <AppShell>
        <Guard allow={["siswa", "guru", "admin"]}>
          <Empty title="LKPD tidak ditemukan" desc="Submateri mungkin sudah dihapus." action={<Link href="/lkpd" className="btn-ghost">← Kembali ke LKPD</Link>} />
        </Guard>
      </AppShell>
    );
  }

  const missions = sub.missions;
  const p = progresSubtopic(sub, prog);
  const m = missions[Math.min(idx, Math.max(0, missions.length - 1))];
  const selesaiSemua = p.total > 0 && p.selesai >= p.total;

  const tandai = () => {
    if (!m) return;
    tandaiMissionLkpd(sub.id, m.id);
    if (idx < missions.length - 1) { setIdx(idx + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else setRaya(true);
  };

  const indikator = (id: string) => (prog?.missions.includes(id) ? "✓" : "○");

  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
            <Link href="/lkpd" className="hover:text-primary">LKPD</Link>
            <span>/</span>
            <Link href={`/lkpd/${topik.id}`} className="hover:text-primary">{topik.judul}</Link>
            <span>/</span>
            <span className="text-ink font-medium">{sub.judul}</span>
            <span className="ml-auto"><Badge tone={selesaiSemua ? "green" : "amber"}>{p.persen}% selesai</Badge></span>
          </div>

          <div className="mt-3 mb-4">
            <Progress value={p.persen} />
          </div>

          {/* Timeline mission */}
          <div className="card card-pad !py-3 mb-4 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              {missions.map((x, i) => {
                const aktif = i === idx && !raya;
                const done = prog?.missions.includes(x.id);
                return (
                  <button
                    key={x.id}
                    onClick={() => { setIdx(i); setRaya(false); }}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] whitespace-nowrap transition-colors ${aktif ? "bg-primary-50 text-primary font-semibold" : done ? "text-green-700 hover:bg-wash" : "text-ink-muted hover:bg-wash"}`}
                    title={x.judul}
                  >
                    <span>{indikator(x.id)}</span>
                    <span>{x.ikon} {x.judul}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {raya ? (
            <div className="card card-pad text-center py-9">
              <p className="text-[40px]">🎉</p>
              <p className="text-[18px] font-bold mt-1">LKPD Complete!</p>
              <p className="muted mt-1 max-w-[440px] mx-auto">
                Kamu menuntaskan seluruh mission <b>{sub.judul}</b> — {p.total} mission selesai. Teruskan ke submateri berikutnya!
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <Link href={`/lkpd/${topik.id}`} className="btn-primary">Pilih submateri lain</Link>
                <Link href="/lkpd" className="btn-ghost">Kembali ke LKPD Hub</Link>
              </div>
            </div>
          ) : m ? (
            <div>
              <div className="mb-3">
                <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-faint">Mission {idx + 1} dari {missions.length}</p>
                <h1 className="text-[22px] font-bold tracking-tight mt-0.5">{m.ikon} {m.judul}</h1>
                {m.deskripsi ? <p className="muted mt-1 max-w-[640px]">{m.deskripsi}</p> : null}
              </div>

              {m.blok.length === 0 ? (
                <Empty title="Mission ini belum berisi konten" desc={user?.role !== "siswa" ? "Buka mode Kelola untuk menambahkan content block." : "Konten sedang disiapkan guru."} />
              ) : (
                <div className="space-y-3.5">
                  {m.blok.map((b) => (
                    <BlokRenderer
                      key={b.id}
                      blok={b}
                      jawaban={prog?.jawaban?.[b.id]}
                      onSimpan={(t) => simpanJawabanLkpd(sub.id, b.id, t)}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 mt-5">
                <button className="btn-ghost !text-[13px]" disabled={idx === 0} onClick={() => { setIdx(idx - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  ← Sebelumnya
                </button>
                <button className="btn-primary !text-[13px] ml-auto" onClick={tandai}>
                  {idx < missions.length - 1 ? "Tandai selesai & lanjut →" : "Tandai selesai & akhiri 🎉"}
                </button>
              </div>
            </div>
          ) : (
            <Empty title="Belum ada mission" desc={user?.role !== "siswa" ? "Buka \"Kelola mission\" untuk menambahkan mission." : "Submateri ini belum berisi mission."} />
          )}
        </div>
      </Guard>
    </AppShell>
  );
}
