import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { isPermissionError } from "@/lib/query-guards";

export interface SavedAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postcode: string;
  is_default: boolean;
}

export type AddressInput = Omit<SavedAddress, "id"> & { is_default: boolean };

const COLUMNS =
  "id, label, name, phone, address, subdistrict, district, province, postcode, is_default";

/** สมุดที่อยู่จัดส่งของผู้ใช้ที่เข้าสู่ระบบ */
export function useAddresses(userId: string | null) {
  return useQuery({
    queryKey: ["addresses", userId],
    enabled: !!userId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_addresses")
        .select(COLUMNS)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) {
        if (isPermissionError(error)) return [] as SavedAddress[];
        throw error;
      }
      return (data ?? []) as SavedAddress[];
    },
  });
}

function useInvalidate(userId: string | null) {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ["addresses", userId] });
}

/** เพิ่มที่อยู่ใหม่เข้าสมุดที่อยู่ */
export function useAddAddress(userId: string | null) {
  const invalidate = useInvalidate(userId);
  return useMutation({
    mutationFn: async (input: AddressInput) => {
      if (!userId) throw new Error("กรุณาเข้าสู่ระบบก่อนบันทึกที่อยู่");
      const { data, error } = await supabase
        .from("user_addresses")
        .insert({ ...input, user_id: userId })
        .select(COLUMNS)
        .single();
      if (error) throw error;
      return data as SavedAddress;
    },
    onSuccess: invalidate,
  });
}

/** ตั้งที่อยู่นี้เป็นค่าเริ่มต้น */
export function useSetDefaultAddress(userId: string | null) {
  const invalidate = useInvalidate(userId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_addresses")
        .update({ is_default: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** ลบที่อยู่ออกจากสมุดที่อยู่ */
export function useDeleteAddress(userId: string | null) {
  const invalidate = useInvalidate(userId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
