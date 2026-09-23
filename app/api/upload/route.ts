import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { supabaseServer } from "@/lib/supabase";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file";
}

/** Fallback: tebak MIME dari ekstensi bila browser tidak mengirim tipe file. */
function mimeFromExt(name: string): string {
  const ext = name.toLowerCase().split(".").pop() || "";
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "";
}

/**
 * Upload lampiran (PDF/gambar).
 * - Supabase terkonfigurasi: simpan ke bucket Storage `materi` → public URL lintas device.
 * - Production TANPA Supabase: error eksplisit (disk Vercel read-only & ephemeral).
 * - Mode dev lokal saja: fallback ke `<project>/public/uploads/` + `/api/files/...`.
 */
async function uploadFile(file: File, index: number) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const stamped = `${Date.now()}-${index}-${safeName(file.name)}`;
  const contentType = file.type || mimeFromExt(file.name);

  const sb = supabaseServer();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "materi";
  if (sb && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { error } = await sb.storage.from(bucket).upload(stamped, bytes, {
        contentType,
        upsert: false,
      });
      if (!error) {
        const { data } = sb.storage.from(bucket).getPublicUrl(stamped);
        return { url: data.publicUrl, name: file.name, size: file.size, storage: "supabase" };
      }
      console.error(`[upload] Supabase storage gagal: ${error.message} → coba penyimpanan lokal`);
    } catch (err) {
      console.error("[upload] Supabase storage error:", err);
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Gagal menyimpan ke Supabase Storage. Pastikan bucket `materi` sudah dibuat (jalankan supabase/migration-revisi.sql)."
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Penyimpanan cloud (Supabase) belum dikonfigurasi di server ini. Isi env NEXT_PUBLIC_SUPABASE_URL & kunci Supabase."
    );
  }

  // Hanya mode lokal/dev: simpan ke disk proyek.
  try {
    const dir = join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, stamped), bytes);
    // Disajikan via /api/files agar file yang baru diunggah langsung bisa
    // dibuka tanpa restart server (next start meng-cache daftar public/).
    return { url: `/api/files/${stamped}`, name: file.name, size: file.size, storage: "local" };
  } catch (err) {
    console.error("[upload] Penyimpanan lokal gagal:", err);
    throw new Error("Gagal menyimpan file di server. Konfigurasi Supabase Storage untuk mode produksi.");
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("file").filter((entry): entry is File => entry instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "Tidak ada file." }, { status: 400 });
    }
    for (const file of files) {
      const contentType = file.type || mimeFromExt(file.name);
      if (!ALLOWED.has(contentType)) {
        return NextResponse.json({ error: `Format file ${file.name} tidak didukung. Gunakan PDF, PNG, JPG, atau WebP.` }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: `Ukuran file ${file.name} maksimal 10 MB.` }, { status: 400 });
      }
    }

    const uploaded = await Promise.all(files.map((file, index) => uploadFile(file, index)));
    // files mempertahankan format lama untuk pemanggil yang hanya mengunggah satu file.
    return NextResponse.json({ ...uploaded[0], files: uploaded });
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : "Gagal mengunggah file.";
    console.error("[upload]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
