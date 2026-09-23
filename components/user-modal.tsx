"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import type { Role, User } from "@/lib/types";
import { uid } from "@/lib/utils";

type AccountInput = User & { password?: string };

/**
 * Form tambah/ubah data pribadi user: Nama, Email/Username, Password,
 * Kelas (siswa), NISN, TTL (tempat + tanggal), foto profil.
 */
export function UserModal({
  open,
  initial,
  role,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: AccountInput | null;
  role: Role;
  onClose: () => void;
  onSave: (u: AccountInput) => void;
}) {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [kelas, setKelas] = useState("VIII-A");
  const [nisn, setNisn] = useState("");
  const [ttlTempat, setTtlTempat] = useState("");
  const [ttlTanggal, setTtlTanggal] = useState("");
  const [foto, setFoto] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);

  if (open && !wasOpen) {
    setWasOpen(true);
    setNama(initial?.nama || "");
    setEmail(initial?.email || "");
    setPassword("");
    setKelas(initial?.kelas && initial.kelas !== "-" ? initial.kelas : "VIII-A");
    setNisn(initial?.nisn || "");
    setFoto(initial?.fotoProfil || "");
    const parts = (initial?.ttl || "").split(", ");
    setTtlTempat(parts.length > 1 ? parts[0] : "");
    setTtlTanggal(parts.length > 1 && /^\d{4}-\d{2}-\d{2}$/.test(parts.slice(1).join(", ")) ? parts.slice(1).join(", ") : "");
    setErr(null);
  }
  if (!open && wasOpen) setWasOpen(false);
  if (!open) return null;

  async function handleFoto(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: form });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Foto gagal diunggah.");
        return;
      }
      setFoto(j.files?.[0]?.url || j.url);
    } catch {
      setErr("Foto gagal diunggah. Coba lagi.");
    } finally {
      setUploading(false);
    }
  }

  const ttl = [ttlTempat.trim(), ttlTanggal.trim()].filter(Boolean).join(", ");
  const label = role === "siswa" ? "siswa" : role === "guru" ? "guru" : "admin";

  return (
    <Modal open onClose={onClose} title={initial ? `Ubah ${label}` : `Tambah ${label}`} wide>
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          {foto ? (
            <img src={foto} alt="Foto profil" className="h-16 w-16 rounded-full object-cover border border-line" />
          ) : (
            <span className="h-16 w-16 rounded-full bg-wash border border-line flex items-center justify-center text-[22px] font-semibold text-ink-soft">{(nama.trim()[0] || "?").toUpperCase()}</span>
          )}
          <div>
            <p className="label !mb-1">Foto profil</p>
            <label className={`btn-ghost !py-1.5 !text-[12.5px] ${uploading ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} onChange={(e) => { handleFoto(e.target.files); e.currentTarget.value = ""; }} />
              {uploading ? "Mengunggah…" : foto ? "Ganti foto" : "Pilih foto"}
            </label>
            {foto ? <button className="text-red-600 text-[12.5px] ml-2" onClick={() => setFoto("")}>Hapus</button> : null}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Nama lengkap</label><input className="input" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama sesuai identitas" /></div>
          <div><label className="label">Email / username</label><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cth. 2601 / guru1" /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Kata sandi</label>
            <input className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={initial ? "Kosongkan jika tidak diubah" : "Kata sandi login"} />
          </div>
          {role === "siswa" ? (
            <div><label className="label">Kelas</label><select className="input" value={kelas} onChange={(e) => setKelas(e.target.value)}>{["VII-A", "VII-B", "VIII-A", "VIII-B", "IX-A", "IX-B"].map((k) => <option key={k}>{k}</option>)}</select></div>
          ) : (
            <div><label className="label">Kelas / wali kelas</label><input className="input" value={kelas} onChange={(e) => setKelas(e.target.value)} placeholder="cth. VIII / -" /></div>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">NISN <span className="text-ink-faint font-normal">(opsional)</span></label><input className="input" value={nisn} onChange={(e) => setNisn(e.target.value)} placeholder="Nomor induk siswa nasional" inputMode="numeric" /></div>
          <div>
            <label className="label">Tempat, tanggal lahir (TTL)</label>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" value={ttlTempat} onChange={(e) => setTtlTempat(e.target.value)} placeholder="Tempat" />
              <input type="date" className="input" value={ttlTanggal} onChange={(e) => setTtlTanggal(e.target.value)} />
            </div>
          </div>
        </div>

        {err ? <p role="alert" className="text-[12.5px] text-red-600">{err}</p> : null}

        <div className="flex gap-2">
          <button
            className="btn-primary flex-1"
            disabled={!nama.trim() || !email.trim() || (!initial && !password.trim()) || uploading}
            onClick={() => onSave({
              id: initial?.id || uid("u"),
              nama: nama.trim(),
              email: email.trim(),
              role,
              kelas: role === "siswa" ? kelas : (kelas.trim() || "-"),
              nisn: nisn.trim() || undefined,
              ttl: ttl || undefined,
              fotoProfil: foto || undefined,
              password: password.trim() || initial?.password,
            })}
          >Simpan</button>
          <button className="btn-ghost" onClick={onClose}>Batal</button>
        </div>
      </div>
    </Modal>
  );
}
