"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { AnswerUpload } from "@/components/answer-upload";
import { Badge, Modal } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtCountdown, heuristicGrade, nowIso, pgCorrect, uid } from "@/lib/utils";

export default function ExamPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <Exam />
      </Guard>
    </AppShell>
  );
}

function Exam() {
  const { id } = useParams() as { id: string };
  const { assignments, addSubmission, addNotification, addCheatLog, user } = useStore();
  const router = useRouter();
  const a = assignments.find((x) => x.id === id);

  const duration = (a?.durasiMenit || 45) * 60;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answerAttachments, setAnswerAttachments] = useState<Record<string, import("@/lib/types").MaterialAttachment[]>>({});
  const [left, setLeft] = useState(duration);
  const [started, setStarted] = useState(false);
  const [warn, setWarn] = useState<null | { count: number }>(null);
  const [done, setDone] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(1);
  const cheatRef = useRef(0);
  const lastCheatAt = useRef(0);
  const doneRef = useRef(false);

  const ordered = useMemo(() => {
    if (!a) return [];
    const qs = [...a.questions];
    if (a.acakSoal) {
      const seed = user?.id || "x";
      let h = 0;
      for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 997;
      return qs.sort((p, q) => ((p.id.charCodeAt(1) * (h + 3)) % 7) - ((q.id.charCodeAt(1) * (h + 3)) % 7));
    }
    return qs;
  }, [a, user?.id]);

  const submit = useCallback(async () => {
    if (!a || !user || doneRef.current || busy) return;
    doneRef.current = true;
    setBusy(true);
    try {
      let total = 0;
      const feedbackAi: Record<string, { skor: number; feedback: string; draft: boolean }> = {};
      for (const q of a.questions) {
        const ans = answers[q.id] || "";
        if (q.tipe === "pg") {
          const ok = pgCorrect(ans, q.kunci);
          if (ok) total += q.bobot;
          feedbackAi[q.id] = { skor: ok ? 100 : 0, feedback: ok ? "Jawaban tepat." : `Kunci: ${q.kunci}.`, draft: false };
        } else {
          let g = heuristicGrade(q.teks, ans, q.kunci, q.rubrik, q.bobot);
          try {
            const r = await fetch("/api/ai/grade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teks: q.teks, jawaban: ans, kunci: q.kunci, rubrik: q.rubrik }) });
            if (r.ok) {
              const j = await r.json();
              if (typeof j.skor === "number") g = { skor: j.skor, feedback: j.feedback };
            }
          } catch {}
          feedbackAi[q.id] = { ...g, draft: true };
          total += Math.round((g.skor / 100) * q.bobot);
        }
      }
      total = Math.min(100, Math.max(0, Math.round(total)));
      addSubmission({
        id: uid("s"), assignmentId: a.id, siswaId: user.id, siswaNama: user.nama, kelas: user.kelas,
        jawaban: answers, jawabanLampiran: Object.keys(answerAttachments).length ? answerAttachments : undefined, nilai: null, feedbackAi, feedbackGuru: "", status: "draf-ai",
        submittedAt: nowIso(), cheatCount: cheatRef.current,
      });
      addNotification({ userId: "all-guru", kategori: "evaluasi", judul: `${user.nama} menyelesaikan ${a.judul}`, isi: `Skor sementara ${total}${cheatRef.current ? ` · ${cheatRef.current}x pindah tab` : ""}.` });
      if (cheatRef.current > 0) {
        addNotification({ userId: "all-guru", kategori: "kecurangan", judul: `Laporan kecurangan: ${user.nama}`, isi: `${cheatRef.current} pelanggaran pindah tab pada ${a.judul}.` });
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }, [a, answers, user, busy, addSubmission, addNotification, addCheatLog]);

  useEffect(() => {
    if (!started || done !== null) return;
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(t);
          submit();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, done, submit]);

  useEffect(() => {
    if (!started || !a?.kunciTab || done !== null) return;
    const evaluationId = a.id;
    function registerCheat(tipe: "blur" | "visibility") {
      if (doneRef.current || !user) return;
      const now = Date.now();
      // Browser biasanya memicu blur dan visibilitychange untuk satu perpindahan tab.
      if (now - lastCheatAt.current < 1000) return;
      lastCheatAt.current = now;
      cheatRef.current += 1;
      addCheatLog({ evaluationId, siswaId: user.id, siswaNama: user.nama, tipe, soal: activeQuestion });
      void fetch("/api/cheat-log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evaluationId, siswaId: user.id, siswaNama: user.nama, tipe, count: cheatRef.current, soal: activeQuestion }) });
      setWarn({ count: cheatRef.current });
    }
    const onHide = () => { if (document.hidden) registerCheat("visibility"); };
    const onBlur = () => registerCheat("blur");
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("blur", onBlur);
    };
  }, [started, a, done, addCheatLog, user, activeQuestion]);

  if (!a) return <div className="page-wrap !px-0"><p className="muted">Evaluasi tidak ditemukan.</p></div>;

  if (!started) {
    return (
      <div className="page-wrap !px-0 !pb-0 !max-w-none">
        <Link href="/evaluasi" className="text-[13px] text-ink-muted hover:text-primary">← Semua evaluasi</Link>
        <div className="card card-pad sm:p-7 mt-3 max-w-[680px]">
          <Badge tone="red">EVALUASI · {a.durasiMenit} MENIT</Badge>
          <h1 className="h1 mt-2">{a.judul}</h1>
          <p className="muted mt-1.5">{a.deskripsi}</p>
          <ul className="text-[13.5px] text-ink-soft list-disc pl-5 mt-3 space-y-1">
            <li>{a.questions.length} soal · penguncian tab aktif.</li>
            <li>Waktu habis = otomatis terkumpul.</li>
            <li>Pindah tab tercatat dan dilaporkan ke guru.</li>
          </ul>
          <div className="mt-5 flex gap-2">
            <button className="btn-primary !px-5" onClick={() => { setLeft((a.durasiMenit || 45) * 60); setStarted(true); }}>Mulai kerjakan</button>
            <Link href="/evaluasi" className="btn-ghost">Nanti saja</Link>
          </div>
        </div>
      </div>
    );
  }

  const danger = left < 300;

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <div className="sticky top-[56px] z-30 -mx-4 px-4 sm:mx-0 sm:px-0 sm:static">
        <div className={`card card-pad !py-3 flex items-center gap-3 ${danger ? "!border-red-300 !bg-red-50/70" : ""}`}>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold truncate">{a.judul}</p>
            <p className="text-[12px] text-ink-muted">Pelanggaran pindah tab: <b className={cheatRef.current ? "text-red-600" : ""}>{warn?.count ?? 0}x</b></p>
          </div>
          <span className={`font-mono font-bold text-[20px] tabular-nums ${danger ? "text-red-600" : "text-ink"}`}>{fmtCountdown(left)}</span>
          <button className="btn-primary !py-2 text-[13px]" disabled={busy} onClick={submit}>{busy ? "Mengumpulkan…" : "Kumpulkan"}</button>
        </div>
      </div>

      <div className="mt-4 space-y-3 max-w-[760px]">
        {ordered.map((q, i) => (
          <div key={q.id} className="card card-pad" onFocusCapture={() => setActiveQuestion(i + 1)}>
            <p className="text-[12.5px] font-medium text-ink-muted">SOAL {i + 1} · {q.tipe.toUpperCase()} · {q.bobot} poin</p>
            <p className="text-[14.5px] font-medium mt-1">{q.teks}</p>
            {q.tipe === "pg" ? (
              <div className="mt-3 space-y-1.5">
                {q.opsi?.map((op) => (
                  <label key={op} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[14px] cursor-pointer ${answers[q.id] === op ? "border-primary bg-primary-50/60" : "border-line hover:bg-wash/70"}`}>
                    <input type="radio" name={`ex-${q.id}`} className="accent-[#7209B7]" checked={answers[q.id] === op} onChange={() => setAnswers((p) => ({ ...p, [q.id]: op }))} />
                    {op}
                  </label>
                ))}
              </div>
            ) : (
              <textarea className="input mt-3 min-h-[110px]" value={answers[q.id] || ""} onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))} placeholder="Tulis jawabanmu di sini…" />
            )}
            <AnswerUpload attachments={answerAttachments[q.id] || []} onChange={(files) => setAnswerAttachments((current) => ({ ...current, [q.id]: files }))} />
          </div>
        ))}
      </div>

      <Modal open={!!warn && done === null} onClose={() => setWarn(null)} title="Peringatan sistem">
        <p className="text-[14px]">Kamu terdeteksi <b>meninggalkan tab ujian</b> ({warn?.count}x). Kejadian ini sudah dicatat beserta waktunya dan dilaporkan ke guru.</p>
        <p className="muted mt-2">Tetap di tab ini sampai menekan Kumpulkan. Pelanggaran berulang dapat memengaruhi penilaian.</p>
        <button className="btn-primary mt-4 w-full" onClick={() => setWarn(null)}>Saya mengerti, kembali mengerjakan</button>
      </Modal>

      <Modal open={done !== null} onClose={() => router.push("/nilai")} title="Ujian terkumpul">
        <p className="text-[18px] font-semibold">Jawaban berhasil dikumpulkan.</p>
        <p className="muted mt-1">Nilai akan diumumkan setelah guru selesai memeriksa jawaban{cheatRef.current ? ` · ${cheatRef.current} catatan perpindahan laman diteruskan ke guru` : ""}.</p>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary" onClick={() => router.push("/nilai")}>Lihat nilai</button>
          <button className="btn-ghost" onClick={() => router.push("/evaluasi")}>Kembali</button>
        </div>
      </Modal>
    </div>
  );
}
