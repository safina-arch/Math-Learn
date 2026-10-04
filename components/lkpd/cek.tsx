"use client";

import { Badge, Modal } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cariProgress, nilaiSubtopic, progresSubtopic } from "@/lib/lkpd";
import { fmtDateTime } from "@/lib/utils";
import { BLOCK_LABEL } from "./blocks";
import type { LkpdAktivitas, LkpdBlock } from "@/lib/types";

/** Kunci baris yang sedang dicek guru/admin (data diambil ulang dari store → selalu terkini). */
export type KunciCek = { siswaId: string; subtopicId: string; topikId: string };

type StateAktivitas = {
  diArea?: string[];
  pasang?: Record<string, string>;
  val?: Record<string, string>;
  dicek?: boolean;
};

/** Angka dibandingkan longgar (selaras `activities.tsx`) — dipakai untuk isi-tabel. */
function sama(a: string, kunci: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  if (norm(a) === norm(kunci)) return true;
  const na = a.replace(/[^0-9]/g, "");
  const nk = kunci.replace(/[^0-9]/g, "");
  return na !== "" && nk !== "" && Number(na) === Number(nk);
}

function parseState(teks?: string): StateAktivitas | null {
  if (!teks) return null;
  try {
    const o: unknown = JSON.parse(teks);
    return o && typeof o === "object" ? (o as StateAktivitas) : null;
  } catch {
    return null;
  }
}

