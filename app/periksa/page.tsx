"use client";

import { Fragment, useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, Modal, PageHeader, Stat } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cheatLabel, cheatTone, fmtDateTime, STATUS_TUGAS_META, statusRingkasan, statusTugas, TIPE_LABEL, TIPE_TONE, TIPEURUT } from "@/lib/utils";
import type { AssignmentType } from "@/lib/types";

type FilterTipe = "semua" | AssignmentType;

export default function PeriksaPage() {
  return (
    <AppShell>
      <Guard allow={["guru", "admin"]}>
        <Content />
      </Guard>
    </AppShell>
  );
}

function Content() {
  const { submissions, assignments, users, updateSubmission, addNotification, cheatLogs } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [nilai, setNilai] = useState("");
  const [catatan, setCatatan] = useState("");
  const [aiEdits, setAiEdits] = useState<Record<string, { skor: number; feedback: string }>>({});
  const [cheatSiswa, setCheatSiswa] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTipe>("semua");

  const current = submissions.find((s) => s.id === openId);
  const currentAssign = current ? assignments.find((a) => a.id === current.assignmentId) : null;
  const ringkas = statusRingkasan(assignments, submissions, users);

  // Kiriman terkelompok per jenis tugas (latihan, LKPD, evaluasi), terbaru di tiap kelompok.
  const tipeOf = (sid: string): AssignmentType => assignments.find((x) => x.id === sid)?.tipe || "latihan";
  const urutKiriman = submissions
    .filter((s) => filter === "semua" || tipeOf(s.assignmentId) === filter)
    .slice()
    .sort((a, b) => TIPEURUT[tipeOf(a.assignmentId)] - TIPEURUT[tipeOf(b.assignmentId)] || b.submittedAt.localeCompare(a.submittedAt));
  const hitungTipe = (t: AssignmentType) => submissions.filter((s) => tipeOf(s.assignmentId) === t).length;
  const chips: { key: FilterTipe; label: string }[] = [
    { key: "semua", label: `Semua (${submissions.length})` },
    ...(["latihan", "lkpd", "evaluasi"] as AssignmentType[]).map((t) => ({ key: t, label: `${TIPE_LABEL[t]} (${hitungTipe(t)})` })),
  ];

  // Kelompokkan laporan kecurangan per peserta (foto = menambahkan foto, bukan pelanggaran).
  const cheatBySiswa = new Map<string, { nama: string; logs: typeof cheatLogs }>();
  for (const c of cheatLogs) {
    const g = cheatBySiswa.get(c.siswaId) || { nama: c.siswaNama, logs: [] as typeof cheatLogs };
    g.logs.push(c);
    cheatBySiswa.set(c.siswaId, g);
  }
  const pesertaCheat = Array.from(cheatBySiswa.entries());
  const detailCheat = cheatSiswa ? cheatBySiswa.get(cheatSiswa) : undefined;

  function open(sid: string) {
    const s = submissions.find((x) => x.id === sid);
    if (!s) return;
    setOpenId(sid);
    setNilai(s.nilai != null ? String(s.nilai) : "");
    setCatatan(s.feedbackGuru || "");
    const e: Record<string, { skor: number; feedback: string }> = {};
    Object.entries(s.feedbackAi).forEach(([k, v]) => { e[k] = { skor: v.skor, feedback: v.feedback }; });
    setAiEdits(e);
  }

  function publish() {
    if (!current) return;
    const patchedAi: typeof current.feedbackAi = { ...current.feedbackAi };
    Object.entries(aiEdits).forEach(([k, v]) => {
      // Batas nilai per soal dan nilai akhir: 0–100.
      if (patchedAi[k]) patchedAi[k] = { ...patchedAi[k], skor: Math.min(100, Math.max(0, Math.round(v.skor) || 0)), feedback: v.feedback, draft: false };
    });
    const n = nilai === "" ? current.nilai : Math.min(100, Math.max(0, Math.round(Number(nilai) || 0)));
    updateSubmission(current.id, { nilai: n, feedbackGuru: catatan, feedbackAi: patchedAi, status: "dinilai" });
    addNotification({ userId: current.siswaId, kategori: "nilai", judul: "Hasil evaluasi telah dinilai", isi: `${currentAssign?.judul}: nilai ${n}. ${catatan.slice(0, 100)}` });
    setOpenId(null);
  }

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader
        title="Periksa kiriman"
        desc="Setujui draf AI, sunting umpan balik, atau override nilai sebelum diterbitkan ke siswa."
        right={<a href="/api/export/nilai" className="btn-ghost text-[13px]">Ekspor CSV</a>}
      />
      <div className="grid sm:grid-cols-3 gap-3 mb-3">
        <Stat label="Belum mengerjakan" value={String(ringkas.belum)} sub="siswa × tugas tanpa kiriman" />
        <Stat label="Belum diperiksa" value={String(ringkas.blm)} sub="kiriman menunggu pemeriksaan" />
        <Stat label="Sudah diperiksa" value={String(ringkas.sudah)} sub="nilai sudah diterbitkan" />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {chips.map((c) => (
          <button
            key={c.key}
            className={`btn !py-1.5 !px-3 !text-[12.5px] ${filter === c.key ? "bg-ink text-white border border-ink" : "btn-ghost"}`}
            onClick={() => setFilter(c.key)}
          >{c.label}</button>
        ))}
      </div>
      {submissions.length === 0 ? <Empty title="Belum ada kiriman" desc="Kiriman siswa dari LKPD, latihan, dan evaluasi akan muncul di sini." /> : urutKiriman.length === 0 ? (
        <Empty title="Tidak ada kiriman pada jenis ini" desc="Pilih jenis tugas lain pada filter di atas." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[680px]">
              <thead><tr className="text-left text-[12px] text-ink-muted bg-wash/50"><th className="px-4 py-2.5 font-medium">Siswa</th><th className="px-4 py-2.5 font-medium">Jenis</th><th className="px-4 py-2.5 font-medium">Tugas</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium">Skor</th><th className="px-4 py-2.5 font-medium">Dikumpulkan</th><th className="px-4 py-2.5" /></tr></thead>
              <tbody>
                {(() => {
                  let lastTipe: AssignmentType | null = null;
                  return urutKiriman.map((s) => {
                    const a = assignments.find((x) => x.id === s.assignmentId);
                    const tipe = tipeOf(s.assignmentId);
                    const meta = STATUS_TUGAS_META[statusTugas(s)];
                    const showHead = filter === "semua" && tipe !== lastTipe;
                    lastTipe = tipe;
                    return (
                      <Fragment key={s.id}>
                        {showHead ? (
                          <tr><td colSpan={7} className="px-4 pt-3 pb-1 text-[12px] font-semibold uppercase tracking-wide text-ink-faint bg-wash/40">{TIPE_LABEL[tipe]}</td></tr>
                        ) : null}
                        <tr className="table-row">
                          <td className="px-4 py-2.5"><b>{s.siswaNama}</b><span className="block text-[12px] text-ink-muted">{s.kelas}{s.cheatCount ? ` · ${s.cheatCount}x tab` : ""}</span></td>
                          <td className="px-4 py-2.5"><Badge tone={TIPE_TONE[tipe]}>{TIPE_LABEL[tipe]}</Badge></td>
                          <td className="px-4 py-2.5">{a?.judul || "—"}</td>
                          <td className="px-4 py-2.5"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                          <td className="px-4 py-2.5 font-semibold">{s.nilai ?? "—"}</td>
                          <td className="px-4 py-2.5 text-ink-muted">{fmtDateTime(s.submittedAt)}</td>
                          <td className="px-4 py-2.5 text-right"><button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => open(s.id)}>Periksa</button></td>
                        </tr>
                      </Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card overflow-hidden mt-3">
        <div className="px-4 py-3 border-b border-line">
          <p className="h2">Laporan kecurangan ({cheatLogs.length} kejadian · {pesertaCheat.length} peserta)</p>
          <p className="muted mt-0.5">Klik nama peserta untuk melihat detail: jenis kecurangan, menit kejadian, dan nomor soal terindikasi.</p>
        </div>
        {pesertaCheat.length === 0 ? <p className="muted p-4">Belum ada pelanggaran.</p> : (
          <div className="divide-y divide-line">
            {pesertaCheat.map(([sid, g]) => (
              <div key={sid} className="px-4 py-2.5 flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-wash border border-line flex items-center justify-center text-[12px] font-semibold text-ink-soft shrink-0">{g.nama.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium truncate">{g.nama}</p>
                  <p className="text-[12px] text-ink-muted">{g.logs.length} kejadian tercatat</p>
                </div>
                <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => setCheatSiswa(sid)}>Lihat detail</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!detailCheat} onClose={() => setCheatSiswa(null)} title={`Detail kecurangan — ${detailCheat?.nama || ""}`} wide>
        {detailCheat ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[560px]">
              <thead><tr className="text-left text-[12px] text-ink-muted bg-wash/50"><th className="px-3 py-2.5 font-medium">Jenis</th><th className="px-3 py-2.5 font-medium">Menit kejadian</th><th className="px-3 py-2.5 font-medium">Soal</th><th className="px-3 py-2.5 font-medium">Evaluasi</th><th className="px-3 py-2.5 font-medium">Waktu</th></tr></thead>
              <tbody>
                {detailCheat.logs.map((c) => {
                  const evaluation = assignments.find((a) => a.id === c.evaluationId);
                  return (
                    <tr key={c.id} className="table-row">
                      <td className="px-3 py-2.5"><Badge tone={cheatTone(c.tipe)}>{cheatLabel(c.tipe)}</Badge></td>
                      <td className="px-3 py-2.5 tabular-nums">{c.menit != null ? `Menit ke-${c.menit}` : "—"}</td>
                      <td className="px-3 py-2.5">{c.soal ? `Soal ${c.soal}` : "—"}</td>
                      <td className="px-3 py-2.5">{evaluation?.judul || "Evaluasi"}</td>
                      <td className="px-3 py-2.5 text-ink-muted">{fmtDateTime(c.timestamp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Modal>

      <Modal open={!!current} onClose={() => setOpenId(null)} title={`Periksa — ${current?.siswaNama}`} wide>
        {current && currentAssign ? (
          <div className="space-y-3">
            {currentAssign.questions.map((q, i) => (
              <div key={q.id} className="rounded-xl border border-line p-3.5">
                <p className="text-[12.5px] text-ink-muted font-medium">SOAL {i + 1} · {q.tipe.toUpperCase()} · bobot {q.bobot}</p>
                <p className="text-[14px] font-medium mt-0.5 whitespace-pre-wrap">{q.teks}</p>
                {q.gambar?.length ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {q.gambar.map((g, gi) => (
                      <a key={`${g.url}-${gi}`} href={g.url} target="_blank" rel="noreferrer" title={g.name}>
                        <img src={g.url} alt={g.name || "Foto soal"} className="max-h-44 rounded-lg border border-line object-contain bg-white" />
                      </a>
                    ))}
                  </div>
                ) : null}
                {q.kunci ? <p className="text-[12.5px] text-ink-muted mt-1">Kunci: {q.kunci}{q.rubrik ? ` · Rubrik: ${q.rubrik}` : ""}</p> : null}
                <p className="text-[13.5px] mt-2 bg-wash border border-line rounded-lg px-3 py-2 whitespace-pre-wrap">{current.jawaban[q.id] || "(kosong)"}</p>
                {current.jawabanLampiran?.[q.id]?.length ? (
                  <div className="mt-2">
                    <p className="text-[12px] text-ink-muted mb-1.5">Foto jawaban siswa</p>
                    <div className="flex flex-wrap gap-3">
                      {current.jawabanLampiran[q.id].map((file, index) => {
                        const deg = current.fotoRotasi?.[file.url] ?? 0;
                        const rotate = (next: number) => {
                          if (!current) return;
                          updateSubmission(current.id, {
                            fotoRotasi: { ...(current.fotoRotasi || {}), [file.url]: ((next % 360) + 360) % 360 },
                          });
                        };
                        return (
                          <div key={`${file.url}-${index}`} className="w-24">
                            <a href={file.url} target="_blank" rel="noreferrer" title={`${file.name} — klik untuk membuka ukuran penuh`} className="block">
                              <img
                                src={file.url}
                                alt={file.name || "Foto jawaban siswa"}
                                className="h-24 w-24 rounded-lg border border-line bg-white object-contain transition-transform"
                                style={{ transform: `rotate(${deg}deg)` }}
                              />
                            </a>
                            <div className="flex justify-center gap-1 mt-1">
                              <button type="button" aria-label="Putar kiri" title="Putar kiri" className="h-6 w-6 rounded border border-line bg-white text-[13px] text-ink-muted hover:border-primary-300 hover:text-primary" onClick={() => rotate(deg - 90)}>⟲</button>
                              <button type="button" aria-label="Putar kanan" title="Putar kanan" className="h-6 w-6 rounded border border-line bg-white text-[13px] text-ink-muted hover:border-primary-300 hover:text-primary" onClick={() => rotate(deg + 90)}>⟳</button>
                              <span className="h-6 px-1.5 inline-flex items-center text-[11px] text-ink-faint tabular-nums">{((deg % 360) + 360) % 360}°</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div className="grid sm:grid-cols-[100px_1fr] gap-2 mt-2">
                  <div>
                    <div className="flex items-center justify-between"><label className="label">Persentase AI</label><span className="text-[12px] font-semibold text-primary">{aiEdits[q.id]?.skor ?? 0}%</span></div>
                    <input type="number" min={0} max={100} className="input" value={aiEdits[q.id]?.skor ?? 0} onChange={(e) => setAiEdits((p) => ({ ...p, [q.id]: { skor: Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0))), feedback: p[q.id]?.feedback || "" } }))} />
                    <div className="h-1.5 rounded-full bg-wash mt-1.5 overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, aiEdits[q.id]?.skor ?? 0))}%` }} /></div>
                  </div>
                  <div><label className="label">Draf umpan balik (sunting bila perlu)</label><input className="input" value={aiEdits[q.id]?.feedback || ""} onChange={(e) => setAiEdits((p) => ({ ...p, [q.id]: { skor: p[q.id]?.skor || 0, feedback: e.target.value } }))} /></div>
                </div>
              </div>
            ))}
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Nilai akhir (override · maks. 100)</label><input type="number" min={0} max={100} className="input" value={nilai} onChange={(e) => setNilai(e.target.value === "" ? "" : String(Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0)))))} placeholder="0–100" /></div>
              <div><label className="label">Umpan balik akhir untuk siswa</label><input className="input" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="1–2 kalimat apresiasi + saran" /></div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={publish}>Setujui & terbitkan</button>
              <button className="btn-ghost" onClick={() => setOpenId(null)}>Batal</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
