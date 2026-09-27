"use client";

import { useEffect, useState } from "react";
import { Home, RefreshCw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "@/utils/apiConfig";

type Settings = {
  productAutoInactiveTime: number;
  userRepeatAdViewTime: number;
  adReShowAfterMinutes: number;
  productPhotoLimit: number;
  blockCheckInHeadline: string[];
  blockCheckInDescription: string[];
};

const defaults: Settings = {
  productAutoInactiveTime: 90,
  userRepeatAdViewTime: 3,
  adReShowAfterMinutes: 0,
  productPhotoLimit: 5,
  blockCheckInHeadline: [],
  blockCheckInDescription: [],
};

export default function AllSettingsShowPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const token = Cookies.get("adminToken");
      const response = await axios.get(API_BASE_URL + "/api/settings", {
        headers: { "x-auth-token": token },
      });
      setSettings({ ...defaults, ...(response.data?.data || response.data || {}) });
    } catch (error) {
      toast.error("Unable to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const token = Cookies.get("adminToken");
      await axios.put(API_BASE_URL + "/api/settings", settings, {
        headers: { "x-auth-token": token },
      });
      toast.success("Settings saved");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-3 text-xs text-black">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-3 flex items-center gap-2">
          <button type="button" onClick={() => router.push("/dashboard")} className="text-rose-500">
            <Home className="h-4 w-4" />
          </button>
          <span>/</span>
          <span className="font-bold text-indigo-600">Settings & Others</span>
        </div>

        <section className="border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-3">
            <div>
              <h1 className="text-sm font-bold">All Settings</h1>
              <p className="mt-1 text-[11px] text-slate-500">
                Dashboard/feed timing and photo limits for the investment marketplace.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => router.push("/dashboard")} className="border px-3 py-1.5 font-bold">
                Dashboard
              </button>
              <button type="button" onClick={load} className="border px-3 py-1.5 font-bold">
                <RefreshCw className="mr-1 inline h-3.5 w-3.5" /> Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">Loading settings...</div>
          ) : (
            <div className="grid gap-3 p-4 md:grid-cols-2">
              <label className="font-bold">Auto inactive time (days)
                <input type="number" min="0" value={settings.productAutoInactiveTime} onChange={e => setSettings({...settings, productAutoInactiveTime: Number(e.target.value)})} className="mt-1 w-full border p-2 font-normal" />
              </label>
              <label className="font-bold">Repeat ad view time (minutes)
                <input type="number" min="0" value={settings.userRepeatAdViewTime} onChange={e => setSettings({...settings, userRepeatAdViewTime: Number(e.target.value)})} className="mt-1 w-full border p-2 font-normal" />
              </label>
              <label className="font-bold">Ad re-show after (minutes)
                <input type="number" min="0" value={settings.adReShowAfterMinutes} onChange={e => setSettings({...settings, adReShowAfterMinutes: Number(e.target.value)})} className="mt-1 w-full border p-2 font-normal" />
              </label>
              <label className="font-bold">Product photo limit
                <input type="number" min="1" value={settings.productPhotoLimit} onChange={e => setSettings({...settings, productPhotoLimit: Number(e.target.value)})} className="mt-1 w-full border p-2 font-normal" />
              </label>
              <label className="font-bold md:col-span-2">Headline block words (one per line)
                <textarea value={settings.blockCheckInHeadline.join("\n")} onChange={e => setSettings({...settings, blockCheckInHeadline: e.target.value.split("\n").map(x => x.trim()).filter(Boolean)})} className="mt-1 min-h-24 w-full border p-2 font-normal" />
              </label>
              <label className="font-bold md:col-span-2">Description block words (one per line)
                <textarea value={settings.blockCheckInDescription.join("\n")} onChange={e => setSettings({...settings, blockCheckInDescription: e.target.value.split("\n").map(x => x.trim()).filter(Boolean)})} className="mt-1 min-h-24 w-full border p-2 font-normal" />
              </label>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-200 p-3">
            <button type="button" disabled={saving || loading} onClick={save} className="bg-indigo-600 px-5 py-2 font-bold text-white disabled:opacity-50">
              <Save className="mr-1 inline h-4 w-4" /> {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
