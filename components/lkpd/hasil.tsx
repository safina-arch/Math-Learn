"use client";

import { useState } from "react";
import { Badge, Empty } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cariProgress, nilaiSubtopic, progresSubtopic } from "@/lib/lkpd";
import { fmtDateTime } from "@/lib/utils";

export type BarisHasilLkpd = {
  key: string;
  siswaId: string;
  subtopicId: string;
  topikId: string;
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
    const pr = cariProgress(lkpdProgress, p.siswaId, sub.id);
    const proyek = progresSubtopic(sub, pr);
    if (proyek.selesai === 0) continue; // belum ada mission dikerjakan — tidak ditampilkan
    const siswa = users.find((u) => u.id === p.siswaId);
    rows.push({
      key: `${p.siswaId}:${p.subtopicId}`,
      siswaId: p.siswaId,
      subtopicId: p.subtopicId,
      topikId: topik.id,
      siswaNama: siswa?.nama || "Siswa",
      kelas: siswa?.kelas || "—",
      materi: topik.judul,
      submateri: sub.judul,
      progres: `${proyek.selesai}/${proyek.total} mission`,
      persen: proyek.persen,
      // Nilai per sub-bab: sudah ada tersimpan ATAU persentase sementara (tak menunggu materi penuh).
      nilai: nilaiSubtopic(sub, pr),
      verifikasi: Boolean(pr?.verifikasi),
      updatedAt: pr?.updatedAt || p.updatedAt,
    });
  }
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function statusHasil(r: BarisHasilLkpd): { label: string; tone: "gray" | "amber" | "green" | "purple" } {
  if (r.nilai == null) return { label: r.persen === 0 ? "Belum mulai" : "Sedang dikerjakan", tone: "gray" };
  if (r.verifikasi) return { label: "Terverifikasi", tone: "green" };
  return { label: "Menunggu verifikasi", tone: "amber" };
}

/** Baris "belum mengerjakan" untuk daftar siswa ketika sub bab dipilih tertentu. */
function barisKosong(
  topikId: string,
  topikJudul: string,
  subId: string,
  subJudul: string,
  totalMission: number,
  siswa: { id: string; nama: string; kelas?: string },
): BarisHasilLkpd {
  return {
    key: `${siswa.id}:${subId}`,
    siswaId: siswa.id,
    subtopicId: subId,
    topikId,
    siswaNama: siswa.nama,
    kelas: siswa.kelas || "—",
    materi: topikJudul,
    submateri: subJudul,
    progres: `0/${totalMission} mission`,
    persen: 0,
    nilai: null,
    verifikasi: false,
    updatedAt: "",
  };
}

/**
 * Panel penilaian LKPD terorganisir untuk guru/admin.
 * Alurnya persis seperti yang diminta: Nilai siswa → LKPD → Materi → Sub bab → Verifikasi.
 */
