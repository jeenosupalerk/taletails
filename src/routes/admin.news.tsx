import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminArticles,
  useDeleteArticle,
  useSaveArticle,
  type ArticleInput,
  type DbArticle,
} from "@/hooks/useArticles";

export const Route = createFileRoute("/admin/news")({
  component: AdminNewsPage,
});

const CATEGORIES = ["ข่าวสาร", "คู่มือ", "ตลาด", "ตรวจสอบความแท้", "การลงทุน"];

const emptyForm: ArticleInput = {
  title: "",
  categoryTag: "ข่าวสาร",
  excerpt: "",
  content: "",
  isPublished: true,
  publishedAt: "",
  file: null,
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AdminNewsPage() {
  const articles = useAdminArticles();
  const save = useSaveArticle();
  const remove = useDeleteArticle();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleInput>(emptyForm);

  const set = <K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const startCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, publishedAt: toLocalInput(new Date().toISOString()) });
    setOpen(true);
  };

  const startEdit = (a: DbArticle) => {
    setEditId(a.id);
    setForm({
      title: a.title,
      categoryTag: a.category_tag,
      excerpt: a.excerpt ?? "",
      content: a.content ?? "",
      isPublished: a.is_published,
      publishedAt: toLocalInput(a.published_at),
      file: null,
    });
    setOpen(true);
  };

  const submit = () =>
    save.mutate(
      { ...(editId ? { id: editId } : {}), input: form },
      {
        onSuccess: () => {
          toast.success(editId ? "บันทึกข่าวแล้ว" : "เผยแพร่ข่าวใหม่แล้ว");
          setOpen(false);
          setEditId(null);
          setForm(emptyForm);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"),
      },
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">ข่าวสาร</h2>
        {open ? (
          <Button
            variant="secondary"
            className="h-11 rounded-xl px-4 text-sm"
            onClick={() => {
              setOpen(false);
              setEditId(null);
            }}
          >
            <X className="h-4 w-4" />
            ปิดฟอร์ม
          </Button>
        ) : (
          <Button className="h-11 rounded-xl px-4 text-sm" onClick={startCreate}>
            <Plus className="h-4 w-4" />
            สร้างข่าวใหม่
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-4 rounded-3xl border border-border bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="title">หัวข้อข่าว</Label>
              <Input
                id="title"
                className="h-11 rounded-xl"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="เช่น สรุปตลาดการ์ดประจำเดือน"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">หมวดหมู่</Label>
              <select
                id="category"
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                value={form.categoryTag}
                onChange={(e) => set("categoryTag", e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="publishedAt">วันเวลาเผยแพร่</Label>
              <Input
                id="publishedAt"
                type="datetime-local"
                className="h-11 rounded-xl"
                value={form.publishedAt}
                onChange={(e) => set("publishedAt", e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="excerpt">เรื่องย่อ</Label>
              <Input
                id="excerpt"
                className="h-11 rounded-xl"
                value={form.excerpt}
                onChange={(e) => set("excerpt", e.target.value)}
                placeholder="สรุปสั้นๆ 1-2 บรรทัด"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="content">เนื้อหา</Label>
              <Textarea
                id="content"
                rows={8}
                className="rounded-xl"
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder="เขียนเนื้อหาข่าว เว้นบรรทัดเพื่อแยกย่อหน้า"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="thumb">รูปปก</Label>
              <Input
                id="thumb"
                type="file"
                accept="image/*"
                className="h-11 rounded-xl py-2.5"
                onChange={(e) => set("file", e.target.files?.[0] ?? null)}
              />
            </div>

            <label className="flex h-11 items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => set("isPublished", e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              เผยแพร่ทันที
            </label>
          </div>

          <Button
            className="h-11 w-full rounded-xl sm:w-auto sm:px-6"
            disabled={save.isPending}
            onClick={submit}
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {editId ? "บันทึกการแก้ไข" : "เผยแพร่ข่าว"}
          </Button>
        </div>
      )}

      {articles.isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (articles.data ?? []).length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          ยังไม่มีข่าวในระบบ
        </p>
      ) : (
        <ul className="space-y-3">
          {(articles.data ?? []).map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {a.thumbnail_url && (
                  <img src={a.thumbnail_url} alt={a.title} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-sm font-semibold">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {a.category_tag} • {new Date(a.published_at).toLocaleString("th-TH")}
                  {!a.is_published && " • ฉบับร่าง"}
                </p>
              </div>
              <Button
                variant="secondary"
                className="h-10 rounded-xl px-3 text-xs"
                onClick={() => startEdit(a)}
              >
                <Pencil className="h-3.5 w-3.5" />
                แก้ไข
              </Button>
              <ConfirmDialog
                title="ยืนยันการลบข่าว"
                description={`ต้องการลบข่าว "${a.title}" หรือไม่? การลบไม่สามารถย้อนกลับได้`}
                confirmLabel="ลบข่าว"
                tone="destructive"
                disabled={remove.isPending}
                onConfirm={() =>
                  remove.mutate(a.id, {
                    onSuccess: () => toast.success("ลบข่าวแล้ว"),
                    onError: (e) => toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ"),
                  })
                }
                trigger={
                  <Button
                    variant="ghost"
                    className="h-10 rounded-xl px-3 text-xs text-destructive"
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    ลบ
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
