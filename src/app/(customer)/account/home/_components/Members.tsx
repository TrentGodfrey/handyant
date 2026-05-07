"use client";

import Card from "@/components/Card";
import Button from "@/components/Button";
import { initialsOf } from "@/lib/initials";
import {
  Wifi, Users, Phone, X, Plus, Eye, EyeOff,
} from "lucide-react";
import type { HomeFull, MemberRecord } from "./types";

interface MembersProps {
  home: HomeFull;
  members: MemberRecord[];

  // WiFi state
  showWifiPw: boolean;
  setShowWifiPw: (v: boolean) => void;
  editingWifi: boolean;
  setEditingWifi: (v: boolean) => void;
  editWifiName: string;
  setEditWifiName: (v: string) => void;
  editWifiPassword: string;
  setEditWifiPassword: (v: string) => void;
  savingWifi: boolean;
  saveWifi: () => void;

  // Member state
  showAddMember: boolean;
  setShowAddMember: (v: boolean) => void;
  newMemberName: string;
  setNewMemberName: (v: string) => void;
  newMemberRole: string;
  setNewMemberRole: (v: string) => void;
  newMemberPhone: string;
  setNewMemberPhone: (v: string) => void;
  savingMember: boolean;
  addMember: () => void;
  removeMember: (id: string) => void;
}

export default function Members(props: MembersProps) {
  const {
    home, members,
    showWifiPw, setShowWifiPw,
    editingWifi, setEditingWifi,
    editWifiName, setEditWifiName,
    editWifiPassword, setEditWifiPassword,
    savingWifi, saveWifi,
    showAddMember, setShowAddMember,
    newMemberName, setNewMemberName,
    newMemberRole, setNewMemberRole,
    newMemberPhone, setNewMemberPhone,
    savingMember, addMember, removeMember,
  } = props;

  return (
    <>
      {/* WiFi + Household quick cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card padding="sm" className="border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF9FF]">
                <Wifi size={14} className="text-[#0EA5E9]" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">WiFi</span>
            </div>
            {!editingWifi && (
              <button onClick={() => setEditingWifi(true)} className="text-[11px] font-semibold text-primary">
                {home.wifiName ? "Edit" : "Add"}
              </button>
            )}
          </div>
          {!editingWifi ? (
            home.wifiName ? (
              <>
                <p className="text-[13px] font-semibold text-text-primary truncate">{home.wifiName}</p>
                {home.wifiPassword && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className={`text-[12px] font-mono text-text-secondary tracking-wider truncate ${!showWifiPw ? "blur-[3px] select-none" : ""}`}>
                      {home.wifiPassword}
                    </span>
                    <button onClick={() => setShowWifiPw(!showWifiPw)} className="text-text-tertiary hover:text-text-secondary transition-colors shrink-0">
                      {showWifiPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[12px] text-text-tertiary">Not set</p>
            )
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={editWifiName}
                onChange={(e) => setEditWifiName(e.target.value)}
                placeholder="Network name"
                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] outline-none focus:border-primary"
              />
              <input
                type="text"
                value={editWifiPassword}
                onChange={(e) => setEditWifiPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[12px] font-mono outline-none focus:border-primary"
              />
              <div className="flex gap-1">
                <Button variant="primary" size="sm" disabled={savingWifi} onClick={saveWifi}>
                  {savingWifi ? "…" : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setEditingWifi(false); setEditWifiName(home.wifiName ?? ""); setEditWifiPassword(home.wifiPassword ?? ""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card padding="sm" className="border border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F3FF]">
              <Users size={14} className="text-accent-purple" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Household</span>
          </div>
          <p className="text-[13px] font-semibold text-text-primary">{members.length} {members.length === 1 ? "member" : "members"}</p>
          {members.length > 0 && (
            <div className="mt-1.5 flex -space-x-1.5">
              {members.slice(0, 4).map((m) => (
                <div key={m.id} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-primary text-[9px] font-bold text-white">
                  {initialsOf(m.name)}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Household members full */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Household Members</p>
          <button
            onClick={() => setShowAddMember(!showAddMember)}
            className="flex items-center gap-1 text-[12px] font-semibold text-primary"
          >
            <Plus size={12} />
            Add member
          </button>
        </div>

        {showAddMember && (
          <Card padding="md" className="mb-3 border border-primary-100 bg-primary-50">
            <p className="text-[13px] font-semibold text-text-primary mb-3">New Member</p>
            <div className="space-y-2">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Full name"
                autoFocus
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
              />
              <input
                type="text"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                placeholder="Role (e.g. Spouse, Child)"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
              />
              <input
                type="tel"
                value={newMemberPhone}
                onChange={(e) => setNewMemberPhone(e.target.value)}
                placeholder="Phone (optional)"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] outline-none focus:border-primary"
              />
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => { setShowAddMember(false); setNewMemberName(""); setNewMemberRole(""); setNewMemberPhone(""); }}>Cancel</Button>
                <Button variant="primary" size="sm" fullWidth disabled={!newMemberName.trim() || savingMember} onClick={addMember}>
                  {savingMember ? "Adding…" : "Add"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {members.length === 0 && !showAddMember ? (
          <Card padding="md">
            <p className="text-[13px] text-text-tertiary text-center">No household members yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <Card key={member.id} padding="sm" className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white">
                  {initialsOf(member.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-text-primary truncate">{member.name}</p>
                  <p className="text-[12px] text-text-tertiary truncate">
                    {[member.role, member.phone].filter(Boolean).join(" · ") || "-"}
                  </p>
                </div>
                {member.phone && (
                  <a href={`tel:${member.phone}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-success-light active:bg-success/20 transition-colors">
                    <Phone size={15} className="text-success" />
                  </a>
                )}
                <button
                  onClick={() => removeMember(member.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-error-light transition-colors"
                  aria-label="Remove member"
                >
                  <X size={14} className="text-text-tertiary" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
