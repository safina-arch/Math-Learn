import { redirect } from "next/navigation";

/** Menu "Kelola" dihapus — kelolaan tersebar di halaman Materi, LKPD, Latihan, dan Evaluasi. */
export default function KelolaPage() {
  redirect("/materi");
}
