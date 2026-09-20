import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { supabaseServer } from "@/lib/supabase";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

/** Melayani file lampiran yang disimpan di public/uploads (baca dari disk per-request). */
export async function GET(_req: Request, { params }: { params: { name: string[] } }) {
  const raw = (params.name || []).join("/");
  if (!raw || raw.includes("..") || raw.includes("/") || raw.length > 140) {
    return NextResponse.json({ error: "Nama file tidak valid." }, { status: 400 });
  }
  try {
    const buf = await readFile(join(process.cwd(), "public", "uploads", raw));
    const ext = raw.split(".").pop()?.toLowerCase() || "";
    // Buffer → ArrayBuffer tanpa copy bermasalah di TS; pakai Uint8Array view yang tepat
    const body = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    return new NextResponse(body, {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Content-Disposition": `inline; filename="${raw.split("-").slice(1).join("-") || raw}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    // fallback: coba redirect ke Supabase Storage bila dikonfigurasi
    const sb = supabaseServer();
    if (sb) {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || "materi";
      const { data } = sb.storage.from(bucket).getPublicUrl(raw);
      if (data?.publicUrl) return NextResponse.redirect(data.publicUrl);
    }
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
  }
}
