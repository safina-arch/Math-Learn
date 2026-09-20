import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Math-Learn — E-learning Matematika SMP",
  description:
    "Platform e-learning matematika SMP: materi interaktif, LKPD, latihan soal, evaluasi aman dengan deteksi tab, dan AI auto-grading.",
  keywords: ["matematika", "SMP", "e-learning", "LKPD", "evaluasi"],
  openGraph: {
    title: "Math-Learn",
    description: "Belajar matematika SMP lebih rapi. Materi, tugas, evaluasi, nilai.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7209B7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Google Sans tidak tersedia publik; Plus Jakarta Sans adalah padanan geometris terdekat */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "var(--font-sans)" }}><Providers>{children}</Providers></body>
    </html>
  );
}
