"use client";

import React from "react";

export function Badge({ tone = "gray", children }: { tone?: "gray" | "purple" | "green" | "amber" | "red" | "blue"; children: React.ReactNode }) {
  const map: Record<string, string> = {
    gray: "bg-wash text-ink-soft border-line",
    purple: "bg-primary-50 text-primary border-primary-100",
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return <span className={`badge ${map[tone]}`}>{children}</span>;
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-wash border border-line overflow-hidden">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Empty({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="card card-pad text-center py-10">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-wash border border-line text-ink-faint">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 12h8M8 8h8M8 16h5" /></svg>
      </div>
      <p className="text-[14px] font-semibold">{title}</p>
      {desc ? <p className="muted mt-1 max-w-[420px] mx-auto">{desc}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, desc, right }: { title: string; desc?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="h1">{title}</h1>
        {desc ? <p className="muted mt-1 max-w-[640px]">{desc}</p> : null}
      </div>
      {right ? <div className="flex gap-2 shrink-0">{right}</div> : null}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <button aria-label="tutup" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"} bg-white border border-line rounded-t-2xl sm:rounded-2xl shadow-pop max-h-[92vh] overflow-auto`}>
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-line px-5 py-3.5 flex items-center justify-between">
          <p className="text-[15px] font-semibold">{title}</p>
          <button onClick={onClose} className="btn-ghost !px-2.5 !py-1.5 text-[13px]">Tutup</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card card-pad">
      <p className="text-[12.5px] text-ink-muted font-medium">{label}</p>
      <p className="text-[24px] font-bold tracking-tight mt-1">{value}</p>
      {sub ? <p className="muted mt-0.5 !text-[12.5px]">{sub}</p> : null}
    </div>
  );
}
