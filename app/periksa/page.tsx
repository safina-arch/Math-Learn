"use client";

import { AppShell, Guard } from "@/components/shell";
import { ExportMenu } from "@/components/export-menu";
import { PageHeader } from "@/components/ui";
import { HasilKirimanGuru } from "@/components/kiriman-guru";
import { useStore } from "@/lib/store";

export default function PeriksaPage() {
  return (
    <AppShell>
      <Guard allow={["guru", "admin"]}>
        <Content />
      </Guard>
    </AppShell>
  );
}

/**
 * "Hasil siswa" untuk guru/admin. Seluruh penilaian latihan & evaluasi kini berada
 * dalam satu komponen bersama (`HasilKirimanGuru`) berformat Learning Journey —
 * papan langkah Jenis → Kelas → Tugas → Status + tabel yang bisa diurutkan,
 * dan modal periksa (termasuk penanda "sudah diperiksa" & hapus kiriman).
 */
function Content() {
  const { submissions, assignments, users } = useStore();
  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader
        title="Periksa kiriman"
        desc="Saring per jenis/kelas/tugas, urutkan per kolom, lalu terbitkan nilai & umpan balik ke siswa."
        right={<ExportMenu submissions={submissions} assignments={assignments} users={users} />}
      />
      <HasilKirimanGuru />
    </div>
  );
}
