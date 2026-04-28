"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import Button from "@/components/Button";
import { useDemoMode } from "@/lib/useDemoMode";
import { ChevronLeft, AlertTriangle, Loader2 } from "lucide-react";

import type { HomeFull, Priority } from "./_components/types";
import DemoHomeProfile from "./_components/DemoHomeProfile";
import HomeHeader from "./_components/HomeHeader";
import Members from "./_components/Members";
import TodoList from "./_components/TodoList";
import VisitsAndNotes from "./_components/VisitsAndNotes";
import AddHomeForm, { type AddHomeState } from "./_components/AddHomeForm";

// =====================================================================
// Page entry — chooses demo vs real
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

  // Edit state — address
  const [editingAddress, setEditingAddress] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editZip, setEditZip] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressToast, setAddressToast] = useState<string | null>(null);

  // Edit state — home details
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
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
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

  async function addTodo() {
    if (!home || !newTask.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetch(`/api/homes/${home.id}/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: newTask.trim(), priority: newPriority }),
      });
      if (!res.ok) throw new Error("Failed to add task");
      setNewTask("");
      setNewPriority("medium");
      setShowAddTask(false);
      await refresh();
    } catch {
      /* noop */
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
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      const photoRes = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeId: home.id, dataUrl, type: "before" }),
      });
      if (!photoRes.ok) throw new Error("Photo upload failed");
      await fetch(`/api/homes/${home.id}/todos/${todoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasPhoto: true }),
      });
      await refresh();
    } catch {
      /* noop */
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
  const highCount = todos.filter((t) => t.priority === "high").length;

  return (
    <div className="min-h-screen bg-background pb-28">
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

      <div className="px-5 py-5 space-y-6">
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
          newTask={newTask}
          setNewTask={setNewTask}
          newPriority={newPriority}
          setNewPriority={setNewPriority}
          savingTask={savingTask}
          addTodo={addTodo}
          removeTodo={removeTodo}
          triggerPhotoUpload={triggerPhotoUpload}
          photoUploadingId={photoUploadingId}
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
