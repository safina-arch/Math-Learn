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
 * "Hasil siswa" untuk guru/admin — **tempat MEMERIKSA**: papan langkah
 * Jenis → Kelas → Tugas → Status + tabel (termasuk baris roster "Belum
 * mengerjakan") yang bisa diurutkan, dan modal periksa per soal untuk
 * menerbitkan nilai & umpan balik. Rekap nilai/ekspor ada di "Nilai siswa".
 */
function Content() {
  const { submissions, assignments, users } = useStore();
  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader
        title="Hasil siswa — periksa & terbitkan nilai"
        desc="Memeriksa jawaban per soal lalu menerbitkan nilai dan umpan balik. Untuk melihat rekap nilai, rata-rata, dan ekspor → menu Nilai siswa."
        right={<ExportMenu submissions={submissions} assignments={assignments} users={users} />}
      />
      <HasilKirimanGuru />
    </div>
  );
}
