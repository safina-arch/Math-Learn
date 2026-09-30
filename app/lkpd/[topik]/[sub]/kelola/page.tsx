"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty } from "@/components/ui";
import { BlokRenderer, BLOCK_LABEL } from "@/components/lkpd/blocks";
import { BlockEditor } from "@/components/lkpd/block-editor";
import { useStore } from "@/lib/store";
import { missionBaru } from "@/lib/lkpd";
import type { LkpdBlock, LkpdBlockTipe, LkpdMission, LkpdTopic } from "@/lib/types";
import { uid } from "@/lib/utils";

const JENIS_BLOK: LkpdBlockTipe[] = ["teks", "gambar", "video", "animasi", "berkas", "pertanyaan", "aktivitas", "petunjuk", "refleksi"];

function blokBaru(tipe: LkpdBlockTipe): LkpdBlock {
  const b: LkpdBlock = { id: uid("b"), tipe };
  if (tipe === "pertanyaan") b.pertanyaan = { teks: "", opsi: [{ teks: "", benar: true, feedback: "" }, { teks: "", benar: false, feedback: "" }], petunjuk: [] };
  if (tipe === "aktivitas") b.aktivitas = { tipe: "seret-slot", instruksi: "", area: "Area", kartu: [], temuan: "" };
  return b;
}

