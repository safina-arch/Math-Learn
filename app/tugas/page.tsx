import { redirect } from "next/navigation";

/** Menu "Tugas" lama dipisah menjadi LKPD (/lkpd) & Latihan (/latihan). */
// Dynamic: redirect() saat request → Location header ikut terkirim
// (saat prerender statis, Next 14 menyimpan status 307 tapi membuang Location).
export const dynamic = "force-dynamic";

export default function TugasPage() {
  redirect("/lkpd");
}
