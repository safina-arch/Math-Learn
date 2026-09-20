import type { AcademicEvent, Announcement, Assignment, Material, User } from "./types";

export const AUTH_USERS: (User & { password: string })[] = [
  { id: "u-admin", nama: "Admin", email: "Admin", password: "Admin_Kel4UM", role: "admin", kelas: "-" },
  { id: "u-guru-1", nama: "Guru1", email: "Guru1", password: "Guru1_Kel4UM", role: "guru", kelas: "VIII" },
  { id: "u-guru-2", nama: "Guru2", email: "Guru2", password: "Guru2_Kel4UM", role: "guru", kelas: "VIII" },
  { id: "u-siswa-2601", nama: "Siswa 1", email: "2601", password: "26220311605858", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2602", nama: "Siswa 2", email: "2602", password: "26240311604406", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2603", nama: "Siswa 3", email: "2603", password: "26240311609699", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2604", nama: "Siswa 4", email: "2604", password: "26240311604343", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2605", nama: "Siswa 5", email: "2605", password: "26240311604159", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2606", nama: "Siswa 6", email: "2606", password: "26240311609454", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2607", nama: "Siswa 7", email: "2607", password: "26240311602716", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2608", nama: "Siswa 8", email: "2608", password: "26240311603739", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2609", nama: "Siswa 9", email: "2609", password: "26240311606498", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2610", nama: "Siswa 10", email: "2610", password: "26240311603392", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2611", nama: "Siswa 11", email: "2611", password: "26240311604131", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2612", nama: "Siswa 12", email: "2612", password: "26240311606244", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2613", nama: "Siswa 13", email: "2613", password: "26240311605002", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2614", nama: "Siswa 14", email: "2614", password: "26240311609426", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2615", nama: "Siswa 15", email: "2615", password: "26240311604689", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2616", nama: "Siswa 16", email: "2616", password: "26240311600820", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2617", nama: "Siswa 17", email: "2617", password: "26240311608020", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2618", nama: "Siswa 18", email: "2618", password: "26240311604474", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2619", nama: "Siswa 19", email: "2619", password: "26240311603940", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2620", nama: "Siswa 20", email: "2620", password: "26240311605377", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2621", nama: "Siswa 21", email: "2621", password: "26240311601687", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2622", nama: "Siswa 22", email: "2622", password: "26240311606999", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2623", nama: "Siswa 23", email: "2623", password: "26240311601016", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2624", nama: "Siswa 24", email: "2624", password: "26240311602129", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2625", nama: "Siswa 25", email: "2625", password: "26240311604800", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2626", nama: "Siswa 26", email: "2626", password: "26240311603985", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2627", nama: "Siswa 27", email: "2627", password: "26240311600598", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2628", nama: "Siswa 28", email: "2628", password: "26240311604524", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2629", nama: "Siswa 29", email: "2629", password: "26240311609797", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2630", nama: "Siswa 30", email: "2630", password: "26240311611572", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2631", nama: "Siswa 31", email: "2631", password: "26240311604183", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2632", nama: "Siswa 32", email: "2632", password: "26240311600706", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2633", nama: "Siswa 33", email: "2633", password: "26240311608410", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2634", nama: "Siswa 34", email: "2634", password: "26240311609138", role: "siswa", kelas: "VIII-A" },
  { id: "u-siswa-2635", nama: "Siswa 35", email: "2635", password: "26240311600572", role: "siswa", kelas: "VIII-A" },
];

export const SEED_MATERIALS: Material[] = [];

export const SEED_ASSIGNMENTS: Assignment[] = [];

export const SEED_ANNOUNCEMENTS: Announcement[] = [];

export const SEED_EVENTS: AcademicEvent[] = [];
