"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useSyncExternalStore, useState } from "react";
import { useStore, visibleNotifications } from "@/lib/store";
import { Modal } from "@/components/ui";
import { UpdateBanner } from "@/components/update-banner";
import {
  keadaanAwalPengawas,
  keadaanPengawas,
  langgananPengawas,
  pantauHalaman,
  tutupPeringatan,
  upayaBlok,
} from "@/lib/pengawas";

const NAV: Record<string, { href: string; label: string; icon: React.ReactNode; ket?: string }[]> = {
  siswa: [
    { href: "/dashboard", label: "Beranda", icon: <I d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" /> },
    { href: "/materi", label: "Materi", icon: <I d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h5" /> },
    { href: "/lkpd", label: "LKPD", icon: <I d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h4" /> },
    { href: "/latihan", label: "Latihan", icon: <I d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" /> },
    { href: "/evaluasi", label: "Evaluasi", icon: <I d="M9 5h6a1 1 0 011 1v1H8V6a1 1 0 011-1zM8 7H6a1 1 0 00-1 1v11a1 1 0 001 1h12a1 1 0 001-1V8a1 1 0 00-1-1h-2M9 12l2 2 4-4" /> },
    { href: "/nilai", label: "Nilai", icon: <I d="M4 20V10M10 20V4M16 20v-8M22 20H2" /> },
    { href: "/jadwal", label: "Jadwal", icon: <I d="M4 6.5h16V20H4zM8 3.5v4M16 3.5v4M4 11h16" /> },
    { href: "/pengumuman", label: "Pengumuman", icon: <I d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 004 0" /> },
  ],
  guru: [
    { href: "/dashboard", label: "Beranda", icon: <I d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" /> },
    { href: "/materi", label: "Materi", icon: <I d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h5" /> },
    { href: "/lkpd", label: "LKPD", icon: <I d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h4" /> },
    { href: "/latihan", label: "Latihan", icon: <I d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" /> },
    { href: "/evaluasi", label: "Evaluasi", icon: <I d="M9 5h6a1 1 0 011 1v1H8V6a1 1 0 011-1zM8 7H6a1 1 0 00-1 1v11a1 1 0 001 1h12a1 1 0 001-1V8a1 1 0 00-1-1h-2M9 12l2 2 4-4" /> },
    { href: "/periksa", label: "Hasil siswa", icon: <I d="M5 13l4 4L19 7" />, ket: "Memeriksa jawaban per soal lalu menerbitkan nilai" },
    { href: "/nilai", label: "Nilai siswa", icon: <I d="M4 20V10M10 20V4M16 20v-8M22 20H2" />, ket: "Rekap nilai, ringkasan & ekspor" },
    { href: "/laporan", label: "Laporan kecurangan", icon: <I d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /> },
    { href: "/jadwal", label: "Jadwal", icon: <I d="M4 6.5h16V20H4zM8 3.5v4M16 3.5v4M4 11h16" /> },
    { href: "/pengumuman", label: "Pengumuman", icon: <I d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 004 0" /> },
  ],
  admin: [
    { href: "/dashboard", label: "Beranda", icon: <I d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" /> },
    { href: "/admin", label: "Admin", icon: <I d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /> },
    { href: "/materi", label: "Materi", icon: <I d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h5" /> },
    { href: "/lkpd", label: "LKPD", icon: <I d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h4" /> },
    { href: "/latihan", label: "Latihan", icon: <I d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" /> },
    { href: "/evaluasi", label: "Evaluasi", icon: <I d="M9 5h6a1 1 0 011 1v1H8V6a1 1 0 011-1zM8 7H6a1 1 0 00-1 1v11a1 1 0 001 1h12a1 1 0 001-1V8a1 1 0 00-1-1h-2M9 12l2 2 4-4" /> },
    { href: "/periksa", label: "Hasil siswa", icon: <I d="M5 13l4 4L19 7" />, ket: "Memeriksa jawaban per soal lalu menerbitkan nilai" },
    { href: "/nilai", label: "Nilai siswa", icon: <I d="M4 20V10M10 20V4M16 20v-8M22 20H2" />, ket: "Rekap nilai, ringkasan & ekspor" },
    { href: "/laporan", label: "Laporan kecurangan", icon: <I d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /> },
    { href: "/jadwal", label: "Jadwal", icon: <I d="M4 6.5h16V20H4zM8 3.5v4M16 3.5v4M4 11h16" /> },
    { href: "/pengumuman", label: "Pengumuman", icon: <I d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 004 0" /> },
  ],
};

function I({ d }: { d: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, notifications, markAllRead, bersihkanNotifikasi, stopImpersonate, impersonating, syncError } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNav, setMobileNav] = useState(false);
  const [bell, setBell] = useState(false);
  /** Keadaan anti-cheat global: kunci menu + peringatan real-time selama pengerjaan. */
  const p = useSyncExternalStore(langgananPengawas, keadaanPengawas, keadaanAwalPengawas);

  // Cadangan penghitungan: perpindahan pathname yang tidak terdeteksi oleh unmount
  // halaman pengerjaan (mis. perubahan query pada rute yang sama) tetap dicatat.
  React.useEffect(() => {
    pantauHalaman(pathname);
  }, [pathname]);

  if (!user) {
    return <>{children}</>;
  }

  const nav = NAV[user.role] || NAV.siswa;
  const notifs = visibleNotifications(notifications, user).slice(0, 12);
  const unread = visibleNotifications(notifications, user).filter((n) => !n.dibaca).length;
  /** Menu tidak bisa diklik selama pengerjaan berjalan → upaya pindah diperingatkan. */
  const navLocked = (e: React.MouseEvent) => {
    if (!p.terkunci) return;
    e.preventDefault();
    upayaBlok();
  };

  return (
    <div className="min-h-screen bg-canvas">
      {impersonating ? (
        <div className="bg-primary text-white text-[13px] px-4 py-2 flex items-center justify-between gap-3">
          <span className="truncate">Mode impersonasi — berperan sebagai <b>{user.nama}</b> ({user.role}).</span>
          <button onClick={() => { stopImpersonate(); router.push("/dashboard"); }} className="rounded-md bg-white/15 hover:bg-white/25 px-2.5 py-1 font-medium shrink-0">Keluar mode</button>
        </div>
      ) : null}

      {/* Peringatan sinkronisasi untuk SEMUA peran (siswa pun perlu tahu bila
          kiriman/jawabannya belum berhasil terkirim ke server). */}
      {syncError ? (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-[12.5px] px-4 py-1.5">
          ⚠️ Sinkronisasi bermasalah — <b>{syncError}</b>. Data akan dikirim ulang otomatis; jangan tutup tab ini dulu.
        </div>
      ) : null}

      {/* Tab lama (bundle usang) → dorong reload agar perbaikan terbaru ikut aktif. */}
      <UpdateBanner />

      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-[1100px] px-4 h-[56px] flex items-center gap-3">
          <button
            className="lg:hidden btn-ghost !px-2.5"
            onClick={() => (p.terkunci ? upayaBlok() : setMobileNav((v) => !v))}
            aria-label={p.terkunci ? "menu dikunci" : "menu"}
            title={p.terkunci ? "Menu dikunci selama pengerjaan" : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d={p.terkunci ? "M7 11V7a5 5 0 0110 0v4M5 11h14v10H5z" : "M4 7h16M4 12h16M4 17h16"} />
            </svg>
          </button>
          <Link href="/dashboard" className="flex items-center gap-2" onClick={navLocked} aria-disabled={p.terkunci}>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-[15px]">M</span>
            <span className="font-bold tracking-tight text-[15.5px]">Math-Learn</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {p.terkunci ? (
              <span className="badge bg-red-50 text-red-700 border-red-200 font-semibold" title="Menu dinonaktifkan selama pengerjaan berlangsung">
                🔒 Pengerjaan · ⚠️ {p.jumlah}×
              </span>
            ) : null}
            <div className="relative">
              <button className="btn-ghost !px-2.5 relative" onClick={() => setBell((v) => !v)} aria-label="notifikasi">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 004 0" /></svg>
                {unread > 0 ? <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[11px] font-semibold flex items-center justify-center">{unread}</span> : null}
              </button>
              {bell ? (
                <div className="absolute right-0 mt-2 w-[320px] max-w-[86vw] card shadow-pop overflow-hidden">
                  <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
                    <p className="text-[13.5px] font-semibold">Notifikasi</p>
                    <div className="flex items-center gap-3 shrink-0">
                      <button className="text-[12.5px] text-primary font-medium" onClick={() => markAllRead(user.id)}>Tandai dibaca</button>
                      {user.role === "guru" || user.role === "admin" ? (
                        <button
                          className="text-[12.5px] text-red-600 font-medium"
                          onClick={() => {
                            if (confirm("Bersihkan SELURUH history notifikasi (semua pengguna, dari awal sampai sekarang)?")) {
                              bersihkanNotifikasi();
                              setBell(false);
                            }
                          }}
                        >🗑 Bersihkan</button>
                      ) : null}
                    </div>
                  </div>
                  <div className="max-h-[340px] overflow-auto divide-y divide-line">
                    {notifs.length === 0 ? <p className="muted p-4">Belum ada notifikasi.</p> : notifs.map((n) => (
                      <div key={n.id} className="px-4 py-3">
                        <p className="text-[13.5px] font-medium">{n.judul}</p>
                        <p className="text-[12.5px] text-ink-muted mt-0.5">{n.isi}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            {user.fotoProfil ? (
              <img src={user.fotoProfil} alt={user.nama} className="hidden sm:block h-7 w-7 rounded-full object-cover border border-line" />
            ) : null}
            <span className="hidden sm:block text-[13px] text-ink-soft max-w-[180px] truncate">{user.nama}</span>
            <span className="hidden sm:inline-flex badge bg-primary-50 text-primary border-primary-100 capitalize">{user.role}</span>
            <button className="btn-ghost !py-1.5 text-[13px]" onClick={() => { logout(); router.push("/login"); }}>Keluar</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-0 sm:px-4 flex gap-5">
        <aside className="hidden lg:block w-[220px] shrink-0 py-5">
          <nav className="sticky top-[76px] space-y-0.5">
            {p.terkunci ? (
              <p className="px-3 pb-2 text-[12px] text-red-600 font-medium">🔒 Menu dikunci selama pengerjaan</p>
            ) : null}
            {nav.map((n) =>
              p.terkunci ? (
                <button
                  key={n.href}
                  type="button"
                  className="navlink text-ink-faint opacity-75"
                  onClick={upayaBlok}
                  title="Menu dikunci selama pengerjaan berlangsung"
                  aria-disabled
                >
                  {n.icon}<span>{n.label}</span><span className="ml-auto text-[11px]">🔒</span>
                </button>
              ) : (
                <Link key={n.href} href={n.href} title={n.ket} className={`navlink ${pathname === n.href || pathname.startsWith(n.href + "/") ? "navlink-active" : ""}`}>
                  {n.icon}<span>{n.label}</span>
                </Link>
              ),
            )}
            <div className="pt-4 mt-4 border-t border-line">
              <p className="px-3 text-[12px] text-ink-faint mb-1">{user.kelas} · {user.email}</p>
            </div>
          </nav>
        </aside>

        {mobileNav ? (
          <div className="lg:hidden fixed inset-0 z-40">
            <button className="absolute inset-0 bg-black/25" onClick={() => setMobileNav(false)} aria-label="tutup menu" />
            <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-white border-r border-line p-4 space-y-0.5">
              {p.terkunci ? (
                <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[12.5px] text-red-700">
                  🔒 Pengerjaan berlangsung — menu dinonaktifkan sampai kamu mengumpulkan.
                </p>
              ) : null}
              {nav.map((n) =>
                p.terkunci ? (
                  <button key={n.href} type="button" className="navlink text-ink-faint" onClick={upayaBlok} aria-disabled>
                    {n.icon}<span>{n.label}</span><span className="ml-auto text-[11px]">🔒</span>
                  </button>
                ) : (
                  <Link key={n.href} href={n.href} onClick={() => setMobileNav(false)} className={`navlink ${pathname === n.href ? "navlink-active" : ""}`}>{n.icon}<span>{n.label}</span></Link>
                ),
              )}
            </div>
          </div>
        ) : null}

        <main className="flex-1 min-w-0 px-4 sm:px-0 py-5 pb-28 lg:pb-16">{children}</main>
      </div>

      {p.terkunci ? (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-ink text-white text-[12.5px] px-4 py-2.5 flex items-center justify-between gap-3">
          <span>🔒 Pengerjaan berlangsung — menu dinonaktifkan.</span>
          <span className="shrink-0 font-semibold">⚠️ {p.jumlah}×</span>
        </div>
      ) : (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line overflow-x-auto">
          <div className="flex min-w-max">
            {nav.map((n) => {
              const active = pathname === n.href || pathname.startsWith(n.href + "/");
              return (
                <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2.5 px-3 text-[11px] shrink-0 w-[72px] ${active ? "text-primary font-semibold" : "text-ink-muted"}`}>
                  {n.icon}<span>{n.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Peringatan anti-cheat GLOBAL: tampil di halaman mana pun (termasuk setelah
          siswa berpindah menu) berkat modul lib/pengawas.ts. */}
      <Modal open={p.peringatan !== null} onClose={tutupPeringatan} title={p.peringatan?.tipe === "blok" ? "Menu dikunci" : "Peringatan sistem"}>
        {p.peringatan?.tipe === "blok" ? (
          <>
            <p className="text-[14px]">
              Menu navigasi <b>dinonaktifkan selama pengerjaan berlangsung</b> agar kamu fokus. Kegiatan yang sedang
              berjalan (<b>{p.jenis}</b>) harus dikumpulkan terlebih dahulu.
            </p>
            <p className="muted mt-2">Upaya berpindah halaman tidak mengubah hitungan pelanggaranmu — tetap di halaman ini.</p>
            <button className="btn-primary mt-4 w-full" onClick={tutupPeringatan}>Lanjutkan mengerjakan</button>
          </>
        ) : (
          <>
            <p className="text-[14px]">
              Kamu terdeteksi <b>meninggalkan tab/halaman {p.jenis === "evaluasi" ? "ujian" : "pengerjaan"}</b> — total{" "}
              <b>{p.peringatan?.n ?? 0}×</b>. Setiap satu kali keluar/pindah tab dihitung <b>satu kali</b>, langsung
              dicatat beserta waktunya, dan dilaporkan ke guru.
            </p>
            <p className="muted mt-2">
              Menu dikunci selama pengerjaan. Pelanggaran berulang dapat memengaruhi penilaian.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {p.peringatan?.halaman && p.terkunci === false ? (
                <button className="btn-primary w-full" onClick={() => { router.push(p.peringatan!.halaman); tutupPeringatan(); }}>
                  🔙 Kembali mengerjakan
                </button>
              ) : (
                <button className="btn-primary w-full" onClick={tutupPeringatan}>Saya mengerti, kembali mengerjakan</button>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export function Guard({ allow, children }: { allow: string[]; children: React.ReactNode }) {
  const { user, ready } = useStore();
  const router = useRouter();
  React.useEffect(() => {
    // Tunggu sesi selesai dimuat dari penyimpanan lokal agar refresh tidak menganggap user keluar.
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (!allow.includes(user.role)) router.replace("/dashboard");
  }, [ready, user, allow, router]);
  if (!ready) return <div className="page-wrap pt-16"><p className="muted">Memuat…</p></div>;
  if (!user || !allow.includes(user.role)) return <div className="page-wrap pt-16"><p className="muted">Memuat…</p></div>;
  return <>{children}</>;
}
