"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { Badge, Empty, Stat } from "@/components/ui";
import { useStore } from "@/lib/store";
import { fmtDateTime, labelCheat, normalize, STATUS_TUGAS_META, statusTugas, TIPE_LABEL, TIPE_TONE, TIPEURUT } from "@/lib/utils";
import type { AssignmentType, Submission } from "@/lib/types";

type FilterTipe = "semua" | AssignmentType;
type SortKey = "siswa" | "kelas" | "tugas" | "nilai" | "status" | "waktu";

const URUT_STATUS: Record<import("@/lib/utils").StatusTugas, number> = { belum: 0, "belum-diperiksa": 1, sudah: 2 };

/**
 * Satu baris rekap — bisa berasal dari kiriman siswa (`sub` terisi) ATAU dari
 * roster kelas (`sub` null): siswa `role==="siswa"` di kelas tugas yang BELUM
 * mengumpulkan. Sengaja digabung agar guru melihat SELURUH kelas, bukan hanya
 * siswa yang sudah mengumpulkan.
 */
interface BarisRekap {
  key: string;
  siswaNama: string;
  kelas: string;
  assignmentId: string | null;
  judul: string;
  tipe: AssignmentType;
  nilai: number | null;
  sub: Submission | null;
}

/**
 * Rekap nilai (halaman `/nilai`) untuk guru & admin — RINGKASAN & tampilan lihat
 * nilai, TANPA modal pemeriksaan. Pemeriksaan jawaban per soal dan penerbitan
 * nilai tetap berada di menu "Hasil Siswa" (`/periksa`) — dua menu ini sengaja
 * dipisah tegas: memeriksa vs melihat rekap.
 *
 * Papan langkah penyaring bertingkat (Jenis → Kelas → Tugas → Cari nama)
 * mengikuti panel penilaian LKPD, dan tabelnya bisa diurutkan per kolom.
 * Panel LKPD Journey (`HasilLkpdGuru`) TIDAK dibawa ke sini — tetap di `/periksa`.
 */
