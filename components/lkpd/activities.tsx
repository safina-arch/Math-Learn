"use client";

import { useState } from "react";
import type { LkpdAktivitas } from "@/lib/types";
import { selSama } from "@/lib/lkpd";

/** State tersimpan per aktivitas — di-restore saat siswa kembali ke mission. */
type NilaiAktivitas = {
  /** seret-slot lama: id kartu yang sudah masuk (satu) area. */
  diArea?: string[];
  /** seret-slot baru: posisi tiap kartu (kartuId → areaId); absen = masih di pool. */
  posisi?: Record<string, string>;
  pasang?: Record<string, string>;
  val?: Record<string, string>;
  /** urutkan: susunan kartu versi siswa. */
  urutan?: string[];
  /** benar-salah: pilihan per pernyataan ("true"/"false"). */
  pilih?: Record<string, string>;
  dicek?: boolean;
} | null;

function parseNilai(nilai?: string): NilaiAktivitas {
  if (!nilai) return null;
  try {
    const o = JSON.parse(nilai);
    return o && typeof o === "object" ? (o as NonNullable<NilaiAktivitas>) : null;
  } catch {
    return null;
  }
}

/** Palet warna pasangan cocokkan (warna ringan — teks tetap terbaca di atasnya). */
export const PALET_PASANGAN = [
  "#DBEAFE", // biru
  "#DCFCE7", // hijau
  "#FEF3C7", // kuning
  "#FCE7F3", // merah muda
  "#E0E7FF", // nila
  "#CCFBF1", // toska
  "#FED7AA", // oranye
  "#E9D5FF", // ungu
];

/** Warna satu pasangan: custom guru bila ada, kalau tidak palet otomatis per urutan. */
export function warnaPasangan(a: LkpdAktivitas, kiriId: string): string {
  const custom = a.warnaPasangan?.[kiriId];
  if (custom) return custom;
  const idx = (a.kiri || []).findIndex((k) => k.id === kiriId);
  return PALET_PASANGAN[(idx < 0 ? 0 : idx) % PALET_PASANGAN.length];
}

/** Daftar area tujuan seret-slot — fallback ramah data lama (`area` tunggal); tanpa keduanya = 2 area bawaan. */
export function daftarAreas(a: LkpdAktivitas): { id: string; nama: string }[] {
  if (a.areas?.length) return a.areas;
  if (a.area) return [{ id: "a0", nama: a.area }];
  return [{ id: "a0", nama: "Area 1" }, { id: "a1", nama: "Area 2" }];
}

/**
 * Router aktivitas interaktif — satu komponen untuk semua jenis LKPD.
 * `nilai`/`onNilai`: jawaban siswa disimpan ke progres sehingga bolak-balik tidak menghapusnya.
 */
export function Aktivitas({ a, nilai, onNilai }: { a: LkpdAktivitas; nilai?: string; onNilai?: (t: string) => void }) {
  const awal = parseNilai(nilai);
  if (a.tipe === "seret-slot") return <SeretSlot a={a} awal={awal} simpan={onNilai} />;
  if (a.tipe === "cocokkan") return <Cocokkan a={a} awal={awal} simpan={onNilai} />;
  if (a.tipe === "benar-salah") return <BenarSalah a={a} awal={awal} simpan={onNilai} />;
  if (a.tipe === "urutkan") return <Urutkan a={a} awal={awal} simpan={onNilai} />;
  return <IsiTabel a={a} awal={awal} simpan={onNilai} />;
}

