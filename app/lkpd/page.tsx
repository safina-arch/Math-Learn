"use client";

import { AppShell, Guard } from "@/components/shell";
import { LkpdHub } from "@/components/lkpd/hub";

/**
 * Halaman LKPD — Learning Journey berbasis materi (data-driven).
 * Cukup satu tampilan ini saja: semua materi, submateri, mission, dan progres siswa.
 */
export default function LkpdPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <LkpdHub />
      </Guard>
    </AppShell>
  );
}
