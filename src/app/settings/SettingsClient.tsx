"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { IconAlert, IconCheck } from "@/components/ui/icons";
import { ToggleGroup } from "@/components/settings/ToggleGroup";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
import type { InboxScope, InboxOrder, UserSettings } from "@/lib/types";

type LoadState = "loading" | "ready" | "error";

async function fetchSettings(): Promise<UserSettings> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Could not load settings");
  const { settings } = await res.json();
  return settings;
}

async function saveSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Could not save settings");
  const { settings } = await res.json();
  return settings;
}

export function SettingsClient() {
  const router = useRouter();
  const { preference: themePreference, setTheme } = useTheme();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [voiceToneDraft, setVoiceToneDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [disconnectStep, setDisconnectStep] = useState<"idle" | "confirm" | "working">("idle");

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setSettings(s);
        setVoiceToneDraft(s.voiceTone ?? "");
        setLoadState("ready");
      })
      .catch((err) => {
        setError(err.message);
        setLoadState("error");
      });
  }, []);

  function flashSaved() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  async function updateSetting(patch: Partial<UserSettings>) {
    setSaving(true);
    setError(null);
    try {
      const updated = await saveSettings(patch);
      setSettings(updated);
      flashSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  function handleThemeChange(value: ThemePreference) {
    setTheme(value);
    void updateSetting({ theme: value });
  }

  async function handleVoiceToneSave() {
    await updateSetting({ voiceTone: voiceToneDraft.trim() });
  }

  async function handleDisconnect() {
    setDisconnectStep("working");
    setError(null);
    try {
      const res = await fetch("/api/settings/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Could not disconnect your account");
      await signOut({ redirectTo: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect your account");
      setDisconnectStep("idle");
    }
  }

  if (loadState === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-body text-text-secondary">Loading settings…</p>
      </main>
    );
  }

  if (loadState === "error" || !settings) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-body text-danger">{error}</p>
        <Button variant="secondary" onClick={() => router.push("/home")}>
          Back home
        </Button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10 gap-8 max-w-2xl mx-auto w-full">
      <div className="w-full flex items-center justify-between">
        <h1 className="text-h1 font-bold text-text-primary">Settings</h1>
        {savedFlash && (
          <Chip tone="positive" icon={<IconCheck className="w-4 h-4" />}>
            Saved
          </Chip>
        )}
      </div>

      {error && <p className="w-full text-body text-danger">{error}</p>}

      <Card className="w-full flex flex-col gap-6">
        <h2 className="text-h2 font-semibold text-text-primary">Inbox</h2>

        <div className="flex flex-col gap-2">
          <p className="text-label uppercase text-text-secondary">What to read</p>
          <ToggleGroup<InboxScope>
            value={settings.inboxScope}
            options={[
              { value: "unread", label: "Unread" },
              { value: "all", label: "All mail" },
            ]}
            onChange={(value) => updateSetting({ inboxScope: value })}
            disabled={saving}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-label uppercase text-text-secondary">Order</p>
          <ToggleGroup<InboxOrder>
            value={settings.inboxOrder}
            options={[
              { value: "oldest", label: "Oldest first" },
              { value: "newest", label: "Newest first" },
            ]}
            onChange={(value) => updateSetting({ inboxOrder: value })}
            disabled={saving}
          />
        </div>

        <p className="text-meta text-text-muted">
          Changing scope or order starts a fresh session the next time you listen.
        </p>
      </Card>

      <Card className="w-full flex flex-col gap-4">
        <h2 className="text-h2 font-semibold text-text-primary">Appearance</h2>
        <ToggleGroup<ThemePreference>
          value={themePreference}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          onChange={handleThemeChange}
          disabled={saving}
        />
      </Card>

      <Card className="w-full flex flex-col gap-4">
        <h2 className="text-h2 font-semibold text-text-primary">Voice tone</h2>
        <p className="text-body text-text-secondary">
          Optional hint for how emails are read aloud — for example, &quot;a little more upbeat&quot;
          or &quot;slower pace.&quot;
        </p>
        <textarea
          className="w-full min-h-20 rounded-card border border-border bg-surface-sunken p-4 text-body text-text-primary"
          placeholder="No special tone — calm and unhurried (default)"
          value={voiceToneDraft}
          onChange={(e) => setVoiceToneDraft(e.target.value)}
          disabled={saving}
        />
        <div>
          <Button
            variant="secondary"
            onClick={handleVoiceToneSave}
            disabled={saving || voiceToneDraft === (settings.voiceTone ?? "")}
          >
            Save
          </Button>
        </div>
      </Card>

      <Card className="w-full flex flex-col gap-4">
        <h2 className="text-h2 font-semibold text-text-primary">Account</h2>
        {disconnectStep === "idle" && (
          <Button
            variant="danger"
            icon={<IconAlert className="w-5 h-5" />}
            onClick={() => setDisconnectStep("confirm")}
            className="self-start"
          >
            Disconnect Google account
          </Button>
        )}
        {disconnectStep === "confirm" && (
          <div className="flex flex-col gap-3">
            <p className="text-body text-danger">
              This revokes MailFlow&apos;s access to your Gmail and signs you out. You can
              reconnect any time by signing in again.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setDisconnectStep("idle")}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDisconnect}>
                Yes, disconnect
              </Button>
            </div>
          </div>
        )}
        {disconnectStep === "working" && (
          <p className="text-body text-text-secondary">Disconnecting…</p>
        )}
      </Card>
    </main>
  );
}
