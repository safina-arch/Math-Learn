"use client";

import { AppShell, Guard } from "@/components/shell";
import { AssignmentList } from "@/components/assignment-list";
import { LkpdHub } from "@/components/lkpd/hub";

/**
 * Halaman LKPD — Learning Journey berbasis materi (data-driven).
 * Bagian bawah mempertahankan tugas LKPD lama (pengumpulan bernilai) tetap utuh.
 */
export default function LkpdPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <LkpdHub />
        <section className="mt-9">
          <div className="mb-3">
            <h2 className="h2">📋 Tugas LKPD</h2>
            <p className="muted mt-0.5">Lembar kerja yang dikumpulkan dan dinilai guru — terpisah dari Learning Journey di atas.</p>
          </div>
          <AssignmentList tipe="lkpd" header={false} />
        </section>
      </Guard>
    </AppShell>
  );
}
