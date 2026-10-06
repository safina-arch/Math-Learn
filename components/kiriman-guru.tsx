"use client";

import { Fragment, useRef, useState } from "react";
import { Badge, Empty, Modal, Stat } from "@/components/ui";
import { HasilLkpdGuru, barisHasil } from "@/components/lkpd/hasil";
import { useStore } from "@/lib/store";
import { fmtDateTime, STATUS_TUGAS_META, statusRingkasan, statusTugas, TIPE_LABEL, TIPE_TONE, TIPEURUT } from "@/lib/utils";
import type { AssignmentType, MaterialAttachment } from "@/lib/types";

type FilterTipe = "semua" | AssignmentType;
type FilterStatus = "semua" | "belum-diperiksa" | "sudah";
type SortKey = "siswa" | "tugas" | "kelas" | "status" | "nilai" | "waktu";

const URUT_STATUS: Record<import("@/lib/utils").StatusTugas, number> = { belum: 0, "belum-diperiksa": 1, sudah: 2 };

/**
 * Rotasi foto DITENKAN ke dalam file (bukan sekadar CSS) — hasilnya semua yang
 * membuka foto (siswa, guru, admin, perangkat lain) melihat orientasi yang sama.
 * Elemen browser memakai orientasi EXIF asli, sehingga putaran sesuai tampilan.
 * `null` = gagal (mis. CORS) → pemanggil mempertahankan rotasi tampilan.
 */
async function bakeRotation(file: MaterialAttachment, deg: number): Promise<MaterialAttachment | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const loaded = await new Promise<boolean>((res) => {
      img.onload = () => res(true);
      img.onerror = () => res(false);
      img.src = file.url;
    });
    if (!loaded || !img.naturalWidth || !img.naturalHeight) return null;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const putar = ((deg % 360) + 360) % 360;
    const tukarSisi = putar === 90 || putar === 270;
    const canvas = document.createElement("canvas");
    canvas.width = tukarSisi ? h : w;
    canvas.height = tukarSisi ? w : h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((putar * Math.PI) / 180);
    ctx.drawImage(img, -w / 2, -h / 2);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.92));
    if (!blob) return null;
    const form = new FormData();
    const nama = (file.name || "foto-jawaban").replace(/\.[a-z0-9]+$/i, "") + "-rotasi.jpg";
    form.append("file", new File([blob], nama, { type: "image/jpeg" }));
    const r = await fetch("/api/upload", { method: "POST", body: form });
    const j = (await r.json()) as { url?: string; name?: string; size?: number; error?: string };
    if (!r.ok || !j.url) return null;
    return { ...file, url: j.url, name: j.name || file.name, size: j.size ?? file.size };
  } catch {
    return null;
  }
}

/**
 * Panel penilaian LATIHAN & EVALUASI untuk guru/admin — tata letaknya mengikuti
 * **Penilaian LKPD (Learning Journey)**: papan langkah penyaring bertingkat
 * (Jenis → Kelas → Tugas → Status) di atas tabel yang bisa diurutkan per kolom,
 * sehingga seluruh kiriman siswa mudah dicari, disaring, dan diperiksa.
 *
 * Dipakai bersama oleh halaman `/periksa` (Hasil siswa) dan `/nilai` (Nilai siswa)
 * — termasuk admin, yang sebelumnya tidak punya pintu ke pemeriksaan kiriman.
 */
