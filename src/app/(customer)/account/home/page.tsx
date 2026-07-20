"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useDemoMode } from "@/lib/useDemoMode";
import { ChevronLeft, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { getVisitUsage } from "@/lib/subscription-usage";

import type { HomeFull } from "./_components/types";
import type { NewTaskPayload } from "@/components/AddTaskForm";
import DemoHomeProfile from "./_components/DemoHomeProfile";
import HomeHeader from "./_components/HomeHeader";
import Members from "./_components/Members";
import TodoList from "./_components/TodoList";
import VisitsAndNotes from "./_components/VisitsAndNotes";
import Appliances from "./_components/Appliances";
import AddHomeForm, { type AddHomeState } from "./_components/AddHomeForm";
import { prepareImageForUpload } from "@/lib/client-image-upload";
import { toast } from "@/components/Toaster";

// =====================================================================
// Page entry - chooses demo vs real
// =====================================================================

export default function HomeProfilePage() {
  const { isDemo, mounted } = useDemoMode();

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background pb-28 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-text-tertiary" />
      </div>
    );
  }

  return isDemo ? <DemoHomeProfile /> : <RealHomeProfile />;
}

// =====================================================================
// Real-mode UI
// =====================================================================

function RealHomeProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [home, setHome] = useState<HomeFull | null>(null);
  const [hasNoHome, setHasNoHome] = useState(false);

  // Edit state - address
  const [editingAddress, setEditingAddress] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editZip, setEditZip] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressToast, setAddressToast] = useState<string | null>(null);

  // Edit state - home details
  const [editingDetails, setEditingDetails] = useState(false);
  const [editYearBuilt, setEditYearBuilt] = useState<string>("");
  const [editWaterHeaterYear, setEditWaterHeaterYear] = useState<string>("");
  const [editPanelAmps, setEditPanelAmps] = useState<string>("");
  const [savingDetails, setSavingDetails] = useState(false);

  // WiFi
  const [showWifiPw, setShowWifiPw] = useState(false);
  const [editingWifi, setEditingWifi] = useState(false);
  const [editWifiName, setEditWifiName] = useState("");
  const [editWifiPassword, setEditWifiPassword] = useState("");
  const [savingWifi, setSavingWifi] = useState(false);

  // Members
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [savingMember, setSavingMember] = useState(false);

  // Todos
  const [expandedTodo, setExpandedTodo] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [photoUploadingId, setPhotoUploadingId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const photoTargetTodoRef = useRef<string | null>(null);

  // Visits
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null);

  // Add-home form (when no home exists)
  const [addHome, setAddHome] = useState<AddHomeState>({ address: "", city: "", state: "TX", zip: "", gateCode: "", notes: "" });
  const [addHomeBusy, setAddHomeBusy] = useState(false);
  const [addHomeError, setAddHomeError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const homesRes = await fetch("/api/homes");
      if (!homesRes.ok) throw new Error("Failed to load homes");
      const homes = (await homesRes.json()) as { id: string }[];
      if (!Array.isArray(homes) || homes.length === 0) {
        setHome(null);
        setHasNoHome(true);
        return;
      }
      setHasNoHome(false);
      const homeId = homes[0].id;
      const detailRes = await fetch(`/api/homes/${homeId}`);
      if (!detailRes.ok) throw new Error("Failed to load home detail");
      const detail = (await detailRes.json()) as HomeFull;
      setHome(detail);

      // Sync edit fields
      setEditAddress(detail.address ?? "");
      setEditCity(detail.city ?? "");
      setEditState(detail.state ?? "");
      setEditZip(detail.zip ?? "");
      setEditYearBuilt(detail.yearBuilt != null ? String(detail.yearBuilt) : "");
      setEditWaterHeaterYear(detail.waterHeaterYear != null ? String(detail.waterHeaterYear) : "");
      setEditPanelAmps(detail.panelAmps != null ? String(detail.panelAmps) : "");
      setEditWifiName(detail.wifiName ?? "");
      setEditWifiPassword(detail.wifiPassword ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ============ Actions ============

  async function handleCreateHome(e: React.FormEvent) {
    e.preventDefault();
    if (!addHome.address.trim()) {
      setAddHomeError("Address is required");
      return;
    }
    setAddHomeBusy(true);
    setAddHomeError(null);
    try {
      const res = await fetch("/api/homes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addHome),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to create home");
      }
      await refresh();
    } catch (err: unknown) {
      setAddHomeError(err instanceof Error ? err.message : "Failed to create home");
    } finally {
      setAddHomeBusy(false);
    }
  }

  async function patchHome(payload: Record<string, unknown>) {
    if (!home) return null;
    const res = await fetch(`/api/homes/${home.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Failed to save");
    }
    return await res.json();
  }

  async function saveAddress() {
    if (!editAddress.trim()) {
      setAddressToast("Address is required");
      setTimeout(() => setAddressToast(null), 2500);
      return;
    }
    setSavingAddress(true);
    try {
      await patchHome({
        address: editAddress.trim(),
        city: editCity.trim() || null,
        state: editState.trim() || null,
        zip: editZip.trim() || null,
      });
      setEditingAddress(false);
      setAddressToast("Address saved");
      setTimeout(() => setAddressToast(null), 2500);
      await refresh();
    } catch (e: unknown) {
      setAddressToast(e instanceof Error ? e.message : "Failed to save");
      setTimeout(() => setAddressToast(null), 3500);
    } finally {
      setSavingAddress(false);
    }
  }

  async function saveDetails() {
    setSavingDetails(true);
    try {
      const yb = editYearBuilt.trim();
      const wy = editWaterHeaterYear.trim();
      const pa = editPanelAmps.trim();
      await patchHome({
        yearBuilt: yb ? Number(yb) : null,
        waterHeaterYear: wy ? Number(wy) : null,
        panelAmps: pa ? Number(pa) : null,
      });
      setEditingDetails(false);
      await refresh();
    } catch {
      // surfaced via address toast pattern not great here; refresh to revert state
    } finally {
      setSavingDetails(false);
    }
  }

  async function saveWifi() {
    setSavingWifi(true);
    try {
      await patchHome({
        wifiName: editWifiName.trim() || null,
        wifiPassword: editWifiPassword || null,
      });
      setEditingWifi(false);
      await refresh();
    } catch {
      /* noop */
    } finally {
      setSavingWifi(false);
    }
  }

  async function addMember() {
    if (!home || !newMemberName.trim()) return;
    setSavingMember(true);
    try {
      const res = await fetch(`/api/homes/${home.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMemberName.trim(),
          role: newMemberRole.trim() || null,
          phone: newMemberPhone.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add member");
      setNewMemberName("");
      setNewMemberRole("");
      setNewMemberPhone("");
      setShowAddMember(false);
      await refresh();
    } catch {
      /* noop */
    } finally {
      setSavingMember(false);
    }
  }

  async function removeMember(memberId: string) {
    if (!home) return;
    try {
      await fetch(`/api/homes/${home.id}/members/${memberId}`, { method: "DELETE" });
      await refresh();
    } catch {
      /* noop */
    }
  }

  async function addTodoFull(payload: NewTaskPayload) {
    if (!home) throw new Error("Home is not loaded yet.");
    setSavingTask(true);
    try {
      const res = await fetch(`/api/homes/${home.id}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to add task");
      }
      setShowAddTask(false);
      await refresh();
      toast.success("Task saved");
    } catch (error) {
      throw error instanceof Error ? error : new Error("Failed to add task");
    } finally {
      setSavingTask(false);
    }
  }

  async function removeTodo(todoId: string) {
    if (!home) return;
    try {
      await fetch(`/api/homes/${home.id}/todos/${todoId}`, { method: "DELETE" });
      await refresh();
    } catch {
      /* noop */
    }
  }

  function triggerPhotoUpload(todoId: string) {
    photoTargetTodoRef.current = todoId;
    photoInputRef.current?.click();
  }

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !home) return;
    const todoId = photoTargetTodoRef.current;
    if (!todoId) return;
    setPhotoUploadingId(todoId);
    try {
      const dataUrl = await prepareImageForUpload(file);
      const photoRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeId: home.id, dataUrl, type: "before" }),
      });
      const photo = await photoRes.json().catch(() => ({}));
      if (!photoRes.ok || !photo.id) throw new Error(photo.error ?? "Photo upload failed");
      const todo = home.todos.find((item) => item.id === todoId);
      const existingPhotoIds = Array.isArray(todo?.photoIds) ? todo.photoIds : [];
      const updateRes = await fetch(`/api/homes/${home.id}/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasPhoto: true, photoIds: [...existingPhotoIds, photo.id] }),
      });
      if (!updateRes.ok) throw new Error("Photo uploaded but could not be attached to the task");
      await refresh();
      toast.success("Photo added to task");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Photo upload failed");
    } finally {
      setPhotoUploadingId(null);
      photoTargetTodoRef.current = null;
    }
  }

  // ============ Render ============

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-28 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-28 px-5 pt-14">
        <Link href="/account" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary">
          <ChevronLeft size={16} />
          Account
        </Link>
        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-error mt-0.5" />
            <div>
              <p className="text-[14px] font-semibold text-text-primary">Could not load home profile</p>
              <p className="text-[12px] text-text-secondary mt-1">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={refresh}>Retry</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (hasNoHome || !home) {
    return (
      <AddHomeForm
        addHome={addHome}
        setAddHome={setAddHome}
        addHomeBusy={addHomeBusy}
        addHomeError={addHomeError}
        handleCreateHome={handleCreateHome}
      />
    );
  }

  const completedVisits = (home.bookings ?? []).filter((b) => b.status === "completed");
  const todos = home.todos ?? [];
  const members = home.householdMembers ?? [];
  const techNotes = home.techNotes ?? [];
  const appliances = home.appliances ?? [];
  const highCount = todos.filter((t) => t.priority === "high").length;
  const membership = home.activeSubscription;
  const usage = membership ? getVisitUsage(membership.plan, membership.visitsUsed) : null;
  const membershipLabel = membership
    ? PLANS.find((plan) => plan.id === membership.plan)?.label ?? membership.plan
    : null;

  return (
    <div className="min-h-screen bg-background pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />

      <HomeHeader
        home={home}
        highCount={highCount}
        editingAddress={editingAddress}
        setEditingAddress={setEditingAddress}
        editAddress={editAddress}
        setEditAddress={setEditAddress}
        editCity={editCity}
        setEditCity={setEditCity}
        editState={editState}
        setEditState={setEditState}
        editZip={editZip}
        setEditZip={setEditZip}
        savingAddress={savingAddress}
        saveAddress={saveAddress}
        addressToast={addressToast}
        editingDetails={editingDetails}
        setEditingDetails={setEditingDetails}
        editYearBuilt={editYearBuilt}
        setEditYearBuilt={setEditYearBuilt}
        editWaterHeaterYear={editWaterHeaterYear}
        setEditWaterHeaterYear={setEditWaterHeaterYear}
        editPanelAmps={editPanelAmps}
        setEditPanelAmps={setEditPanelAmps}
        savingDetails={savingDetails}
        saveDetails={saveDetails}
      />

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-5 sm:px-6">
        {membership && usage && (
          <Card className="border border-primary-100 bg-gradient-to-br from-primary-50 to-surface">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100">
                  <Sparkles size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-primary">{membershipLabel} membership</p>
                  <p className="mt-0.5 text-[22px] font-black text-text-primary">{usage.used}/{usage.allowance} <span className="text-[12px] font-semibold text-text-secondary">visits used</span></p>
                </div>
              </div>
              <p className="rounded-full bg-success-light px-3 py-1.5 text-[12px] font-bold text-success">{usage.remaining} remaining</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary-100">
              <div className="h-full rounded-full bg-primary" style={{ width: `${usage.percent}%` }} />
            </div>
          </Card>
        )}
        <Members
          home={home}
          members={members}
          showWifiPw={showWifiPw}
          setShowWifiPw={setShowWifiPw}
          editingWifi={editingWifi}
          setEditingWifi={setEditingWifi}
          editWifiName={editWifiName}
          setEditWifiName={setEditWifiName}
          editWifiPassword={editWifiPassword}
          setEditWifiPassword={setEditWifiPassword}
          savingWifi={savingWifi}
          saveWifi={saveWifi}
          showAddMember={showAddMember}
          setShowAddMember={setShowAddMember}
          newMemberName={newMemberName}
          setNewMemberName={setNewMemberName}
          newMemberRole={newMemberRole}
          setNewMemberRole={setNewMemberRole}
          newMemberPhone={newMemberPhone}
          setNewMemberPhone={setNewMemberPhone}
          savingMember={savingMember}
          addMember={addMember}
          removeMember={removeMember}
        />

        <TodoList
          todos={todos}
          highCount={highCount}
          expandedTodo={expandedTodo}
          setExpandedTodo={setExpandedTodo}
          showAddTask={showAddTask}
          setShowAddTask={setShowAddTask}
          savingTask={savingTask}
          addTodoFull={addTodoFull}
          removeTodo={removeTodo}
          triggerPhotoUpload={triggerPhotoUpload}
          photoUploadingId={photoUploadingId}
          homeId={home.id}
        />

        <Appliances
          homeId={home.id}
          appliances={appliances}
          onChange={refresh}
        />

        <VisitsAndNotes
          completedVisits={completedVisits}
          techNotes={techNotes}
          expandedVisit={expandedVisit}
          setExpandedVisit={setExpandedVisit}
        />
      </div>
    </div>
  );
}