export function HasilLkpdGuru({ aksi = true }: { aksi?: boolean }) {
  const { lkpdTopics, lkpdProgress, users, user, verifikasiLkpd, verifikasiLkpdBatch, syncError } = useStore();
  const [materiId, setMateriId] = useState("semua");
  const [subId, setSubId] = useState("semua");
  const boleh = user?.role === "guru" || user?.role === "admin";

  // Langkah 2 & 3: penyaring bertingkat (materi → sub bab).
  const semuaBaris = barisHasil(lkpdTopics, lkpdProgress, users);
  const rows = semuaBaris.filter(
    (r) => (materiId === "semua" || r.topikId === materiId) && (subId === "semua" || r.subtopicId === subId),
  );
  const opsiSub = lkpdTopics.flatMap((t) =>
    materiId === "semua" || t.id === materiId
      ? t.subtopics.map((s) => ({
          id: s.id,
          label: materiId === "semua" ? `${t.ikon ? `${t.ikon} ` : ""}${t.judul} › ${s.judul}` : s.judul,
        }))
      : [],
  );
  const subTerpilih = subId === "semua" ? null : lkpdTopics.flatMap((t) => t.subtopics).find((s) => s.id === subId);
  const topikTerpilih = subTerpilih ? lkpdTopics.find((t) => t.subtopics.some((s) => s.id === subTerpilih.id)) : null;

  // Sub bab tertentu → tampilkan SELURUH daftar siswa (termasuk yang belum mengerjakan).
  const daftar: BarisHasilLkpd[] =
    subTerpilih && topikTerpilih
      ? [
          ...rows,
          ...users
            .filter((u) => u.role === "siswa" && !rows.some((r) => r.siswaId === u.id))
            .map((u) => barisKosong(topikTerpilih.id, topikTerpilih.judul, subTerpilih.id, subTerpilih.judul, subTerpilih.missions.length, u)),
        ].sort((a, b) => a.siswaNama.localeCompare(b.siswaNama))
      : rows;

  const nilaiTersedia = daftar.filter((r) => r.nilai != null);
  const rata = nilaiTersedia.length
    ? Math.round(nilaiTersedia.reduce((n, r) => n + (r.nilai || 0), 0) / nilaiTersedia.length)
    : "—";
  const menungguRows = daftar.filter((r) => r.nilai != null && !r.verifikasi);
  const menungguTotal = semuaBaris.filter((r) => r.nilai != null && !r.verifikasi).length;

  const verifikasiSemua = () =>
    verifikasiLkpdBatch(
      menungguRows.map((r) => ({ siswaId: r.siswaId, subtopicId: r.subtopicId })),
      true,
    );

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="h2">📊 Penilaian LKPD (Learning Journey)</h2>
        <Badge tone="purple">{daftar.length} data</Badge>
        {menungguTotal ? <Badge tone="amber">{menungguTotal} menunggu verifikasi</Badge> : null}
      </div>
      <p className="muted mb-3 max-w-[680px]">
        Nilai per sub-bab naik sejak mission pertama (tanpa menunggu seluruh materi selesai). Pilih <b>Materi → Sub bab</b>
        untuk menilai per sub-bab, lalu verifikasi agar nilai fiks di siswa.
      </p>

      {boleh && syncError ? (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
          ⚠️ Sinkronisasi bermasalah — <b>{syncError}</b>. Data akan dikirim ulang otomatis.
        </div>
      ) : null}

      {/* Papan langkah penyaring nilai */}
      <div className="card mb-3 !py-3">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <div>
            <span className="label">1 · Nilai siswa</span>
            <div className="mt-1">
              <Badge tone="purple">LKPD</Badge>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="penilai-materi">
              2 · Materi
            </label>
            <select
              id="penilai-materi"
              className="input !w-auto mt-1"
              value={materiId}
              onChange={(e) => {
                setMateriId(e.target.value);
                setSubId("semua");
              }}
            >
              <option value="semua">Semua materi</option>
              {lkpdTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.ikon ? `${t.ikon} ` : ""}
                  {t.judul}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="penilai-sub">
              3 · Sub bab
            </label>
            <select id="penilai-sub" className="input !w-auto mt-1" value={subId} onChange={(e) => setSubId(e.target.value)}>
              <option value="semua">Semua sub bab</option>
              {opsiSub.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto">
            <span className="label">4 · Verifikasi</span>
            <div className="mt-1">
              {aksi && boleh ? (
                menungguRows.length ? (
                  <button className="btn-primary !py-2 !text-[13px]" onClick={verifikasiSemua}>
                    ✓ Verifikasi semua ({menungguRows.length})
                  </button>
                ) : (
                  <span className="text-[12.5px] text-ink-faint">Tidak ada yang menunggu</span>
                )
              ) : (
                <span className="text-[12.5px] text-ink-faint">—</span>
              )}
            </div>
          </div>
        </div>
        {subTerpilih && topikTerpilih ? (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2 text-[12.5px] text-ink-muted">
            <span>
              📖 <b className="text-ink">{topikTerpilih.judul}</b> › {subTerpilih.judul}
            </span>
            <span>
              Rata-rata: <b className="text-ink">{rata}</b>
            </span>
            <span>
              {nilaiTersedia.length} dari {daftar.length} siswa dinilai
            </span>
            {menungguRows.length ? <Badge tone="amber">{menungguRows.length} menunggu verifikasi</Badge> : null}
          </div>
        ) : null}
      </div>

      {daftar.length === 0 ? (
        <Empty
          title="Belum ada hasil LKPD"
          desc="Hasil muncul ketika siswa mulai mengerjakan learning journey pada menu LKPD. Data progres dikirim otomatis dari perangkat siswa."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[760px]">
              <thead>
                <tr className="text-left text-[12px] text-ink-muted bg-wash/50">
                  <th className="px-4 py-2.5 font-medium">Siswa</th>
                  <th className="px-4 py-2.5 font-medium">Materi</th>
                  <th className="px-4 py-2.5 font-medium">Sub bab</th>
                  <th className="px-4 py-2.5 font-medium">Progres</th>
                  <th className="px-4 py-2.5 font-medium">Nilai</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Terakhir</th>
                  {aksi && boleh ? <th className="px-4 py-2.5" /> : null}
                </tr>
              </thead>
              <tbody>
                {daftar.map((r) => {
                  const st = statusHasil(r);
                  return (
                    <tr key={r.key} className="table-row">
                      <td className="px-4 py-2.5 font-medium">
                        {r.siswaNama}
                        <span className="block text-[12px] text-ink-muted">{r.kelas}</span>
                      </td>
                      <td className="px-4 py-2.5">{r.materi}</td>
                      <td className="px-4 py-2.5">{r.submateri}</td>
                      <td className="px-4 py-2.5 text-ink-muted">
                        {r.progres} · {r.persen}%
                      </td>
                      <td className="px-4 py-2.5 font-semibold">{r.nilai ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted">{fmtDateTime(r.updatedAt)}</td>
                      {aksi && boleh ? (
                        <td className="px-4 py-2.5 text-right">
                          {r.nilai == null ? (
                            <span className="text-[12.5px] text-ink-faint">—</span>
                          ) : r.verifikasi ? (
                            <button
                              className="btn-ghost !py-1.5 !text-[12.5px]"
                              onClick={() => verifikasiLkpd(r.siswaId, r.subtopicId, false)}
                            >
                              Batalkan
                            </button>
                          ) : (
                            <button
                              className="btn-primary !py-1.5 !text-[12.5px]"
                              onClick={() => verifikasiLkpd(r.siswaId, r.subtopicId, true)}
                            >
                              Verifikasi
                            </button>
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
