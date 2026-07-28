"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, Loader2, Save, ShoppingCart, X } from "lucide-react";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { uploadMediaFile } from "@/lib/client-image-upload";
import { isVideoUrl } from "@/lib/media";
import {
  normalizePartPurchaseStatus,
  normalizePartsBuyer,
  type PartPurchaseStatus,
  type PartsBuyer,
} from "@/lib/parts-status";

type TaskPhoto = { id: string; url: string; label: string | null };
type TaskDetail = {
  id: string; homeId: string; task: string; description: string | null; priority: string; status: string;
  parts: string | null; partStatus: string | null;
  partsDescription: string | null; partsBuyer: string | null; notes: string | null; photoIds: string[];
  photos: TaskPhoto[]; home: { id: string; address: string };
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/home-tasks/${id}`);
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? "Task could not be loaded");
      setDetail(body);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Task could not be loaded");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function save(patch: Record<string, unknown>) {
    if (!detail) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/home-tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? "Task could not be saved");
      setDetail(body);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Task could not be saved");
    } finally { setSaving(false); }
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || !detail) return;
    setUploading(true); setError("");
    try {
      const media = await uploadMediaFile(file, { homeId: detail.homeId, label: file.name, type: "before" });
      await save({ photoIds: [...detail.photoIds, media.id] });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally { setUploading(false); }
  }

  async function removePhoto(photoId: string) {
    if (!detail) return;
    await save({ photoIds: detail.photoIds.filter((value) => value !== photoId) });
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></main>;
  if (!detail) return <main className="min-h-screen bg-background px-5 py-12"><Card><p className="font-semibold text-error">{error || "Task not found"}</p><Button className="mt-4" variant="outline" onClick={() => router.back()}>Go back</Button></Card></main>;

  const partsText = detail.partsDescription ?? detail.parts ?? "";
  const partsBuyerValue: PartsBuyer | null = normalizePartsBuyer(detail.partsBuyer, detail.partStatus);
  const partStatusValue: PartPurchaseStatus = normalizePartPurchaseStatus(detail.partStatus);

  return (
    <main className="min-h-screen bg-background px-4 pb-12 pt-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <button onClick={() => router.back()} className="mb-5 inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-text-secondary"><ArrowLeft size={16} />Back</button>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{detail.home.address}</p>
        <h1 className="mt-1 text-2xl font-black text-text-primary">Task details</h1>
        {error && <p className="mt-4 rounded-xl bg-error-light px-4 py-3 text-[12px] font-medium text-error">{error}</p>}
        <Card className="mt-5 space-y-4">
          <label className="block text-[12px] font-semibold text-text-secondary">Task<input value={detail.task} onChange={(e) => setDetail({ ...detail, task: e.target.value })} className="mt-1.5 w-full rounded-xl border border-border px-4 py-3 text-[15px] text-text-primary outline-none focus:border-primary" /></label>
          <label className="block text-[12px] font-semibold text-text-secondary">Description<textarea value={detail.description ?? ""} onChange={(e) => setDetail({ ...detail, description: e.target.value })} rows={4} className="mt-1.5 w-full resize-none rounded-xl border border-border px-4 py-3 text-[14px] text-text-primary outline-none focus:border-primary" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[12px] font-semibold text-text-secondary">Priority<select value={detail.priority} onChange={(e) => setDetail({ ...detail, priority: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-[14px]"><option value="low">Low</option><option value="medium">Normal</option><option value="high">High</option></select></label>
            <label className="text-[12px] font-semibold text-text-secondary">Status<select value={detail.status} onChange={(e) => setDetail({ ...detail, status: e.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-[14px]"><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="in-progress">In progress</option><option value="needs-parts">Needs parts</option><option value="completed">Completed</option></select></label>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[12px] font-semibold text-text-secondary"><ShoppingCart size={12} />Parts</label>
            <input
              value={partsText}
              onChange={(e) => setDetail({ ...detail, partsDescription: e.target.value })}
              placeholder="e.g. Ecobee Smart Thermostat"
              className="mt-1.5 w-full rounded-xl border border-border px-4 py-3 text-[14px] text-text-primary outline-none focus:border-primary"
            />
            {partsText.trim() && (
              <div className="mt-2.5 space-y-2.5">
                <div>
                  <p className="text-[11px] font-medium text-text-secondary mb-1.5">Who buys the parts?</p>
                  <div className="inline-flex rounded-full bg-surface-secondary p-1 border border-border">
                    {(["customer", "tech"] as const).map((buyer) => (
                      <button
                        key={buyer}
                        type="button"
                        onClick={() => setDetail({ ...detail, partsBuyer: buyer })}
                        className={`min-h-11 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                          partsBuyerValue === buyer ? "bg-primary text-white shadow-sm" : "text-text-secondary"
                        }`}
                      >
                        {buyer === "customer" ? "Customer" : "Anthony"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-text-secondary mb-1.5">Parts status</p>
                  <div className="inline-flex rounded-full bg-surface-secondary p-1 border border-border">
                    {(["needed", "purchased"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setDetail({ ...detail, partStatus: status })}
                        className={`min-h-11 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                          partStatusValue === status ? "bg-primary text-white shadow-sm" : "text-text-secondary"
                        }`}
                      >
                        {status === "needed" ? "Needs purchase" : "Purchased"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <label className="block text-[12px] font-semibold text-text-secondary">Notes<textarea value={detail.notes ?? ""} onChange={(e) => setDetail({ ...detail, notes: e.target.value })} rows={3} placeholder="Anything worth remembering about this task" className="mt-1.5 w-full resize-none rounded-xl border border-border px-4 py-3 text-[14px] text-text-primary outline-none focus:border-primary" /></label>
          <Button fullWidth icon={<Save size={16} />} disabled={saving || !detail.task.trim()} onClick={() => save({
            task: detail.task,
            description: detail.description,
            priority: detail.priority,
            status: detail.status,
            parts: partsText.trim() || null,
            partsDescription: partsText.trim() || null,
            partsBuyer: partsText.trim() ? partsBuyerValue : null,
            partStatus: partsText.trim() ? partStatusValue : null,
            notes: detail.notes?.trim() || null,
          })}>{saving ? "Saving…" : "Save changes"}</Button>
        </Card>

        <Card className="mt-4">
          <div className="flex items-center justify-between"><div><h2 className="font-bold text-text-primary">Photos & video</h2><p className="text-[12px] text-text-secondary">Add up to five photos or short videos for this task.</p></div><button onClick={() => inputRef.current?.click()} disabled={uploading || detail.photos.length >= 5} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-[12px] font-semibold text-white disabled:opacity-50">{uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}Add media</button></div>
          <input ref={inputRef} type="file" accept="image/*,video/mp4,video/quicktime,video/webm" className="hidden" onChange={upload} />
          {detail.photos.length === 0 ? <p className="mt-4 rounded-xl bg-surface-secondary px-4 py-5 text-center text-[12px] text-text-tertiary">No task photos or videos yet.</p> : <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{detail.photos.map((photo) => <div key={photo.id} className="relative overflow-hidden rounded-xl border border-border bg-surface-secondary">
            {isVideoUrl(photo.url)
              ? <video src={photo.url} controls playsInline preload="metadata" className="aspect-square w-full object-cover" aria-label={photo.label ?? "Task video"} />
              /* eslint-disable-next-line @next/next/no-img-element */
              : <img src={photo.url} alt={photo.label ?? "Task photo"} className="aspect-square w-full object-cover" />}<button type="button" onClick={() => removePhoto(photo.id)} className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/65 text-white" aria-label="Remove photo"><X size={14} /></button></div>)}</div>}
        </Card>

        <button onClick={() => save({ status: detail.status === "completed" ? "pending" : "completed" })} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-success/30 bg-success-light text-[13px] font-bold text-success"><CheckCircle2 size={16} />{detail.status === "completed" ? "Reopen task" : "Mark task complete"}</button>
      </div>
    </main>
  );
}