/* ————————————— seret-slot: kartu dari pool → 2+ area tujuan (custom) ————————————— */
function SeretSlot({ a, awal, simpan }: { a: LkpdAktivitas; awal: NilaiAktivitas; simpan?: (t: string) => void }) {
  const kartu = a.kartu || [];
  const areas = daftarAreas(a);
  const [posisi, setPosisi] = useState<Record<string, string>>(() => {
    const p: Record<string, string> = {};
    if (awal?.posisi) {
      for (const [id, area] of Object.entries(awal.posisi)) {
        if (kartu.some((k) => k.id === id) && areas.some((x) => x.id === area)) p[id] = area;
      }
    } else {
      // Data lama (`diArea`): semua kartu di area pertama.
      for (const id of awal?.diArea || []) if (kartu.some((k) => k.id === id)) p[id] = areas[0].id;
    }
    return p;
  });
  const [pilih, setPilih] = useState<string | null>(null); // kartu terpilih — klik area untuk meletakkan
  const [dragId, setDragId] = useState<string | null>(null);
  const [sorotArea, setSorotArea] = useState<string | null>(null);
  const [riwayat, setRiwayat] = useState<Record<string, string>[]>([]); // tumpukan undo
  const [pesan, setPesan] = useState<string | null>(null);

  const sisa = kartu.filter((k) => !posisi[k.id]);
  const ditempatkan = kartu.filter((k) => posisi[k.id]);
  const adaKunci = kartu.some((k) => (k.kunciArea || "").trim());
  const semuaBenar = !adaKunci || ditempatkan.every((k) => !k.kunciArea || posisi[k.id] === k.kunciArea);
  const semuanya = kartu.length > 0 && sisa.length === 0;

  const terapkan = (next: Record<string, string>) => {
    setRiwayat((r) => [...r.slice(-29), posisi]);
    setPosisi(next);
    setPilih(null);
    simpan?.(JSON.stringify({ posisi: next }));
  };

  const letakkan = (kartuId: string, areaId: string) => {
    if (posisi[kartuId] === areaId) return;
    terapkan({ ...posisi, [kartuId]: areaId });
    setPesan(null);
  };

  const kembalikan = (kartuId: string) => {
    const next = { ...posisi };
    delete next[kartuId];
    terapkan(next);
  };

  const undo = () => {
    if (!riwayat.length) return;
    const prev = riwayat[riwayat.length - 1];
    setRiwayat(riwayat.slice(0, -1));
    setPosisi(prev);
    setPilih(null);
    simpan?.(JSON.stringify({ posisi: prev }));
  };

  return (
    <div className="card card-pad !bg-wash/50">
      <p className="text-[13.5px] font-semibold mb-0.5">🧩 {a.instruksi}</p>
      <p className="text-[12.5px] text-ink-faint mb-2">
        {pilih
          ? "✅ Kartu terpilih — klik area tujuan untuk meletakkannya."
          : "Seret kartu ke area, atau klik kartunya dulu lalu klik area (tanpa perlu mouse)."}
      </p>

      {/* Pool kartu — area awal sebelum dikelompokkan */}
      <div className="rounded-xl border border-dashed border-line bg-white px-3 py-2.5">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-2">🗂️ Kartu (area awal)</p>
        <div className="flex flex-wrap gap-2">
          {sisa.map((k) => (
            <button
              key={k.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", k.id);
                e.dataTransfer.effectAllowed = "move";
                setDragId(k.id);
              }}
              onDragEnd={() => { setDragId(null); setSorotArea(null); }}
              onClick={() => { setPilih(pilih === k.id ? null : k.id); setPesan(null); }}
              className={`btn bg-white border shadow-card cursor-grab active:cursor-grabbing hover:border-primary hover:shadow-pop transition-all ${
                pilih === k.id ? "border-primary ring-2 ring-primary-200 !bg-primary-50" : "border-line"
              } ${dragId === k.id ? "opacity-50" : ""}`}
              title="Seret ke area, atau klik lalu klik area tujuan"
            >
              👷 {k.label}
            </button>
          ))}
          {sisa.length === 0 ? <span className="text-[13px] text-ink-faint">Semua kartu sudah ditempatkan.</span> : null}
        </div>
      </div>

      {/* Area tujuan — grid 2+ (nama & jumlah dicustom guru) */}
      <div className={`grid gap-2.5 mt-3 ${areas.length === 1 ? "grid-cols-1" : "sm:grid-cols-2"}`}>
        {areas.map((ar) => {
          const isi = ditempatkan.filter((k) => posisi[k.id] === ar.id);
          return (
            <div
              key={ar.id}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setSorotArea(ar.id); }}
              onDragLeave={() => setSorotArea((v) => (v === ar.id ? null : v))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain") || dragId;
                setSorotArea(null);
                setDragId(null);
                if (id) letakkan(id, ar.id);
              }}
              onClick={() => {
                if (pilih) letakkan(pilih, ar.id);
                else setPesan("Pilih dulu salah satu kartu — lalu klik area ini.");
              }}
              className={`rounded-xl border-2 border-dashed p-2.5 min-h-[92px] transition-colors ${pilih ? "cursor-pointer" : ""} ${
                sorotArea === ar.id ? "border-primary bg-primary-100/60" : "border-primary-200 bg-primary-50/50"
              }`}
            >
              <p className="text-[12.5px] font-semibold text-primary mb-1.5">📍 {ar.nama}</p>
              <div className="flex flex-wrap gap-2">
                {isi.length === 0 ? (
                  <span className="text-[12.5px] text-ink-faint">{pilih ? "Klik untuk meletakkan kartu…" : "Taruh kartu di sini…"}</span>
                ) : (
                  isi.map((k) => {
                    const benarK = !k.kunciArea || posisi[k.id] === k.kunciArea;
                    return (
                      <div
                        key={k.id}
                        className={`rounded-lg border bg-white px-2.5 py-1.5 shadow-card ${adaKunci && k.kunciArea ? (benarK ? "border-green-400" : "border-red-400") : "border-line"}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <button
                            className="text-[13.5px] font-semibold text-left"
                            title="Pindahkan kartu ini ke area lain"
                            onClick={(e) => { e.stopPropagation(); setPilih(pilih === k.id ? null : k.id); setPesan(null); }}
                          >
                            {k.label}
                          </button>
                          {adaKunci && k.kunciArea ? (
                            <span className={`text-[12px] font-bold ${benarK ? "text-green-600" : "text-red-500"}`}>{benarK ? "✓" : "✗"}</span>
                          ) : null}
                          <button
                            className="text-[12px] text-ink-faint hover:text-ink"
                            title="Kembalikan ke area awal"
                            onClick={(e) => { e.stopPropagation(); kembalikan(k.id); }}
                          >↩</button>
                        </div>
                        <p className="text-[12.5px] text-ink-muted">{k.hasil}</p>
                        {k.feedback ? <p className="text-[12px] text-ink-faint">{k.feedback}</p> : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn-ghost !py-1.5 !text-[12.5px]" disabled={!riwayat.length} onClick={undo} title="Batalkan langkah terakhir">↶ Undo</button>
        <button
          className="btn-ghost !py-1.5 !text-[12.5px]"
          onClick={() => { setPosisi({}); setRiwayat([]); setPilih(null); setPesan(null); simpan?.(JSON.stringify({ posisi: {} })); }}
        >Reset</button>
        {pesan ? <span className="text-[12.5px] text-amber-700">{pesan}</span> : null}
        <span className="text-[12.5px] text-green-700 ml-auto">✓ Tersimpan otomatis</span>
      </div>

      {semuanya && a.temuan ? (
        semuaBenar ? (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-[13.5px] text-green-800">
            🎉 {a.temuan}
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13.5px] text-amber-800">
            Semua kartu sudah ditempatkan, tapi ada yang belum di area yang tepat — seret kartu untuk memperbaiki.
          </div>
        )
      ) : null}
    </div>
  );
}

/* ————————————————— cocokkan: pasangkan kolom kiri dengan kanan ————————————————— */
function Cocokkan({ a, awal, simpan }: { a: LkpdAktivitas; awal: NilaiAktivitas; simpan?: (t: string) => void }) {
  const kiri = a.kiri || [];
  const kanan = a.kanan || [];
  const [aktif, setAktif] = useState<string | null>(null);
  const [pasang, setPasang] = useState<Record<string, string>>(() => awal?.pasang || {});
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const selesai = kiri.length > 0 && kiri.every((k) => pasang[k.id]);

  const pilihKanan = (kananId: string) => {
    if (!aktif) { setPesan({ ok: false, teks: "Pilih dulu satu kartu di kolom kiri." }); return; }
    if ((a.pasangan || {})[aktif] === kananId) {
      const next = { ...pasang, [aktif]: kananId };
      setPasang(next);
      simpan?.(JSON.stringify({ pasang: next }));
      setPesan({ ok: true, teks: "Pasangan tepat! ✅" });
      setAktif(null);
    } else {
      setPesan({ ok: false, teks: a.feedbackSalah || "Belum tepat — coba pasangan lain." });
    }
  };

  const sudah = (kiriId: string) => Boolean(pasang[kiriId]);
  const kepakai = new Set(Object.values(pasang));
  // Warna pasangan terjodohkan: custom guru, atau palet otomatis per urutan baris.
  const warnaKiri = (kiriId: string) => (sudah(kiriId) ? warnaPasangan(a, kiriId) : undefined);
  const warnaKanan = (kananId: string): string | undefined => {
    const k = kiri.find((x) => pasang[x.id] === kananId);
    return k ? warnaPasangan(a, k.id) : undefined;
  };

  return (
    <div className="card card-pad !bg-wash/50">
      <p className="text-[13.5px] font-semibold mb-0.5">🧩 {a.instruksi}</p>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Kolom A</p>
          {kiri.map((k) => {
            const ok = sudah(k.id);
            return (
              <button
                key={k.id}
                disabled={ok}
                onClick={() => { setAktif(k.id); setPesan(null); }}
                style={ok ? { backgroundColor: warnaKiri(k.id) } : undefined}
                className={`w-full text-left rounded-lg border px-3 py-2 text-[13.5px] transition-colors ${ok ? "border-line font-medium" : aktif === k.id ? "border-primary bg-primary-50 text-primary font-semibold" : "bg-white border-line hover:border-primary-200"}`}
              >
                {k.label}{ok ? " ✓" : ""}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Kolom B</p>
          {kanan.map((k) => {
            const dipakai = kepakai.has(k.id);
            const warna = dipakai ? warnaKanan(k.id) : undefined;
            return (
              <button
                key={k.id}
                disabled={dipakai}
                onClick={() => pilihKanan(k.id)}
                style={warna ? { backgroundColor: warna } : undefined}
                className={`w-full text-left rounded-lg border px-3 py-2 text-[13.5px] transition-colors ${dipakai ? "border-line font-medium opacity-90" : "bg-white border-line hover:border-primary-200"}`}
              >
                {k.label}
              </button>
            );
          })}
        </div>
      </div>
      {pesan ? <p className={`mt-3 text-[13px] ${pesan.ok ? "text-green-700" : "text-amber-700"}`}>{pesan.teks}</p> : null}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[12.5px] text-green-700">✓ Pasangan tersimpan otomatis</span>
        <button className="btn-ghost !py-1 !text-[12px] ml-auto" onClick={() => { setPasang({}); simpan?.(JSON.stringify({ pasang: {} })); setPesan(null); }}>Ulangi</button>
      </div>
      {selesai ? <p className="mt-2 text-[13.5px] font-medium text-green-700">🎉 Semua pasangan benar — kamu menemukan pola kesetaraannya!</p> : null}
    </div>
  );
}

/* ————————————————— benar-salah: nilai tiap pernyataan ————————————————— */
function BenarSalah({ a, awal, simpan }: { a: LkpdAktivitas; awal: NilaiAktivitas; simpan?: (t: string) => void }) {
  const pernyataan = a.pernyataan || [];
  const [pilih, setPilih] = useState<Record<string, string>>(() => awal?.pilih || {});
  const [dicek, setDicek] = useState<boolean>(() => Boolean(awal?.dicek));
  const terjawab = (id: string) => pilih[id] === "true" || pilih[id] === "false";
  const lengkap = pernyataan.length > 0 && pernyataan.every((p) => terjawab(p.id));
  const benarSemua = lengkap && pernyataan.every((p) => pilih[p.id] === p.kunci);

  const jawab = (id: string, v: "true" | "false") => {
    const next = { ...pilih, [id]: v };
    setPilih(next);
    setDicek(false);
    simpan?.(JSON.stringify({ pilih: next, dicek: false }));
  };
  const periksa = () => {
    setDicek(true);
    simpan?.(JSON.stringify({ pilih, dicek: true }));
  };
  const ulangi = () => {
    setPilih({});
    setDicek(false);
    simpan?.(JSON.stringify({ pilih: {}, dicek: false }));
  };

  return (
    <div className="card card-pad !bg-wash/50">
      <p className="text-[13.5px] font-semibold mb-0.5">✅ {a.instruksi}</p>
      <p className="text-[12.5px] text-ink-faint mb-2">Pilih Benar atau Salah untuk tiap pernyataan.</p>
      <div className="space-y-2.5">
        {pernyataan.map((p, i) => {
          const dijawab = terjawab(p.id);
          const benarIni = dicek && dijawab && pilih[p.id] === p.kunci;
          const salahIni = dicek && dijawab && pilih[p.id] !== p.kunci;
          return (
            <div key={p.id} className={`rounded-xl border bg-white px-3 py-2.5 ${benarIni ? "border-green-400" : salahIni ? "border-red-400" : "border-line"}`}>
              <p className="text-[13.5px] mb-2">
                <span className="font-semibold text-ink-muted mr-1.5">{i + 1}.</span>
                {p.teks || <span className="text-ink-faint italic">Pernyataan belum diisi</span>}
              </p>
              <div className="flex gap-2">
                <button
                  className={`flex-1 rounded-lg border px-3 py-2 text-[13.5px] font-medium transition-colors ${pilih[p.id] === "true" ? "border-green-500 bg-green-50 text-green-700" : "border-line bg-white hover:border-green-400"}`}
                  onClick={() => jawab(p.id, "true")}
                >✓ Benar</button>
                <button
                  className={`flex-1 rounded-lg border px-3 py-2 text-[13.5px] font-medium transition-colors ${pilih[p.id] === "false" ? "border-red-500 bg-red-50 text-red-600" : "border-line bg-white hover:border-red-400"}`}
                  onClick={() => jawab(p.id, "false")}
                >✗ Salah</button>
              </div>
              {benarIni ? <p className="text-[12.5px] text-green-700 mt-1.5">{p.feedbackBenar || "Benar ✓"}</p> : null}
              {salahIni ? (
                <p className="text-[12.5px] text-red-600 mt-1.5">
                  {p.feedbackSalah || `Belum tepat — kuncinya: ${p.kunci === "true" ? "Benar" : "Salah"}.`}
                </p>
              ) : null}
            </div>
          );
        })}
        {pernyataan.length === 0 ? <p className="text-[13px] text-ink-faint italic">Belum ada pernyataan.</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn-primary !py-1.5 !text-[13px]" disabled={!lengkap} onClick={periksa}>Periksa jawaban</button>
        <button className="btn-ghost !py-1.5 !text-[13px]" onClick={ulangi}>Ulangi</button>
        {!lengkap ? <span className="text-[12.5px] text-ink-faint">Jawab semua pernyataan dulu.</span> : null}
        {dicek && lengkap ? (
          <span className={`text-[13px] font-medium ${benarSemua ? "text-green-700" : "text-amber-700"}`}>
            {benarSemua ? "🎉 Semua pernyataan tepat!" : "Sebagian belum tepat — perbaiki jawabanmu."}
          </span>
        ) : null}
        <span className="text-[12.5px] text-green-700 ml-auto">✓ Tersimpan otomatis</span>
      </div>
    </div>
  );
}

/* ————————————————— urutkan kartu: susun urutan, undo, periksa ————————————————— */
function Urutkan({ a, awal, simpan }: { a: LkpdAktivitas; awal: NilaiAktivitas; simpan?: (t: string) => void }) {
  const kartu = a.kartu || [];
  const susunanAwal = (): string[] => {
    const s = awal?.urutan || [];
    const valid = s.length === kartu.length && kartu.every((k) => s.includes(k.id));
    if (valid) return s;
    // Deterministik: urutan editor DIBALIK — tantangan tanpa acak, stabil antar sesi.
    return [...kartu].reverse().map((k) => k.id);
  };
  const [urutan, setUrutan] = useState<string[]>(susunanAwal);
  const [dicek, setDicek] = useState<boolean>(() => Boolean(awal?.dicek) && Boolean(awal?.urutan));
  const [riwayat, setRiwayat] = useState<string[][]>([]); // tumpukan undo
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const terapkan = (next: string[]) => {
    setRiwayat((r) => [...r.slice(-29), urutan]);
    setUrutan(next);
    setDicek(false);
    simpan?.(JSON.stringify({ urutan: next, dicek: false }));
  };

  const pindah = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= urutan.length) return;
    const next = [...urutan];
    [next[i], next[j]] = [next[j], next[i]];
    terapkan(next);
  };

  const jatuhkan = (dari: number | null, ke: number) => {
    setDragIdx(null);
    if (dari === null || dari === ke) return;
    const next = [...urutan];
    const [x] = next.splice(dari, 1);
    next.splice(ke, 0, x);
    terapkan(next);
  };

  const undo = () => {
    if (!riwayat.length) return;
    const prev = riwayat[riwayat.length - 1];
    setRiwayat(riwayat.slice(0, -1));
    setUrutan(prev);
    setDicek(false);
    simpan?.(JSON.stringify({ urutan: prev, dicek: false }));
  };

  const acakAwal = () => {
    const next = [...kartu].reverse().map((k) => k.id);
    setRiwayat([]);
    setUrutan(next);
    setDicek(false);
    simpan?.(JSON.stringify({ urutan: next, dicek: false }));
  };

  const periksa = () => {
    setDicek(true);
    simpan?.(JSON.stringify({ urutan, dicek: true }));
  };

  const baris = urutan.map((id, i) => ({ k: kartu.find((x) => x.id === id), posisi: i, ok: kartu[i]?.id === id }));
  const benarSemua = baris.length === kartu.length && baris.every((r) => r.ok);
  const salah = baris.filter((r) => !r.ok);

  return (
    <div className="card card-pad !bg-wash/50">
      <p className="text-[13.5px] font-semibold mb-0.5">🔢 {a.instruksi}</p>
      <p className="text-[12.5px] text-ink-faint mb-2">
        Susun kartu: seret barisnya, atau tekan tombol ↑ ↓. Semua langkah bisa dibatalkan dengan <b>Undo</b> — belum ada yang final.
      </p>

      <div className="space-y-2">
        {baris.map((r, i) => {
          if (!r.k) return null;
          return (
            <div
              key={urutan[i]}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", String(i));
                e.dataTransfer.effectAllowed = "move";
                setDragIdx(i);
              }}
              onDragEnd={() => setDragIdx(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const angka = Number(e.dataTransfer.getData("text/plain"));
                jatuhkan(Number.isInteger(angka) ? angka : dragIdx, i);
              }}
              className={`flex items-center gap-2.5 rounded-xl border bg-white px-3 py-2.5 shadow-card cursor-grab active:cursor-grabbing transition-colors ${
                dicek && r.ok
                  ? "border-green-400 bg-green-50/60"
                  : dicek && !r.ok
                    ? "border-red-400 bg-red-50/60"
                    : dragIdx === i
                      ? "border-primary opacity-60"
                      : "border-line"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                  dicek && r.ok ? "bg-green-100 text-green-700" : dicek && !r.ok ? "bg-red-100 text-red-600" : "bg-wash text-ink-muted"
                }`}
              >{i + 1}</span>
              <span className="flex-1 text-[13.5px] font-medium">{r.k.label}</span>
              {dicek ? <span className={`text-[13px] font-bold ${r.ok ? "text-green-600" : "text-red-500"}`}>{r.ok ? "✓" : "✗"}</span> : null}
              <button className="btn-ghost !px-2.5 !py-1.5 !text-[15px] leading-none" title="Naikkan" disabled={i === 0} onClick={() => pindah(i, -1)}>↑</button>
              <button className="btn-ghost !px-2.5 !py-1.5 !text-[15px] leading-none" title="Turunkan" disabled={i === baris.length - 1} onClick={() => pindah(i, 1)}>↓</button>
            </div>
          );
        })}
        {kartu.length === 0 ? <p className="text-[13px] text-ink-faint italic">Belum ada kartu.</p> : null}
      </div>

      {dicek && benarSemua ? (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-[13.5px] text-green-800">
          🎉 Urutan sudah tepat!
        </div>
      ) : null}
      {dicek && !benarSemua ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13.5px] text-amber-800">
          <p className="font-medium">Beberapa kartu belum tepat — perbaiki lalu periksa lagi.</p>
          {salah.filter((r) => r.k?.feedback).map((r) => (
            <p key={urutan[r.posisi]} className="text-[12.5px] mt-1">💡 {r.k?.feedback}</p>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn-primary !py-1.5 !text-[13px]" onClick={periksa}>Periksa urutan</button>
        <button className="btn-ghost !py-1.5 !text-[13.5px]" disabled={!riwayat.length} onClick={undo} title="Batalkan langkah terakhir">↶ Undo</button>
        <button className="btn-ghost !py-1.5 !text-[13px]" onClick={acakAwal}>↺ Ulangi dari awal</button>
        <span className="text-[12.5px] text-green-700 ml-auto">✓ Tersimpan otomatis</span>
      </div>
    </div>
  );
}

/* ————————————————— isi-tabel: isi sel kosong, uji pola ————————————————— */
function IsiTabel({ a, awal, simpan }: { a: LkpdAktivitas; awal: NilaiAktivitas; simpan?: (t: string) => void }) {
  const baris = a.baris || [];
  const kolom = a.kolom || [];
  // Toleransi data lama: jumlah kolom tabel = terlebar antara header & sel terpanjang.
  const nKolom = Math.max(kolom.length, ...baris.map((r) => r.sel.length));
  const [val, setVal] = useState<Record<string, string>>(() => awal?.val || {});
  const [dicek, setDicek] = useState<boolean>(() => Boolean(awal?.dicek));

  const ubahSel = (key: string, v: string) => {
    const next = { ...val, [key]: v };
    setVal(next);
    setDicek(false);
    simpan?.(JSON.stringify({ val: next, dicek: false }));
  };

  const periksa = () => {
    setDicek(true);
    simpan?.(JSON.stringify({ val, dicek: true }));
  };

  return (
    <div className="card card-pad !bg-wash/50">
      <p className="text-[13.5px] font-semibold mb-2">📊 {a.instruksi}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-[13.5px] min-w-[420px]">
          <thead>
            <tr className="text-left text-[12px] text-ink-muted bg-white border border-line">
              {Array.from({ length: nKolom }, (_, i) => <th key={i} className="px-3 py-2 font-medium">{kolom[i] ?? ""}</th>)}
            </tr>
          </thead>
          <tbody>
            {baris.map((r, ri) => (
              <tr key={ri} className="border border-line bg-white">
                {Array.from({ length: nKolom }, (_, ci) => {
                  const key = `${ri}-${ci}`;
                  const s = r.sel[ci];
                  if (!s || s.teks !== undefined) return <td key={ci} className="px-3 py-2 text-ink-soft">{s?.teks ?? ""}</td>;
                  // Kotak centang benar/salah — default tak tercentang (= "false").
                  if (s.centang) {
                    const tercentang = (val[key] || "false") === "true";
                    const kunciCentang = s.kunci || "false";
                    const benarC = dicek && (tercentang ? "true" : "false") === kunciCentang;
                    const salahC = dicek && !benarC;
                    return (
                      <td key={ci} className="px-3 py-2 align-top">
                        <label
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13.5px] cursor-pointer ${
                            benarC ? "border-green-400 bg-green-50" : salahC ? "border-red-400 bg-red-50" : "border-line bg-white"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="accent-teal-600"
                            style={{ width: 18, height: 18 }}
                            checked={tercentang}
                            onChange={(e) => ubahSel(key, e.target.checked ? "true" : "false")}
                          />
                          <span>Centang</span>
                        </label>
                        {benarC ? <p className="text-[12px] text-green-700 mt-1">{s.feedbackBenar || "Benar ✓"}</p> : null}
                        {salahC ? <p className="text-[12px] text-red-600 mt-1">{s.feedbackSalah || "Periksa lagi centanganmu."}</p> : null}
                      </td>
                    );
                  }
                  const v = val[key] || "";
                  const benar = dicek && selSama(v, s.kunci);
                  const salah = dicek && !selSama(v, s.kunci);
                  return (
                    <td key={ci} className="px-3 py-2 align-top">
                      <input
                        className={`input !py-1.5 !text-[13.5px] ${benar ? "!border-green-400 !ring-green-100" : salah ? "!border-red-400 !ring-red-100" : ""}`}
                        value={v}
                        placeholder="isi…"
                        onChange={(e) => ubahSel(key, e.target.value)}
                      />
                      {benar ? <p className="text-[12px] text-green-700 mt-1">{s.feedbackBenar || "Benar ✓"}</p> : null}
                      {salah ? <p className="text-[12px] text-red-600 mt-1">{s.feedbackSalah || "Coba hitung lagi."}</p> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-2 items-center">
        <button className="btn-primary !py-1.5 !text-[13px]" onClick={periksa}>Periksa jawaban</button>
        <button className="btn-ghost !py-1.5 !text-[13px]" onClick={() => { setVal({}); setDicek(false); simpan?.(JSON.stringify({ val: {}, dicek: false })); }}>Ulangi</button>
        <span className="text-[12.5px] text-green-700 ml-auto">✓ Jawaban tersimpan otomatis</span>
      </div>
    </div>
  );
}
