"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, Modal, Progress } from "@/components/ui";
import { BlokRenderer } from "@/components/lkpd/blocks";
import { AnswerUpload } from "@/components/answer-upload";
import { PengawasKecurangan } from "@/components/pengawas-kecurangan";
import { useStore } from "@/lib/store";
import { cariProgress, missionTerjawab, nilaiSubtopic, progresSubtopic } from "@/lib/lkpd";

/**
 * Perjalanan misi 5 tahap — WAJIB BERURUTAN:
 * mission N+1 baru terbuka setelah mission N ditandai selesai (mis. 1 → 2 → … → 5).
 * Jawaban tiap blok tersimpan di progres sehingga bolak-balik tidak menghapusnya.
 */
export default function JourneyPage() {
  const params = useParams<{ topik: string; sub: string }>();
  const router = useRouter();
  const { lkpdTopics, lkpdProgress, user, tandaiMissionLkpd, simpanJawabanLkpd, simpanLampiranLkpd, addNotification, ready } = useStore();

  const topik = lkpdTopics.find((t) => t.id === params.topik);
  const sub = topik?.subtopics.find((s) => s.id === params.sub);
  const prog = cariProgress(lkpdProgress, user?.id, params.sub);

  const [idx, setIdx] = useState(0);
  const [raya, setRaya] = useState(false);
  const [kurang, setKurang] = useState<string[]>([]);
  const initRef = useRef(false);
  // Pengawas kecurangan LKPD: hitungan pelanggaran, waktu mulai, penanda refresh & selesai.
  const cheatRef = useRef(0);
  const mulaiRef = useRef(Date.now());
  const refreshRef = useRef(false);
  const selesaiRef = useRef(false);
  const mulaiInitRef = useRef(false);

  // Mulai dari mission pertama yang belum selesai — cukup sekali agar tidak melompat saat sinkron.
  useEffect(() => {
    if (!ready || initRef.current || !sub) return;
    initRef.current = true;
    const belum = sub.missions.findIndex((m) => !prog?.missions.includes(m.id));
    setIdx(belum >= 0 ? belum : 0);
  }, [ready, sub, prog]);

  // Waktu mulai pengerjaan untuk laporan pengawas — pakai updatedAt progres bila ada
  // (sekali saja saat progres terbaca pertama kali, agar kolom "menit ke-N" wajar).
  useEffect(() => {
    if (!ready || mulaiInitRef.current) return;
    mulaiInitRef.current = true;
    const t = prog?.updatedAt ? Date.parse(prog.updatedAt) : 0;
    mulaiRef.current = t || Date.now();
  }, [ready, prog]);

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
  // LKPD sudah disubmit → terkunci (sekali kerja), data pengerjaan pertama tetap ada.
  const terkunci = Boolean(prog?.dikumpulkan);
  // Pengawas kecurangan berhenti menghitung begitu LKPD dikumpulkan.
  selesaiRef.current = terkunci;
  // Kunci/pembahasan hanya bila sudah dikumpulkan DAN guru/admin mengizinkan.
  const bukaKunci = Boolean(prog?.dikumpulkan && topik.kunciTerbuka);
  // Feedback guru PER SOAL boleh tampil setelah dikumpulkan ATAU setelah guru menulisnya
  // (kunci jawaban tetap mengikuti aturan lama: dikumpulkan + kunciTerbuka).
  const adaFbBlok = Boolean(
    prog?.feedbackBlok && Object.values(prog.feedbackBlok).some((v) => Boolean(v && v.trim())),
  );
  const bolehFbBlok = Boolean(prog?.dikumpulkan) || adaFbBlok;
  const nilaiAkhir = nilaiSubtopic(sub, prog);

  const tandai = () => {
    if (!m || terkunci) return;
    // Semua blok yang mengharuskan jawaban wajib terisi — nilai diambil dari
    // jawaban, bukan sekadar menekan tombol.
    const cek = missionTerjawab(m, prog?.jawaban || {});
    if (!cek.boleh) {
      setKurang(cek.kurang);
      window.scrollTo({ top: 240, behavior: "smooth" });
      return;
    }
    setKurang([]);
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
          {/* Pengawas kecurangan: peringatan real-time saat keluar tab selama LKPD belum dikumpulkan.
              `catatNavigasi` sengaja tidak dipasang (false) untuk LKPD. */}
          <PengawasKecurangan
            aktif={Boolean(prog) && !prog?.dikumpulkan}
            evaluationId={`lkpd:${sub.id}`}
            jenis="lkpd"
            countRef={cheatRef}
            mulaiRef={mulaiRef}
            refreshRef={refreshRef}
            selesaiRef={selesaiRef}
          />
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

          {terkunci ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-900 mb-4">
              📦 <b>LKPD sudah dikumpulkan</b> — jawaban tidak bisa diubah dan tidak bisa dikerjakan ulang. Nilai{" "}
              <b>{nilaiAkhir ?? "—"}</b>{" "}
              {prog?.menungguPemeriksaan ? "· menunggu pemeriksaan guru." : prog?.verifikasi ? "· sudah diperiksa guru ✓" : "· menunggu pemeriksaan guru."}
              {prog?.feedbackGuru ? (
                <span className="mt-2 block rounded-lg border border-amber-200 bg-white px-3 py-2 text-[13px] text-ink-soft">
                  💬 <b>Feedback guru:</b> {prog.feedbackGuru}
                </span>
              ) : null}
            </div>
          ) : null}

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
            /**
             * Pop-up pasca-kerjakan (sama seperti latihan & evaluasi): intinya
             * "hasil sedang menunggu diverifikasi oleh guru".
             */
            <Modal open={raya} onClose={() => setRaya(false)} title="🎉 LKPD selesai!">
              <div className="text-center py-1">
                <p className="text-[44px] leading-none">🎉</p>
                <p className="text-[17px] font-bold mt-2">Seluruh mission tuntas</p>
                <p className="muted mt-1 max-w-[460px] mx-auto">
                  Kamu menuntaskan seluruh mission <b>{sub.judul}</b> — {p.total} mission selesai.
                </p>
                <div className="mx-auto mt-4 max-w-[420px] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-[12.5px] font-semibold text-amber-800 uppercase tracking-wide">Nilai pengerjaan</p>
                  <p className="text-[30px] font-bold text-ink mt-0.5">{nilaiAkhir ?? "—"}</p>
                  <p className="text-[15px] font-semibold text-amber-900 mt-1">⏳ Menunggu pemeriksaan guru</p>
                  <p className="text-[13px] text-amber-800 mt-1">
                    {nilaiAkhir == null
                      ? "Jawabanmu berupa pertanyaan terbuka — nilai ditentukan guru setelah memeriksa."
                      : "Status: Menunggu pemeriksaan — nilai menjadi fiks setelah guru memeriksa dan memverifikasi."}
                  </p>
                  <p className="text-[12.5px] text-amber-800 mt-2 border-t border-amber-200 pt-2">
                    🔒 LKPD terkunci: tidak bisa dikerjakan ulang. Jawaban pertamamu tetap tersimpan.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/nilai" className="btn-primary flex-1">Lihat nilai &amp; status</Link>
                <Link href={`/lkpd/${topik.id}`} className="btn-ghost" onClick={() => setRaya(false)}>Pilih submateri lain</Link>
              </div>
            </Modal>
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
                  {m.blok.map((b) => {
                    // 💬 Feedback guru per soal — tampil tepat di bawah blok/jawaban yang
                    // bersangkutan, hanya setelah LKPD dikumpulkan ATAU setelah guru menulisnya.
                    const fb = bolehFbBlok ? prog?.feedbackBlok?.[b.id] : undefined;
                    return (
                      <div key={b.id}>
                        <BlokRenderer
                          blok={b}
                          jawaban={prog?.jawaban?.[b.id]}
                          onSimpan={(t) => simpanJawabanLkpd(sub.id, b.id, t)}
                          readOnly={terkunci}
                          bukaKunci={bukaKunci}
                        />
                        {fb && fb.trim() ? (
                          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-ink-soft">
                            💬 <b>Feedback guru:</b> {fb}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Foto jawaban (tulisan tangan / proses pengerjaan) — pratinjau sebelum & sesudah kirim */}
              <div className="card card-pad mt-3.5">
                <p className="text-[14.5px] font-semibold mb-1">📷 Foto jawaban mission ini</p>
                <p className="muted mb-2">
                  {terkunci
                    ? "Foto yang sudah dikirim ikut terkunci bersama jawabanmu."
                    : "Foto tulisan tangan atau proses pengerjaanmu — bisa dilihat guru saat memeriksa LKPD."}
                </p>
                {terkunci ? (
                  (prog?.lampiran?.[m.id]?.length || 0) > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {prog?.lampiran?.[m.id].map((f, i) => (
                        <a key={`${f.url}-${i}`} href={f.url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f.url} alt={f.name || "Foto jawaban"} className="h-20 w-20 rounded-lg border border-line object-cover" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-ink-faint italic">Belum ada foto pada mission ini.</p>
                  )
                ) : (
                  <AnswerUpload
                    attachments={prog?.lampiran?.[m.id] || []}
                    onChange={(files) => simpanLampiranLkpd(sub.id, m.id, files)}
                  />
                )}
              </div>

              {/* Daftar isi mission yang belum terjawab — nilai diambil dari jawaban, bukan tombol */}
              {kurang.length && !terkunci ? (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
                  <p className="font-semibold mb-1">⚠️ Lengkapi dulu bagian ini sebelum menandai selesai:</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {kurang.slice(0, 8).map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                    {kurang.length > 8 ? <li>…dan {kurang.length - 8} bagian lainnya</li> : null}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 mt-5">
                <button
                  className="btn-ghost !text-[13px]"
                  disabled={aman === 0}
                  onClick={() => pilihMission(aman - 1)}
                >← Sebelumnya</button>
                <span className="text-[12.5px] text-ink-faint hidden sm:inline">
                  {terkunci ? "🔒 Terkunci — sudah dikumpulkan" : selesaiSet.has(m.id) ? "Mission ini sudah selesai ✓" : "Selesaikan seluruh isi mission untuk lanjut"}
                </span>
                {terkunci ? (
                  <span className="ml-auto text-[12.5px] text-ink-muted">
                    {aman < missions.length - 1 ? "Lanjut mission →" : "Lihat hasil"}
                  </span>
                ) : (
                  <button className="btn-primary !text-[13px] ml-auto" onClick={tandai}>
                    {aman < missions.length - 1 ? (selesaiSet.has(m.id) ? "Lanjut ke mission berikutnya →" : "Tandai selesai & lanjut →") : "Kumpulkan & akhiri LKPD 🎉"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <Empty title="Belum ada mission" desc={user?.role !== "siswa" ? "Buka \"Kelola mission\" untuk menambahkan mission." : "Submateri ini belum berisi mission."} />
          )}

          {semuaSelesai && !raya ? (
            <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[13.5px] text-green-800">
              ✅ Seluruh mission selesai — nilai <b>{nilaiAkhir ?? "—"}</b>{" "}
              {prog?.verifikasi ? "· sudah diperiksa guru ✓" : "menunggu pemeriksaan guru."}
              {prog?.feedbackGuru ? (
                <span className="mt-2 block rounded-lg border border-green-200 bg-white px-3 py-2 text-[13px] text-ink-soft">
                  💬 <b>Feedback guru:</b> {prog.feedbackGuru}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </Guard>
    </AppShell>
  );
}
