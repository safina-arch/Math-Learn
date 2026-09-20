"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";

function Form() {
  const { register } = useStore();
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [kelas, setKelas] = useState("VIII-A");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!nama.trim() || !email.trim() || !password) {
          setErr("Lengkapi nama, email, dan kata sandi.");
          return;
        }
        const msg = register(nama.trim(), email.trim(), password, kelas);
        if (msg) setErr(msg);
        else router.push("/dashboard");
      }}
      className="card card-pad sm:p-7 space-y-4"
    >
      <div>
        <label className="label">Nama lengkap</label>
        <input className="input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="cth. Aisyah Putri" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Email</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@sekolah.id" />
        </div>
        <div>
          <label className="label">Kelas</label>
          <select className="input" value={kelas} onChange={(e) => setKelas(e.target.value)}>
            {["VII-A", "VII-B", "VIII-A", "VIII-B", "IX-A", "IX-B"].map((k) => <option key={k}>{k}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Kata sandi</label>
        <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min. 6 karakter" />
      </div>
      {err ? <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p> : null}
      <button className="btn-primary w-full !py-2.5" type="submit">Buat akun siswa</button>
      <p className="text-[13.5px] text-ink-muted text-center">Sudah punya akun? <Link href="/login" className="text-primary font-medium">Masuk</Link></p>
    </form>
  );
}

export default function RegisterPage() {
  return (
      <div className="min-h-screen bg-wash/60">
        <div className="mx-auto max-w-[440px] px-4 py-10 sm:py-16">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">M</span>
            <span className="font-bold tracking-tight">Math-Learn</span>
          </Link>
          <h1 className="h1">Buat akun</h1>
          <p className="muted mt-1 mb-5">Akun baru otomatis berperan sebagai siswa.</p>
          <Form />
        </div>
      </div>
  );
}
