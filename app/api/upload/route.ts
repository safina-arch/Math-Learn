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

/**
 * Upload lampiran materi (PDF/gambar).
 * - Produksi (Supabase dikonfigurasi): simpan ke bucket Storage `materi`, kembalikan public URL.
 * - Lokal/demo: simpan ke `<project>/public/uploads/`, kembalikan path `/uploads/...`
 *   yang langsung bisa dibuka & diunduh di browser.
 */
async function uploadFile(file: File, index: number) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const stamped = `${Date.now()}-${index}-${safeName(file.name)}`;

  const sb = supabaseServer();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "materi";
  if (sb && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { error } = await sb.storage.from(bucket).upload(stamped, bytes, {
        contentType: file.type,
        upsert: false,
      });
      if (!error) {
        const { data } = sb.storage.from(bucket).getPublicUrl(stamped);
        return { url: data.publicUrl, name: file.name, size: file.size, storage: "supabase" };
      }
      // bucket belum ada / RLS → jatuh ke penyimpanan lokal
    } catch {
      // jatuh ke penyimpanan lokal
    }
  }

  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, stamped), bytes);
  // Disajikan via /api/files agar file yang baru diunggah langsung bisa
  // dibuka tanpa restart server (next start meng-cache daftar public/).
  return { url: `/api/files/${stamped}`, name: file.name, size: file.size, storage: "local" };
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("file").filter((entry): entry is File => entry instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "Tidak ada file." }, { status: 400 });
    }
    for (const file of files) {
      if (!ALLOWED.has(file.type)) {
        return NextResponse.json({ error: `Format file ${file.name} tidak didukung. Gunakan PDF, PNG, JPG, atau WebP.` }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: `Ukuran file ${file.name} maksimal 10 MB.` }, { status: 400 });
      }
    }

    const uploaded = await Promise.all(files.map((file, index) => uploadFile(file, index)));
    // files mempertahankan format lama untuk pemanggil yang hanya mengunggah satu file.
    return NextResponse.json({ ...uploaded[0], files: uploaded });
  } catch {
    return NextResponse.json({ error: "Gagal mengunggah file." }, { status: 500 });
  }
}
