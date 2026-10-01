"use client";

import { Badge, Empty } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cariProgress, progresSubtopic } from "@/lib/lkpd";
import { fmtDateTime } from "@/lib/utils";

export type BarisHasilLkpd = {
  key: string;
  siswaId: string;
  subtopicId: string;
  siswaNama: string;
  kelas: string;
  materi: string;
  submateri: string;
  progres: string;
  persen: number;
  nilai: number | null;
  verifikasi: boolean;
  updatedAt: string;
};

/** Gabungkan progres LKPD seluruh siswa dengan katalog materi → baris hasil. */
export function barisHasil(
  lkpdTopics: ReturnType<typeof useStore>["lkpdTopics"],
  lkpdProgress: ReturnType<typeof useStore>["lkpdProgress"],
  users: ReturnType<typeof useStore>["users"],
): BarisHasilLkpd[] {
  const rows: BarisHasilLkpd[] = [];
  for (const p of lkpdProgress) {
    const topik = lkpdTopics.find((t) => t.subtopics.some((s) => s.id === p.subtopicId));
    const sub = topik?.subtopics.find((s) => s.id === p.subtopicId);
    if (!topik || !sub) continue;
    const proyek = progresSubtopic(sub, cariProgress(lkpdProgress, p.siswaId, sub.id));
    if (proyek.selesai === 0) continue; // belum ada mission dikerjakan — tidak ditampilkan
    const siswa = users.find((u) => u.id === p.siswaId);
    rows.push({
      key: `${p.siswaId}:${p.subtopicId}`,
      siswaId: p.siswaId,
      subtopicId: p.subtopicId,
      siswaNama: siswa?.nama || "Siswa",
      kelas: siswa?.kelas || "—",
      materi: topik.judul,
      submateri: sub.judul,
      progres: `${proyek.selesai}/${proyek.total} mission`,
      persen: proyek.persen,
      nilai: p.nilai ?? null,
      verifikasi: Boolean(p.verifikasi),
      updatedAt: p.updatedAt,
    });
  }
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function statusHasil(r: BarisHasilLkpd): { label: string; tone: "gray" | "amber" | "green" | "purple" } {
  if (r.nilai == null) return { label: "Sedang dikerjakan", tone: "gray" };
  if (r.verifikasi) return { label: "Terverifikasi", tone: "green" };
  return { label: "Menunggu verifikasi", tone: "amber" };
}

/** Tabel nilai LKPD — untuk halaman guru (Hasil siswa) & admin (Nilai siswa). */
export function HasilLkpdGuru({ aksi = true }: { aksi?: boolean }) {
  const { lkpdTopics, lkpdProgress, users, user, verifikasiLkpd } = useStore();
  const rows = barisHasil(lkpdTopics, lkpdProgress, users);
  const boleh = user?.role === "guru" || user?.role === "admin";
  const menunggu = rows.filter((r) => r.nilai != null && !r.verifikasi).length;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="h2">📊 Nilai LKPD (Learning Journey)</h2>
        <Badge tone="purple">{rows.length} data</Badge>
        {menunggu ? <Badge tone="amber">{menunggu} menunggu verifikasi</Badge> : null}
      </div>
      <p className="muted mb-3 max-w-[680px]">Nilai dihitung dari penyelesaian mission tiap submateri. Verifikasi untuk menerbitkan nilai final ke siswa.</p>
      {rows.length === 0 ? (
        <Empty title="Belum ada hasil LKPD" desc="Hasil muncul ketika siswa mulai mengerjakan learning journey pada menu LKPD." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[760px]">
              <thead>
                <tr className="text-left text-[12px] text-ink-muted bg-wash/50">
                  <th className="px-4 py-2.5 font-medium">Siswa</th>
                  <th className="px-4 py-2.5 font-medium">Materi</th>
                  <th className="px-4 py-2.5 font-medium">Submateri</th>
                  <th className="px-4 py-2.5 font-medium">Progres</th>
                  <th className="px-4 py-2.5 font-medium">Nilai</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Terakhir</th>
                  {aksi && boleh ? <th className="px-4 py-2.5" /> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = statusHasil(r);
                  return (
                    <tr key={r.key} className="table-row">
                      <td className="px-4 py-2.5 font-medium">{r.siswaNama}<span className="block text-[12px] text-ink-muted">{r.kelas}</span></td>
                      <td className="px-4 py-2.5">{r.materi}</td>
                      <td className="px-4 py-2.5">{r.submateri}</td>
                      <td className="px-4 py-2.5 text-ink-muted">{r.progres} · {r.persen}%</td>
                      <td className="px-4 py-2.5 font-semibold">{r.nilai ?? "—"}</td>
                      <td className="px-4 py-2.5"><Badge tone={st.tone}>{st.label}</Badge></td>
                      <td className="px-4 py-2.5 text-ink-muted">{fmtDateTime(r.updatedAt)}</td>
                      {aksi && boleh ? (
                        <td className="px-4 py-2.5 text-right">
                          {r.nilai == null ? (
                            <span className="text-[12.5px] text-ink-faint">—</span>
                          ) : r.verifikasi ? (
                            <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => verifikasiLkpd(r.siswaId, r.subtopicId, false)}>Batalkan</button>
                          ) : (
                            <button className="btn-primary !py-1.5 !text-[12.5px]" onClick={() => verifikasiLkpd(r.siswaId, r.subtopicId, true)}>Verifikasi</button>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
