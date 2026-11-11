"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Bell,
  Scale,
  Shield,
  Palette,
  CheckCircle2,
  Sparkles,
  Download,
  Lock,
  LogOut,
  Loader2,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/ui/page-container";
import { demoUserSettings, DEMO_DATA_TAG } from "@/lib/demo-data";
import { UserSettingsData } from "@/types/demo-data";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();

  const [settings, setSettings] = React.useState<UserSettingsData>(demoUserSettings);
  const [userEmail, setUserEmail] = React.useState<string>("alex.morgan@example.com");
  const [userId, setUserId] = React.useState<string | null>(null);
  const [isLiveUser, setIsLiveUser] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [resettingPassword, setResettingPassword] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchAccount() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          setIsLiveUser(true);
          if (user.email) setUserEmail(user.email);

          const { data: profile } = await supabase
            .from("profiles")
            .select("preferred_unit")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.preferred_unit) {
            setSettings((prev) => ({
              ...prev,
              units: profile.preferred_unit,
            }));
          }
        }
      } catch {
        // Fallback to local demo state
      }
    }

    fetchAccount();
  }, []);

  const showNotification = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleToggle = (key: keyof UserSettingsData) => {
    if (typeof settings[key] === "boolean") {
      const updated = !settings[key];
      setSettings({ ...settings, [key]: updated });
      showNotification(`Updated preference: ${String(key)}`);
    }
  };

  const handleUnitsChange = async (unit: "metric" | "imperial") => {
    setSettings((prev) => ({ ...prev, units: unit }));

    if (isLiveUser && userId) {
      try {
        const supabase = createClient();
        const validUnits = ["metric", "imperial"] as const;
        const selectedUnit = validUnits.includes(unit) ? unit : "metric";
        await supabase
          .from("profiles")
          .update({ preferred_unit: selectedUnit })
          .eq("id", userId);
      } catch {
        // Silent fallback
      }
    }
    showNotification(`Measurement units switched to ${unit}`);
  };

  const handleResetPassword = async () => {
    setErrorMessage(null);
    setResettingPassword(true);

    try {
      if (isLiveUser && userEmail) {
        const supabase = createClient();
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
          redirectTo: `${origin}/auth/callback?next=/reset-password`,
        });

        if (error) {
          setErrorMessage(error.message);
          setResettingPassword(false);
          return;
        }

        showNotification(`Password recovery instructions sent to ${userEmail}`);
      } else {
        showNotification("Demo Mode: Simulated password recovery link sent.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to request password reset.";
      setErrorMessage(msg);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Signout completed locally
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const handleExportData = () => {
    const backupData = {
      user: {
        id: userId,
        email: userEmail,
      },
      settings,
      exportedAt: new Date().toISOString(),
      format: "LocalFit JSON Export",
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `localfit-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification("Downloaded LocalFit account data backup (JSON)");
  };

  return (
    <PageContainer size="wide" className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E5DD]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C7DBD0] bg-[#E2ECE4] px-2.5 py-0.5 text-[11px] font-semibold text-[#263B2C] mb-2">
            {isLiveUser ? (
              <>
                <UserCheck size={12} className="text-[#375A41]" />
                <span>SUPABASE AUTHENTICATED</span>
              </>
            ) : (
              <>
                <Sparkles size={12} className="text-[#375A41]" />
                <span>{DEMO_DATA_TAG}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D]">
            Settings & Preferences
          </h1>
          <p className="text-xs sm:text-sm text-[#575E59] mt-0.5">
            Account parameters, notifications, measurement units, and privacy controls.
          </p>
        </div>

        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          disabled={loggingOut}
          icon={loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
          iconPosition="left"
          className="text-red-700 hover:text-red-800 hover:bg-red-50 hover:border-red-200"
        >
          {loggingOut ? "Signing out..." : "Sign Out"}
        </Button>
      </div>

      {notice && (
        <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4] p-3 text-xs font-semibold text-[#263B2C] flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#375A41]" />
          <span>{notice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* SECTION 1: Account Settings UI */}
        <Card variant="default" className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E5DD]">
            <Settings size={18} className="text-[#437151]" />
            <div>
              <h2 className="text-base font-semibold text-[#1C1F1D]">Account Settings</h2>
              <p className="text-xs text-[#575E59]">Manage login credentials and identity verification</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1C1F1D]">Registered Email</label>
              <input
                type="text"
                disabled
                value={userEmail}
                className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#1C1F1D] cursor-not-allowed font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1C1F1D]">Security Status</label>
              <div className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2.5 text-xs text-[#575E59] flex items-center justify-between">
                <span>Password protected</span>
                <span className="text-[11px] font-semibold text-[#437151]">Active</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-3 justify-start">
            <Button
              onClick={handleResetPassword}
              size="sm"
              variant="outline"
              disabled={resettingPassword}
              icon={resettingPassword ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
              iconPosition="left"
            >
              {resettingPassword ? "Sending reset link..." : "Request Password Reset"}
            </Button>
          </div>
        </Card>

        {/* SECTION 2: Notification Preferences */}
        <Card variant="default" className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E5DD]">
            <Bell size={18} className="text-[#437151]" />
            <div>
              <h2 className="text-base font-semibold text-[#1C1F1D]">Notification Preferences</h2>
              <p className="text-xs text-[#575E59]">Control reminders and weekly progress digests</p>
            </div>
          </div>

          <div className="divide-y divide-[#E8E5DD] pt-1">
            <div className="py-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#1C1F1D]">Daily Meal Reminders</p>
                <p className="text-[11px] text-[#717A73]">Prompt to log breakfast, lunch, and dinner calmly</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("mealReminders")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.mealReminders ? "bg-[#437151]" : "bg-[#E8E5DD]"
                }`}
                aria-label="Toggle meal reminders"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.mealReminders ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="py-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#1C1F1D]">Workout Alerts</p>
                <p className="text-[11px] text-[#717A73]">Notification when daily step goal or training window approaches</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("workoutReminders")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.workoutReminders ? "bg-[#437151]" : "bg-[#E8E5DD]"
                }`}
                aria-label="Toggle workout reminders"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.workoutReminders ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="py-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#1C1F1D]">Water Intake Pings</p>
                <p className="text-[11px] text-[#717A73]">Gentle hydration cues every two hours during daytime</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("waterReminders")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.waterReminders ? "bg-[#437151]" : "bg-[#E8E5DD]"
                }`}
                aria-label="Toggle water pings"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.waterReminders ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* SECTION 3: Units Preferences */}
        <Card variant="default" className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E5DD]">
            <Scale size={18} className="text-[#437151]" />
            <div>
              <h2 className="text-base font-semibold text-[#1C1F1D]">Measurement Units</h2>
              <p className="text-xs text-[#575E59]">Select preferred dimensional and weight metrics</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleUnitsChange("metric")}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                settings.units === "metric"
                  ? "border-[#437151] bg-[#E2ECE4] text-[#263B2C] font-semibold"
                  : "border-[#E8E5DD] bg-[#FAF8F5] text-[#575E59] hover:bg-[#F5EFEB]"
              }`}
            >
              <div className="text-xs">Metric System</div>
              <div className="text-[11px] opacity-75 font-normal">kg, cm, ml, kcal</div>
            </button>

            <button
              type="button"
              onClick={() => handleUnitsChange("imperial")}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                settings.units === "imperial"
                  ? "border-[#437151] bg-[#E2ECE4] text-[#263B2C] font-semibold"
                  : "border-[#E8E5DD] bg-[#FAF8F5] text-[#575E59] hover:bg-[#F5EFEB]"
              }`}
            >
              <div className="text-xs">Imperial System</div>
              <div className="text-[11px] opacity-75 font-normal">lbs, ft/in, fl oz, kcal</div>
            </button>
          </div>
        </Card>

        {/* SECTION 4: Privacy Settings */}
        <Card variant="default" className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E5DD]">
            <Shield size={18} className="text-[#437151]" />
            <div>
              <h2 className="text-base font-semibold text-[#1C1F1D]">Privacy & Data Portability</h2>
              <p className="text-xs text-[#575E59]">GDPR compliance, export rights, and telemetry controls</p>
            </div>
          </div>

          <div className="divide-y divide-[#E8E5DD] pt-1">
            <div className="py-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#1C1F1D]">Data Portability Export</p>
                <p className="text-[11px] text-[#717A73]">Download all your nutrition history, workouts, and biometrics in JSON format</p>
              </div>
              <Button
                onClick={handleExportData}
                size="sm"
                variant="outline"
                icon={<Download size={13} />}
                iconPosition="left"
              >
                Export JSON
              </Button>
            </div>
          </div>
        </Card>

        {/* SECTION 5: Appearance Settings */}
        <Card variant="default" className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E5DD]">
            <Palette size={18} className="text-[#437151]" />
            <div>
              <h2 className="text-base font-semibold text-[#1C1F1D]">Appearance & Theme</h2>
              <p className="text-xs text-[#575E59]">LocalFit visual identity configuration</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs font-semibold text-[#1C1F1D]">Color Theme</p>
              <p className="text-[11px] text-[#717A73]">Warm Ivory Canvas • Cream Surfaces • Sage Green Accent</p>
            </div>
            <Badge variant="sage" size="md">
              Light Mode Only
            </Badge>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
