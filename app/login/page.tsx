"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";

function Form() {
  const { login } = useStore();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const msg = login(username, password);
        if (msg) setErr(msg);
        else router.push("/dashboard");
      }}
      className="card card-pad sm:p-7 space-y-4"
    >
      <div>
        <label className="label" htmlFor="username">Username / kode pengguna</label>
        <input id="username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Masukkan username atau kode" autoComplete="username" />
      </div>
      <div>
        <label className="label" htmlFor="pw">Kata sandi</label>
        <input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan kata sandi" autoComplete="current-password" />
      </div>
      {err ? <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p> : null}
      <button className="btn-primary w-full !py-2.5" type="submit">Masuk</button>
      <p className="text-[12.5px] text-ink-muted text-center">Gunakan username dan kata sandi yang diberikan oleh sekolah.</p>
    </form>
  );
}

export default function LoginPage() {
  return (
      <div className="min-h-screen bg-wash/60">
        <div className="mx-auto max-w-[440px] px-4 py-10 sm:py-16">
          <Link href="/" className="flex items-center gap-2 mb-6">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">M</span>
            <span className="font-bold tracking-tight">Math-Learn</span>
          </Link>
          <h1 className="h1">Selamat datang kembali</h1>
          <p className="muted mt-1 mb-5">Masuk untuk lanjut belajar atau mengajar.</p>
          <Form />
        </div>
      </div>
  );
}
