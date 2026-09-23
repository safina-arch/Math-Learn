import { redirect } from "next/navigation";

/** Menu "Tugas" lama dipisah menjadi LKPD (/lkpd) & Latihan (/latihan). */
export default function TugasPage() {
  redirect("/lkpd");
}
