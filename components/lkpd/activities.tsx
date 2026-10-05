"use client";

import { useState } from "react";
import type { LkpdAktivitas } from "@/lib/types";
import { selSama } from "@/lib/lkpd";

/** State tersimpan per aktivitas — di-restore saat siswa kembali ke mission. */
type NilaiAktivitas = { diArea?: string[]; pasang?: Record<string, string>; val?: Record<string, string>; dicek?: boolean } | null;

function parseNilai(nilai?: string): NilaiAktivitas {
  if (!nilai) return null;
  try {
    const o = JSON.parse(nilai);
    return o && typeof o === "object" ? (o as NonNullable<NilaiAktivitas>) : null;
  } catch {
    return null;
  }
}

/**
 * Router aktivitas interaktif — satu komponen untuk semua jenis LKPD.
 * `nilai`/`onNilai`: jawaban siswa disimpan ke progres sehingga bolak-balik tidak menghapusnya.
 */
export function Aktivitas({ a, nilai, onNilai }: { a: LkpdAktivitas; nilai?: string; onNilai?: (t: string) => void }) {
  const awal = parseNilai(nilai);
  if (a.tipe === "seret-slot") return <SeretSlot a={a} awal={awal} simpan={onNilai} />;
  if (a.tipe === "cocokkan") return <Cocokkan a={a} awal={awal} simpan={onNilai} />;
  return <IsiTabel a={a} awal={awal} simpan={onNilai} />;
}

/* ————————————————— seret-slot: seret kartu ke area, temukan pola ————————————————— */
function SeretSlot({ a, awal, simpan }: { a: LkpdAktivitas; awal: NilaiAktivitas; simpan?: (t: string) => void }) {
  const kartu = a.kartu || [];
  const [diArea, setDiArea] = useState<string[]>(() => (awal?.diArea || []).filter((id) => kartu.some((k) => k.id === id)));
  const [sorot, setSorot] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [diSorotArea, setDiSorotArea] = useState(false);
  const sisa = kartu.filter((k) => !diArea.includes(k.id));
  const semuanya = kartu.length > 0 && sisa.length === 0;

  const letakkan = (id: string) => {
    if (diArea.includes(id)) return;
    const next = [...diArea, id];
    setDiArea(next);
    setSorot(id);
    simpan?.(JSON.stringify({ diArea: next }));
  };

  return (
    <div className="card card-pad !bg-wash/50">
      <p className="text-[13.5px] font-semibold mb-0.5">🧩 {a.instruksi}</p>
      <p className="text-[12.5px] text-ink-faint mb-2">Seret kartu ke area — atau klik kartunya (alternatif tanpa mouse).</p>

      <div className="flex flex-wrap gap-2">
        {sisa.map((k) => (
          <button
            key={k.id}
            draggable
            onDragStart={(e) => {
              // Firefox/Chrome membutuhkan dataTransfer agar drag benar-benar dimulai.
              e.dataTransfer.setData("text/plain", k.id);
              e.dataTransfer.effectAllowed = "move";
              setDragId(k.id);
            }}
            onDragEnd={() => { setDragId(null); setDiSorotArea(false); }}
            onClick={() => letakkan(k.id)}
            className={`btn bg-white border border-line shadow-card cursor-grab active:cursor-grabbing hover:border-primary hover:shadow-pop transition-all ${dragId === k.id ? "opacity-50" : ""}`}
            title="Seret ke area di bawah, atau klik untuk memindahkan"
          >
            👷 {k.label}
          </button>
        ))}
        {sisa.length === 0 ? <span className="text-[13px] text-ink-faint">Semua kartu sudah dipindahkan.</span> : null}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDiSorotArea(true); }}
        onDragLeave={() => setDiSorotArea(false)}
        onDrop={(e) => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/plain") || dragId;
          setDiSorotArea(false);
          setDragId(null);
          if (id) letakkan(id);
        }}
        className={`mt-3 rounded-xl border-2 border-dashed p-3 min-h-[86px] transition-colors ${diSorotArea ? "border-primary bg-primary-100/60" : "border-primary-200 bg-primary-50/50"}`}
      >
        <p className="text-[12.5px] font-medium text-primary mb-2">📦 {a.area || "Area kondisi baru"}</p>
        <div className="flex flex-wrap gap-2">
          {diArea.length === 0 ? (
            <span className="text-[13px] text-ink-faint">Seret / klik kartu pekerja ke sini…</span>
          ) : (
            diArea.map((id) => {
              const k = kartu.find((x) => x.id === id);
              if (!k) return null;
              const bagian = k.hasil.split("→");
              return (
                <div key={id} className="rounded-lg border border-line bg-white px-3 py-2 shadow-card">
                  <p className="text-[13.5px] font-semibold">{k.label} → <span className="text-primary">{bagian.length > 1 ? bagian.slice(1).join("→").trim() : k.hasil}</span></p>
                  <p className="text-[12.5px] text-ink-muted">{k.feedback}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="text-[12.5px] text-ink-muted">
          {sorot ? `Amati pasangan terakhir: ${kartu.find((k) => k.id === sorot)?.hasil}` : ""}
        </p>
        <span className="text-[12.5px] text-green-700 ml-auto">✓ Tersimpan otomatis</span>
        <button className="btn-ghost !py-1.5 !text-[12.5px]" onClick={() => { setDiArea([]); setSorot(null); simpan?.(JSON.stringify({ diArea: [] })); }}>Reset</button>
      </div>

      {semuanya && a.temuan ? (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-[13.5px] text-green-800">
          🎉 {a.temuan}
        </div>
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
                className={`w-full text-left rounded-lg border px-3 py-2 text-[13.5px] transition-colors ${ok ? "border-green-200 bg-green-50 text-green-700" : aktif === k.id ? "border-primary bg-primary-50 text-primary font-semibold" : "bg-white border-line hover:border-primary-200"}`}
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
            return (
              <button
                key={k.id}
                disabled={dipakai}
                onClick={() => pilihKanan(k.id)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-[13.5px] transition-colors ${dipakai ? "border-green-200 bg-green-50 text-green-700 opacity-70" : "bg-white border-line hover:border-primary-200"}`}
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

/* ————————————————— isi-tabel: isi sel kosong, uji pola ————————————————— */
function IsiTabel({ a, awal, simpan }: { a: LkpdAktivitas; awal: NilaiAktivitas; simpan?: (t: string) => void }) {
  const baris = a.baris || [];
  const kolom = a.kolom || [];
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
              {kolom.map((c) => <th key={c} className="px-3 py-2 font-medium">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {baris.map((r, ri) => (
              <tr key={ri} className="border border-line bg-white">
                {r.sel.map((s, ci) => {
                  const key = `${ri}-${ci}`;
                  if (s.teks !== undefined) return <td key={ci} className="px-3 py-2 text-ink-soft">{s.teks}</td>;
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
