"use client";

import { useState } from "react";
import { AppShell, Guard } from "@/components/shell";
import { Badge, Empty, Modal, PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cheatLabel, cheatTone, fmtDateTime } from "@/lib/utils";

export default function LaporanPage() {
  return (
    <AppShell>
      <Guard allow={["guru", "admin"]}>
        <Content />
      </Guard>
    </AppShell>
  );
}

function Content() {
  const { cheatLogs, assignments } = useStore();
  const [cheatSiswa, setCheatSiswa] = useState<string | null>(null);

  // Kelompokkan laporan kecurangan per peserta (foto = menambahkan foto, bukan pelanggaran).
  const cheatBySiswa = new Map<string, { nama: string; logs: typeof cheatLogs }>();
  for (const c of cheatLogs) {
    const g = cheatBySiswa.get(c.siswaId) || { nama: c.siswaNama, logs: [] as typeof cheatLogs };
    g.logs.push(c);
    cheatBySiswa.set(c.siswaId, g);
  }
  const pesertaCheat = Array.from(cheatBySiswa.entries()).sort((a, b) => a[1].nama.localeCompare(b[1].nama, "id"));
  const detailCheat = cheatSiswa ? cheatBySiswa.get(cheatSiswa) : undefined;

  return (
    <div className="page-wrap !px-0 !pb-0 !max-w-none">
      <PageHeader
        title="Laporan kecurangan"
        desc="Pelanggaran pindah tab / minimize saat evaluasi, dikelompokkan per peserta."
      />

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-line">
          <p className="h2">Laporan kecurangan ({cheatLogs.length} kejadian · {pesertaCheat.length} peserta)</p>
          <p className="muted mt-0.5">Klik nama peserta untuk melihat detail: jenis kecurangan, menit kejadian, dan nomor soal terindikasi. Foto jawaban siswa tidak dihitung pelanggaran.</p>
        </div>
        {pesertaCheat.length === 0 ? <Empty title="Belum ada pelanggaran" desc="Laporan akan muncul otomatis saat siswa pindah tab atau minimize saat mengerjakan evaluasi." /> : (
          <div className="divide-y divide-line">
            {pesertaCheat.map(([sid, g]) => (
              <div key={sid} className="px-4 py-2.5 flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-wash border border-line flex items-center justify-center text-[12px] font-semibold text-ink-soft shrink-0">{g.nama.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium truncate">{g.nama}</p>
                  <p className="text-[12px] text-ink-muted">{g.logs.length} kejadian tercatat</p>
                </div>
                <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => setCheatSiswa(sid)}>Lihat detail</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!detailCheat} onClose={() => setCheatSiswa(null)} title={`Detail kecurangan — ${detailCheat?.nama || ""}`} wide>
        {detailCheat ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[560px]">
              <thead><tr className="text-left text-[12px] text-ink-muted bg-wash/50"><th className="px-3 py-2.5 font-medium">Jenis</th><th className="px-3 py-2.5 font-medium">Menit kejadian</th><th className="px-3 py-2.5 font-medium">Soal</th><th className="px-3 py-2.5 font-medium">Evaluasi</th><th className="px-3 py-2.5 font-medium">Waktu</th></tr></thead>
              <tbody>
                {detailCheat.logs.map((c) => {
                  const evaluation = assignments.find((a) => a.id === c.evaluationId);
                  return (
                    <tr key={c.id} className="table-row">
                      <td className="px-3 py-2.5"><Badge tone={cheatTone(c.tipe)}>{cheatLabel(c.tipe)}</Badge></td>
                      <td className="px-3 py-2.5 tabular-nums">{c.menit != null ? `Menit ke-${c.menit}` : "—"}</td>
                      <td className="px-3 py-2.5">{c.soal ? `Soal ${c.soal}` : "—"}</td>
                      <td className="px-3 py-2.5">{evaluation?.judul || "Evaluasi"}</td>
                      <td className="px-3 py-2.5 text-ink-muted">{fmtDateTime(c.timestamp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
