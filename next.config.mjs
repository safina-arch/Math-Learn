/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Redirect level platform (jalan sebelum render → Location header dijamin ada).
  // source persis "/tugas" TIDAK match /tugas/[id] → detail tugas tetap jalan.
  async redirects() {
    return [
      { source: "/tugas", destination: "/lkpd", permanent: false },
      { source: "/kelola", destination: "/materi", permanent: false },
    ];
  },
};

export default nextConfig;
