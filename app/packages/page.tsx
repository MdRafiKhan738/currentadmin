"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { API_BASE_URL as API } from "@/utils/apiConfig";

type P = { _id?: string; name: string; packageType: "You" | "Both"; oldPrice: number; price: number; total_connects: number; maxProfileView: number; validDays: number; bestValueSuggestion: boolean; checkedFeatures: string[]; uncheckedFeatures: string[]; isActive: boolean };
type U = any;
type HistoryRow = any;
const blank: P = { name: "", packageType: "You", oldPrice: 0, price: 0, total_connects: 0, maxProfileView: 0, validDays: 30, bestValueSuggestion: false, checkedFeatures: [], uncheckedFeatures: [], isActive: true };

const formatDate = (value: any) => value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const daysUntil = (value: any) => {
  if (!value) return 0;
  const diff = new Date(value).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
};

export default function Packages() {
  const [p, setP] = useState<P>(blank), [rows, setRows] = useState<P[]>([]), [edit, setEdit] = useState(false), [loading, setLoading] = useState(true);
  const [mobile, setMobile] = useState(""), [user, setUser] = useState<U>(null), [searching, setSearching] = useState(false);
  const [connects, setConnects] = useState(""), [validDays, setValidDays] = useState("30"), [note, setNote] = useState("");
  const [targetConnects, setTargetConnects] = useState("");
  const [history, setHistory] = useState<any>({ userSeen: [], othersSeen: [], totalSeen: [] });
  const [historyTab, setHistoryTab] = useState<"userSeen" | "othersSeen" | "totalSeen">("userSeen");
  const [historyOpen, setHistoryOpen] = useState(false), [historyDate, setHistoryDate] = useState(""), [historySearch, setHistorySearch] = useState("");
  const [message, setMessage] = useState("");
  const [packagesLoaded, setPackagesLoaded] = useState(false);
  const token = Cookies.get("adminToken") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(API + "/api/packages/admin", { headers, cache: "no-store" });
      const j = await r.json();
      setRows(j.data || []);
      setPackagesLoaded(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function searchUser(value = mobile) {
    if (!value.trim()) { setUser(null); return; }
    setSearching(true); setMessage("");
    try {
      const r = await fetch(API + "/api/packages/admin/search-user?query=" + encodeURIComponent(value.trim()), { headers });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || "User not found");
      setUser(j.data);
      const activeId = j.data?.activePackage?.packageId ? String(j.data.activePackage.packageId) : "";
      const active = rows.find((row) => String(row._id) === activeId);
      if (active) {
        setP(active);
        // The admin is editing the next assignment here, so show the package's
        // configured validity by default while the account card always shows
        // the real active-package expiry below.
        setValidDays(String(active.validDays || 30));
        setConnects(String(active.maxProfileView || active.total_connects || ""));
      } else {
        setP(blank);
        setValidDays(String(daysUntil(j.data?.activePackage?.validTill) || 30));
        setConnects("");
      }
      setTargetConnects(String(j.data?.connectsBalance ?? 0));
      await loadHistory(j.data?._id);
    } catch (e: any) { setUser(null); setMessage(e.message || "User not found"); }
    finally { setSearching(false); }
  }

  useEffect(() => {
    const value = mobile.trim();
    if (!value) { setUser(null); return; }
    if (!packagesLoaded) return;
    const timer = setTimeout(() => searchUser(value), 400);
    return () => clearTimeout(timer);
  }, [mobile, packagesLoaded]);

  async function loadHistory(userId: string) {
    if (!userId) return;
    const r = await fetch(API + "/api/packages/admin/phone-history?userId=" + userId, { headers });
    const j = await r.json(); if (r.ok) setHistory(j.data || { userSeen: [], othersSeen: [], totalSeen: [] });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const url = edit ? API + "/api/packages/" + p._id : API + "/api/packages";
    const r = await fetch(url, { method: edit ? "PUT" : "POST", headers, body: JSON.stringify({ ...p, total_connects: Number(p.total_connects), maxProfileView: Number(p.maxProfileView || p.total_connects) }) });
    const j = await r.json();
    if (!r.ok) { setMessage(j.message || "Unable to save package"); return; }
    setMessage("Package saved."); setP(blank); setEdit(false); load();
  }
  async function remove(id: string) { if (!confirm("Delete this package?")) return; await fetch(API + "/api/packages/" + id, { method: "DELETE", headers }); load(); }

  async function inject() {
    if (!user) return;
    const amount = Number(connects);
    if (!Number.isFinite(amount) || amount <= 0) { setMessage("Enter a positive connect amount."); return; }
    const r = await fetch(API + "/api/packages/manual-inject", { method: "POST", headers, body: JSON.stringify({ userId: user._id, connects: amount, validDays: Number(validDays || 30), packageId: p._id || undefined, packageType: p.packageType, packageName: p.name, note: note || "Manual package assignment" }) });
    const j = await r.json(); setMessage(j.success ? "Package / connects added successfully." : j.message || "Assignment failed");
    if (j.success) {
      setUser(j.data);
      setConnects("");
      setTargetConnects(String(j.data?.connectsBalance ?? 0));
      setNote("");
      setValidDays(String(daysUntil(j.data?.activePackage?.validTill) || validDays || 30));
      await loadHistory(user._id);
    }
  }

  async function updateValidity() {
    if (!user?.activePackage?.name) {
      setMessage("Select a user with an active package first.");
      return;
    }
    const days = Number(validDays);
    if (!Number.isFinite(days) || days <= 0) {
      setMessage("Enter a valid number of validity days.");
      return;
    }
    const r = await fetch(API + "/api/packages/manual-update-validity", {
      method: "POST",
      headers,
      body: JSON.stringify({ userId: user._id, validDays: days })
    });
    const j = await r.json();
    setMessage(j.success ? "Active package validity updated." : j.message || "Validity update failed");
    if (j.success) {
      setUser(j.data);
      setValidDays(String(daysUntil(j.data?.activePackage?.validTill) || days));
    }
  }

  async function setBalance() {
    if (!user) return;
    const target = Number(targetConnects);
    if (!Number.isFinite(target) || target < 0) { setMessage("Enter a valid target connect balance."); return; }
    const reason = window.prompt("Adjustment reason", "Verified closed phone number / manual connect correction");
    if (!reason?.trim()) return;
    const r = await fetch(API + "/api/packages/set-connect-balance", { method: "POST", headers, body: JSON.stringify({ userId: user._id, targetConnects: target, reason }) });
    const j = await r.json();
    setMessage(j.success ? `Connect balance updated to ${target}.` : j.message || "Balance update failed");
    if (j.success) { setUser(j.data); setTargetConnects(String(j.data.connectsBalance || 0)); await loadHistory(user._id); }
  }

  const currentHistory: HistoryRow[] = useMemo(() => {
    const source = history[historyTab] || [];
    const search = historySearch.trim().toLowerCase();
    return source.filter((x: any) => {
      const d = x.createdAt ? new Date(x.createdAt) : null;
      const dateOk = !historyDate || (d && d.toISOString().slice(0, 10) === historyDate);
      if (!dateOk) return false;
      if (!search) return true;
      const hay = [x.profileOwnerId?.name, x.profileOwnerId?.mobile, x.viewerId?.name, x.viewerId?.mobile, x.adId?.headline, x.adId?.phone, x.postOwner?.mobile].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(search);
    });
  }, [history, historyTab, historyDate, historySearch]);

  return <main className="min-h-screen bg-slate-100 p-4 font-sans md:p-6">
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><h1 className="text-xl font-bold text-slate-900">Package Manager</h1><p className="mt-1 text-xs text-slate-500">Packages and the Premier Zone connect-control workflow.</p></header>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold">Premier Zone <span className="font-normal text-slate-400">(Auto / Manual Package Run)</span></h2><p className="mt-1 text-xs text-slate-500">Type a mobile, email or user ID. User information loads automatically—no Search button.</p></div>{searching && <span className="text-xs font-semibold text-emerald-600">Searching…</span>}</div></div>
        <div className="p-5">
          <div className="grid gap-3 lg:grid-cols-4">
            <label className="block"><span className="mb-1 block text-[11px] font-semibold text-slate-500">Search by email / number / ID</span><input autoComplete="off" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="01XXXXXXXXX" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></label>
            <label className="block"><span className="mb-1 block text-[11px] font-semibold text-slate-500">User</span><input readOnly value={user?.name || "—"} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></label>
            <label className="block"><span className="mb-1 block text-[11px] font-semibold text-slate-500">Package</span><select value={p._id || ""} onChange={e => {
              const x = rows.find(r => r._id === e.target.value);
              if (x) {
                setP(x);
                const packageCredits = Number(x.maxProfileView || x.total_connects || 0);
                setConnects(String(packageCredits));
                setTargetConnects(String(user?.connectsBalance ?? 0));
                setValidDays(String(x.validDays || 30));
              } else {
                setP(blank);
                setConnects("");
                setValidDays("30");
              }
            }} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"><option value="">Select package</option>{rows.filter(x => x.isActive).map(x => <option key={x._id} value={x._id}>{x.name} — {x.packageType}</option>)}</select></label>
            <label className="block"><span className="mb-1 block text-[11px] font-semibold text-slate-500">Current Connect</span><input type="number" min="0" value={targetConnects} onChange={e => setTargetConnects(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-500" /></label>
          </div>

          {user && <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
            <div className="mb-3 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[11px]">
              <span className="font-semibold text-slate-500">Selected package:</span>{" "}
              <span className="font-bold text-slate-900">{p.name || "None"}</span>
              {p.packageType ? <span className="ml-2 font-bold text-emerald-700">({p.packageType})</span> : null}
              {p._id ? <span className="ml-2 text-slate-400">• {Number(p.maxProfileView || p.total_connects || 0).toLocaleString()} connects • {p.validDays || 30} days</span> : null}
              {p._id && p.checkedFeatures?.length ? <span className="ml-2 text-slate-500">• {p.checkedFeatures.slice(0, 2).join(" • ")}</span> : null}
            </div>
            <div className="grid gap-3 md:grid-cols-4"><div><span className="text-[10px] font-semibold uppercase text-slate-400">Name</span><p className="text-sm font-bold">{user.name || "—"}</p></div><div><span className="text-[10px] font-semibold uppercase text-slate-400">Number</span><p className="text-sm font-bold">{user.mobile || "—"}</p></div><div><span className="text-[10px] font-semibold uppercase text-slate-400">Active package</span><p className="text-sm font-bold">{user.activePackage?.name || "No package"}{user.activePackage?.type ? <span className="ml-1 text-[10px] font-semibold text-emerald-600">({user.activePackage.type})</span> : null}</p><p className="mt-0.5 text-[10px] text-slate-500">{Number(user.activePackage?.creditsRemaining ?? 0).toLocaleString()} package credits remaining</p></div><div><span className="text-[10px] font-semibold uppercase text-slate-400">Valid to</span><p className="text-sm font-bold">{formatDate(user.activePackage?.validTill || user.validityDate)}</p><p className="mt-0.5 text-[10px] text-slate-500">{daysUntil(user.activePackage?.validTill || user.validityDate)} days remaining</p></div></div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[160px_1fr_170px_150px]"><input value={connects} onChange={e => setConnects(e.target.value)} type="number" min="1" placeholder="Connects to add" className="rounded-lg border px-3 py-2.5 text-sm"/><input value={note} onChange={e => setNote(e.target.value)} placeholder="Package / adjustment note" className="rounded-lg border px-3 py-2.5 text-sm"/><input value={targetConnects} onChange={e => setTargetConnects(e.target.value)} type="number" min="0" placeholder="Set current connect" className="rounded-lg border px-3 py-2.5 text-sm"/><button onClick={setBalance} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white">Save Connect</button></div>
            <div className="mt-3 flex flex-wrap gap-2"><input value={validDays} onChange={e => setValidDays(e.target.value)} type="number" min="1" placeholder="Validity days" className="w-32 rounded-lg border px-3 py-2 text-xs"/><button onClick={updateValidity} className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">Update Valid To</button><button onClick={inject} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white">Add Package / Connects</button><button onClick={() => { setHistoryTab("userSeen"); setHistoryOpen(true); }} className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-700">User Seen</button><button onClick={() => { setHistoryTab("othersSeen"); setHistoryOpen(true); }} className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-700">Others Seen</button><button onClick={() => { setHistoryTab("totalSeen"); setHistoryOpen(true); }} className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-700">Total Seen</button></div>
          </div>}
          {!user && !searching && <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">Enter a phone number to load the account automatically.</div>}
          {message && <div className="mt-3 rounded-lg bg-slate-900 px-4 py-3 text-xs font-semibold text-white">{message}</div>}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold">Package Configuration</h2><p className="text-xs text-slate-500">Existing package creation/edit/delete functionality is preserved.</p></div><button onClick={() => { setP(blank); setEdit(false); }} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white">+ Add package</button></div>
        <form onSubmit={save} className="border-b border-slate-200 p-5"><div className="grid gap-3 md:grid-cols-4"><input required placeholder="Package name" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} className="rounded border p-2 text-sm"/><select value={p.packageType} onChange={e => setP({ ...p, packageType: e.target.value as P["packageType"] })} className="rounded border p-2 text-sm"><option value="You">You</option><option value="Both">Both</option></select><input type="number" placeholder="Old price" value={p.oldPrice} onChange={e => setP({ ...p, oldPrice: +e.target.value })} className="rounded border p-2 text-sm"/><input required type="number" placeholder="Package price" value={p.price} onChange={e => setP({ ...p, price: +e.target.value })} className="rounded border p-2 text-sm"/><input required type="number" placeholder="Connect / credit" value={p.total_connects} onChange={e => setP({ ...p, total_connects: +e.target.value, maxProfileView: +e.target.value })} className="rounded border p-2 text-sm"/><input required type="number" placeholder="Valid days" value={p.validDays} onChange={e => setP({ ...p, validDays: +e.target.value })} className="rounded border p-2 text-sm md:col-span-2"/><textarea placeholder="Checked Features (one per line)" value={p.checkedFeatures.join("\n")} onChange={e => setP({ ...p, checkedFeatures: e.target.value.split("\n").map(x => x.trim()).filter(Boolean) })} className="min-h-24 rounded border p-2 text-sm md:col-span-2" /><textarea placeholder="Unchecked Features (one per line)" value={p.uncheckedFeatures.join("\n")} onChange={e => setP({ ...p, uncheckedFeatures: e.target.value.split("\n").map(x => x.trim()).filter(Boolean) })} className="min-h-24 rounded border p-2 text-sm md:col-span-2" /></div><div className="mt-4 flex gap-2"><button className="rounded bg-emerald-700 px-5 py-2 text-sm font-bold text-white">{edit ? "Update" : "Save"}</button>{edit && <button type="button" onClick={() => { setP(blank); setEdit(false); }} className="rounded border px-5 py-2 text-sm">Cancel</button>}</div></form>
        {loading ? <p className="p-5 text-sm">Loading...</p> : <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50"><tr><th className="p-3 text-left">Name</th><th className="p-3">Type</th><th className="p-3">Price</th><th className="p-3">Credits</th><th className="p-3">Days</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody>{rows.map(x => <tr key={x._id} className="border-t"><td className="p-3 font-bold">{x.name}</td><td className="p-3 text-center">{x.packageType}</td><td className="p-3 text-center">৳{x.price}</td><td className="p-3 text-center">{x.maxProfileView || x.total_connects}</td><td className="p-3 text-center">{x.validDays}</td><td className="p-3 text-center">{x.isActive ? "Active" : "Inactive"}</td><td className="p-3 text-center"><button onClick={() => { setP(x); setEdit(true); }} className="mr-2 rounded border px-2 py-1">Edit</button><button onClick={() => remove(x._id!)} className="rounded border px-2 py-1 text-red-600">Delete</button></td></tr>)}</tbody></table></div>}
      </section>
    </div>

    {historyOpen && user && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3" onMouseDown={e => { if (e.target === e.currentTarget) setHistoryOpen(false); }}><div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="text-lg font-bold">Connection List</h2><p className="text-xs text-slate-400">{user.name} · {user.mobile} · Package: {user.activePackage?.name || "—"}</p></div><button onClick={() => setHistoryOpen(false)} className="rounded-full bg-slate-100 px-3 py-1.5 text-lg">×</button></div><div className="border-b bg-slate-50 p-4"><div className="flex flex-wrap gap-2"><button onClick={() => setHistoryTab("userSeen")} className={`rounded-lg px-4 py-2 text-xs font-bold ${historyTab === "userSeen" ? "bg-emerald-600 text-white" : "border bg-white"}`}>User Seen</button><button onClick={() => setHistoryTab("othersSeen")} className={`rounded-lg px-4 py-2 text-xs font-bold ${historyTab === "othersSeen" ? "bg-emerald-600 text-white" : "border bg-white"}`}>Others Seen</button><button onClick={() => setHistoryTab("totalSeen")} className={`rounded-lg px-4 py-2 text-xs font-bold ${historyTab === "totalSeen" ? "bg-emerald-600 text-white" : "border bg-white"}`}>Total Seen</button><input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} className="rounded-lg border bg-white px-3 py-2 text-xs"/><input value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Search name / number / post" className="min-w-[220px] flex-1 rounded-lg border bg-white px-3 py-2 text-xs"/></div></div><div className="overflow-auto"><table className="min-w-[900px] w-full text-xs"><thead className="sticky top-0 bg-white shadow-sm"><tr><th className="p-3 text-left">No</th><th className="p-3 text-left">Package</th><th className="p-3 text-left">Person Name</th><th className="p-3 text-left">Number</th><th className="p-3 text-left">Connect Method</th><th className="p-3 text-left">Post</th><th className="p-3 text-left">Date</th><th className="p-3">View Post</th></tr></thead><tbody>{currentHistory.map((x: any, i: number) => { const person = historyTab === "userSeen" ? x.profileOwnerId : x.viewerId; const phone = person?.mobile || x.adId?.phone || x.postOwner?.mobile || "Hidden"; const method = x.connectMethod || x.method || x.actionType || "—"; return <tr key={x._id || i} className="border-t hover:bg-slate-50"><td className="p-3">{i + 1}</td><td className="p-3">{user.activePackage?.name || "—"}</td><td className="p-3 font-semibold">{person?.name || x.postOwner?.name || "Unknown"}</td><td className="p-3 font-medium">{phone}</td><td className="p-3 capitalize">{String(method).replace(/_/g, " ")}</td><td className="p-3">{x.adId?.headline || "Post"}</td><td className="p-3">{x.createdAt ? new Date(x.createdAt).toLocaleString() : "—"}</td><td className="p-3 text-center"><button onClick={() => { if (x.adId?._id) window.open((process.env.NEXT_PUBLIC_FRONTEND_URL || "https://currentshadamon.vercel.app") + "/dashboard?ad=" + x.adId._id, "_blank"); }} className="rounded border px-2 py-1 font-semibold">View Post</button></td></tr> })}</tbody></table>{!currentHistory.length && <p className="p-8 text-center text-xs text-slate-400">No matching history.</p>}</div></div></div>}
  </main>;
}
