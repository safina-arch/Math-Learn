import type { LkpdBlock, LkpdOpsi, LkpdSubtopic, LkpdTopic } from "./types";

/** Opsi pertanyaan singkat. */
const o = (teks: string, benar: boolean, feedback: string): LkpdOpsi => ({ teks, benar, feedback });

/**
 * Konten awal LKPD: satu topik "Perbandingan" dengan 3 submateri.
 * Strukturnya generik — menambahkan Geometri/Aljabar/Statistika cukup menambah
 * entri topik baru tanpa mengubah kode sistem LKPD.
 */
export const SEED_LKPD_TOPICS: LkpdTopic[] = [
  {
    id: "perbandingan",
    judul: "Perbandingan",
    deskripsi: "Memahami konsep perbandingan lewat fenomena nyata: mengamati, menanya, mengumpulkan data, menalar pola, lalu mengomunikasikan temuan.",
    ikon: "⚖️",
    subtopics: [
      /* ————————————————— Submateri 1: Perbandingan (konsep dasar) ————————————————— */
      {
        id: "pb-dasar",
        judul: "Perbandingan",
        deskripsi: "Menemukan hubungan 'setara' antara dua keadaan melalui pembagian yang sama.",
        missions: [
          {
            id: "pb-dasar-m1",
            judul: "Mengamati",
            ikon: "👀",
            deskripsi: "Amati dua keadaan berikut sebelum kamu diberi definisi apa pun.",
            blok: [
              { id: "pb-dasar-m1-b1", tipe: "teks", judul: "Di ruang kelas…", teks: "Meja disusun untuk menampung siswa, lalu siswa duduk rata di setiap meja.\n• Kelas A — 4 meja menampung 12 siswa\n• Kelas B — 6 meja menampung 18 siswa\nAmati baik-baik: kira-kira pada kelas mana satu meja terisi lebih banyak siswa?" },
              { id: "pb-dasar-m1-b2", tipe: "gambar", url: "", teks: "🏫 Kelas A — 4 meja · 12 siswa duduk rata" },
              { id: "pb-dasar-m1-b3", tipe: "gambar", url: "", teks: "🏫 Kelas B — 6 meja · 18 siswa duduk rata" },
              {
                id: "pb-dasar-m1-b4",
                tipe: "pertanyaan",
                judul: "Hasil pengamatanmu",
                pertanyaan: {
                  teks: "Pada kelas mana setiap meja terisi lebih banyak siswa?",
                  opsi: [
                    o("Karena 12 < 18, Kelas A lebih sedikit siswanya, jadi meja Kelas B lebih penuh.", false, "Kamu baru membandingkan jumlah seluruh siswa. Coba bandingkan isi SATU meja — ingat, tiap meja di Kelas A dan B berbeda jumlahnya."),
                    o("Sama banyak — di kedua kelas tiap meja berisi 3 siswa.", true, "Tepat! 12 : 4 = 3 dan 18 : 6 = 3. Meski jumlah siswa berbeda, isi tiap mejanya sama. Inilah dua keadaan yang 'setara'."),
                    o("Kelas B — jumlah mejanya lebih banyak.", false, "Banyak meja ≠ tiap meja lebih penuh. Hitung dulu siswa yang duduk di setiap satu meja, baru bandingkan."),
                  ],
                  petunjuk: [
                    "Bandingkan isi SATU meja, bukan jumlah seluruh siswa atau seluruh meja.",
                    "Bagi jumlah siswa dengan jumlah meja pada masing-masing kelas: 12 : 4 dan 18 : 6.",
                  ],
                  feedbackBenar: "Mantap — kamu mengamati pada level yang tepat: isi satu meja.",
                },
              },
            ],
          },
          {
            id: "pb-dasar-m2",
            judul: "Menanya",
            ikon: "❓",
            deskripsi: "Sekarang giliranmu membangun pertanyaan. Rasa penasaranmu adalah bahan bakar penyelidikan.",
            blok: [
              { id: "pb-dasar-m2-b1", tipe: "teks", judul: "Tulis pertanyaanmu", teks: "Dari pengamatan tadi, apa yang ingin kamu ketahui lebih dalam? Tuliskan satu pertanyaan yang menurutmu penting untuk menjelaskan keadaan di kelas A dan kelas B." },
              { id: "pb-dasar-m2-b2", tipe: "refleksi", judul: "Pertanyaan penasaranmu", teks: "Tulis pertanyaanmu di sini (contoh: kenapa jumlah siswa berbeda tapi terasa sama?)" },
              {
                id: "pb-dasar-m2-b3",
                tipe: "pertanyaan",
                judul: "Pertanyaan paling tepat",
                pertanyaan: {
                  teks: "Pertanyaan manakah yang paling tepat untuk menyelidiki keadaan kelas A dan kelas B?",
                  opsi: [
                    o("Berapa jumlah seluruh siswa di kedua kelas?", false, "Jumlah seluruh siswa sudah kamu ketahui (12 dan 18). Pertanyaan yang baik harus membuka hal yang BELUM kamu tahu."),
                    o("Berapa siswa yang menempati setiap meja?", true, "Bagus! Pertanyaan ini membuka data baru: 3 siswa per meja di kedua kelas. Itulah yang membuat keduanya setara."),
                    o("Meja mana yang lebih mahal?", false, "Harga meja tidak menjelaskan pembagian siswa. Pertanyaan ilmiah harus terhubung langsung dengan fenomena yang kamu amati."),
                  ],
                  petunjuk: ["Pertanyaan yang baik selalu membawa kamu pada data yang belum diketahui.", "Fokus pada 'per satu meja', bukan pada total."],
                  feedbackBenar: "Excellent — pertanyaanmu kini mengarah pada pola perbandingan.",
                },
              },
            ],
          },
          {
            id: "pb-dasar-m3",
            judul: "Mengumpulkan Informasi",
            ikon: "🔎",
            deskripsi: "Kumpulkan datanya lewat tabel interaktif — isi kolom terakhir untuk menguji dugaanmu.",
            blok: [
              { id: "pb-dasar-m3-b1", tipe: "teks", judul: "Instruksi", teks: "Hitung siswa yang menempati setiap meja (bagi jumlah siswa dengan jumlah meja), lalu isi kolom terakhir. Perhatikan pola yang muncul!" },
              {
                id: "pb-dasar-m3-b2",
                tipe: "aktivitas",
                aktivitas: {
                  tipe: "isi-tabel",
                  instruksi: "Klik kotak kosong, isi dengan hasil pembagianmu, lalu tekan Periksa.",
                  kolom: ["Keadaan", "Jumlah meja", "Jumlah siswa", "Siswa tiap meja"],
                  baris: [
                    { sel: [{ teks: "Kelas A" }, { teks: "4" }, { teks: "12" }, { kunci: "3", feedbackBenar: "12 : 4 = 3 — benar.", feedbackSalah: "Bagi 12 dengan 4. Coba hitung 4 + 4 + 4." }] },
                    { sel: [{ teks: "Kelas B" }, { teks: "6" }, { teks: "18" }, { kunci: "3", feedbackBenar: "18 : 6 = 3 — sama dengan Kelas A!", feedbackSalah: "Bagi 18 dengan 6. Coba ingat: 6 × 3 = ?" }] },
                    { sel: [{ teks: "Kelas C" }, { teks: "5" }, { teks: "15" }, { kunci: "3", feedbackBenar: "15 : 5 = 3 — pola berlanjut.", feedbackSalah: "Bagi 15 dengan 5. Lima berapa kali sama dengan 15?" }] },
                    { sel: [{ teks: "Kelas D" }, { teks: "4" }, { teks: "20" }, { kunci: "5", feedbackBenar: "20 : 4 = 5 — perhatikan: hasilnya berbeda! Kelas D TIDAK setara dengan yang lain.", feedbackSalah: "Bagi 20 dengan 4. 4 × 5 = 20, berarti 20 : 4 = ?" }] },
                  ],
                },
              },
              { id: "pb-dasar-m3-b3", tipe: "petunjuk", judul: "Petunjuk progresif", teks: "1) Kolom terakhir = jumlah siswa ÷ jumlah meja.\n2) Kelas A–C menghasilkan angka yang sama → mereka setara. Kelas D menghasilkan angka lain → tidak setara." },
            ],
          },
          {
            id: "pb-dasar-m4",
            judul: "Menalar",
            ikon: "🧠",
            deskripsi: "Sekarang konsep formalnya BOLEH diberikan — karena polanya sudah kamu temukan sendiri.",
            blok: [
              { id: "pb-dasar-m4-b1", tipe: "teks", judul: "Konsep: Perbandingan", teks: "PERBANDINGAN adalah hubungan antara dua kuantitas yang dibandingkan melalui pembagian yang sama.\nContoh: Kelas A dan Kelas B sama-sama menghasilkan 3 siswa per meja → perbandingan keduanya setara.\nBentuk sederhananya dapat ditulis: 12/4 = 18/6 (dibaca '12 banding 4 sama dengan 18 banding 6')." },
              {
                id: "pb-dasar-m4-b2",
                tipe: "pertanyaan",
                judul: "Uji pemahamanmu",
                pertanyaan: {
                  teks: "Manakah pernyataan yang BENAR tentang Kelas A dan Kelas B?",
                  opsi: [
                    o("Keduanya setara karena 12/4 = 18/6 = 3.", true, "Sempurna! Kuantitasnya berbeda (12 ≠ 18), tetapi hasil baginya sama — itulah inti perbandingan."),
                    o("Keduanya setara karena jumlah siswanya hampir sama.", false, "12 dan 18 cukup berbeda. Yang membuat setara bukan selisih jumlahnya, melainkan hasil baginya."),
                    o("Kelas A lebih banyak karena 4 < 6 meja.", false, "Jumlah meja bukan pembanding yang tepat. Bandingkan hasil bagi (siswa per meja) — di situ letak kesetaraannya."),
                  ],
                  petunjuk: ["Hitung hasil bagi masing-masing kelas.", "12 : 4 = 3 dan 18 : 6 = 3 — keduanya identik."],
                  feedbackBenar: "Kamu sudah memahami esensi perbandingan!",
                },
              },
            ],
          },
          {
            id: "pb-dasar-m5",
            judul: "Mengomunikasikan & Mengevaluasi",
            ikon: "💬",
            deskripsi: "Jelaskan temuanmu, lalu temukan kesalahan penalaran pada orang lain.",
            blok: [
              {
                id: "pb-dasar-m5-b1",
                tipe: "pertanyaan",
                judul: "Error analysis",
                pertanyaan: {
                  teks: "Adit berkata: \"Kelas A dan Kelas B pasti sama karena jumlah siswanya sama-sama belasan.\" Apa yang keliru dari penalaran Adit?",
                  opsi: [
                    o("Ia membandingkan jumlah total (belasan) alih-alih hasil bagi per meja.", true, "Tepat! 'Belasan' adalah penampilan angka, bukan perbandingan. Yang benar adalah membandingkan hasil bagi: 12/4 vs 18/6."),
                    o("Sebenarnya Adit benar karena 12 dan 18 sama-sama ganjil-genap berbeda.", false, "Itu justru membuktikan keduanya berbeda. Kesalahan Adit adalah berhenti pada kesan 'mirip' tanpa menghitung bagiannya."),
                    o("Adit salah karena Kelas A harusnya lebih banyak siswanya.", false, "Tidak ada kelas yang 'lebih banyak' — keduanya setara. Kesalahannya ada pada alasan yang dipakai, bukan pada pilihannya."),
                  ],
                  petunjuk: ["Tanyakan pada dirimu: apa yang sebenarnya dibandingkan Adit?", "Angka 'belasan' tidak pernah jadi ukuran perbandingan."],
                  feedbackBenar: "Kritis sekali — kamu bisa menilai penalaran orang lain.",
                },
              },
              { id: "pb-dasar-m5-b2", tipe: "refleksi", judul: "Refleksi akhir", teks: "Dengan bahasamu sendiri, bagaimana cara membandingkan dua keadaan agar hasilnya adil dan tepat? Tulis 2–3 kalimat." },
            ],
          },
        ],
      },
      {
        id: "pb-senilai",
        judul: "Perbandingan Senilai",
        deskripsi: "Dua perbandingan senilai jika hasil baginya sama — diuji lewat manipulasi jumlah barang dan harga.",
        missions: [
          {
            id: "pb-senilai-m1",
            judul: "Mengamati",
            ikon: "👀",
            deskripsi: "Amati situasi belanja berikut tanpa rumus apa pun.",
            blok: [
              { id: "pb-senilai-m1-b1", tipe: "teks", judul: "Di kantin sekolah…", teks: "• 2 pensil dijual Rp10.000\n• Di warung sebelah, 4 pensil dijual Rp20.000\nAmati dulu: manakah yang terlihat lebih murah? Bagaimana kamu tahu?" },
              { id: "pb-senilai-m1-b2", tipe: "gambar", url: "", teks: "🛒 Warung A — 2 pensil · Rp10.000" },
              { id: "pb-senilai-m1-b3", tipe: "gambar", url: "", teks: "🛒 Warung B — 4 pensil · Rp20.000" },
              {
                id: "pb-senilai-m1-b4",
                tipe: "pertanyaan",
                judul: "Hasil pengamatanmu",
                pertanyaan: {
                  teks: "Apa yang kamu perhatikan dari kedua harga itu?",
                  opsi: [
                    o("Kedua warung tampaknya menjual pensil dengan harga yang sama per biji.", true, "Benar! 10.000 : 2 = 5.000 dan 20.000 : 4 = 5.000 — harga per pensil identik."),
                    o("Warung B lebih murah karena jumlah uangnya dua kali lipat.", false, "Jumlah total memang beda, tapi jumlah pensilnya juga beda. Bandingkan harga per SATU pensil dulu."),
                    o("Tidak bisa diketahui tanpa menanyakan penjualnya.", false, "Kita bisa menyimpulkan dari data yang ada — coba bagi masing-masing total dengan jumlah pensilnya."),
                  ],
                  petunjuk: ["Hitung dulu harga satu pensil di tiap warung.", "10.000 dibagi 2, dan 20.000 dibagi 4."],
                  feedbackBenar: "Tepat — kamu menemukan 'harga satuan' sebagai kunci perbandingan.",
                },
              },
            ],
          },
          {
            id: "pb-senilai-m2",
            judul: "Menanya",
            ikon: "❓",
            deskripsi: "Bangun pertanyaanmu sendiri sebelum datanya dikumpulkan.",
            blok: [
              { id: "pb-senilai-m2-b1", tipe: "teks", judul: "Giliranmu bertanya", teks: "Dari dua harga tadi, hal apa yang ingin kamu ketahui agar bisa memastikan mana yang benar-benar lebih murah?" },
              { id: "pb-senilai-m2-b2", tipe: "refleksi", judul: "Pertanyaanmu", teks: "Tulis satu pertanyaanmu di sini." },
              {
                id: "pb-senilai-m2-b3",
                tipe: "pertanyaan",
                judul: "Pertanyaan paling tepat",
                pertanyaan: {
                  teks: "Pertanyaan manakah yang paling tepat untuk menyelidiki kedua harga itu?",
                  opsi: [
                    o("Berapa harga satu pensil di masing-masing warung?", true, "Tepat! Harga satuan adalah jembatan untuk membandingkan dua total yang berbeda."),
                    o("Siapa yang membuat pensilnya?", false, "Produsen tidak memengaruhi harga jual di kedua warung. Pertanyaan itu menjauh dari fenomena yang diamati."),
                    o("Berapa jumlah pensil yang tersisa di rak?", false, "Sisa stok tidak menjelaskan harga per biji. Fokus pada hubungan jumlah barang dengan total harga."),
                  ],
                  petunjuk: ["Pertanyaan yang baik mengarah pada data baru yang belum kamu punya.", "Yang dibutuhkan adalah pembanding per satuan."],
                  feedbackBenar: "Bagus — pertanyaanmu kini siap diuji dengan data.",
                },
              },
            ],
          },
          {
            id: "pb-senilai-m3",
            judul: "Mengumpulkan Informasi",
            ikon: "🔎",
            deskripsi: "Manipulasi angka lewat tabel harga dan aktivitas mencocokkan.",
            blok: [
              { id: "pb-senilai-m3-b1", tipe: "teks", judul: "Instruksi", teks: "Harga satu pensil Rp5.000. Lengkapi tabel di bawah ini dengan mengalikan jumlah pensil dengan harga satuan, lalu cocokkan pasangan yang setara." },
              {
                id: "pb-senilai-m3-b2",
                tipe: "aktivitas",
                aktivitas: {
                  tipe: "isi-tabel",
                  instruksi: "Isi kolom Harga dengan hasil perkalianmu, lalu tekan Periksa.",
                  kolom: ["Jumlah pensil", "Harga satuan", "Total harga"],
                  baris: [
                    { sel: [{ teks: "2" }, { teks: "Rp5.000" }, { kunci: "10000", feedbackBenar: "2 × 5.000 = 10.000 — sesuai data awal.", feedbackSalah: "Kalikan 2 dengan 5.000." }] },
                    { sel: [{ teks: "4" }, { teks: "Rp5.000" }, { kunci: "20000", feedbackBenar: "4 × 5.000 = 20.000 — inilah total Warung B.", feedbackSalah: "Kalikan 4 dengan 5.000: coba 5.000 + 5.000 + 5.000 + 5.000." }] },
                    { sel: [{ teks: "6" }, { teks: "Rp5.000" }, { kunci: "30000", feedbackBenar: "6 × 5.000 = 30.000.", feedbackSalah: "Kalikan 6 dengan 5.000." }] },
                    { sel: [{ teks: "5" }, { teks: "Rp5.000" }, { kunci: "25000", feedbackBenar: "5 × 5.000 = 25.000 — pola perkaliannya konsisten.", feedbackSalah: "Kalikan 5 dengan 5.000." }] },
                  ],
                },
              },
              {
                id: "pb-senilai-m3-b3",
                tipe: "aktivitas",
                aktivitas: {
                  tipe: "cocokkan",
                  instruksi: "Klik satu kartu di kolom kiri, lalu klik pasangan setaranya di kolom kanan.",
                  kiri: [
                    { id: "c1", label: "2 pensil" },
                    { id: "c2", label: "4 pensil" },
                    { id: "c3", label: "6 pensil" },
                  ],
                  kanan: [
                    { id: "k1", label: "Rp30.000" },
                    { id: "k2", label: "Rp10.000" },
                    { id: "k3", label: "Rp20.000" },
                  ],
                  pasangan: { c1: "k2", c2: "k3", c3: "k1" },
                  feedbackSalah: "Belum setara — hitung dulu total harga masing-masing (jumlah × Rp5.000), baru pasangkan.",
                },
              },
              { id: "pb-senilai-m3-b4", tipe: "petunjuk", judul: "Petunjuk", teks: "Dua perbandingan SENILAI jika hasil baginya sama: 10.000/2 = 20.000/4 = 5.000." },
            ],
          },
          {
            id: "pb-senilai-m4",
            judul: "Menalar",
            ikon: "🧠",
            deskripsi: "Konsep formal menyusul — setelah pola harga satuan kamu temukan.",
            blok: [
              { id: "pb-senilai-m4-b1", tipe: "teks", judul: "Konsep: Perbandingan Senilai", teks: "Dua perbandingan dinyatakan SENILAI jika hasil baginya sama.\na/b = c/d artinya a : b = c : d.\nContoh: 10.000/2 = 20.000/4 karena keduanya bernilai 5.000.\nSatuannya boleh berbeda (rupiah & pensil), yang penting rasionya identik." },
              { id: "pb-senilai-m4-b2", tipe: "video", url: "", judul: "Video penjelas (opsional)", teks: "Tautan video perbandingan senilai" },
              {
                id: "pb-senilai-m4-b3",
                tipe: "pertanyaan",
                judul: "Uji pemahamanmu",
                pertanyaan: {
                  teks: "Manakah pasangan perbandingan yang SENILAI?",
                  opsi: [
                    o("15/3 dan 20/4 — keduanya bernilai 5.", true, "Sempurna! 15 : 3 = 5 dan 20 : 4 = 5 — hasil baginya sama."),
                    o("15/3 dan 20/5 — keduanya punya penyebut ganjil.", false, "Penyebut ganjil bukan ukuran kesetaraan. Yang dibandingkan adalah HASIL BAGINYA, bukan bentuk angkanya."),
                    o("10/2 dan 12/3 — karena bedanya sama-sama 8.", false, "Selisih sama ≠ perbandingan senilai. 10/2 = 5 sedangkan 12/3 = 4 — rasionya berbeda."),
                  ],
                  petunjuk: ["Bagi setiap pembilang dengan penyebutnya.", "Bandingkan hasil bagi yang diperoleh."],
                  feedbackBenar: "Kamu kini paham perbandingan senilai!",
                },
              },
            ],
          },
          {
            id: "pb-senilai-m5",
            judul: "Mengomunikasikan & Mengevaluasi",
            ikon: "💬",
            deskripsi: "Jelaskan strategimu dan evaluasi solusi yang keliru.",
            blok: [
              {
                id: "pb-senilai-m5-b1",
                tipe: "pertanyaan",
                judul: "Error analysis",
                pertanyaan: {
                  teks: "Sinta berkata: \"2 pensil Rp10.000 dan 3 pensil Rp15.000 jelas berbeda karena 10.000 ≠ 15.000.\" Apa yang keliru?",
                  opsi: [
                    o("Ia membandingkan total harga tanpa memperhatikan jumlah pensil — padahal 10.000/2 = 15.000/3 = 5.000.", true, "Tepat! Total boleh beda selama harga satuan tetap sama — itulah perbandingan senilai."),
                    o("Ia salah karena 15.000 seharusnya Rp16.000.", false, "Angkanya benar. Kesalahan Sinta terletak pada CARA membandingkan, bukan pada nilai rupiahnya."),
                    o("Sebenarnya Sinta benar karena jumlah pensilnya berbeda.", false, "Justru jumlah pensil berbeda tapi harga satuan sama → keduanya senilai. Sinta berhenti terlalu cepat pada total."),
                  ],
                  petunjuk: ["Selalu turunkan ke harga per satu satuan sebelum memutuskan.", "10.000/2 dan 15.000/3 — berapa hasilnya?"],
                  feedbackBenar: "Analisis yang tajam — kamu menangkap kesalahan penalaran Sinta.",
                },
              },
              { id: "pb-senilai-m5-b2", tipe: "refleksi", judul: "Refleksi akhir", teks: "Bagaimana kamu akan menjelaskan 'perbandingan senilai' kepada teman yang baru belajar? Tulis 2–3 kalimat dengan bahasamu sendiri." },
            ],
          },
        ],
      },
      {
        id: "pb-balik",
        judul: "Perbandingan Berbalik Nilai",
        deskripsi: "Saat satu besaran naik, besaran lain turun — ditemukan lewat aktivitas 'Atur Para Pekerja'.",
        missions: [
          {
            id: "pb-balik-m1",
            judul: "Mengamati",
            ikon: "👀",
            deskripsi: "Amati situasi penyelesaian pekerjaan sebelum rumus apa pun diberikan.",
            blok: [
              { id: "pb-balik-m1-b1", tipe: "teks", judul: "Situasi", teks: "Sebuah taman harus selesai tepat waktu.\n• Dengan 4 pekerja, taman selesai dalam 12 hari.\n• Karena terlambat, mandor menambah pekerja.\nAmati: apa yang kira-kira terjadi pada lama pengerjaan saat pekerja ditambah?" },
              { id: "pb-balik-m1-b2", tipe: "gambar", url: "", teks: "👷 4 pekerja · taman selesai dalam 12 hari" },
              {
                id: "pb-balik-m1-b3",
                tipe: "pertanyaan",
                judul: "Hasil pengamatanmu",
                pertanyaan: {
                  teks: "Jika pekerja ditambah (misal menjadi 8 orang), apa yang kamu duga terjadi pada lamanya pekerjaan?",
                  opsi: [
                    o("Waktu pengerjaan menjadi lebih singkat karena tenaga bertambah.", true, "Tepat — lebih banyak tenaga, pekerjaan lebih cepat selesai. Sekarang kita akan menguji seberapa cepat."),
                    o("Waktu pengerjaan tetap 12 hari karena pekerjaannya sama.", false, "Kalau waktu sama, menambah pekerja tidak memberi manfaat apa pun. Amati: tenaga yang tersedia bertambah."),
                    o("Waktu pengerjaan justru menjadi lebih lama.", false, "Logika ini membalik kenyataan. Tambah pekerja = tenaga bertambah = waktu memendek."),
                  ],
                  petunjuk: ["Bayangkan mengerjakan tugas kelas berdua vs berdelapan.", "Tenaga bertambah biasanya membuat waktu memendek."],
                  feedbackBenar: "Dugaanmu tepat — mari kita buktikan dengan data.",
                },
              },
            ],
          },
          {
            id: "pb-balik-m2",
            judul: "Menanya",
            ikon: "❓",
            deskripsi: "Apa pertanyaanmu tentang hubungan jumlah pekerja dan lama pekerjaan?",
            blok: [
              { id: "pb-balik-m2-b1", tipe: "teks", judul: "Giliranmu bertanya", teks: "Hubungan apa yang ingin kamu selidiki dari situasi taman tadi?" },
              { id: "pb-balik-m2-b2", tipe: "refleksi", judul: "Pertanyaanmu", teks: "Tulis pertanyaanmu di sini." },
              {
                id: "pb-balik-m2-b3",
                tipe: "pertanyaan",
                judul: "Pertanyaan paling tepat",
                pertanyaan: {
                  teks: "Pertanyaan manakah yang paling tepat untuk menyelidiki situasi ini?",
                  opsi: [
                    o("Bagaimana lama pekerjaan berubah ketika jumlah pekerja ditambah?", true, "Tepat! Pertanyaan ini menyentuh hubungan antara dua besaran yang saling memengaruhi."),
                    o("Siapa nama mandor yang memimpin pekerjaan?", false, "Identitas mandor tidak menjelaskan hubungan pekerja dan waktu. Pertanyaanmu harus dekat dengan fenomena."),
                    o("Berapa warna alat yang dipakai pekerja?", false, "Detail visual tidak menyentuh pola yang ingin ditemukan. Kembali pada besaran: pekerja & hari."),
                  ],
                  petunjuk: ["Fokus pada dua besaran yang berubah: jumlah pekerja dan lama hari.", "Pertanyaan yang baik meminta hubungan 'ketika … berubah …'."],
                  feedbackBenar: "Pertanyaanmu kini siap diuji lewat aktivitas berikutnya.",
                },
              },
            ],
          },
          {
            id: "pb-balik-m3",
            judul: "Mengumpulkan Informasi",
            ikon: "🔎",
            deskripsi: "Aktivitas: ATUR PARA PEKERJA — seret stok pekerja ke area kondisi baru dan amati hasilnya.",
            blok: [
              { id: "pb-balik-m3-b1", tipe: "teks", judul: "👷 Atur Para Pekerja", teks: "Kondisi awal: 4 pekerja → 12 hari.\nSeret salah satu kartu pekerja ke area kondisi baru untuk melihat berapa hari yang dibutuhkan. Ulangi untuk semua kartu dan temukan polanya." },
              {
                id: "pb-balik-m3-b2",
                tipe: "aktivitas",
                aktivitas: {
                  tipe: "seret-slot",
                  instruksi: "Seret (atau klik lalu pilih area) kartu pekerja ke dalam area kondisi baru.",
                  area: "Area kondisi baru",
                  kartu: [
                    { id: "w4", label: "4 pekerja", hasil: "4 pekerja → 12 hari", feedback: "Kondisi awal. 4 × 12 = 48 hari-kerja — inilah 'harga' total pekerjaan." },
                    { id: "w6", label: "6 pekerja", hasil: "6 pekerja → 8 hari", feedback: "6 × 8 = 48. Tambah pekerja, hari memendek — tapi hasil kalinya tetap 48!" },
                    { id: "w8", label: "8 pekerja", hasil: "8 pekerja → 6 hari", feedback: "8 × 6 = 48. Pola yang sama muncul lagi." },
                    { id: "w12", label: "12 pekerja", hasil: "12 pekerja → 4 hari", feedback: "12 × 4 = 48. Paling banyak pekerja = paling cepat selesai." },
                  ],
                  temuan: "Semua pasangan menghasilkan 48 hari-kerja! Makin banyak pekerja → makin sedikit hari. Inilah PERBANDINGAN BERBALIK NILAI.",
                },
              },
              { id: "pb-balik-m3-b3", tipe: "petunjuk", judul: "Petunjuk", teks: "Amati dua kolom: saat pekerja NAIK, hari TURUN. Kalikan keduanya — hasilnya selalu sama (48)." },
            ],
          },
          {
            id: "pb-balik-m4",
            judul: "Menalar",
            ikon: "🧠",
            deskripsi: "Konsep formalnya menyusul — setelah pola temuanmu terbukti.",
            blok: [
              { id: "pb-balik-m4-b1", tipe: "teks", judul: "Konsep: Perbandingan Berbalik Nilai", teks: "PERBANDINGAN BERBALIK NILAI terjadi ketika satu besaran bertambah sementara besaran lain berkurang, dan hasil kalinya tetap konstan.\nJika a berbanding terbalik dengan b, maka a × b = k (konstan).\nContoh: 4 × 12 = 6 × 8 = 8 × 6 = 12 × 4 = 48." },
              {
                id: "pb-balik-m4-b2",
                tipe: "aktivitas",
                aktivitas: {
                  tipe: "isi-tabel",
                  instruksi: "Isi kolom terakhir untuk membuktikan hasil kalinya selalu sama.",
                  kolom: ["Jumlah pekerja", "Lama hari", "Pekerja × Hari"],
                  baris: [
                    { sel: [{ teks: "4" }, { teks: "12" }, { kunci: "48", feedbackBenar: "4 × 12 = 48 ✓", feedbackSalah: "Kalikan 4 dengan 12." }] },
                    { sel: [{ teks: "6" }, { teks: "8" }, { kunci: "48", feedbackBenar: "6 × 8 = 48 ✓ — sama!", feedbackSalah: "Kalikan 6 dengan 8." }] },
                    { sel: [{ teks: "8" }, { teks: "6" }, { kunci: "48", feedbackBenar: "8 × 6 = 48 ✓ — konstan!", feedbackSalah: "Kalikan 8 dengan 6." }] },
                    { sel: [{ teks: "12" }, { teks: "4" }, { kunci: "48", feedbackBenar: "12 × 4 = 48 ✓ — pola terbukti!", feedbackSalah: "Kalikan 12 dengan 4." }] },
                  ],
                },
              },
              {
                id: "pb-balik-m4-b3",
                tipe: "pertanyaan",
                judul: "Uji pemahamanmu",
                pertanyaan: {
                  teks: "Bagaimana hubungan antara jumlah pekerja dan lama pekerjaan?",
                  opsi: [
                    o("Berbalik nilai — pekerja naik, hari turun, dan hasil kalinya tetap 48.", true, "Sempurna! Kamu menyebutkan ciri khas perbandingan berbalik nilai: hasil kalinya konstan."),
                    o("Senilai — pekerja naik, hari juga naik.", false, "Kalau senilai, 12 pekerja akan butuh lebih banyak hari (36 hari). Kenyataannya justru turun ke 4 hari."),
                    o("Tidak ada hubungan — hasilnya kebetulan sama.", false, "Empat pasangan identik menghasilkan 48 bukan kebetulan. Itu pola: a × b = konstan."),
                  ],
                  petunjuk: ["Lihat kolom 'Pekerja × Hari' — apa yang terjadi pada hasilnya?", "Ciri berbalik nilai: satu naik, satu turun, hasil kali tetap."],
                  feedbackBenar: "Konsep berbalik nilai sudah kamu kuasai!",
                },
              },
            ],
          },
          {
            id: "pb-balik-m5",
            judul: "Mengomunikasikan & Mengevaluasi",
            ikon: "💬",
            deskripsi: "Jelaskan strategimu, evaluasi solusi yang keliru, lalu refleksikan pembelajaranmu.",
            blok: [
              {
                id: "pb-balik-m5-b1",
                tipe: "pertanyaan",
                judul: "Error analysis",
                pertanyaan: {
                  teks: "Bima berkata: \"Kalau 4 pekerja butuh 12 hari, maka 8 pekerja butuh 24 hari karena 8 = 2 × 4.\" Apa yang keliru?",
                  opsi: [
                    o("Bima memakai perbandingan senilai pada situasi berbalik nilai — seharusnya hari dibagi 2 menjadi 6 hari.", true, "Tepat! Karena hasil kalinya harus tetap 48: 8 × 6 = 48. Bima menggandakan waktu, padahal seharusnya memendek."),
                    o("Bima salah karena 8 pekerja seharusnya butuh 12 hari.", false, "12 hari adalah waktu awal dengan 4 pekerja. Dengan 8 pekerja waktu harus berkurang, bukan sama."),
                    o("Bima benar karena lebih banyak pekerja butuh waktu lebih lama.", false, "Justru kebalikannya — lebih banyak pekerja mempercepat. Perhatikan pola: pekerja naik → hari turun."),
                  ],
                  petunjuk: ["Cek apakah hasil kalinya tetap 48: 4 × 12 = 48, lalu 8 × ? = 48.", "Jika pekerja digandakan, waktunya dibagi dua."],
                  feedbackBenar: "Kritis sekali — kamu menangkap salah terap perbandingan senilai.",
                },
              },
              { id: "pb-balik-m5-b2", tipe: "refleksi", judul: "Refleksi akhir", teks: "Bagaimana kamu membedakan perbandingan senilai dan berbalik nilai dalam situasi nyata? Tulis 2–3 kalimat." },
            ],
          },
        ],
      },
    ],
  },
];
