export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function fmtCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function normalize(s: string): string {
  return (s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function pgCorrect(answer: string, kunci: string | undefined): boolean {
  return normalize(answer) === normalize(kunci || "");
}

/** Fallback AI heuristic: nilai 0-100 per soal + feedback 1-2 kalimat. */
export function heuristicGrade(
  teks: string,
  jawaban: string,
  kunci: string | undefined,
  rubrik: string | undefined,
  bobot: number
): { skor: number; feedback: string } {
  const a = normalize(jawaban);
  const k = normalize(kunci || "");
  if (!a) return { skor: 0, feedback: "Jawaban masih kosong. Coba tulis langkah pengerjaanmu walau belum yakin." };
  if (k && a === k) return { skor: 100, feedback: "Tepat dan sesuai kunci. Pertahankan cara pengerjaanmu yang rapi." };
  const keyTokens = new Set(k.split(/[^a-z0-9]+/).filter((t) => t.length > 1));
  const ansTokens = new Set(a.split(/[^a-z0-9]+/).filter((t) => t.length > 1));
  let hit = 0;
  keyTokens.forEach((t) => {
    if (ansTokens.has(t)) hit += 1;
  });
  const recall = keyTokens.size ? hit / keyTokens.size : 0;
  const lengthBonus = Math.min(1, a.length / 60) * 0.15;
  const raw = Math.round(Math.min(95, recall * 90 + lengthBonus * 100));
  const skor = Math.max(10, raw);
  const fb =
    skor >= 75
      ? "Sudah mendekati kunci. Periksa kembali hitungan akhirmu agar sempurna."
      : skor >= 45
        ? "Ada bagian yang benar. Lengkapi langkah dan samakan dengan rubrik yang diminta."
        : `Belum sesuai ${rubrik ? "rubrik" : "kunci"}. Tulis ulang langkah dari awal dan periksa tiap operasi.`;
  void teks;
  void bobot;
  return { skor, feedback: fb };
}

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
