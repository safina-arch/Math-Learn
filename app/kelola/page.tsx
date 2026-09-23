import { redirect } from "next/navigation";

/** Menu "Kelola" dihapus — kelolaan tersebar di halaman Materi, LKPD, Latihan, dan Evaluasi. */
// Dynamic: redirect() saat request → Location header ikut terkirim
// (saat prerender statis, Next 14 menyimpan status 307 tapi membuang Location).
export const dynamic = "force-dynamic";

export default function KelolaPage() {
  redirect("/materi");
}
