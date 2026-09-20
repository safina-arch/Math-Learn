import { toCsv } from "@/lib/utils";

/** Ekspor CSV demo: No | Nama | Kelas | Nilai (diambil dari query agar bisa diunduh tanpa JS). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rowsParam = url.searchParams.get("rows");
  let rows: (string | number)[][] = [["No", "Nama", "Kelas", "Nilai"]];
  if (rowsParam) {
    try {
      const parsed = JSON.parse(rowsParam) as { nama: string; kelas: string; nilai: number | null }[];
      parsed.forEach((r, i) => rows.push([i + 1, r.nama, r.kelas, r.nilai ?? "-"]));
    } catch {}
  } else {
    rows.push([1, "Aisyah Putri", "VIII-A", 88], [2, "Bima Prasetyo", "VIII-A", 76]);
  }
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=rekap-nilai.csv",
    },
  });
}