export function RekapNilaiGuru() {
  // `lkpdTopics`/`lkpdProgress` sengaja TIDAK dipakai di sini: penilaian LKPD
  // per sub-bab tetap berada di panel `HasilLkpdGuru` pada menu "Hasil Siswa".
  const { assignments, submissions, users } = useStore();
  const [filter, setFilter] = useState<FilterTipe>("semua");
  const [kelas, setKelas] = useState("semua");
  const [tugasId, setTugasId] = useState("semua");
  const [cari, setCari] = useState("");
  /** Sorting kolom; pengelompokan jenis tugas hanya dijaga pada tampilan baku. */
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);

  const tipeOf = (sid: string): AssignmentType => assignments.find((x) => x.id === sid)?.tipe || "latihan";
  const judulDari = (sid: string) => assignments.find((x) => x.id === sid)?.judul || "";
  const hitungTipe = (t: AssignmentType) => submissions.filter((s) => tipeOf(s.assignmentId) === t).length;

  // Penyaring bertingkat (mengikuti papan penilaian): jenis → kelas → tugas → cari nama.
  const tugasTersaring = assignments
    .filter((a) => filter === "semua" || a.tipe === filter)
    .filter((a) => kelas === "semua" || a.kelas === kelas)
    .filter((a) => tugasId === "semua" || a.id === tugasId);
  const subTersaring = submissions
    .filter((s) => filter === "semua" || tipeOf(s.assignmentId) === filter)
    .filter((s) => kelas === "semua" || s.kelas === kelas)
    .filter((s) => tugasId === "semua" || s.assignmentId === tugasId);

  const opsiKelas = Array.from(new Set([...assignments.map((a) => a.kelas), ...submissions.map((s) => s.kelas)])).sort((a, b) => a.localeCompare(b, "id"));
  const opsiTugas = assignments
    .filter((a) => filter === "semua" || a.tipe === filter)
    .filter((a) => kelas === "semua" || a.kelas === kelas)
    .map((a) => ({ id: a.id, label: `${TIPE_LABEL[a.tipe]} · ${a.judul}`, jumlah: submissions.filter((s) => s.assignmentId === a.id).length }));
  const chips: { key: FilterTipe; label: string }[] = [
    { key: "semua", label: `Semua (${submissions.length})` },
    { key: "latihan", label: `${TIPE_LABEL.latihan} (${hitungTipe("latihan")})` },
    { key: "lkpd", label: `${TIPE_LABEL.lkpd} (${hitungTipe("lkpd")})` },
    { key: "evaluasi", label: `${TIPE_LABEL.evaluasi} (${hitungTipe("evaluasi")})` },
  ];

  // Baris kiriman + baris roster: siswa kelas tugas yang belum mengumpulkan
  // tetap tampil (Nilai "—" · Status "Belum mengerjakan").
  const sudahKiriman = new Set(subTersaring.map((s) => `${s.assignmentId}:${s.siswaId}`));
  const barisKiriman: BarisRekap[] = subTersaring.map((s) => ({
    key: s.id,
    siswaNama: s.siswaNama,
    kelas: s.kelas,
    assignmentId: s.assignmentId,
    judul: judulDari(s.assignmentId),
    tipe: tipeOf(s.assignmentId),
    nilai: s.nilai,
    sub: s,
  }));
  const barisRoster: BarisRekap[] = tugasTersaring.flatMap((a) =>
    users
      .filter((u) => u.role === "siswa" && u.kelas === a.kelas && !sudahKiriman.has(`${a.id}:${u.id}`))
      .map((u) => ({
        key: `${a.id}:${u.id}`,
        siswaNama: u.nama,
        kelas: u.kelas,
        assignmentId: a.id,
        judul: a.judul,
        tipe: a.tipe,
        nilai: null,
        sub: null,
      })),
  );
  // Cari nama berlaku untuk kiriman maupun baris roster.
  const q = normalize(cari);
  const baris = [...barisKiriman, ...barisRoster].filter((r) => !q || normalize(r.siswaNama).includes(q));

  const kunciSort = (r: BarisRekap, key: SortKey): string | number => {
    if (key === "siswa") return normalize(r.siswaNama);
    if (key === "tugas") return normalize(r.judul);
    if (key === "kelas") return normalize(r.kelas);
    if (key === "nilai") return r.nilai ?? -1;
    if (key === "status") return URUT_STATUS[statusTugas(r.sub)];
    return r.sub?.submittedAt ?? "";
  };
  const urutRekap = baris.slice().sort((a, b) => {
    // Baku: kelompok jenis tugas → nama siswa. Saat user memilih kolom, urutan
    // mengikuti kolom itu penuh (tanpa pengelompokan) supaya sort terasa wajar.
    if (!sort) {
      const t = TIPEURUT[a.tipe] - TIPEURUT[b.tipe];
      if (t) return t;
      return a.siswaNama.localeCompare(b.siswaNama, "id") || (a.sub?.submittedAt || "").localeCompare(b.sub?.submittedAt || "");
    }
    const va = kunciSort(a, sort.key);
    const vb = kunciSort(b, sort.key);
    if (va < vb) return -sort.dir;
    if (va > vb) return sort.dir;
    return a.siswaNama.localeCompare(b.siswaNama, "id");
  });
  const klikSort = (key: SortKey) => setSort((p) => (p?.key === key ? { key, dir: p.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const panah = (key: SortKey) => (sort?.key === key ? (sort.dir === 1 ? "▲" : "▼") : "↕");
  const th = (key: SortKey, label: string) => (
    <th className="px-4 py-2.5 font-medium">
      <button type="button" className={`inline-flex items-center gap-1 hover:text-ink ${sort?.key === key ? "text-ink font-semibold" : ""}`} onClick={() => klikSort(key)}>
        {label}<span className="text-[10px] text-ink-faint">{panah(key)}</span>
      </button>
    </th>
  );

  // Angka rekap — dihitung dari baris yang sedang tampil (sudah kena penyaring & pencarian).
  const beriNilai = baris.filter((r) => r.nilai != null);
  const rata = beriNilai.length ? Math.round(beriNilai.reduce((n, r) => n + (r.nilai || 0), 0) / beriNilai.length) : "—";
  const tertinggi = beriNilai.length ? Math.max(...beriNilai.map((r) => r.nilai as number)) : null;
  const terendah = beriNilai.length ? Math.min(...beriNilai.map((r) => r.nilai as number)) : null;
  const blmDiperiksa = baris.filter((r) => r.sub && statusTugas(r.sub) === "belum-diperiksa").length;
  const blmMengerjakan = baris.filter((r) => !r.sub).length;
  const tugasTerpilih = tugasId === "semua" ? null : assignments.find((a) => a.id === tugasId) || null;

  return (
    <div>
      {/* Kartu ringkasan global (mengikuti penyaring yang sedang aktif). */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <Stat label="Rata-rata nilai" value={String(rata)} sub={`dari ${beriNilai.length} kiriman bernilai`} />
        <Stat label="Kiriman dinilai" value={String(beriNilai.length)} sub="sudah memiliki nilai" />
        <Stat label="Belum diperiksa" value={String(blmDiperiksa)} sub="kiriman menunggu pemeriksaan guru" />
        <Stat label="Belum mengerjakan" value={String(blmMengerjakan)} sub="siswa di kelas tugas (roster)" />
      </div>

      {/* Papan langkah penyaring bertingkat (mengikuti papan Penilaian LKPD). */}
      <div className="card mb-3 !py-3">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <div>
            <span className="label">1 · Jenis</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button
                  key={c.key}
                  className={`btn !py-1.5 !px-3 !text-[12.5px] ${filter === c.key ? "bg-ink text-white border border-ink" : "btn-ghost"}`}
                  onClick={() => { setFilter(c.key); setTugasId("semua"); }}
                >{c.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="rekap-kelas">2 · Kelas</label>
            <select id="rekap-kelas" className="input !w-auto mt-1" value={kelas} onChange={(e) => { setKelas(e.target.value); setTugasId("semua"); }}>
              <option value="semua">Semua kelas</option>
              {opsiKelas.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="rekap-tugas">3 · Tugas</label>
            <select id="rekap-tugas" className="input !w-auto mt-1" value={tugasId} onChange={(e) => setTugasId(e.target.value)}>
              <option value="semua">Semua tugas</option>
              {opsiTugas.map((t) => <option key={t.id} value={t.id}>{t.label} ({t.jumlah})</option>)}
            </select>
          </div>
          <div className="min-w-[200px]">
            <label className="label" htmlFor="rekap-cari">4 · Cari nama</label>
            <input id="rekap-cari" className="input mt-1" placeholder="Nama siswa…" value={cari} onChange={(e) => setCari(e.target.value)} />
          </div>
        </div>

        {/* Ringkasan tugas terpilih (atau seluruh tugas tersaring bila "Semua tugas"). */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2 text-[12.5px] text-ink-muted">
          <span className="font-medium text-ink">{tugasTerpilih ? `Ringkasan — ${tugasTerpilih.judul}` : "Ringkasan semua tugas tersaring"}</span>
          <span>Rata-rata: <b className="text-ink">{rata}</b></span>
          {tertinggi != null ? <span>Tertinggi–terendah: <b className="text-ink">{tertinggi}–{terendah}</b></span> : null}
          <span>Dinilai: <b className="text-ink">{beriNilai.length}</b></span>
          <span>Belum diperiksa: <b className="text-ink">{blmDiperiksa}</b></span>
          <span>Belum mengerjakan: <b className="text-ink">{blmMengerjakan}</b></span>
          {sort ? <button className="text-primary font-medium" onClick={() => setSort(null)}>reset urutan</button> : <span className="text-ink-faint">Urut baku: jenis tugas → nama siswa</span>}
        </div>
      </div>

      {/* Keterangan tujuan halaman — pemeriksaan tetap di "Hasil Siswa" (/periksa). */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-wash/60 px-3.5 py-2.5">
        <p className="text-[12.5px] text-ink-muted max-w-[720px]">
          Halaman ini untuk melihat nilai &amp; rekap. Untuk memeriksa jawaban per soal dan menerbitkan nilai → menu <b>Hasil Siswa</b>.
        </p>
        <Link href="/periksa" className="btn-ghost !py-1.5 !text-[12.5px] ml-auto">Buka Hasil Siswa →</Link>
      </div>

      {urutRekap.length === 0 ? (
        submissions.length === 0 ? (
          <Empty title="Belum ada kiriman" desc="Rekap nilai akan muncul begitu siswa mengumpulkan latihan, LKPD, atau evaluasi." />
        ) : (
          <Empty title="Tidak ada data yang cocok" desc="Longgarkan penyaring pada papan di atas (jenis / kelas / tugas) atau hapus kata kunci pencarian." />
        )
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[820px]">
              <thead><tr className="text-left text-[12px] text-ink-muted bg-wash/50">
                {th("siswa", "Siswa")}
                {th("kelas", "Kelas")}
                {th("tugas", "Tugas")}
                <th className="px-4 py-2.5 font-medium">Jenis</th>
                {th("nilai", "Nilai")}
                {th("status", "Status")}
                {th("waktu", "Dikumpulkan")}
                <th className="px-4 py-2.5" />
              </tr></thead>
              <tbody>
                {(() => {
                  let lastTipe: AssignmentType | null = null;
                  return urutRekap.map((r) => {
                    const meta = STATUS_TUGAS_META[statusTugas(r.sub)];
                    // Kelompok jenis tugas hanya pada tampilan baku tanpa sort khusus.
                    const showHead = !sort && filter === "semua" && r.tipe !== lastTipe;
                    lastTipe = r.tipe;
                    return (
                      <Fragment key={r.key}>
                        {showHead ? (
                          <tr><td colSpan={8} className="px-4 pt-3 pb-1 text-[12px] font-semibold uppercase tracking-wide text-ink-faint bg-wash/40">{TIPE_LABEL[r.tipe]} · {urutRekap.filter((x) => x.tipe === r.tipe).length} baris</td></tr>
                        ) : null}
                        <tr className="table-row">
                          <td className="px-4 py-2.5">
                            <b>{r.siswaNama}</b>
                            {!r.sub ? <span className="block text-[12px] text-ink-muted">belum mengumpulkan</span> : null}
                          </td>
                          <td className="px-4 py-2.5">{r.kelas}</td>
                          <td className="px-4 py-2.5">{r.judul || <span className="italic text-ink-faint">Tugas sudah dihapus</span>}</td>
                          <td className="px-4 py-2.5"><Badge tone={TIPE_TONE[r.tipe]}>{TIPE_LABEL[r.tipe]}</Badge></td>
                          <td className="px-4 py-2.5 font-semibold">{r.nilai ?? "—"}</td>
                          <td className="px-4 py-2.5">
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                            {r.sub?.feedbackGuru ? <span title="Feedback guru tersimpan"> 💬</span> : null}
                            {r.sub && r.sub.cheatCount > 0 ? <span title={`${labelCheat(r.sub.cheatCount)} pelanggaran pindah tab tercatat`}> ⚠️ {labelCheat(r.sub.cheatCount)}</span> : null}
                          </td>
                          <td className="px-4 py-2.5 text-ink-muted">{r.sub ? fmtDateTime(r.sub.submittedAt) : "—"}</td>
                          <td className="px-4 py-2.5 text-right">
                            {r.sub && r.assignmentId ? (
                              <Link href="/periksa" className="btn-ghost !py-1.5 !text-[12.5px]" title="Periksa jawaban di menu Hasil Siswa">Periksa</Link>
                            ) : (
                              <span className="text-[12px] text-ink-faint">—</span>
                            )}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
