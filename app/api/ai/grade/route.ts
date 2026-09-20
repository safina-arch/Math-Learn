import { NextResponse } from "next/server";
import { heuristicGrade } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const { teks, jawaban, kunci, rubrik } = await req.json();
    const key = process.env.GEMINI_API_KEY;

    if (key) {
      try {
        const prompt = `Kamu adalah guru matematika SMP yang adil. Nilai jawaban siswa 0-100 berdasarkan kunci dan rubrik.\nSoal: ${teks}\nKunci: ${kunci || "-"}\nRubrik: ${rubrik || "-"}\nJawaban siswa: ${jawaban || "(kosong)"}\nBalas HANYA JSON valid: {"skor": number, "feedback": "1-2 kalimat bahasa Indonesia"}.`;
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 256 } }),
          }
        );
        if (r.ok) {
          const j = await r.json();
          const text: string = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const m = text.match(/\{[\s\S]*\}/);
          if (m) {
            const parsed = JSON.parse(m[0]);
            if (typeof parsed.skor === "number") {
              return NextResponse.json({ skor: Math.min(100, Math.max(0, Math.round(parsed.skor))), feedback: String(parsed.feedback || "").slice(0, 280), engine: "gemini" });
            }
          }
        }
      } catch {
        // jatuh ke heuristik
      }
    }

    const g = heuristicGrade(teks || "", jawaban || "", kunci, rubrik, 100);
    return NextResponse.json({ ...g, engine: "heuristic" });
  } catch {
    return NextResponse.json({ skor: 0, feedback: "Tidak dapat menilai saat ini.", engine: "error" }, { status: 200 });
  }
}
