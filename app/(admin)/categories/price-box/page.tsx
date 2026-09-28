"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { API_BASE_URL as API } from "@/utils/apiConfig";

type Field = { key: string; label: string; labelBn: string; placeholder: string; placeholderBn: string; required: boolean; order: number };
type Sub = { _id: string; name: string; subCategoryNameBn?: string; category?: { _id?: string; name?: string; categoryNameBn?: string }; priceBoxShow?: boolean; priceBoxName?: string; priceBoxFields?: Field[] };

const blankField = (order: number): Field => ({ key: `field_${order + 1}`, label: "", labelBn: "", placeholder: "", placeholderBn: "", required: false, order });

export default function PriceBoxManager() {
  const [rows, setRows] = useState<Sub[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [boxName, setBoxName] = useState("");
  const [fields, setFields] = useState<Field[]>([blankField(0)]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const token = Cookies.get("adminToken") || "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/categories/sub`);
      const j = await r.json();
      setRows(j.data || []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => Array.from(new Set(rows.map(x => x.category?.name).filter(Boolean))) as string[], [rows]);
  const visibleRows = useMemo(() => categoryFilter === "all" ? rows : rows.filter(x => x.category?.name === categoryFilter), [rows, categoryFilter]);

  function selectRow(row: Sub) {
    setSelectedId(row._id);
    setEnabled(Boolean(row.priceBoxShow));
    setBoxName(row.priceBoxName || "");
    setFields((row.priceBoxFields?.length ? row.priceBoxFields : [blankField(0)]).map((f, i) => ({ ...blankField(i), ...f, order: i })));
    setMessage("");
  }

  function updateField(index: number, patch: Partial<Field>) {
    setFields(current => current.map((f, i) => i === index ? { ...f, ...patch } : f));
  }

  function addField() { setFields(current => [...current, blankField(current.length)]); }
  function removeField(index: number) { setFields(current => current.filter((_, i) => i !== index).map((f, i) => ({ ...f, order: i }))); }

  async function save() {
    const row = rows.find(x => x._id === selectedId);
    if (!row) return;
    if (enabled && fields.some(f => !f.label && !f.labelBn && !f.placeholder && !f.placeholderBn)) {
      setMessage("Every enabled price-box row needs a label or placeholder.");
      return;
    }
    setSaving(true); setMessage("");
    try {
      const r = await fetch(`${API}/api/categories/sub/${row._id}`, {
        method: "PUT", headers,
        body: JSON.stringify({
          name: row.name,
          subCategoryNameBn: row.subCategoryNameBn || "",
          category: row.category?._id,
          features: [],
          buttonType: "",
          freePost: 1,
          order: 0,
          status: true,
          tags: [],
          priceBoxShow: enabled,
          priceBoxName: boxName,
          priceBoxFields: enabled ? fields.map((f, i) => ({ ...f, order: i })) : []
        })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || "Unable to save price-box configuration");
      setMessage("Saved successfully. The post form can now read this configuration dynamically.");
      await load();
      const updated = (j.data || rows.find(x => x._id === row._id)) as Sub;
      selectRow(updated);
    } catch (e: any) { setMessage(e.message || "Save failed"); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-slate-100 p-4 md:p-6">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Dynamic Price Box</h1>
        <p className="mt-1 text-sm text-slate-500">Admin controls what appears in Investor / Business Owner free posts. Existing category mechanisms remain untouched.</p>
      </header>

      <section className="grid gap-5 lg:grid-cols-[330px_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-sm">Subcategories</h2><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="rounded border px-2 py-1 text-xs"><option value="all">All categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className="max-h-[650px] space-y-1 overflow-y-auto">{loading ? <p className="p-3 text-sm text-slate-500">Loading...</p> : visibleRows.map(row => <button key={row._id} onClick={() => selectRow(row)} className={`w-full rounded-lg border p-3 text-left ${selectedId === row._id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:bg-slate-50"}`}><div className="flex items-center justify-between"><span className="font-semibold text-sm">{row.name}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.priceBoxShow ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{row.priceBoxShow ? "YES" : "NO"}</span></div><p className="mt-1 text-[11px] text-slate-500">{row.category?.name || "No category"}</p></button>)}</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selectedId ? <div className="flex min-h-[450px] items-center justify-center text-center text-slate-400"><div><div className="text-4xl">▦</div><p className="mt-2 font-semibold">Select a subcategory</p><p className="text-xs">Configure whether its price box appears and define human-readable English/Bangla placeholders.</p></div></div> : <>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected subcategory</p><h2 className="text-lg font-bold">{rows.find(x => x._id === selectedId)?.name}</h2><p className="text-xs text-slate-500">{rows.find(x => x._id === selectedId)?.category?.name}</p></div><label className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold"><span>Show price box</span><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /></label></div>
            {enabled && <>
              <div className="mt-4"><label className="mb-1 block text-xs font-bold">Price box title</label><input value={boxName} onChange={e => setBoxName(e.target.value)} placeholder="e.g. Investment Details / বিনিয়োগের তথ্য" className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-emerald-500" /></div>
              <div className="mt-5 flex items-center justify-between"><div><h3 className="font-bold text-sm">Fields shown in post</h3><p className="text-xs text-slate-500">Example: Min Invest, Max Invest, Expected Return — or any custom business fields.</p></div><button onClick={addField} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">+ Add field</button></div>
              <div className="mt-3 space-y-3">{fields.map((field, index) => <div key={field.key + index} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold text-slate-500">Field {index + 1}</span><button onClick={() => removeField(index)} disabled={fields.length === 1} className="text-xs font-semibold text-red-600 disabled:opacity-30">Remove</button></div><div className="grid gap-3 md:grid-cols-2"><input value={field.key} onChange={e => updateField(index, { key: e.target.value })} placeholder="Internal key" className="rounded border px-3 py-2 text-sm"/><label className="flex items-center gap-2 rounded border bg-white px-3 text-xs"><input type="checkbox" checked={field.required} onChange={e => updateField(index, { required: e.target.checked })}/> Required</label><input value={field.label} onChange={e => updateField(index, { label: e.target.value })} placeholder="English label — e.g. Min Invest" className="rounded border px-3 py-2 text-sm"/><input value={field.labelBn} onChange={e => updateField(index, { labelBn: e.target.value })} placeholder="Bangla label — e.g. সর্বনিম্ন বিনিয়োগ" className="rounded border px-3 py-2 text-sm"/><input value={field.placeholder} onChange={e => updateField(index, { placeholder: e.target.value })} placeholder="English placeholder — e.g. Minimum investment" className="rounded border px-3 py-2 text-sm"/><input value={field.placeholderBn} onChange={e => updateField(index, { placeholderBn: e.target.value })} placeholder="Bangla placeholder" className="rounded border px-3 py-2 text-sm"/></div></div>)}</div>
            </>}
            {!enabled && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><b>Price box disabled.</b> The post flow should not ask this subcategory for min/max/return or custom price fields.</div>}
            <div className="mt-5 flex justify-end"><button disabled={saving} onClick={save} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save configuration"}</button></div>
            {message && <p className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white">{message}</p>}
          </>}
        </div>
      </section>
    </div>
  </main>;
}
