"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, Progress } from "@/components/ui";
import { BlokRenderer } from "@/components/lkpd/blocks";
import { useStore } from "@/lib/store";
import { cariProgress, progresSubtopic } from "@/lib/lkpd";

/**
 * Perjalanan misi 5 tahap — WAJIB BERURUTAN:
 * mission N+1 baru terbuka setelah mission N ditandai selesai (mis. 1 → 2 → … → 5).
 * Jawaban tiap blok tersimpan di progres sehingga bolak-balik tidak menghapusnya.
 */
export default function JourneyPage() {
  const params = useParams<{ topik: string; sub: string }>();
  const router = useRouter();
  const { lkpdTopics, lkpdProgress, user, tandaiMissionLkpd, simpanJawabanLkpd, addNotification, ready } = useStore();

  const topik = lkpdTopics.find((t) => t.id === params.topik);
  const sub = topik?.subtopics.find((s) => s.id === params.sub);
  const prog = cariProgress(lkpdProgress, user?.id, params.sub);

  const [idx, setIdx] = useState(0);
  const [raya, setRaya] = useState(false);
  const initRef = useRef(false);

  // Mulai dari mission pertama yang belum selesai — cukup sekali agar tidak melompat saat sinkron.
  useEffect(() => {
    if (!ready || initRef.current || !sub) return;
    initRef.current = true;
    const belum = sub.missions.findIndex((m) => !prog?.missions.includes(m.id));
    setIdx(belum >= 0 ? belum : 0);
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
  const selesaiSet = new Set(prog?.missions || []);

  // Batas urutan: jumlah mission berurutan dari awal yang sudah selesai.
  let batas = 0;
  while (batas < missions.length && selesaiSet.has(missions[batas].id)) batas++;
  const aman = Math.min(Math.max(idx, 0), Math.max(0, Math.min(batas, missions.length - 1)));
  const m: typeof missions[number] | undefined = missions[aman];
  const semuaSelesai = missions.length > 0 && batas >= missions.length;
  const boleh = (i: number) => i <= batas;

  const tandai = () => {
    if (!m) return;
    const baru = !selesaiSet.has(m.id);
    tandaiMissionLkpd(sub.id, m.id);
    if (aman < missions.length - 1) {
      setIdx(aman + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setRaya(true);
    // Notifikasi guru: siswa menuntaskan seluruh LKPD — muncul di "Hasil siswa".
    if (baru && missions.every((x) => selesaiSet.has(x.id) || x.id === m.id)) {
      addNotification({
        userId: "all-guru",
        kategori: "kiriman",
        judul: `${user?.nama || "Siswa"} menyelesaikan LKPD ${sub.judul}`,
        isi: `Materi ${topik.judul} · seluruh ${missions.length} mission selesai — nilai menunggu verifikasi pada menu Hasil siswa.`,
      });
    }
  };

  const pilihMission = (i: number) => {
    if (!boleh(i)) return;
    setIdx(i);
    setRaya(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
            <span className="ml-auto"><Badge tone={p.status === "selesai" ? "green" : "amber"}>{p.persen}% selesai</Badge></span>
          </div>

          <div className="mt-3 mb-4">
            <Progress value={p.persen} />
          </div>

          <div className="rounded-lg border border-primary-200 bg-primary-50/60 px-3.5 py-2.5 text-[13px] text-primary-800 mb-4">
            🔒 <b>Urutan wajib:</b> mission berikutnya terbuka setelah mission ini ditandai selesai. Jawabanmu tetap tersimpan saat berpindah tahap.
          </div>

          {/* Timeline mission — yang belum berurutan masih terkunci */}
          <div className="card card-pad !py-3 mb-4 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              {missions.map((x, i) => {
                const aktif = i === aman && !raya;
                const done = selesaiSet.has(x.id);
                const kunci = !boleh(i);
                return (
                  <button
                    key={x.id}
                    onClick={() => pilihMission(i)}
                    disabled={kunci}
                    title={kunci ? "Selesaikan mission sebelumnya terlebih dahulu" : x.judul}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] whitespace-nowrap transition-colors ${
                      kunci
                        ? "text-ink-faint opacity-60 cursor-not-allowed"
                        : aktif
                          ? "bg-primary-50 text-primary font-semibold"
                          : done
                            ? "text-green-700 hover:bg-wash"
                            : "text-ink-muted hover:bg-wash"
                    }`}
                  >
                    <span>{done ? "✓" : kunci ? "🔒" : "○"}</span>
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
              <p className="muted mt-1 max-w-[460px] mx-auto">
                Kamu menuntaskan seluruh mission <b>{sub.judul}</b> — {p.total} mission selesai.
              </p>
              <div className="mx-auto mt-4 max-w-[420px] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-[12.5px] font-semibold text-amber-800 uppercase tracking-wide">Nilai pengerjaan</p>
                <p className="text-[30px] font-bold text-ink mt-0.5">{prog?.nilai ?? p.persen}</p>
                <p className="text-[13.5px] text-amber-900 mt-0.5">⏳ Nilai sedang menunggu untuk diverifikasi oleh guru</p>
              </div>
              <div className="flex justify-center gap-2 mt-4 flex-wrap">
                <Link href="/nilai" className="btn-primary">Lihat nilai saya</Link>
                <Link href={`/lkpd/${topik.id}`} className="btn-ghost">Pilih submateri lain</Link>
                <Link href="/lkpd" className="btn-ghost">Kembali ke LKPD Hub</Link>
              </div>
            </div>
          ) : m ? (
            <div>
              <div className="mb-3">
                <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-faint">Mission {aman + 1} dari {missions.length}</p>
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
                <button
                  className="btn-ghost !text-[13px]"
                  disabled={aman === 0}
                  onClick={() => pilihMission(aman - 1)}
                >← Sebelumnya</button>
                <span className="text-[12.5px] text-ink-faint hidden sm:inline">
                  {selesaiSet.has(m.id) ? "Mission ini sudah selesai ✓" : "Selesaikan seluruh isi mission untuk lanjut"}
                </span>
                <button className="btn-primary !text-[13px] ml-auto" onClick={tandai}>
                  {aman < missions.length - 1 ? (selesaiSet.has(m.id) ? "Lanjut ke mission berikutnya →" : "Tandai selesai & lanjut →") : "Tandai selesai & akhiri 🎉"}
                </button>
              </div>
            </div>
          ) : (
            <Empty title="Belum ada mission" desc={user?.role !== "siswa" ? "Buka \"Kelola mission\" untuk menambahkan mission." : "Submateri ini belum berisi mission."} />
          )}

          {semuaSelesai && !raya ? (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[13.5px] text-green-800">
              ✅ Seluruh mission selesai — nilai <b>{prog?.nilai ?? p.persen}</b> menunggu verifikasi guru.
            </div>
          ) : null}
        </div>
      </Guard>
    </AppShell>
  );
}
