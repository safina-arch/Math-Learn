import { NextResponse } from "next/server";
import { heuristicGrade } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Urutan model Gemini yang dicoba bila env GEMINI_MODEL tidak diisi. */
const MODEL_BAWAAN = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
/** Batas waktu tiap percobaan (ms) supaya tidak menggantung saat API lambat/ramai. */
const WAKTU_HABIS_MS = 12000;

/** Daftar model dari env GEMINI_MODEL (dipisah koma), fallback ke daftar bawaan. */
function daftarModel(): string[] {
  const dariEnv = (process.env.GEMINI_MODEL || "")
    .split(",")
    .map((m) => m.trim().replace(/^models\//, ""))
    .filter(Boolean);
  return dariEnv.length ? dariEnv : MODEL_BAWAAN;
}

/**
 * Ambil objek JSON pertama dari balasan model dengan aman:
 * buang fence ```json, cari `{...}` pertama (seimbang, perhatikan tanda kutip),
 * lalu JSON.parse di dalam try/catch. Gagal parse → null.
 */
function ambilJson(teks: string): Record<string, unknown> | null {
  const bersih = teks.replace(/```(?:json)?/gi, "");
  const mulai = bersih.indexOf("{");
  if (mulai < 0) return null;
  let kedalaman = 0;
  let diKutip = false;
  let esc = false;
  let akhir = -1;
  for (let i = mulai; i < bersih.length; i++) {
    const c = bersih[i];
    if (diKutip) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') diKutip = false;
      continue;
    }
    if (c === '"') diKutip = true;
    else if (c === "{") kedalaman++;
    else if (c === "}") {
      kedalaman--;
      if (kedalaman === 0) {
        akhir = i;
        break;
      }
    }
  }
  if (akhir < 0) return null; // objek tidak seimbang (balasan terpotong) → anggap rusak
  try {
    const parsed = JSON.parse(bersih.slice(mulai, akhir + 1));
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Coba satu model Gemini dengan timeout ketat (AbortController).
 * Berhasil → { skor, feedback } ternormalisasi; gagal (jaringan, model mati,
 * timeout, JSON rusak) → null supaya caller lanjut ke model berikutnya/fallback.
 */
async function cobaGemini(
  model: string,
  key: string,
  prompt: string
): Promise<{ skor: number; feedback: string } | null> {
  const pengontrol = new AbortController();
  const jeda = setTimeout(() => pengontrol.abort(), WAKTU_HABIS_MS);
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 256 },
        }),
        signal: pengontrol.signal,
      }
    );
    if (!r.ok) return null;
    const j = await r.json();
    const teks: string = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const obj = ambilJson(teks);
    if (!obj || typeof obj.skor !== "number" || !Number.isFinite(obj.skor)) return null;
    return {
      skor: Math.min(100, Math.max(0, Math.round(obj.skor))),
      feedback: String(obj.feedback || "").slice(0, 280),
    };
  } catch {
    return null; // termasuk timeout → biarkan caller jatuh ke heuristik
  } finally {
    clearTimeout(jeda); // bersihkan timer supaya tidak menumpuk
  }
}

export async function POST(req: Request) {
  try {
    const { teks, jawaban, kunci, rubrik } = await req.json();
    const isiJawaban = typeof jawaban === "string" ? jawaban.trim() : "";

    // Jawaban kosong → tidak ada yang dinilai, tetap sukses tanpa panggil AI.
    if (!isiJawaban) {
      return NextResponse.json(
        { skor: 0, feedback: "Belum ada jawaban.", engine: "heuristic" },
        { status: 200 }
      );
    }

    const key = process.env.GEMINI_API_KEY;
    // Tanpa kunci → heuristic langsung, tanpa panggil jaringan sama sekali.
    if (key) {
      const prompt = `Kamu adalah guru matematika SMP yang adil. Nilai jawaban siswa 0-100 berdasarkan kunci dan rubrik.\nSoal: ${teks}\nKunci: ${kunci || "-"}\nRubrik: ${rubrik || "-"}\nJawaban siswa: ${isiJawaban}\nBalas HANYA JSON valid: {"skor": number, "feedback": "1-2 kalimat bahasa Indonesia"}.`;
      // Coba model berurutan; berhenti begitu ada yang sukses.
      for (const model of daftarModel()) {
        const hasil = await cobaGemini(model, key, prompt);
        if (hasil) {
          return NextResponse.json(
            { ...hasil, engine: "gemini", model },
            { status: 200 }
          );
        }
      }
    }

    // Semua kegagalan (tanpa key, jaringan, model mati, JSON rusak) → heuristik lokal.
    const g = heuristicGrade(teks || "", isiJawaban, kunci, rubrik, 100);
    return NextResponse.json({ ...g, engine: "heuristic" }, { status: 200 });
  } catch {
    return NextResponse.json(
      { skor: 0, feedback: "Tidak dapat menilai saat ini.", engine: "error" },
      { status: 200 }
    );
  }
}
