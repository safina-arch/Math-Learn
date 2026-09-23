"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { AnswerUpload } from "@/components/answer-upload";
import { Badge, Modal } from "@/components/ui";
import { useStore } from "@/lib/store";
import { heuristicGrade, nowIso, pgCorrect, uid } from "@/lib/utils";

export default function KerjakanTugasPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <Work />
      </Guard>
    </AppShell>
  );
}

function Work() {
  const { id } = useParams() as { id: string };
  const { assignments, addSubmission, addNotification, user, submissions } = useStore();
  const router = useRouter();
  const a = assignments.find((x) => x.id === id);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerAttachments, setAnswerAttachments] = useState<Record<string, import("@/lib/types").MaterialAttachment[]>>({});
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const [result, setResult] = useState<{ nilai: number; pgBenar: number } | null>(null);

  const ordered = useMemo(() => {
    if (!a) return [];
    if (a.acakSoal) return [...a.questions].sort((x, y) => x.id.localeCompare(y.id) !== 0 ? (x.id < y.id ? 1 : -1) : 0);
    return a.questions;
  }, [a]);

  if (!a) return <div className="page-wrap !px-0"><p className="muted">Tugas tidak ditemukan.</p></div>;
  const already = submissions.find((s) => s.assignmentId === a.id && s.siswaId === user?.id);
  const backHref = a.tipe === "lkpd" ? "/lkpd" : "/latihan";

  async function submit() {
    if (!user || busy) return;
    setBusy(true);
    try {
      let pgScore = 0;
      let pgBobot = 0;
      const feedbackAi: Record<string, { skor: number; feedback: string; draft: boolean }> = {};
      for (const q of a!.questions) {
        const ans = answers[q.id] || "";
        if (q.tipe === "pg") {
          pgBobot += q.bobot;
          const ok = pgCorrect(ans, q.kunci);
          if (ok) pgScore += q.bobot;
          feedbackAi[q.id] = { skor: ok ? 100 : 0, feedback: ok ? "Jawaban tepat." : `Kunci yang benar: ${q.kunci}.`, draft: false };
        } else {
          let graded = heuristicGrade(q.teks, ans, q.kunci, q.rubrik, q.bobot);
          try {
            const r = await fetch("/api/ai/grade", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ teks: q.teks, jawaban: ans, kunci: q.kunci, rubrik: q.rubrik }),
            });
            if (r.ok) {
              const j = await r.json();
              if (typeof j.skor === "number") graded = { skor: j.skor, feedback: j.feedback };
            }
          } catch {}
          feedbackAi[q.id] = { ...graded, draft: true };
        }
      }
      let total = pgScore;
      for (const q of a!.questions.filter((q) => q.tipe !== "pg")) {
        total += Math.round(((feedbackAi[q.id]?.skor || 0) / 100) * q.bobot);
      }
      total = Math.min(100, Math.max(0, Math.round(total)));
      addSubmission({
        id: uid("s"),
        assignmentId: a!.id,
        siswaId: user.id,
        siswaNama: user.nama,
        kelas: user.kelas,
        jawaban: answers,
        jawabanLampiran: Object.keys(answerAttachments).length ? answerAttachments : undefined,
        nilai: a!.tipe === "latihan" ? total : null,
        feedbackAi,
        feedbackGuru: "",
        status: a!.tipe === "latihan" ? "dinilai" : "draf-ai",
        submittedAt: nowIso(),
        cheatCount: 0,
      });
      addNotification({ userId: "all-guru", kategori: "kiriman", judul: `${user.nama} mengumpulkan ${a!.judul}`, isi: `Nilai sementara ${total}. Perlu ${a!.tipe === "latihan" ? "verifikasi" : "penilaian"}.` });
      const pgBenar = a!.questions.filter((q) => q.tipe === "pg" && pgCorrect(answers[q.id] || "", q.kunci)).length;
      setResult({ nilai: total, pgBenar });
      void pgBobot;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <Link href={backHref} className="text-[13px] text-ink-muted hover:text-primary">← Semua {a.tipe === "lkpd" ? "LKPD" : "latihan"}</Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone="purple">{a.tipe.toUpperCase()}</Badge>
        <Badge>{a.kelas}</Badge>
        {already ? <Badge tone="green">Sudah dikumpulkan</Badge> : null}
      </div>
      <h1 className="h1 mt-2">{a.judul}</h1>
      <p className="muted mt-1 max-w-[680px]">{a.deskripsi}</p>
      {a.deskripsiGambar?.length ? (
        <div className="flex flex-wrap gap-2 mt-2">
          {a.deskripsiGambar.map((g, i) => (
            <a key={`${g.url}-${i}`} href={g.url} target="_blank" rel="noreferrer">
              <img src={g.url} alt={g.name || "Foto instruksi"} className="max-h-52 rounded-lg border border-line object-contain bg-white" />
            </a>
          ))}
        </div>
      ) : null}

      <div className="mt-5 space-y-3 max-w-[760px]">
        {ordered.map((q, i) => (
          <div key={q.id} className="card card-pad">
            <p className="text-[12.5px] font-medium text-ink-muted">SOAL {i + 1} · {q.tipe.toUpperCase()} · {q.bobot} poin</p>
            <p className="text-[14.5px] font-medium mt-1">{q.teks}</p>
            {q.gambar?.length ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {q.gambar.map((g, gi) => (
                  <a key={`${g.url}-${gi}`} href={g.url} target="_blank" rel="noreferrer">
                    <img src={g.url} alt={g.name || "Foto soal"} className="max-h-52 rounded-lg border border-line object-contain bg-white" />
                  </a>
                ))}
              </div>
            ) : null}
            {q.tipe === "pg" ? (
              <div className="mt-3 space-y-1.5">
                {q.opsi?.map((op) => (
                  <label key={op} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[14px] cursor-pointer transition-colors ${answers[q.id] === op ? "border-primary bg-primary-50/60" : "border-line hover:bg-wash/70"}`}>
                    <input type="radio" name={q.id} className="accent-[#7209B7]" checked={answers[q.id] === op} onChange={() => setAnswers((p) => ({ ...p, [q.id]: op }))} />
                    {op}
                  </label>
                ))}
              </div>
            ) : (
              <textarea className="input mt-3 min-h-[96px]" value={answers[q.id] || ""} onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))} placeholder={q.tipe === "essay" ? "Jelaskan langkah dan alasanmu…" : "Tulis jawaban singkat…"} />
            )}
            <AnswerUpload attachments={answerAttachments[q.id] || []} onChange={(files) => setAnswerAttachments((current) => ({ ...current, [q.id]: files }))} />
          </div>
        ))}
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => setAsk(true)}>{busy ? "Menilai…" : already ? "Kumpulkan ulang" : "Kumpulkan jawaban"}</button>
          <button className="btn-ghost" onClick={() => router.push(backHref)}>Simpan & keluar</button>
        </div>
        <p className="muted">Pilihan ganda dinilai otomatis. Uraian & essay dibantu AI lalu diverifikasi guru.</p>
      </div>

      <Modal open={ask} onClose={() => setAsk(false)} title="Yakin mengumpulkan?">
        <p className="text-[14.5px]">Jawaban akan dikirim ke guru{already ? " — kiriman sebelumnya akan ditimpa" : ""}.</p>
        <p className="muted mt-2">Periksa kembali semua jawaban dan foto sebelum mengirim. Setelah dikumpulkan, jawaban tidak dapat diubah lagi.</p>
        <div className="mt-4 flex gap-2">
          <button
            className="btn-primary flex-1"
            disabled={busy}
            onClick={() => { setAsk(false); void submit(); }}
          >{busy ? "Menilai…" : "Ya, kumpulkan"}</button>
          <button className="btn-ghost" onClick={() => setAsk(false)}>Batal</button>
        </div>
      </Modal>

      <Modal open={!!result} onClose={() => { setResult(null); router.push("/nilai"); }} title="Hasil penilaian sementara">
        <p className="text-[44px] font-bold tracking-tight">{result?.nilai}</p>
        <p className="muted">Pilihan ganda benar {result?.pgBenar} soal. Uraian & essay menunggu verifikasi guru sebelum menjadi nilai final.</p>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={() => router.push("/nilai")}>Lihat nilai</button>
          <button className="btn-ghost" onClick={() => setResult(null)}>Tetap di sini</button>
        </div>
      </Modal>
    </div>
  );
}
