import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuthUserId } from "@/hooks/useCardDetail";
import { getLatestArticles, type Article } from "@/data/articles";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export interface DbArticle {
  id: string;
  title: string;
  category_tag: string;
  excerpt: string | null;
  content: string;
  thumbnail_url: string | null;
  is_published: boolean;
  published_at: string;
  created_at: string;
}

const SELECT =
  "id, title, category_tag, excerpt, content, thumbnail_url, is_published, published_at, created_at";

export function toArticle(row: DbArticle): Article & { excerpt?: string; content?: string } {
  return {
    id: row.id,
    title: row.title,
    categoryTag: row.category_tag,
    thumbnailUrl: row.thumbnail_url ?? "/cards/card-1.jpg",
    publishedDate: row.published_at,
    excerpt: row.excerpt ?? undefined,
    content: row.content,
  };
}

/** Published articles from Supabase; falls back to bundled demo articles when empty. */
export function usePublishedArticles() {
  const query = useQuery({
    queryKey: ["articles", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(SELECT)
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as DbArticle[];
    },
  });

  const rows = query.data ?? [];
  const articles = rows.length > 0 ? rows.map(toArticle) : getLatestArticles();
  return { ...query, articles };
}

export function useArticle(id: string) {
  return useQuery({
    queryKey: ["articles", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? toArticle(data as DbArticle) : null;
    },
  });
}

/** All articles including drafts (admin only). */
export function useAdminArticles(enabled = true) {
  return useQuery({
    queryKey: ["admin", "articles"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select(SELECT)
        .order("published_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as DbArticle[];
    },
  });
}

export interface ArticleInput {
  title: string;
  categoryTag: string;
  excerpt: string;
  content: string;
  isPublished: boolean;
  publishedAt: string;
  file?: File | null;
}

async function uploadThumbnail(userId: string, file: File) {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/news-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("card-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  const { data, error: signErr } = await supabase.storage
    .from("card-images")
    .createSignedUrl(path, TEN_YEARS);
  if (signErr) throw new Error(signErr.message);
  return data.signedUrl;
}

export function useSaveArticle() {
  const queryClient = useQueryClient();
  const userId = useAuthUserId();

  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ArticleInput }) => {
      if (!userId) throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ");
      if (!input.title.trim()) throw new Error("กรุณากรอกหัวข้อข่าว");

      const thumbnail = input.file ? await uploadThumbnail(userId, input.file) : undefined;

      const payload = {
        title: input.title.trim(),
        category_tag: input.categoryTag.trim() || "ข่าวสาร",
        excerpt: input.excerpt.trim() || null,
        content: input.content,
        is_published: input.isPublished,
        published_at: input.publishedAt
          ? new Date(input.publishedAt).toISOString()
          : new Date().toISOString(),
        ...(thumbnail ? { thumbnail_url: thumbnail } : {}),
      };

      if (id) {
        const { error } = await supabase.from("articles").update(payload).eq("id", id);
        if (error) throw new Error(error.message);
        return id;
      }

      const { data, error } = await supabase
        .from("articles")
        .insert({ ...payload, author_id: userId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data.id as string;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
      void queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "articles"] });
      void queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
  });
}
