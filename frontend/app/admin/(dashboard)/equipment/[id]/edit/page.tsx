"use client";

import { useParams } from "next/navigation";

import { EquipmentForm } from "@/components/admin/EquipmentForm";

/** 编辑设备页 */
export default function EditEquipmentPage() {
  const params = useParams<{ id: string }>();
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">编辑设备 #{params.id}</h2>
      <EquipmentForm equipmentId={Number(params.id)} />
    </div>
  );
}
