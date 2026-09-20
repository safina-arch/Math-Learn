import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

/** Polling notifikasi (fallback bila Realtime tidak dipakai). */
export async function GET() {
  try {
    const sb = supabaseServer();
    if (!sb) return NextResponse.json({ notifications: [], realtime: false });
    const { data } = await sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
    return NextResponse.json({ notifications: data || [], realtime: true });
  } catch {
    return NextResponse.json({ notifications: [], realtime: false });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sb = supabaseServer();
    if (sb) {
      await sb.from("notifications").insert({
        user_id: body.userId || null,
        kategori: body.kategori || "info",
        judul: body.judul || "",
        isi: body.isi || "",
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
