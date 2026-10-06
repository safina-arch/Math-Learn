"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { AnswerUpload } from "@/components/answer-upload";
import { Badge, Modal } from "@/components/ui";
import { PengawasKecurangan } from "@/components/pengawas-kecurangan";
import { useStore } from "@/lib/store";
import { heuristicGrade, nowIso, pgCorrect, statusTugas, STATUS_TUGAS_META, uid } from "@/lib/utils";

/** Draf "Simpan & keluar" per tugas + siswa — bertahan walau tab ditutup. */
function draftKey(aId: string, userId: string) {
  return `mathlearn-draft:${aId}:${userId}`;
}

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
  const [draftRestored, setDraftRestored] = useState(false);
  const loadedDraft = useRef(false);
  const hydrated = useRef(false);
  /** Pengawas kecurangan latihan: 1 keluar/pindah tab = 1 hitungan + peringatan real-time. */
  const cheatRef = useRef(0);
  const mulaiRef = useRef(Date.now());
  const refreshRef = useRef(false);
  const selesaiRef = useRef(false);
  /** Saat dialog foto terbuka browser kehilangan fokus — bukan pelanggaran. */
  const photoGrace = useRef(0);
  const [cheatTampil, setCheatTampil] = useState(0);

  // Pulihkan jawaban saat halaman dibuka: kiriman yang sudah ada menang (sekali kerja),
  // baru draf "Simpan & keluar" bila belum pernah mengumpulkan.
  useEffect(() => {
    if (!a || !user || loadedDraft.current) return;
    loadedDraft.current = true;
    try {
      const sub = submissions.find((s) => s.assignmentId === a.id && s.siswaId === user.id);
      if (sub) {
        setAnswers(sub.jawaban || {});
        if (sub.jawabanLampiran && Object.keys(sub.jawabanLampiran).length) setAnswerAttachments(sub.jawabanLampiran);
        return;
      }
      const raw = localStorage.getItem(draftKey(a.id, user.id));
      if (raw) {
        const d = JSON.parse(raw) as { answers?: Record<string, string>; attachments?: Record<string, import("@/lib/types").MaterialAttachment[]> };
        if (d.answers && Object.keys(d.answers).length) setAnswers(d.answers);
        if (d.attachments && Object.keys(d.attachments).length) setAnswerAttachments(d.attachments);
        if (d.answers || d.attachments) setDraftRestored(true);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a?.id, user?.id]);

  // Simpan draf otomatis setiap ada perubahan (lewati render pertama sebelum draf dipulihkan).
  // Kiriman yang sudah dikumpulkan TIDAK ditulis ulang ke draf — sekali kerja.
  useEffect(() => {
    if (!a || !user || !loadedDraft.current) return;
    if (already) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    try {
      localStorage.setItem(draftKey(a.id, user.id), JSON.stringify({ answers, attachments: answerAttachments }));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, answerAttachments]);

  const ordered = useMemo(() => {
    if (!a) return [];
    if (a.acakSoal) return [...a.questions].sort((x, y) => x.id.localeCompare(y.id) !== 0 ? (x.id < y.id ? 1 : -1) : 0);
    return a.questions;
  }, [a]);

  if (!a) return <div className="page-wrap !px-0"><p className="muted">Tugas tidak ditemukan.</p></div>;
  const already = submissions.find((s) => s.assignmentId === a.id && s.siswaId === user?.id);
  /** Sekali kerja: setelah dikumpulkan soal & jawaban terkunci (draf tidak bisa diulang). */
  const terkunci = Boolean(already);
  // Pengawas berhenti menghitung begitu kiriman ada (pengerjaan selesai).
  selesaiRef.current = terkunci;
  const stTugas = statusTugas(already);
  const backHref = a.tipe === "lkpd" ? "/lkpd" : "/latihan";

  async function submit() {
    if (!user || busy) return;
    if (already) return; // sekali kerja: kiriman sudah ada, tidak boleh ditimpa
    setBusy(true);
    try {
      let pgScore = 0;
      let pgBobot = 0;
      let totalBobot = 0;
      const feedbackAi: Record<string, { skor: number; feedback: string; draft: boolean }> = {};
      for (const q of a!.questions) {
        totalBobot += q.bobot;
        const ans = answers[q.id] || "";
        if (q.tipe === "pg") {
          pgBobot += q.bobot;
          const ok = pgCorrect(ans, q.kunci);
          if (ok) pgScore += q.bobot;
          // Kunci TIDAK ditampilkan ke siswa di sini — hanya guru yang melihatnya saat memeriksa.
          feedbackAi[q.id] = {
            skor: ok ? 100 : 0,
            feedback: ok ? "Jawaban tepat." : "Belum tepat — jawabanmu disimpan dan menunggu pemeriksaan guru.",
            draft: false,
          };
        } else {
          // Uraian/essay: TIDAK dianggap benar oleh sistem. Saran AI/heuristic hanya draf
          // untuk guru — nilai akhir ditentukan setelah guru memeriksa.
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
      // Nilai sementara: hanya dari poin yang benar-benar dinilai sistem (PG).
      // Bobot uraian/essay sementara 0 — bertambah saat guru memberi nilai.
      const total = totalBobot > 0 ? Math.min(100, Math.max(0, Math.round((pgScore / totalBobot) * 100))) : 0;
      const adaTerbuka = a!.questions.some((q) => q.tipe !== "pg");
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
        // Belum diperiksa sampai guru menerbitkan nilai di menu Periksa.
        status: a!.tipe === "latihan" ? "menunggu" : "draf-ai",
        submittedAt: nowIso(),
        // Jumlah pelanggaran pindah tab selama pengerjaan (lihat PengawasKecurangan).
        cheatCount: cheatRef.current,
      });
      addNotification({
        userId: "all-guru",
        kategori: "kiriman",
        judul: `${user.nama} mengumpulkan ${a!.judul}`,
        isi: `Nilai sementara ${total}${adaTerbuka ? " (sebagian soal menunggu pemeriksaan)" : ""}. Perlu pemeriksaan guru.`,
      });
      if (cheatRef.current > 0) {
        addNotification({
          userId: "all-guru",
          kategori: "kecurangan",
          judul: `Laporan kecurangan: ${user.nama}`,
          isi: `${cheatRef.current} kali keluar/pindah tab saat mengerjakan ${a!.judul}.`,
        });
      }
      try { localStorage.removeItem(draftKey(a!.id, user.id)); } catch {}
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
        {already ? <Badge tone={stTugas === "sudah" ? "green" : "amber"}>{already.nilai != null ? `Nilai sementara ${already.nilai} · ` : ""}{STATUS_TUGAS_META[stTugas].label}</Badge> : null}
        {draftRestored && !already ? <Badge tone="blue">Draf dipulihkan</Badge> : null}
        {cheatTampil > 0 ? <Badge tone="red">{cheatTampil}× pindah tab tercatat</Badge> : null}
      </div>
      <h1 className="h1 mt-2">{a.judul}</h1>
      <p className="muted mt-1 max-w-[680px] whitespace-pre-wrap">{a.deskripsi}</p>
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
            <p className="text-[14.5px] font-medium mt-1 whitespace-pre-wrap">{q.teks}</p>
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
                  <label key={op} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[14px] transition-colors ${terkunci ? "cursor-default" : "cursor-pointer"} ${answers[q.id] === op ? "border-primary bg-primary-50/60" : "border-line hover:bg-wash/70"}`}>
                    <input type="radio" name={q.id} className="accent-[#7209B7]" checked={answers[q.id] === op} disabled={terkunci} onChange={() => setAnswers((p) => ({ ...p, [q.id]: op }))} />
                    {op}
                  </label>
                ))}
              </div>
            ) : (
              <textarea className="input mt-3 min-h-[96px]" readOnly={terkunci} value={answers[q.id] || ""} onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))} placeholder={q.tipe === "essay" ? "Jelaskan langkah dan alasanmu…" : "Tulis jawaban singkat…"} />
            )}
            {terkunci ? (
              (answerAttachments[q.id]?.length || 0) > 0 ? (
                <div className="flex flex-wrap gap-2 mt-3">
                  {answerAttachments[q.id].map((f, fi) => (
                    <a key={`${f.url}-${fi}`} href={f.url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt={f.name || "Foto jawaban"} className="h-20 w-20 rounded-lg border border-line object-cover bg-white" />
                    </a>
                  ))}
                </div>
              ) : null
            ) : (
              <AnswerUpload attachments={answerAttachments[q.id] || []} onActivity={() => { photoGrace.current = Date.now() + 15000; }} onChange={(files) => setAnswerAttachments((current) => ({ ...current, [q.id]: files }))} />
            )}
          </div>
        ))}
        {terkunci ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-[13.5px] font-semibold text-amber-900">🔒 Sudah dikumpulkan — tugas ini hanya bisa dikerjakan satu kali.</p>
            <p className="text-[13px] text-amber-800 mt-1">
              Jawabanmu tersimpan dan menunggu pemeriksaan guru. Refresh halaman, logout, atau login ulang tidak membuat
              tugas bisa dikerjakan ulang.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/nilai" className="btn-primary !py-2 !text-[13px]">Lihat nilai &amp; status</Link>
              <Link href={backHref} className="btn-ghost !py-2 !text-[13px]">Kembali ke daftar</Link>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button className="btn-primary" disabled={busy} onClick={() => setAsk(true)}>{busy ? "Menilai…" : "Kumpulkan jawaban"}</button>
            <button
              className="btn-ghost"
              onClick={() => {
                try {
                  if (user) localStorage.setItem(draftKey(a.id, user.id), JSON.stringify({ answers, attachments: answerAttachments }));
                } catch {}
                router.push(backHref);
              }}
            >Simpan & keluar</button>
          </div>
        )}
        <p className="muted">
          Pilihan ganda dinilai otomatis dan nilainya tampil sebagai <b>nilai sementara</b>. Uraian &amp; essay{" "}
          <b>tidak dianggap benar oleh sistem</b> — penilaian akhir setelah guru memeriksa. Jawabanmu tersimpan otomatis
          sebagai draf sampai dikumpulkan.
        </p>
      </div>

      <Modal open={ask} onClose={() => setAsk(false)} title="Yakin mengumpulkan?">
        <p className="text-[14.5px]">Jawaban akan dikirim ke guru.</p>
        <p className="muted mt-2">Periksa kembali semua jawaban dan foto sebelum mengirim. Setelah dikumpulkan, tugas tidak dapat dikerjakan ulang dan jawaban tidak dapat diubah lagi.</p>
        <div className="mt-4 flex gap-2">
          <button
            className="btn-primary flex-1"
            disabled={busy}
            onClick={() => { setAsk(false); void submit(); }}
          >{busy ? "Menilai…" : "Ya, kumpulkan"}</button>
          <button className="btn-ghost" onClick={() => setAsk(false)}>Batal</button>
        </div>
      </Modal>

      <Modal open={!!result} onClose={() => { setResult(null); router.push("/nilai"); }} title="🎉 Jawaban berhasil dikirim">
        <div className="text-center py-1">
          <p className="text-[44px] font-bold tracking-tight">{result?.nilai}</p>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-faint -mt-2">Nilai sementara</p>
          <p className="muted mt-2">Pilihan ganda benar {result?.pgBenar} soal{a.tipe !== "latihan" ? ". Uraian & essay belum dinilai sistem" : ""}.</p>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
          <p className="text-[15px] font-semibold text-amber-900">⏳ Menunggu pemeriksaan guru</p>
          <p className="text-[13px] text-amber-800 mt-1">
            Status kirimanmu: <b>Belum diperiksa</b> — nilai akhir &amp; feedback muncul setelah guru memeriksa jawabanmu.
          </p>
          <p className="text-[12.5px] text-amber-800 mt-1">Tugas ini sekali kerja — jawaban tidak bisa diubah lagi.</p>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="btn-primary flex-1" onClick={() => router.push("/nilai")}>Lihat nilai & status</button>
          <button className="btn-ghost" onClick={() => setResult(null)}>Tetap di sini</button>
        </div>
      </Modal>

      {/* Pengawas latihan: 1 keluar/pindah tab = 1 hitungan, peringatan tampil langsung. */}
      <PengawasKecurangan
        aktif={!terkunci}
        evaluationId={a.id}
        jenis="latihan"
        countRef={cheatRef}
        mulaiRef={mulaiRef}
        graceRef={photoGrace}
        selesaiRef={selesaiRef}
        refreshRef={refreshRef}
        onCount={setCheatTampil}
      />
    </div>
  );
}
