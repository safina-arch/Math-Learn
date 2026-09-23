import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

/** Terima log pindah-tab dari klien. Persist ke Supabase bila dikonfigurasi, selalu 200 agar ujian tak terganggu. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sb = supabaseServer();
    if (sb) {
      await sb.from("cheat_logs").insert({
        evaluation_id: body.evaluationId || null,
        siswa_id: body.siswaId || null,
        siswa_nama: body.siswaNama || null,
        tipe: body.tipe === "foto" || body.tipe === "blur" || body.tipe === "visibility" ? body.tipe : "visibility",
        meta: { count: body.count ?? 1, soal: body.soal ?? null, menit: body.menit ?? null },
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
