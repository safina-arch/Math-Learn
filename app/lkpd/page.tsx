"use client";

import { AppShell, Guard } from "@/components/shell";
import { AssignmentList } from "@/components/assignment-list";

export default function LkpdPage() {
  return (
    <AppShell>
      <Guard allow={["siswa", "guru", "admin"]}>
        <AssignmentList tipe="lkpd" />
      </Guard>
    </AppShell>
  );
}
