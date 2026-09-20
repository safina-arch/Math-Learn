"use client";

import { useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, Modal, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDateTime } from "@/lib/utils";

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
  const { submissions, assignments, updateSubmission, addNotification, cheatLogs } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [nilai, setNilai] = useState("");
  const [catatan, setCatatan] = useState("");
  const [aiEdits, setAiEdits] = useState<Record<string, { skor: number; feedback: string }>>({});

  const current = submissions.find((s) => s.id === openId);
  const currentAssign = current ? assignments.find((a) => a.id === current.assignmentId) : null;

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
      if (patchedAi[k]) patchedAi[k] = { ...patchedAi[k], skor: v.skor, feedback: v.feedback, draft: false };
    });
    const n = nilai === "" ? current.nilai : Math.min(100, Math.max(0, Number(nilai) || 0));
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
      {submissions.length === 0 ? <Empty title="Belum ada kiriman" desc="Kiriman siswa dari LKPD, latihan, dan evaluasi akan muncul di sini." /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[640px]">
              <thead><tr className="text-left text-[12px] text-ink-muted"><th className="px-4 py-2.5 font-medium">Siswa</th><th className="px-4 py-2.5 font-medium">Tugas</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium">Skor</th><th className="px-4 py-2.5 font-medium">Dikumpulkan</th><th className="px-4 py-2.5" /></tr></thead>
              <tbody>
                {submissions.map((s) => {
                  const a = assignments.find((x) => x.id === s.assignmentId);
                  return (
                    <tr key={s.id} className="table-row">
                      <td className="px-4 py-2.5"><b>{s.siswaNama}</b><span className="block text-[12px] text-ink-muted">{s.kelas}{s.cheatCount ? ` · ${s.cheatCount}x tab` : ""}</span></td>
                      <td className="px-4 py-2.5">{a?.judul}</td>
                      <td className="px-4 py-2.5"><Badge tone={s.status === "dinilai" ? "green" : s.status === "draf-ai" ? "purple" : "amber"}>{s.status}</Badge></td>
                      <td className="px-4 py-2.5 font-semibold">{s.nilai ?? "—"}</td>
                      <td className="px-4 py-2.5 text-ink-muted">{fmtDateTime(s.submittedAt)}</td>
                      <td className="px-4 py-2.5 text-right"><button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => open(s.id)}>Periksa</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card overflow-hidden mt-3">
        <div className="px-4 py-3 border-b border-line">
          <p className="h2">Laporan kecurangan ({cheatLogs.length})</p>
          <p className="muted mt-0.5">Setiap perpindahan laman dihitung satu kali dan dikaitkan dengan soal yang sedang aktif.</p>
        </div>
        {cheatLogs.length === 0 ? <p className="muted p-4">Belum ada pelanggaran.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[620px]">
              <thead><tr className="text-left text-[12px] text-ink-muted bg-wash/50"><th className="px-4 py-2.5 font-medium">Siswa</th><th className="px-4 py-2.5 font-medium">Evaluasi</th><th className="px-4 py-2.5 font-medium">Soal</th><th className="px-4 py-2.5 font-medium">Jenis</th><th className="px-4 py-2.5 font-medium">Waktu</th></tr></thead>
              <tbody>
                {cheatLogs.slice(0, 50).map((c) => {
                  const evaluation = assignments.find((a) => a.id === c.evaluationId);
                  return <tr key={c.id} className="table-row"><td className="px-4 py-2.5 font-medium">{c.siswaNama}</td><td className="px-4 py-2.5">{evaluation?.judul || "Evaluasi"}</td><td className="px-4 py-2.5">{c.soal ? `Soal ${c.soal}` : "Tidak diketahui"}</td><td className="px-4 py-2.5"><Badge tone="red">{c.tipe === "visibility" ? "Pindah laman" : "Keluar fokus"}</Badge></td><td className="px-4 py-2.5 text-ink-muted">{fmtDateTime(c.timestamp)}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!current} onClose={() => setOpenId(null)} title={`Periksa — ${current?.siswaNama}`} wide>
        {current && currentAssign ? (
          <div className="space-y-3">
            {currentAssign.questions.map((q, i) => (
              <div key={q.id} className="rounded-xl border border-line p-3.5">
                <p className="text-[12.5px] text-ink-muted font-medium">SOAL {i + 1} · {q.tipe.toUpperCase()} · bobot {q.bobot}</p>
                <p className="text-[14px] font-medium mt-0.5">{q.teks}</p>
                {q.kunci ? <p className="text-[12.5px] text-ink-muted mt-1">Kunci: {q.kunci}{q.rubrik ? ` · Rubrik: ${q.rubrik}` : ""}</p> : null}
                <p className="text-[13.5px] mt-2 bg-wash border border-line rounded-lg px-3 py-2 whitespace-pre-wrap">{current.jawaban[q.id] || "(kosong)"}</p>
                {current.jawabanLampiran?.[q.id]?.length ? (
                  <div className="mt-2">
                    <p className="text-[12px] text-ink-muted mb-1.5">Foto jawaban siswa</p>
                    <div className="flex flex-wrap gap-2">
                      {current.jawabanLampiran[q.id].map((file, index) => (
                        <a key={`${file.url}-${index}`} href={file.url} target="_blank" rel="noreferrer" title={file.name}>
                          <img src={file.url} alt={file.name || "Foto jawaban siswa"} className="h-20 w-20 rounded-lg border border-line object-cover hover:border-primary-300" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="grid sm:grid-cols-[100px_1fr] gap-2 mt-2">
                  <div>
                    <div className="flex items-center justify-between"><label className="label">Persentase AI</label><span className="text-[12px] font-semibold text-primary">{aiEdits[q.id]?.skor ?? 0}%</span></div>
                    <input type="number" min={0} max={100} className="input" value={aiEdits[q.id]?.skor ?? 0} onChange={(e) => setAiEdits((p) => ({ ...p, [q.id]: { skor: Number(e.target.value), feedback: p[q.id]?.feedback || "" } }))} />
                    <div className="h-1.5 rounded-full bg-wash mt-1.5 overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, aiEdits[q.id]?.skor ?? 0))}%` }} /></div>
                  </div>
                  <div><label className="label">Draf umpan balik (sunting bila perlu)</label><input className="input" value={aiEdits[q.id]?.feedback || ""} onChange={(e) => setAiEdits((p) => ({ ...p, [q.id]: { skor: p[q.id]?.skor || 0, feedback: e.target.value } }))} /></div>
                </div>
              </div>
            ))}
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Nilai akhir (override)</label><input type="number" min={0} max={100} className="input" value={nilai} onChange={(e) => setNilai(e.target.value)} placeholder="0–100" /></div>
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
