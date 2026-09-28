import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { compressImageFile } from "@/lib/image-compress";
import { uid } from "@/lib/utils";

/*
 * หมวดเกม + banner หน้าแรกที่แอดมินจัดการเอง (ตาราง categories / banners, patch 28 ก.ย. 2026)
 * ทั้งสองตารางยังไม่อยู่ใน types ที่ generate ไว้ จึง cast เป็น never ตามแบบ usePoints
 */

export interface Category {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface SiteBanner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  /** รูปที่ครอบ 4:3 สำหรับมือถือ (null/ไม่มีคอลัมน์ = ใช้รูปจอคอม) */
  image_url_mobile?: string | null | undefined;
  cta_text: string | null;
  cta_link: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

const CATEGORY_COLUMNS = "id, slug, name, sort_order, is_active";
// ใช้ * เพื่อให้อ่านได้ทั้งก่อน/หลัง patch ที่เพิ่ม image_url_mobile (เลือกคอลัมน์ที่ยังไม่มีจะ error ทั้งหน้าแรก)
const BANNER_COLUMNS = "*";

/** หมวดทั้งหมด (หน้าเว็บกรองเฉพาะที่เปิดเอง) */
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories" as never)
        .select(CATEGORY_COLUMNS)
        .order("sort_order" as never)
        .order("name" as never);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Category[];
    },
  });
}

/** banner ที่กำลังแสดง — RLS คัดเฉพาะที่เปิดและอยู่ในช่วงเวลาให้แล้ว */
export function useBanners() {
  return useQuery({
    queryKey: ["banners", "live"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("banners" as never)
        .select(BANNER_COLUMNS)
        .eq("is_active" as never, true as never)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order("sort_order" as never);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SiteBanner[];
    },
  });
}

export function useAdminBanners() {
  return useQuery({
    queryKey: ["banners", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners" as never)
        .select(BANNER_COLUMNS)
        .order("sort_order" as never)
        .order("created_at" as never);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SiteBanner[];
    },
  });
}

export type BannerInput = Omit<SiteBanner, "id"> & { id?: string | undefined };

export function useSaveBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...row }: BannerInput) => {
      // ไม่ได้ครอบรูปมือถือใหม่ → ไม่ส่งช่องนี้ (กันพังถ้ายังไม่ได้ apply patch เพิ่มคอลัมน์)
      const { image_url_mobile, ...rest } = row;
      const payload = {
        ...rest,
        ...(image_url_mobile !== undefined ? { image_url_mobile } : {}),
        updated_at: new Date().toISOString(),
      };
      const { error } = id
        ? await supabase
            .from("banners" as never)
            .update(payload as never)
            .eq("id" as never, id as never)
        : await supabase.from("banners" as never).insert(payload as never);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["banners"] }),
  });
}

/** ลบแถว banner เท่านั้น — ไฟล์รูปใน storage ค้างไว้ตามกติการ้าน */
export function useDeleteBanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("banners" as never)
        .delete()
        .eq("id" as never, id as never);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["banners"] }),
  });
}

/**
 * อัปโหลดรูป banner → คืน public URL
 * รูปที่ครอบจาก BannerCropDialog ย่อ/แปลงเป็น WebP มาแล้ว (alreadySized) ไม่ต้องบีบซ้ำ
 */
export async function uploadBannerImage(file: File, alreadySized = false): Promise<string> {
  const small = alreadySized ? file : await compressImageFile(file, 2400);
  const ext = small.type === "image/png" ? "png" : small.type === "image/webp" ? "webp" : "jpg";
  const path = `${new Date().getFullYear()}/${uid()}.${ext}`;
  const { error } = await supabase.storage
    .from("banners")
    .upload(path, small, { contentType: small.type, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("banners").getPublicUrl(path).data.publicUrl;
}

export type CategoryInput = Omit<Category, "id"> & { id?: string | undefined };

export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...row }: CategoryInput) => {
      const { error } = id
        ? await supabase
            .from("categories" as never)
            .update(row as never)
            .eq("id" as never, id as never)
        : await supabase.from("categories" as never).insert(row as never);
      if (error) {
        if (error.code === "23505") throw new Error("slug นี้มีหมวดอื่นใช้แล้ว");
        throw new Error(error.message);
      }
      return true;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}

/** ลบหมวด — การ์ดในหมวดนั้นกลับเป็น "ไม่ระบุหมวด" (on delete set null) ไม่หายไปด้วย */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("categories" as never)
        .delete()
        .eq("id" as never, id as never);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
      void queryClient.invalidateQueries({ queryKey: ["cards"] });
    },
  });
}

/** แปลงชื่อหมวดเป็น slug สำหรับ URL (อังกฤษ/ตัวเลข) — ภาษาไทยล้วนให้แอดมินพิมพ์เอง */
export function slugify(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