/** Editor LKPD: kelola mission (default 5 tahap) + content blocks + preview. */
export default function KelolaLkpdPage() {
  const params = useParams<{ topik: string; sub: string }>();
  const router = useRouter();
  const { lkpdTopics, upsertLkpdTopic, ready, user } = useStore();

  const topik = lkpdTopics.find((t) => t.id === params.topik);
  const sub = topik?.subtopics.find((s) => s.id === params.sub);

  const [draft, setDraft] = useState<LkpdTopic | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [addBlok, setAddBlok] = useState(false);
  const [simpan, setSimpan] = useState(false);

  useEffect(() => {
    if (ready && topik && !draft) {
      setDraft(topik);
      setSel(topik.subtopics.find((s) => s.id === params.sub)?.missions[0]?.id || null);
    }
  }, [ready, topik, draft, params.sub]);

  if (!ready) return null;

  const kembali = () => router.push(`/lkpd/${params.topik}/${params.sub}`);
  const subDraft = draft?.subtopics.find((s) => s.id === params.sub);

  if (!topik || !sub || !draft || !subDraft) {
    return (
      <AppShell>
        <Guard allow={["guru", "admin"]}>
          <Empty title="LKPD tidak ditemukan" desc="Submateri mungkin sudah dihapus." action={<Link href="/lkpd" className="btn-ghost">← Kembali ke LKPD</Link>} />
        </Guard>
      </AppShell>
    );
  }

  const missions = subDraft.missions;
  const mission = missions.find((m) => m.id === sel) || null;

  const ubahSub = (fn: (m: LkpdMission[]) => LkpdMission[]) => {
    setDraft((d) => (d ? { ...d, subtopics: d.subtopics.map((s) => (s.id === params.sub ? { ...s, missions: fn(s.missions) } : s)) } : d));
  };
  const ubahMission = (patch: Partial<LkpdMission>) => ubahSub((ms) => ms.map((m) => (m.id === sel ? { ...m, ...patch } : m)));
  const gerakkan = (i: number, delta: number) => ubahSub((ms) => {
    const j = i + delta;
    if (j < 0 || j >= ms.length) return ms;
    const next = [...ms];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  const tambahMission = () => {
    const m = missionBaru(missions.length);
    ubahSub((ms) => [...ms, m]);
    setSel(m.id);
    setPreview(false);
  };
  const hapusMission = (m: LkpdMission) => {
    if (!confirm(`Hapus mission "${m.judul}" beserta seluruh kontennya?`)) return;
    ubahSub((ms) => ms.filter((x) => x.id !== m.id));
    if (sel === m.id) setSel(null);
  };

  const ubahBlok = (bid: string, patch: Partial<LkpdBlock>) => ubahMission({ blok: (mission?.blok || []).map((b) => (b.id === bid ? { ...b, ...patch } : b)) });
  const gerakkanBlok = (i: number, delta: number) => {
    const list = [...(mission?.blok || [])];
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    ubahMission({ blok: list });
  };

  const simpanDraft = () => {
    upsertLkpdTopic(draft);
    setSimpan(true);
    setTimeout(kembali, 450);
  };

  return (
    <AppShell>
      <Guard allow={["guru", "admin"]}>
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-muted">
            <Link href="/lkpd" className="hover:text-primary">LKPD</Link>
            <span>/</span>
            <Link href={`/lkpd/${topik.id}`} className="hover:text-primary">{topik.judul}</Link>
            <span>/</span>
            <Link href={`/lkpd/${topik.id}/${sub.id}`} className="hover:text-primary">{sub.judul}</Link>
            <span>/</span>
            <span className="text-ink font-medium">Kelola</span>
          </div>

          <div className="mt-3 mb-4 flex flex-wrap items-center gap-2">
            <h1 className="h2">🛠️ Kelola LKPD — {sub.judul}</h1>
            <div className="ml-auto flex flex-wrap gap-2">
              <button className={`btn !text-[13px] ${preview ? "bg-ink text-white border border-ink" : "btn-ghost"}`} onClick={() => setPreview((v) => !v)}>
                {preview ? "Kembali ke editor" : "👁 Preview"}
              </button>
              <button className="btn-ghost !text-[13px]" onClick={kembali}>↩ Batal</button>
              <button className="btn-primary !text-[13px]" onClick={simpanDraft}>{simpan ? "Tersimpan ✓" : "💾 Save"}</button>
            </div>
          </div>

          {preview ? (
            <div>
              <div className="rounded-lg border border-ink/15 bg-wash px-3.5 py-2.5 text-[13px] mb-3">
                👁 <b>Mode pratinjau</b> — inilah yang dilihat siswa untuk mission terpilih. Klik “Kembali ke editor” untuk melanjutkan menyunting.
              </div>
              {mission ? (
                <div className="space-y-3.5">
                  <div>
                    <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-faint">Mission {missions.findIndex((m) => m.id === mission.id) + 1}</p>
                    <h2 className="text-[20px] font-bold mt-0.5">{mission.ikon} {mission.judul}</h2>
                    {mission.deskripsi ? <p className="muted mt-1">{mission.deskripsi}</p> : null}
                  </div>
                  {mission.blok.length === 0 ? (
                    <Empty title="Belum ada content block" desc='Klik "+ Add Content" pada mode editor.' />
                  ) : mission.blok.map((b) => <BlokRenderer key={b.id} blok={b} />)}
                </div>
              ) : (
                <Empty title="Pilih mission untuk dipratinjau" />
              )}
            </div>
          ) : (
            <div className="grid lg:grid-cols-[230px_1fr] gap-4 items-start">
              {/* Daftar mission */}
              <div className="card card-pad !p-3 space-y-1.5 lg:sticky lg:top-[76px]">
                <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ink-faint px-1">Mission</p>
                {missions.map((m, i) => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] cursor-pointer border ${sel === m.id ? "border-primary-200 bg-primary-50 text-primary font-semibold" : "border-transparent hover:bg-wash"}`}
                    onClick={() => setSel(m.id)}
                  >
                    <span className="truncate">{m.ikon} {m.judul}</span>
                    <span className="ml-auto text-[11.5px] text-ink-faint shrink-0">{m.blok.length} blok</span>
                    <span className="flex flex-col leading-none text-ink-faint shrink-0">
                      <button className="hover:text-ink" onClick={(e) => { e.stopPropagation(); gerakkan(i, -1); }}>▲</button>
                      <button className="hover:text-ink" onClick={(e) => { e.stopPropagation(); gerakkan(i, 1); }}>▼</button>
                    </span>
                  </div>
                ))}
                <button className="btn-ghost w-full !py-1.5 !text-[12.5px]" onClick={tambahMission}>+ Tambah Mission</button>
                <p className="text-[11.5px] text-ink-faint px-1 pt-1">Default: 5 tahap (Mengamati → … → Mengevaluasi). Mission tambahan boleh ditambahkan sesuai kebutuhan materi.</p>
              </div>

              {/* Editor mission */}
              <div className="space-y-3 min-w-0">
                {!mission ? (
                  <Empty title="Belum ada mission dipilih" desc='Klik "+ Tambah Mission" untuk membuat mission pertama.' />
                ) : (
                  <>
                    <div className="card card-pad space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge tone="purple">Mission {missions.findIndex((m) => m.id === mission.id) + 1}</Badge>
                        <button className="btn-danger !py-1.5 !text-[12.5px] ml-auto" onClick={() => hapusMission(mission)}>Hapus mission</button>
                      </div>
                      <div className="grid sm:grid-cols-[80px_1fr] gap-3">
                        <div>
                          <label className="label">Ikon</label>
                          <input className="input text-center" value={mission.ikon || ""} onChange={(e) => ubahMission({ ikon: e.target.value })} />
                        </div>
                        <div>
                          <label className="label">Judul mission</label>
                          <input className="input" value={mission.judul} onChange={(e) => ubahMission({ judul: e.target.value })} />
                        </div>
                      </div>
                      <div>
                        <label className="label">Instruksi / deskripsi singkat</label>
                        <textarea className="input min-h-[60px]" value={mission.deskripsi || ""} onChange={(e) => ubahMission({ deskripsi: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint">Content blocks (susun seperti building blocks)</p>
                      {mission.blok.length === 0 ? (
                        <Empty title="Belum ada konten" desc='Tambahkan content block pertama dengan tombol "+ Add Content".' />
                      ) : mission.blok.map((b, i) => (
                        <BlockEditor
                          key={b.id}
                          blok={b}
                          canUp={i > 0}
                          canDown={i < mission.blok.length - 1}
                          onUp={() => gerakkanBlok(i, -1)}
                          onDown={() => gerakkanBlok(i, 1)}
                          onDelete={() => { if (confirm("Hapus blok ini?")) ubahMission({ blok: mission.blok.filter((x) => x.id !== b.id) }); }}
                          onChange={(patch) => ubahBlok(b.id, patch)}
                        />
                      ))}
                    </div>

                    <div className="relative">
                      <button className="btn-primary !text-[13px]" onClick={() => setAddBlok((v) => !v)}>+ Add Content</button>
                      {addBlok ? (
                        <div className="absolute z-20 mt-2 w-[260px] card shadow-pop p-1.5 grid grid-cols-1 gap-1">
                          {JENIS_BLOK.map((t) => (
                            <button
                              key={t}
                              className="text-left rounded-lg px-3 py-2 text-[13.5px] hover:bg-wash"
                              onClick={() => {
                                const b = blokBaru(t);
                                ubahMission({ blok: [...(mission?.blok || []), b] });
                                setAddBlok(false);
                                setSel(mission.id);
                              }}
                            >
                              {BLOCK_LABEL[t]}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button className="fixed inset-0 z-10 cursor-default" aria-label="tutup menu" onClick={() => setAddBlok(false)} />
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Guard>
    </AppShell>
  );
}
