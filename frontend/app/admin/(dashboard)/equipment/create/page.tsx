"use client";

import { EquipmentForm } from "@/components/admin/EquipmentForm";

/** 新增设备页 */
export default function CreateEquipmentPage() {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">新增设备</h2>
      <EquipmentForm />
    </div>
  );
}