/** Satu content block pada sudut pandang pemeriksa: isi kerja siswa, bukan alur interaktif. */
function BlokCek({ blok, jawaban }: { blok: LkpdBlock; jawaban?: string }) {
  switch (blok.tipe) {
    case "refleksi":
      return (
        <div className="rounded-lg border border-line px-3.5 py-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-1">💬 {blok.judul || "Refleksi"}</p>
          {jawaban ? (
            <p className="text-[13.5px] text-ink-soft whitespace-pre-wrap bg-wash border border-line rounded-lg px-3 py-2 leading-relaxed">{jawaban}</p>
          ) : (
            <p className="text-[13px] text-ink-faint italic">Belum dijawab</p>
          )}
        </div>
      );

    case "pertanyaan": {
      const q = blok.pertanyaan;
      if (!q) return null;
      const pilih = jawaban !== undefined && jawaban !== "" && Number.isInteger(Number(jawaban)) ? Number(jawaban) : null;
      const dipilih = pilih !== null ? q.opsi[pilih] : null;
      return (
        <div className="rounded-lg border border-line px-3.5 py-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-1">❓ {blok.judul || "Pertanyaan"}</p>
          <p className="text-[13.5px] font-medium whitespace-pre-line mb-2">{q.teks}</p>
          <ul className="space-y-1.5">
            {q.opsi.map((o, i) => {
              const iniDipilih = pilih === i;
              const gaya = iniDipilih
                ? o.benar
                  ? "border-green-300 bg-green-50"
                  : "border-red-300 bg-red-50"
                : o.benar
                  ? "border-green-200 bg-green-50/60"
                  : "border-line bg-white";
              return (
                <li key={i} className={`rounded-lg border px-3 py-2 text-[13px] ${gaya}`}>
                  <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {o.teks}
                  {iniDipilih ? (
                    <span className={`ml-1.5 font-semibold ${o.benar ? "text-green-700" : "text-red-600"}`}>
                      · pilihan siswa ({o.benar ? "benar ✓" : "belum tepat ✗"})
                    </span>
                  ) : o.benar ? (
                    <span className="ml-1.5 text-[12px] font-medium text-green-700">kunci ✓</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {pilih === null ? (
            <p className="mt-2 text-[13px] text-ink-faint italic">Belum dijawab</p>
          ) : dipilih && !dipilih.benar ? (
            <p className="mt-2 text-[13px] text-ink-soft bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <b>Umpan balik untuk siswa:</b> {dipilih.feedback}
            </p>
          ) : null}
        </div>
      );
    }

    case "aktivitas": {
      const a = blok.aktivitas;
      if (!a) return null;
      const st = parseState(jawaban);
      return (
        <div className="rounded-lg border border-line px-3.5 py-2.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint mb-1">🧩 {blok.judul || "Aktivitas"}</p>
          <p className="text-[13px] text-ink-muted mb-2">{a.instruksi}</p>
          <IsiAktivitas a={a} st={st} />
        </div>
      );
    }

    case "teks":
      return (
        <details className="rounded-lg border border-line bg-wash/40 px-3.5 py-2 text-[13px]">
          <summary className="cursor-pointer font-medium">📝 {blok.judul || "Teks"} <span className="font-normal text-ink-faint">(materi)</span></summary>
          <p className="mt-2 text-ink-soft whitespace-pre-line leading-relaxed">{blok.teks}</p>
        </details>
      );

    default:
      return (
        <p className="text-[12.5px] text-ink-faint">
          {BLOCK_LABEL[blok.tipe]} — {blok.judul || blok.namaBerkas || "konten pendukung"}
          {blok.url ? <span className="ml-1">(ada tautan)</span> : null}
        </p>
      );
  }
}

/** Ringkasan jawaban aktivitas interaktif sesuai tipenya. */
function IsiAktivitas({ a, st }: { a: LkpdAktivitas; st: StateAktivitas | null }) {
  if (a.tipe === "seret-slot") {
    const kartu = a.kartu || [];
    const di = (st?.diArea || []).filter((id) => kartu.some((k) => k.id === id));
    const sisa = kartu.filter((k) => !di.includes(k.id));
    return (
      <div>
        {di.length === 0 ? (
          <p className="text-[13px] text-ink-faint italic">Belum ada kartu yang dipindahkan</p>
        ) : (
          <ul className="space-y-1.5">
            {di.map((id) => {
              const k = kartu.find((x) => x.id === id);
              if (!k) return null;
              return (
                <li key={id} className="text-[13px] bg-wash border border-line rounded-lg px-3 py-1.5">
                  👷 <b>{k.label}</b> → {k.hasil}
                </li>
              );
            })}
          </ul>
        )}
        {sisa.length ? <p className="text-[12.5px] text-ink-faint mt-2">Belum dipindahkan: {sisa.map((k) => k.label).join(" · ")}</p> : null}
        {di.length > 0 && a.temuan ? <p className="text-[13px] text-green-700 mt-2">🎉 {a.temuan}</p> : null}
      </div>
    );
  }

  if (a.tipe === "cocokkan") {
    const kiri = a.kiri || [];
    const kanan = a.kanan || [];
    const pasang = st?.pasang || {};
    const terpasang = kiri.filter((k) => pasang[k.id]);
    const belum = kiri.filter((k) => !pasang[k.id]);
    return (
      <div>
        {terpasang.length === 0 ? (
          <p className="text-[13px] text-ink-faint italic">Belum ada pasangan yang tersimpan</p>
        ) : (
          <ul className="space-y-1.5">
            {terpasang.map((k) => {
              const n = kanan.find((x) => x.id === pasang[k.id]);
              return (
                <li key={k.id} className="text-[13px] bg-wash border border-line rounded-lg px-3 py-1.5">
                  {k.label} ↔ <b>{n?.label || "?"}</b> <span className="text-green-700 font-semibold">✓</span>
                </li>
              );
            })}
          </ul>
        )}
        {belum.length ? <p className="text-[12.5px] text-ink-faint mt-2">Belum terpasang: {belum.map((k) => k.label).join(" · ")}</p> : null}
        {terpasang.length > 0 && belum.length === 0 ? <p className="text-[13px] text-green-700 mt-2">🎉 Semua pasangan benar.</p> : null}
      </div>
    );
  }

  // isi-tabel
  const val = st?.val || {};
  const dicek = Boolean(st?.dicek);
  const kolom = a.kolom || [];
  const baris = a.baris || [];
  const terisi = Object.values(val).filter((v) => String(v).trim() !== "").length;
  return (
    <div>
      {terisi === 0 ? (
        <p className="text-[13px] text-ink-faint italic">Belum ada sel yang diisi</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[380px]">
            <thead>
              <tr className="text-left text-[12px] text-ink-muted">
                {kolom.map((c) => (
                  <th key={c} className="px-2 py-1.5 font-medium">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {baris.map((r, ri) => (
                <tr key={ri}>
                  {r.sel.map((s, ci) => {
                    if (s.teks !== undefined) return <td key={ci} className="px-2 py-1.5 text-ink-soft">{s.teks}</td>;
                    const key = `${ri}-${ci}`;
                    const v = val[key] || "";
                    const benar = dicek && v.trim() !== "" && sama(v, s.kunci || "");
                    const salah = dicek && (!v.trim() || !sama(v, s.kunci || ""));
                    return (
                      <td key={ci} className="px-2 py-1.5">
                        <span
                          className={`block rounded border px-2 py-1 text-[13px] ${
                            benar ? "border-green-300 bg-green-50 text-green-800" : salah ? "border-red-300 bg-red-50 text-red-700" : "border-line bg-white"
                          }`}
                        >
                          {v || <span className="text-ink-faint">—</span>}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[12.5px] mt-2 text-ink-muted">
        {dicek ? "Siswa sudah menekan “Periksa jawaban” — hijau = benar, merah = perlu diperbaiki." : "Siswa belum menekan “Periksa jawaban” — nilai sel belum dihitung otomatis."}
      </p>
    </div>
  );
}

/**
 * Modal cek hasil pekerjaan siswa LKPD — dipanggil guru/admin dari tabel penilaian.
 * Menampilkan isi kerja per mission (refleksi, jawaban pertanyaan, hasil aktivitas)
 * lalu verifikasi/batalkan verifikasi di panel bawah — verifikasi tidak lagi sekali klik
 * dari tabel.
 */
export function CekKerjaLkpd({ kunci, onClose }: { kunci: KunciCek | null; onClose: () => void }) {
  const { lkpdTopics, lkpdProgress, users, verifikasiLkpd } = useStore();

  const topik = kunci ? lkpdTopics.find((t) => t.id === kunci.topikId) : undefined;
  const sub = topik?.subtopics.find((s) => s.id === kunci?.subtopicId);
  const siswa = kunci ? users.find((u) => u.id === kunci.siswaId) : undefined;
  const progres = kunci && sub ? cariProgress(lkpdProgress, kunci.siswaId, sub.id) : null;
  const ringkas = progresSubtopic(sub, progres);
  const nilai = nilaiSubtopic(sub, progres);
  const verifikasi = Boolean(progres?.verifikasi);

  if (!kunci || !topik || !sub) return null;

  return (
    <Modal open onClose={onClose} title={`Cek kerja LKPD — ${siswa?.nama || "Siswa"}`} wide>
      {/* Ringkasan pemeriksaan */}
      <div className="rounded-xl border border-line bg-wash/60 px-3.5 py-3 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
        <span className="font-semibold">{topik.judul} › {sub.judul}</span>
        <span className="text-ink-muted">{siswa?.kelas || "—"}</span>
        <span>
          Nilai <b className="text-[16px] align-middle">{nilai ?? "—"}</b>
        </span>
        <span className="text-ink-muted">{ringkas.selesai}/{ringkas.total} mission · {ringkas.persen}%</span>
        {nilai == null ? (
          <Badge tone="gray">Belum dinilai</Badge>
        ) : verifikasi ? (
          <Badge tone="green">Terverifikasi ✓</Badge>
        ) : (
          <Badge tone="amber">Menunggu verifikasi</Badge>
        )}
        <span className="text-ink-muted ml-auto">Terakhir: {fmtDateTime(progres?.updatedAt || null)}</span>
      </div>

      {sub.missions.length === 0 ? (
        <p className="muted">Sub bab ini belum punya mission.</p>
      ) : !progres ? (
        <p className="muted">Siswa belum mengerjakan sub bab ini — belum ada progres tersimpan.</p>
      ) : null}

      {/* Isi kerja per mission */}
      <div className="space-y-3">
        {sub.missions.map((m, i) => {
          const selesai = Boolean(progres?.missions.includes(m.id));
          return (
            <div key={m.id} className="rounded-xl border border-line overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 bg-wash/70 border-b border-line">
                <span className="text-[15px]">{m.ikon || "🔹"}</span>
                <span className="text-[14px] font-semibold">Mission {i + 1} · {m.judul}</span>
                <span className="ml-auto">
                  <Badge tone={selesai ? "green" : "gray"}>{selesai ? "Selesai ✓" : "Belum dikerjakan"}</Badge>
                </span>
              </div>
              <div className="p-3.5 space-y-2.5">
                {m.blok.length === 0 ? (
                  <p className="text-[13px] text-ink-faint">Mission tanpa konten.</p>
                ) : (
                  m.blok.map((b) => <BlokCek key={b.id} blok={b} jawaban={progres?.jawaban[b.id]} />)
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Keputusan pemeriksa — verifikasi hanya setelah isi kerja dibuka */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <p className="text-[13px] text-ink-muted">
          {nilai == null
            ? "Belum ada nilai — mission belum ditandai selesai."
            : verifikasi
              ? "Nilai sudah fiks di siswa."
              : "Nilai menunggu keputusanmu setelah isi kerja dicek."}
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="btn-ghost !py-2 !text-[13px]" onClick={onClose}>Tutup</button>
          {nilai == null || !kunci ? null : verifikasi ? (
            <button className="btn-ghost !py-2 !text-[13px]" onClick={() => verifikasiLkpd(kunci.siswaId, kunci.subtopicId, false)}>
              Batalkan verifikasi
            </button>
          ) : (
            <button className="btn-primary !py-2 !text-[13px]" onClick={() => verifikasiLkpd(kunci.siswaId, kunci.subtopicId, true)}>
              ✓ Verifikasi nilai
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
