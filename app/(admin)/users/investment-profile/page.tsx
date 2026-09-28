"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { API_BASE_URL as API } from "@/utils/apiConfig";

type User = Record<string, any>;
const fields = [
  ["organizationName", "Organization name"], ["designation", "Role / designation"], ["profession", "Profession"], ["employeeCount", "Number of employees"],
  ["investmentRole", "Investment role"], ["investmentType", "Investment type"], ["investmentAmountMin", "Minimum investment"], ["investmentAmountMax", "Maximum investment"], ["investmentReturn", "Return / expected profit"],
  ["education", "Education"], ["currentJob", "Current job"], ["jobExperience", "Job experience"], ["contact", "Contact"],
];

export default function InvestmentProfileEditor() {
  const [query, setQuery] = useState(""), [users, setUsers] = useState<User[]>([]), [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [message, setMessage] = useState("");
  const token = Cookies.get("adminToken") || "";
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!query.trim()) { setUsers([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try { const r = await fetch(`${API}/api/admins/users/search-mobile?query=${encodeURIComponent(query)}`, { headers }); const j = await r.json(); setUsers(Array.isArray(j) ? j : j.data || []); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function choose(id: string) {
    const r = await fetch(`${API}/api/admins/users?id=${encodeURIComponent(id)}&limit=1`, { headers });
    const j = await r.json();
    setUser(j?.data?.[0] || null); setUsers([]);
  }

  function change(key: string, value: string) { setUser(current => current ? { ...current, [key]: value } : current); }

  async function save() {
    if (!user?._id) return;
    setSaving(true); setMessage("");
    try {
      const form = new FormData();
      for (const [key] of fields) form.append(key, user[key] ?? "");
      const r = await fetch(`${API}/api/admins/users/${user._id}`, { method: "PUT", headers, body: form });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || "Unable to save profile");
      setUser(j); setMessage("Investment profile saved successfully.");
    } catch (e: any) { setMessage(e.message || "Save failed"); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-slate-100 p-4 md:p-6"><div className="mx-auto max-w-6xl space-y-5">
    <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h1 className="text-xl font-bold">Investment Profile</h1><p className="mt-1 text-xs text-slate-500">Additional investor / business-owner profile fields. Existing User Management fields remain untouched.</p></header>
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><label className="mb-1 block text-xs font-bold">Find user by mobile / email / ID</label><input value={query} onChange={e => setQuery(e.target.value)} placeholder="01XXXXXXXXX" className="w-full rounded-lg border px-3 py-3 text-sm"/>{loading && <p className="mt-2 text-xs text-slate-400">Searching…</p>}{users.length > 0 && <div className="mt-2 divide-y rounded-lg border">{users.map(x => <button key={x._id} onClick={() => choose(x._id)} className="flex w-full items-center justify-between p-3 text-left hover:bg-slate-50"><span className="text-sm font-semibold">{x.name}</span><span className="text-xs text-slate-500">{x.mobile}</span></button>)}</div>}</section>
    {user && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4"><div><h2 className="font-bold">{user.name}</h2><p className="text-xs text-slate-500">{user.mobile || user.email || "No contact"}</p></div><select value={user.investmentRole || ""} onChange={e => change("investmentRole", e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">Investment role</option><option value="investor">Investor</option><option value="business_owner">Business Owner</option></select></div><div className="mt-5 grid gap-4 md:grid-cols-2">{fields.filter(([key]) => key !== "investmentRole").map(([key, label]) => <label key={key} className="block"><span className="mb-1 block text-xs font-bold text-slate-600">{label}</span><input value={user[key] ?? ""} onChange={e => change(key, e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm"/></label>)}<label className="md:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-600">About yourself</span><textarea value={user.aboutYourself ?? ""} onChange={e => change("aboutYourself", e.target.value)} className="min-h-24 w-full rounded-lg border p-3 text-sm"/></label><label className="md:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-600">Business / investment proposal</span><textarea value={user.businessProposal ?? ""} onChange={e => change("businessProposal", e.target.value)} className="min-h-24 w-full rounded-lg border p-3 text-sm"/></label><label className="md:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-600">About business</span><textarea value={user.aboutBusiness ?? ""} onChange={e => change("aboutBusiness", e.target.value)} className="min-h-24 w-full rounded-lg border p-3 text-sm"/></label></div><div className="mt-5 flex items-center justify-between"><p className="text-xs text-slate-500">Store name, account status, email, verification, DOB, education and all existing User Management mechanisms stay in the main Users module.</p><button onClick={save} disabled={saving} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save Profile"}</button></div>{message && <p className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white">{message}</p>}</section>}
  </div></main>;
}
