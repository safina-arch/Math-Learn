"use client";

import { AppShell, Guard } from "@/components/shell";
import { AssignmentList } from "@/components/assignment-list";

export default function LatihanPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <AssignmentList tipe="latihan" />
      </Guard>
    </AppShell>
  );
}