export function HasilKirimanGuru() {
  const {
    submissions, assignments, users, user, lkpdTopics, lkpdProgress,
    updateSubmission, deleteSubmission, addNotification, syncError,
  } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const [nilai, setNilai] = useState("");
  const [catatan, setCatatan] = useState("");
  const [aiEdits, setAiEdits] = useState<Record<string, { skor: number; feedback: string }>>({});
  const [filter, setFilter] = useState<FilterTipe>("semua");
  const [kelas, setKelas] = useState("semua");
  const [tugasId, setTugasId] = useState("semua");
  const [status, setStatus] = useState<FilterStatus>("semua");
  /** Foto yang sedang dirotasi ke dalam file (tombol putar dinonaktifkan sementara). */
  const [rotasiProses, setRotasiProses] = useState<Record<string, boolean>>({});
  /** Mirror kiriman terbaru agar hasil upload lambat tidak menimpa perubahan lain. */
  const submisiRef = useRef(submissions);
  submisiRef.current = submissions;
  /** Sorting kolom; kelompok jenis tugas hanya dijaga saat tampilan baku. */
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);

  const current = submissions.find((s) => s.id === openId);
  const currentAssign = current ? assignments.find((a) => a.id === current.assignmentId) : null;
  const ringkas = statusRingkasan(assignments, submissions, users);

  const tipeOf = (sid: string): AssignmentType => assignments.find((x) => x.id === sid)?.tipe || "latihan";
  const judulDari = (sid: string) => assignments.find((x) => x.id === sid)?.judul || "";
  const kunciSort = (s: (typeof submissions)[number], key: SortKey): string | number => {
    if (key === "siswa") return s.siswaNama.toLowerCase();
    if (key === "tugas") return judulDari(s.assignmentId).toLowerCase();
    if (key === "kelas") return s.kelas.toLowerCase();
    if (key === "nilai") return s.nilai ?? -1;
    if (key === "status") return URUT_STATUS[statusTugas(s)];
    return s.submittedAt;
  };

  // Penyaring bertingkat (mirip Materi → Sub bab pada LKPD): jenis → kelas → tugas → status.
  // Kiriman yang assignment-nya sudah dihapus TIDAK dibuang — tetap tampil dengan label
  // "Tugas sudah dihapus" supaya hasil siswa tidak pernah lenyap dari pandangan guru.
  const punyaTugas = (s: (typeof submissions)[number]) => assignments.some((a) => a.id === s.assignmentId);
  const berelasi = submissions;
  const opsiKelas = Array.from(new Set(berelasi.map((s) => s.kelas))).sort((a, b) => a.localeCompare(b, "id"));
  const opsiTugas = assignments
    .filter((a) => filter === "semua" || a.tipe === filter)
    .map((a) => ({ id: a.id, label: `${TIPE_LABEL[a.tipe]} · ${a.judul}`, jumlah: berelasi.filter((s) => s.assignmentId === a.id).length }));

  const urutKiriman = berelasi
    .filter((s) => filter === "semua" || tipeOf(s.assignmentId) === filter)
    .filter((s) => kelas === "semua" || s.kelas === kelas)
    .filter((s) => tugasId === "semua" || s.assignmentId === tugasId)
    .filter((s) => status === "semua" || statusTugas(s) === status)
    .slice()
    .sort((a, b) => {
      // Baku: kelompok jenis tugas → nama siswa. Saat user memilih kolom, urutan
      // mengikuti kolom itu penuh (tanpa pengelompokan) supaya sort terasa wajar.
      if (!sort) {
        const t = TIPEURUT[tipeOf(a.assignmentId)] - TIPEURUT[tipeOf(b.assignmentId)];
        if (t) return t;
        return a.siswaNama.localeCompare(b.siswaNama, "id") || b.submittedAt.localeCompare(a.submittedAt);
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

  const hitungTipe = (t: AssignmentType) => berelasi.filter((s) => tipeOf(s.assignmentId) === t).length;
  /** Chip LKPD ikut menghitung penilaian journey LKPD (per sub-bab), bukan hanya kiriman tugas lama. */
  const lkpdJourney = barisHasil(lkpdTopics, lkpdProgress, users).length;
  const chips: { key: FilterTipe; label: string }[] = [
    { key: "semua", label: `Semua (${berelasi.length + lkpdJourney})` },
    { key: "latihan", label: `${TIPE_LABEL.latihan} (${hitungTipe("latihan")})` },
    { key: "lkpd", label: `${TIPE_LABEL.lkpd} (${hitungTipe("lkpd") + lkpdJourney})` },
    { key: "evaluasi", label: `${TIPE_LABEL.evaluasi} (${hitungTipe("evaluasi")})` },
  ];

  const dinilai = urutKiriman.filter((s) => s.nilai != null);
  const rata = dinilai.length ? Math.round(dinilai.reduce((n, s) => n + (s.nilai || 0), 0) / dinilai.length) : "—";
  const menunggu = urutKiriman.filter((s) => statusTugas(s) !== "sudah");
  const berikutnya = menunggu[0] || null;
  /** Kiriman yang tugasnya sudah dihapus — tetap ditampilkan agar hasil tidak hilang. */
  const yatim = urutKiriman.filter((s) => !punyaTugas(s)).length;

  function open(sid: string) {
    const s = submissions.find((x) => x.id === sid);
    if (!s) return;
    setNilai(s.nilai != null ? String(s.nilai) : "");
    setCatatan(s.feedbackGuru || "");
    const e: Record<string, { skor: number; feedback: string }> = {};
    // Guard: data lama bisa tanpa feedbackAi — jangan sampai modal gagal dibuka.
    Object.entries(s.feedbackAi || {}).forEach(([k, v]) => {
      if (v) e[k] = { skor: v.skor, feedback: v.feedback };
    });
    setAiEdits(e);
    setOpenId(sid);
  }

  function publish() {
    if (!current) return;
    const patchedAi: typeof current.feedbackAi = { ...(current.feedbackAi || {}) };
    Object.entries(aiEdits).forEach(([k, v]) => {
      // Batas nilai per soal dan nilai akhir: 0–100.
      if (patchedAi[k]) patchedAi[k] = { ...patchedAi[k], skor: Math.min(100, Math.max(0, Math.round(v.skor) || 0)), feedback: v.feedback, draft: false };
    });
    const n = nilai === "" ? current.nilai : Math.min(100, Math.max(0, Math.round(Number(nilai) || 0)));
    // Tanda `diperiksa` inilah yang membuat status berubah jadi "Sudah diperiksa" —
    // penilaian otomatis sistem sebelumnya tidak pernah dianggap sudah diperiksa.
    updateSubmission(current.id, {
      nilai: n, feedbackGuru: catatan, feedbackAi: patchedAi, status: "dinilai",
      diperiksa: true, diperiksaPada: new Date().toISOString(),
    });
    addNotification({ userId: current.siswaId, kategori: "nilai", judul: "Kiriman sudah diperiksa guru", isi: `${currentAssign?.judul}: nilai ${n} — status "Sudah diperiksa". ${catatan.slice(0, 100)}` });
    setOpenId(null);
  }

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <Stat label="Belum diperiksa" value={String(ringkas.blm)} sub="kiriman menunggu pemeriksaan" />
        <Stat label="Sudah diperiksa" value={String(ringkas.sudah)} sub="nilai sudah diterbitkan" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="h2">📋 Penilaian latihan &amp; evaluasi</h2>
        <Badge tone="blue">{berelasi.length} kiriman</Badge>
        {menunggu.length ? <Badge tone="amber">{menunggu.length} menunggu pemeriksaan</Badge> : null}
      </div>
      <p className="muted mb-3 max-w-[720px]">
        Pilih <b>Jenis → Kelas → Tugas → Status</b> untuk menyaring, lalu klik kolom apa pun untuk mengurutkan.
        Klik <b>👁 Periksa</b> pada baris siswa: lihat seluruh soal + jawaban + kunci → sunting nilai/feedback →{" "}
        <b>Setujui &amp; terbitkan</b>. Status baris berubah dari <b>Belum diperiksa</b> menjadi <b>Sudah diperiksa</b>.
      </p>

      {syncError ? (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
          ⚠️ Sinkronisasi bermasalah — <b>{syncError}</b>. Data akan dikirim ulang otomatis.
        </div>
      ) : null}

      {/* Papan langkah penyaring (mengikuti papan Penilaian LKPD Journey) */}
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
            <label className="label" htmlFor="kiriman-kelas">2 · Kelas</label>
            <select id="kiriman-kelas" className="input !w-auto mt-1" value={kelas} onChange={(e) => setKelas(e.target.value)}>
              <option value="semua">Semua kelas</option>
              {opsiKelas.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="kiriman-tugas">3 · Tugas / evaluasi</label>
            <select id="kiriman-tugas" className="input !w-auto mt-1" value={tugasId} onChange={(e) => setTugasId(e.target.value)}>
              <option value="semua">Semua tugas</option>
              {opsiTugas.map((t) => <option key={t.id} value={t.id}>{t.label} ({t.jumlah})</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="kiriman-status">4 · Status</label>
            <select id="kiriman-status" className="input !w-auto mt-1" value={status} onChange={(e) => setStatus(e.target.value as FilterStatus)}>
              <option value="semua">Semua status</option>
              <option value="belum-diperiksa">Belum diperiksa</option>
              <option value="sudah">Sudah diperiksa</option>
            </select>
          </div>
          <div className="ml-auto">
            <span className="label">5 · Periksa</span>
            <div className="mt-1">
              {berikutnya && (user?.role === "guru" || user?.role === "admin") ? (
                <button className="btn-primary !py-2 !text-[13px]" onClick={() => open(berikutnya.id)}>
                  👁 Periksa berikutnya ({menunggu.length})
                </button>
              ) : (
                <span className="text-[12.5px] text-ink-faint">Tidak ada yang menunggu</span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2 text-[12.5px] text-ink-muted">
          <span>Rata-rata nilai: <b className="text-ink">{rata}</b></span>
          <span>{dinilai.length} dari {urutKiriman.length} kiriman punya nilai</span>
          <span>Menunggu pemeriksaan: <b className="text-ink">{menunggu.length}</b></span>
          <span>Sudah diperiksa: <b className="text-ink">{urutKiriman.length - menunggu.length}</b></span>
          {yatim ? <span className="text-amber-700">Tugas terhapus: <b>{yatim}</b> (tetap ditampilkan)</span> : null}
          {sort ? <button className="text-primary font-medium" onClick={() => setSort(null)}>reset urutan</button> : <span className="text-ink-faint">Urut baku: jenis tugas → nama siswa</span>}
        </div>
      </div>

      {/* Papan langkah penilaian LKPD (Nilai siswa → LKPD → Materi → Sub bab → Verifikasi). */}
      {filter === "lkpd" ? <HasilLkpdGuru /> : null}

      {filter === "lkpd" ? null : urutKiriman.length === 0 ? (
        berelasi.length === 0 ? (
          <Empty title="Belum ada kiriman" desc="Kiriman siswa dari latihan dan evaluasi akan muncul di sini." />
        ) : (
          <Empty title="Tidak ada kiriman yang cocok" desc="Longgarkan penyaring pada papan di atas (kelas / tugas / status)." />
        )
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px] min-w-[860px]">
              <thead><tr className="text-left text-[12px] text-ink-muted bg-wash/50">
                {th("siswa", "Siswa")}
                <th className="px-4 py-2.5 font-medium">Jenis</th>
                {th("tugas", "Tugas / evaluasi")}
                {th("kelas", "Kelas")}
                {th("status", "Status")}
                {th("nilai", "Nilai")}
                {th("waktu", "Dikumpulkan")}
                <th className="px-4 py-2.5" />
              </tr></thead>
              <tbody>
                {(() => {
                  let lastTipe: AssignmentType | null = null;
                  return urutKiriman.map((s) => {
                    const a = assignments.find((x) => x.id === s.assignmentId);
                    const tipe = tipeOf(s.assignmentId);
                    const meta = STATUS_TUGAS_META[statusTugas(s)];
                    // Kelompok jenis tugas hanya pada tampilan baku tanpa sort khusus.
                    const showHead = !sort && filter === "semua" && tipe !== lastTipe;
                    lastTipe = tipe;
                    return (
                      <Fragment key={s.id}>
                        {showHead ? (
                          <tr><td colSpan={8} className="px-4 pt-3 pb-1 text-[12px] font-semibold uppercase tracking-wide text-ink-faint bg-wash/40">{TIPE_LABEL[tipe]} · {urutKiriman.filter((x) => tipeOf(x.assignmentId) === tipe).length} kiriman</td></tr>
                        ) : null}
                        <tr className="table-row">
                          <td className="px-4 py-2.5"><b>{s.siswaNama}</b><span className="block text-[12px] text-ink-muted">{s.kelas}</span></td>
                          <td className="px-4 py-2.5"><Badge tone={TIPE_TONE[tipe]}>{TIPE_LABEL[tipe]}</Badge></td>
                          <td className="px-4 py-2.5">{a?.judul || <span className="italic text-ink-faint">Tugas sudah dihapus</span>}</td>
                          <td className="px-4 py-2.5">{s.kelas}</td>
                          <td className="px-4 py-2.5">
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                            {s.feedbackGuru ? <span title="Feedback guru tersimpan"> 💬</span> : null}
                            {s.cheatCount ? <span title={`${s.cheatCount}x pindah tab tercatat`}> ⚠️</span> : null}
                          </td>
                          <td className="px-4 py-2.5 font-semibold">{s.nilai ?? "—"}</td>
                          <td className="px-4 py-2.5 text-ink-muted">{fmtDateTime(s.submittedAt)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button className="btn-ghost !py-1.5 !text-[12.5px]" disabled={!a} title={a ? "Buka jawaban siswa" : "Tugas sudah dihapus"} onClick={() => a && open(s.id)}>👁 Periksa</button>
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

      <Modal open={!!current} onClose={() => setOpenId(null)} title={`Periksa — ${current?.siswaNama}`} wide>
        {current && currentAssign ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={TIPE_TONE[currentAssign.tipe]}>{TIPE_LABEL[currentAssign.tipe]}</Badge>
              <span className="text-[13px] text-ink-muted">{currentAssign.judul} · {current.kelas}</span>
              <Badge tone={STATUS_TUGAS_META[statusTugas(current)].tone}>{STATUS_TUGAS_META[statusTugas(current)].label}</Badge>
              {current.cheatCount ? <Badge tone="red">{current.cheatCount}x pindah tab</Badge> : null}
            </div>
            {currentAssign.questions.map((q, i) => (
              <div key={q.id} className="rounded-xl border border-line p-3.5">
                <p className="text-[12.5px] text-ink-muted font-medium">SOAL {i + 1} · {q.tipe.toUpperCase()} · bobot {q.bobot}</p>
                <p className="text-[14px] font-medium mt-0.5 whitespace-pre-wrap">{q.teks}</p>
                {q.gambar?.length ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {q.gambar.map((g, gi) => (
                      <a key={`${g.url}-${gi}`} href={g.url} target="_blank" rel="noreferrer" title={g.name}>
                        <img src={g.url} alt={g.name || "Foto soal"} className="max-h-44 rounded-lg border border-line object-contain bg-white" />
                      </a>
                    ))}
                  </div>
                ) : null}
                {q.kunci ? <p className="text-[12.5px] text-ink-muted mt-1">Kunci: {q.kunci}{q.rubrik ? ` · Rubrik: ${q.rubrik}` : ""}</p> : null}
                <p className="text-[13.5px] mt-2 bg-wash border border-line rounded-lg px-3 py-2 whitespace-pre-wrap">{current.jawaban[q.id] || "(kosong)"}</p>
                {current.jawabanLampiran?.[q.id]?.length ? (
                  <div className="mt-2">
                    <p className="text-[12px] text-ink-muted mb-1.5">Foto jawaban siswa</p>
                    <div className="flex flex-wrap gap-3">
                      {current.jawabanLampiran[q.id].map((file, index) => {
                        const deg = current.fotoRotasi?.[file.url] ?? 0;
                        const memasak = Boolean(rotasiProses[file.url]);
                        const rotate = (next: number) => {
                          if (!current || memasak) return;
                          const n = ((next % 360) + 360) % 360;
                          const urlLama = file.url;
                          // 1) Tampilan langsung berputar (responsif).
                          updateSubmission(current.id, { fotoRotasi: { ...(current.fotoRotasi || {}), [urlLama]: n } });
                          // 2) Putaran ditulis ke file baru — orientasi ikut tersimpan,
                          //    sehingga siswa/admin juga melihat hasil rotasi yang sama.
                          setRotasiProses((p) => ({ ...p, [urlLama]: true }));
                          void bakeRotation(file, n).then((baru) => {
                            setRotasiProses((p) => { const c = { ...p }; delete c[urlLama]; return c; });
                            if (!baru) return; // gagal (mis. CORS) → tetap memakai rotasi tampilan
                            const segar = submisiRef.current.find((x) => x.id === current.id);
                            if (!segar) return;
                            const daftar = [...(segar.jawabanLampiran?.[q.id] || [])];
                            daftar[index] = baru;
                            const rotasi = { ...(segar.fotoRotasi || {}) };
                            delete rotasi[urlLama];
                            updateSubmission(current.id, { jawabanLampiran: { ...(segar.jawabanLampiran || {}), [q.id]: daftar }, fotoRotasi: rotasi });
                          });
                        };
                        return (
                          <div key={`${file.url}-${index}`} className="w-24">
                            <a href={file.url} target="_blank" rel="noreferrer" title={`${file.name} — klik untuk membuka ukuran penuh`} className="block">
                              <img
                                src={file.url}
                                alt={file.name || "Foto jawaban siswa"}
                                className="h-24 w-24 rounded-lg border border-line bg-white object-contain transition-transform"
                                style={{ transform: `rotate(${deg}deg)` }}
                              />
                            </a>
                            <div className="flex justify-center gap-1 mt-1">
                              <button type="button" aria-label="Putar kiri" title={memasak ? "Memproses…" : "Putar kiri"} disabled={memasak} className="h-6 w-6 rounded border border-line bg-white text-[13px] text-ink-muted hover:border-primary-300 hover:text-primary disabled:opacity-50" onClick={() => rotate(deg - 90)}>⟲</button>
                              <button type="button" aria-label="Putar kanan" title={memasak ? "Memproses…" : "Putar kanan"} disabled={memasak} className="h-6 w-6 rounded border border-line bg-white text-[13px] text-ink-muted hover:border-primary-300 hover:text-primary disabled:opacity-50" onClick={() => rotate(deg + 90)}>⟳</button>
                              <span className="h-6 px-1.5 inline-flex items-center text-[11px] text-ink-faint tabular-nums">{memasak ? "…" : `${((deg % 360) + 360) % 360}°`}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                <div className="grid sm:grid-cols-[100px_1fr] gap-2 mt-2">
                  <div>
                    <div className="flex items-center justify-between"><label className="label">Persentase AI</label><span className="text-[12px] font-semibold text-primary">{aiEdits[q.id]?.skor ?? 0}%</span></div>
                    <input type="number" min={0} max={100} className="input" value={aiEdits[q.id]?.skor ?? 0} onChange={(e) => setAiEdits((p) => ({ ...p, [q.id]: { skor: Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0))), feedback: p[q.id]?.feedback || "" } }))} />
                    <div className="h-1.5 rounded-full bg-wash mt-1.5 overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, aiEdits[q.id]?.skor ?? 0))}%` }} /></div>
                  </div>
                  <div><label className="label">Draf umpan balik (sunting bila perlu)</label><input className="input" value={aiEdits[q.id]?.feedback || ""} onChange={(e) => setAiEdits((p) => ({ ...p, [q.id]: { skor: p[q.id]?.skor || 0, feedback: e.target.value } }))} /></div>
                </div>
              </div>
            ))}
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Nilai akhir (override · maks. 100)</label><input type="number" min={0} max={100} className="input" value={nilai} onChange={(e) => setNilai(e.target.value === "" ? "" : String(Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0)))))} placeholder="0–100" /></div>
              <div><label className="label">Umpan balik akhir untuk siswa</label><input className="input" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="1–2 kalimat apresiasi + saran" /></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary flex-1" onClick={publish}>Setujui &amp; terbitkan</button>
              <button className="btn-ghost" onClick={() => setOpenId(null)}>Batal</button>
            </div>
            <div className="rounded-xl border border-line bg-wash/60 px-3.5 py-3">
              <p className="text-[13px] font-semibold">Butuh kesempatan ulang?</p>
              <p className="muted !text-[12.5px] mt-0.5">
                Evaluasi &amp; latihan dikerjakan satu kali. Menghapus kiriman di sini membuka kembali pengerjaan siswa
                (jawaban lama ikut terhapus dari data).
              </p>
              <button
                className="btn-danger !py-1.5 !text-[12.5px] mt-2"
                onClick={() => {
                  if (!current) return;
                  if (confirm(`Hapus kiriman ${current.siswaNama} untuk "${currentAssign?.judul}"? Siswa bisa mengerjakan ulang.`)) {
                    deleteSubmission(current.id);
                    setOpenId(null);
                  }
                }}
              >🗑 Hapus kiriman (izinkan mengerjakan ulang)</button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
