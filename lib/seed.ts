import type { AcademicEvent, Announcement, Assignment, Material, User } from "./types";

/**
 * Akun sesuai CSV "Draft User & Password Elearning".
 * Nama = nama lengkap (untuk sapaan "Halo, …"), email = username,
 * password tetap sesuai CSV. NISN/TTL diisi manual lewat halaman admin.
 */
const SISWA: [string, string, string][] = [
  ["2601", "Agies Dwi Wendari", "26220311605858"],
  ["2602", "Alwalidatul Azizah", "26240311604406"],
  ["2603", "Andriani Meisya Putri", "26240311609699"],
  ["2604", "Anisya Nur Fadillah", "26240311604343"],
  ["2605", "Aprilia Maulana Zhafir", "26240311604159"],
  ["2606", "Ashty Avisa Wardhani", "26240311609454"],
  ["2607", "Cahya Sabilla", "26240311602716"],
  ["2608", "Cima Qurniva Arum Kusuma", "26240311603739"],
  ["2609", "Dewi Amelia", "26240311606498"],
  ["2610", "Dinda Alisya Febriana", "26240311603392"],
  ["2611", "Dinda Purnamasari", "26240311604131"],
  ["2612", "Efelinda Nafa Shabira", "26240311606244"],
  ["2613", "Elsa Safitri", "26240311605002"],
  ["2614", "Emy Martha Rahayu", "26240311609426"],
  ["2615", "Faizah Laili Maghfiroh", "26240311604689"],
  ["2616", "Kayla Putri Ayu Ananta", "26240311600820"],
  ["2617", "Luh Putu Ika Jayanti Paramartha Putri", "26240311608020"],
  ["2618", "Muhammad Naufal Rizq Putra Wahyudi", "26240311604474"],
  ["2619", "Muhzinul Asrori", "26240311603940"],
  ["2620", "Nadia Maulivia Zahra", "26240311605377"],
  ["2621", "Natasya Aprilia Putri", "26240311601687"],
  ["2622", "Nurhasan Abdurrahman", "26240311606999"],
  ["2623", "Nurkamila Agustiyawati", "26240311601016"],
  ["2624", "Nur Maftuchatul Hasanah", "26240311602129"],
  ["2625", "Nurul Huda", "26240311604800"],
  ["2626", "Praysezya Sukma Ristantia", "26240311603985"],
  ["2627", "Puji Hanifiah Nur Alfathin Lestari", "26240311600598"],
  ["2628", "Rahmatia Elsa Yuniar", "26240311604524"],
  ["2629", "Ranita Regita Cahyani", "26240311609797"],
  ["2630", "Rency Nada Nadiva", "26240311611572"],
  ["2631", "Safinatul Ilmiyah", "26240311604183"],
  ["2632", "Salsabila Nur Azzahro", "26240311600706"],
  ["2633", "Salwa Khoirin Naziva", "26240311608410"],
  ["2634", "Via Dwi Oktaviyanti", "26240311609138"],
  ["2635", "Yeni Oktaviana", "26240311600572"],
];

export const AUTH_USERS: (User & { password: string })[] = [
  { id: "u-admin", nama: "Admin", email: "Admin", password: "Admin_Kel4UM", role: "admin", kelas: "-", nisn: "", ttl: "" },
  { id: "u-guru-1", nama: "Ani", email: "Guru1", password: "Guru1_Kel4UM", role: "guru", kelas: "VIII", nisn: "", ttl: "" },
  { id: "u-guru-2", nama: "Dennis", email: "Guru2", password: "Guru2_Kel4UM", role: "guru", kelas: "VIII", nisn: "", ttl: "" },
  ...SISWA.map(([kode, nama, password]) => ({
    id: `u-siswa-${kode}`,
    nama,
    email: kode,
    password,
    role: "siswa" as const,
    kelas: "VIII-A",
    nisn: "",
    ttl: "",
  })),
];

export const SEED_MATERIALS: Material[] = [];

export const SEED_ASSIGNMENTS: Assignment[] = [];

export const SEED_ANNOUNCEMENTS: Announcement[] = [];

export const SEED_EVENTS: AcademicEvent[] = [];
