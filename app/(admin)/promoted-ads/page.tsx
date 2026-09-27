"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
    Search, Plus, X, Edit2, Check, ArrowLeft, Calendar, CircleDot,
    MoreHorizontal, LayoutGrid, ChevronDown, Trash2, Clock, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { API_BASE_URL } from '@/utils/apiConfig';
import toast from 'react-hot-toast';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface PromotionPlan {
    _id?: string;
    categories: string[];
    amount: string;
    reach: string;
    traffic: string;
    minReach: string;
    minTraffic: string;
    gapAmount: string;
    isEditing?: boolean;
}

export default function PromotedAdsPage() {
    const [plans, setPlans] = useState<PromotionPlan[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [savingId, setSavingId] = useState<string | number | null>(null);

    // Premier Opportunity State
    const [premierSettings, setPremierSettings] = useState<any>({
        verifyBadgePrice: 400,
        verifyBadgeDuration: 365,
        highlightPostPrice: 300,
        labels: [],
        freeAdCredits: []
    });
    const [newLabel, setNewLabel] = useState({ name: '', price: '' });
    const [premierSaving, setPremierSaving] = useState(false);
    const [editMode, setEditMode] = useState<any>({});
    const [showPremierModal, setShowPremierModal] = useState(false);

    const toggleEdit = (field: string) => {
        setEditMode({ ...editMode, [field]: !editMode[field] });
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = Cookies.get('adminToken');
            const [plansRes, subCatRes, premierRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/admins/promotion-plans`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'x-auth-token': token }
                }).catch(() => ({ data: [] })),
                axios.get(`${API_BASE_URL}/api/categories`),
                axios.get(`${API_BASE_URL}/api/premier-opportunity`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'x-auth-token': token }
                }).catch(() => ({ data: { data: {} } }))
            ]);

            setPlans(plansRes.data.length > 0 ? plansRes.data : [{
                categories: [],
                amount: '',
                reach: '',
                traffic: '',
                minReach: '',
                minTraffic: '',
                gapAmount: ''
            }]);

            const allSubs = subCatRes.data.data?.map((sc: any) => sc.name) || [];
            setCategories(allSubs);

            if (premierRes && premierRes.data && premierRes.data.data) {
                const data = premierRes.data.data;
                const fetchedCredits = data.freeAdCredits || [];
                // Ensure specific order: First Product, then All, then others
                const productCredit = fetchedCredits.find((c: any) => c.forType === 'product') || { amount: 400, forType: 'product', forValue: 'First Product', status: true };
                const allCredit = fetchedCredits.find((c: any) => c.forType === 'all') || { amount: 400, forType: 'all', forValue: 'All', startDate: new Date(), endDate: new Date(), status: true };
                const otherCredits = fetchedCredits.filter((c: any) => c.forType !== 'product' && c.forType !== 'all');

                const finalCredits = [productCredit, allCredit, ...otherCredits];

                setPremierSettings({
                    ...data,
                    labels: data.labels && data.labels.length > 0 ? data.labels : [{ name: 'Discount', price: 500 }],
                    freeAdCredits: finalCredits
                });
            }

        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPlan = () => {
        setPlans([...plans, {
            categories: [],
            amount: '',
            reach: '',
            traffic: '',
            minReach: '',
            minTraffic: '',
            gapAmount: '',
            isEditing: true
        }]);
    };

    const handleRemovePlan = (index: number) => {
        if (plans.length === 1) return;
        const newPlans = [...plans];
        newPlans.splice(index, 1);
        setPlans(newPlans);
    };

    const updatePlan = (index: number, field: keyof PromotionPlan, value: any) => {
        const newPlans = [...plans];
        (newPlans[index] as any)[field] = value;
        setPlans(newPlans);
    };

    const handleSavePlan = async (index: number) => {
        const plan = plans[index];
        setSavingId(index);
        try {
            const token = Cookies.get('adminToken');
            if (plan._id) {
                await axios.put(`${API_BASE_URL}/api/admins/promotion-plans/${plan._id}`, plan, {
                    headers: { 'Authorization': `Bearer ${token}`, 'x-auth-token': token }
                });
            } else {
                const res = await axios.post(`${API_BASE_URL}/api/admins/promotion-plans`, plan, {
                    headers: { 'Authorization': `Bearer ${token}`, 'x-auth-token': token }
                });
                const newPlans = [...plans];
                newPlans[index]._id = res.data._id;
                setPlans(newPlans);
            }
            updatePlan(index, 'isEditing', false);
            toast.success("Package saved successfully!");
            fetchData();
        } catch (err) {
            toast.error("Failed to save Package");
        } finally {
            setSavingId(null);
        }
    };



    const handleSavePremier = async () => {
        setPremierSaving(true);
        try {
            const token = Cookies.get('adminToken');
            await axios.put(`${API_BASE_URL}/api/premier-opportunity`, premierSettings, {
                headers: { 'Authorization': `Bearer ${token}`, 'x-auth-token': token }
            });
            toast.success("Premier settings updated!");
            fetchData();
            setEditMode({});
        } catch (err: any) {
            toast.error("Failed to update settings");
        } finally {
            setPremierSaving(false);
        }
    };

    const updateCredit = (index: number, field: string, value: any) => {
        const newCredits = [...premierSettings.freeAdCredits];
        newCredits[index] = { ...newCredits[index], [field]: value };
        setPremierSettings({ ...premierSettings, freeAdCredits: newCredits });
    };

    const updateLabel = (index: number, field: string, value: any) => {
        const newLabels = [...premierSettings.labels];
        newLabels[index] = { ...newLabels[index], [field]: value };
        setPremierSettings({ ...premierSettings, labels: newLabels });
    };

    const removeLabel = (index: number) => {
        const newLabels = premierSettings.labels.filter((_: any, i: number) => i !== index);
        setPremierSettings({ ...premierSettings, labels: newLabels });
    };

    const addNewLabel = () => {
        if (!newLabel.name || !newLabel.price) return toast.error("Enter label name and price");
        setPremierSettings({
            ...premierSettings,
            labels: [...premierSettings.labels, { name: newLabel.name, price: Number(newLabel.price) }]
        });
        setNewLabel({ name: '', price: '' });
    };

    const addNewCategoryCredit = () => {
        setPremierSettings({
            ...premierSettings,
            freeAdCredits: [
                ...premierSettings.freeAdCredits,
                { amount: 100, forType: 'category', forValue: '', status: true }
            ]
        });
    };

    const removeCredit = (index: number) => {
        const newCredits = premierSettings.freeAdCredits.filter((_: any, i: number) => i !== index);
        setPremierSettings({ ...premierSettings, freeAdCredits: newCredits });
    };

    return (
        <div className="bg-[#f1f5f9] min-h-screen p-3 font-['Tahoma','Verdana',sans-serif] text-xs">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <button className="text-rose-500 bg-white p-1 rounded-sm border border-slate-200">
                        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={3} />
                    </button>
                    <h1 className="text-sm font-bold text-blue-700">Promote Plan</h1>
                </div>
                <button
                    onClick={() => setShowPremierModal(true)}
                    className="bg-[#1e40af] text-white px-4 py-1.5 rounded-sm font-bold text-[11px] shadow-sm hover:bg-blue-800 transition-all uppercase flex items-center gap-2"
                >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Premier Opportunity
                </button>
            </div>

            {/* Promote Plan Section */}
            <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden mb-6 max-w-6xl">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-left border-b border-slate-200 bg-white">
                                <th className="px-2 py-2 font-bold text-black text-xs w-[22%]">Categorie</th>
                                <th className="px-2 py-2 font-bold text-black text-xs text-center border-l border-slate-100 uppercase">Amount</th>
                                <th className="px-2 py-2 font-bold text-black text-xs text-center border-l border-slate-100" colSpan={2}>
                                    <div className="text-xs uppercase">View</div>
                                    <div className="flex justify-around text-xs font-normal text-black mt-0.5">
                                        <span className="w-1/2">Reach</span>
                                        <span className="w-1/2">Trafic</span>
                                    </div>
                                </th>
                                <th className="px-2 py-2 font-bold text-black text-xs text-center border-l border-slate-100" colSpan={2}>
                                    <div className="text-xs uppercase">Min Amount</div>
                                    <div className="flex justify-around text-xs font-normal text-black mt-0.5">
                                        <span className="w-1/2">Reach</span>
                                        <span className="w-1/2">Trafic</span>
                                    </div>
                                </th>
                                <th className="px-2 py-2 font-bold text-black text-xs text-center border-l border-slate-100 whitespace-nowrap uppercase">Gap 'to Amount'</th>
                                <th className="px-2 py-2 font-bold text-black text-xs text-center border-l border-slate-100 uppercase">Edit/Save</th>
                                <th className="px-2 py-2 font-bold text-black text-xs text-center border-l border-slate-100 uppercase">Dl, +</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {plans.map((plan, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                                    {/* Sub Categorie Selection */}
                                    <td className="p-1.5">
                                        <div className="flex flex-wrap gap-1 p-1 min-h-7 border border-slate-200 rounded-sm bg-white relative group">
                                            {plan.categories && plan.categories.length > 0 ? plan.categories.map(cat => (
                                                <span key={cat} className="bg-[#10b981] text-white px-1.5 py-0.5 rounded-sm flex items-center gap-1 text-xs relative z-20">
                                                    {cat}
                                                    <X
                                                        className="w-2.5 h-2.5 cursor-pointer hover:text-rose-200"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const newCats = plan.categories.filter(c => c !== cat);
                                                            updatePlan(idx, 'categories', newCats);
                                                        }}
                                                    />
                                                </span>
                                            )) : <span className="text-black text-xs py-0.5 px-1 uppercase">Catag..</span>}
                                            <select
                                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                                                onChange={(e) => {
                                                    if (e.target.value && !plan.categories.includes(e.target.value)) {
                                                        updatePlan(idx, 'categories', [...plan.categories, e.target.value]);
                                                    }
                                                }}
                                                value=""
                                            >
                                                <option value="" disabled></option>
                                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                            <div className="flex-1 flex items-center justify-end px-1 pointer-events-none">
                                                <ChevronDown className="w-3.5 h-3.5 text-black" />
                                            </div>
                                        </div>
                                    </td>

                                    {/* Amount */}
                                    <td className="p-1.5 border-l border-slate-100 text-center">
                                        <input
                                            type="text"
                                            className="w-16 h-8 border border-slate-200 rounded-sm text-center outline-none bg-[#f8fafc] focus:bg-white focus:border-blue-400 text-xs shadow-inner"
                                            value={plan.amount}
                                            onChange={(e) => updatePlan(idx, 'amount', e.target.value)}
                                        />
                                    </td>

                                    {/* View Reach/Traffic */}
                                    <td className="p-1.5 border-l border-slate-100" colSpan={2}>
                                        <div className="flex gap-1.5 justify-center">
                                            <input
                                                type="text"
                                                className="w-14 h-8 border border-slate-200 rounded-sm text-center outline-none bg-[#f8fafc] focus:bg-white focus:border-blue-400 text-xs shadow-inner"
                                                value={plan.reach}
                                                onChange={(e) => updatePlan(idx, 'reach', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                className="w-14 h-8 border border-slate-200 rounded-sm text-center outline-none bg-[#f8fafc] focus:bg-white focus:border-blue-400 text-xs shadow-inner"
                                                value={plan.traffic}
                                                onChange={(e) => updatePlan(idx, 'traffic', e.target.value)}
                                            />
                                        </div>
                                    </td>

                                    {/* Min Amount Reach/Traffic */}
                                    <td className="p-1.5 border-l border-slate-100" colSpan={2}>
                                        <div className="flex gap-1.5 justify-center">
                                            <input
                                                type="text"
                                                className="w-14 h-8 border border-slate-200 rounded-sm text-center outline-none bg-[#f8fafc] focus:bg-white focus:border-blue-400 text-xs shadow-inner"
                                                value={plan.minReach}
                                                onChange={(e) => updatePlan(idx, 'minReach', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                className="w-14 h-8 border border-slate-200 rounded-sm text-center outline-none bg-[#f8fafc] focus:bg-white focus:border-blue-400 text-xs shadow-inner"
                                                value={plan.minTraffic}
                                                onChange={(e) => updatePlan(idx, 'minTraffic', e.target.value)}
                                            />
                                        </div>
                                    </td>

                                    {/* Gap Amount */}
                                    <td className="p-1.5 border-l border-slate-100 text-center">
                                        <input
                                            type="text"
                                            className="w-16 h-8 border border-slate-200 rounded-sm text-center outline-none bg-[#f8fafc] focus:bg-white focus:border-blue-400 text-xs shadow-inner"
                                            value={plan.gapAmount}
                                            onChange={(e) => updatePlan(idx, 'gapAmount', e.target.value)}
                                        />
                                    </td>

                                    {/* Edit/Save Buttons */}
                                    <td className="p-1.5 border-l border-slate-100 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => updatePlan(idx, 'isEditing', true)}
                                                className="bg-[#1e40af] text-white w-9 h-6 rounded-sm font-bold text-xs uppercase shadow-sm hover:bg-blue-800 transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleSavePlan(idx)}
                                                disabled={savingId === idx}
                                                className="bg-[#1e40af] text-white w-9 h-6 rounded-sm font-bold text-xs uppercase shadow-sm hover:bg-blue-800 transition-colors disabled:bg-slate-300"
                                            >
                                                {savingId === idx ? "..." : "Save"}
                                            </button>
                                        </div>
                                    </td>

                                    {/* DL, + Buttons */}
                                    <td className="p-1.5 border-l border-slate-100 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                onClick={async () => {
                                                    if (plan._id) {
                                                        const token = Cookies.get('adminToken');
                                                        await axios.delete(`${API_BASE_URL}/api/admins/promotion-plans/${plan._id}`, {
                                                            headers: { 'Authorization': `Bearer ${token}`, 'x-auth-token': token }
                                                        });
                                                        toast.success("Plan deleted");
                                                    }
                                                    handleRemovePlan(idx);
                                                }}
                                                className="w-5 h-5 bg-[#0f172a] text-white rounded-sm flex items-center justify-center hover:bg-rose-600 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                            {idx === plans.length - 1 && (
                                                <button
                                                    onClick={handleAddPlan}
                                                    className="w-5 h-5 border border-slate-200 text-black rounded-full flex items-center justify-center hover:bg-slate-50 hover:text-black transition-all font-bold"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>



            <AnimatePresence>
                {showPremierModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPremierModal(false)}
                            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                        />
                         <motion.div
                             initial={{ scale: 0.98, opacity: 0, y: 10 }}
                             animate={{ scale: 1, opacity: 1, y: 0 }}
                             exit={{ scale: 0.98, opacity: 0, y: 10 }}
                             className="bg-white border border-slate-900 w-full max-w-[800px] max-h-[calc(100vh-2rem)] rounded-sm shadow-2xl relative z-10 flex flex-col overflow-hidden"
                         >
                             {/* Modal Header */}
                             <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                                 <h2 className="text-[14px] font-bold text-black uppercase tracking-tight">PREMIER OPPORTUNITY</h2>
                                 <button
                                    onClick={() => setShowPremierModal(false)}
                                    className="hover:bg-slate-200 p-1 rounded transition-colors text-black"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                             </div>
 
                             {/* Modal Body */}
                             <div className="p-5 flex-1 min-h-0 flex flex-col gap-5 overflow-y-auto custom-scrollbar text-[13px]">
                                 {/* Profile Verify Badge Price */}
                                 <div className="space-y-3">
                                     <div className="flex items-center justify-between">
                                        <label className="text-black font-medium">Profile Verify Badge Price (year)</label>
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-400">$</span>
                                            <input
                                                type="number"
                                                className="w-20 border border-slate-300 px-2 py-1 outline-none text-center font-bold"
                                                value={premierSettings.verifyBadgePrice}
                                                readOnly={!editMode.badge}
                                                onChange={e => setPremierSettings({ ...premierSettings, verifyBadgePrice: Number(e.target.value) })}
                                            />
                                            <Clock className="w-4 h-4 text-slate-500 mx-1" />
                                            <input
                                                type="number"
                                                className="w-20 border border-slate-300 px-2 py-1 outline-none text-center font-bold"
                                                value={premierSettings.verifyBadgeDuration}
                                                readOnly={!editMode.badge}
                                                onChange={e => setPremierSettings({ ...premierSettings, verifyBadgeDuration: Number(e.target.value) })}
                                            />
                                            <div className="flex items-center gap-1.5 ml-2">
                                                <Edit2 className="w-4 h-4 text-black cursor-pointer hover:text-blue-600" onClick={() => toggleEdit('badge')} />
                                                <CheckCircle2 className="w-4 h-4 text-black cursor-pointer hover:text-emerald-600" onClick={handleSavePremier} />
                                            </div>
                                        </div>
                                    </div>
                                    <hr className="border-slate-100" />
                                </div>

                                {/* Add Label Section */}
                                <div className="space-y-4">
                                    <label className="text-black font-bold block">Add Label</label>
                                    <div className="space-y-2">
                                        {premierSettings.labels?.map((label: any, idx: number) => {
                                            const labelEditKey = `label_${idx}`;
                                            const isEditing = editMode[labelEditKey];
                                            return (
                                                <div key={idx} className="flex items-center justify-between w-full max-w-[400px]">
                                                    {isEditing ? (
                                                        <div className="flex items-center gap-2 flex-1 mr-4">
                                                            <input 
                                                                type="text" 
                                                                value={label.name} 
                                                                onChange={(e) => updateLabel(idx, 'name', e.target.value)}
                                                                className="flex-1 border border-slate-300 px-2 py-0.5 outline-none"
                                                            />
                                                            <div className="flex items-center gap-1 border border-slate-300 px-1 bg-white">
                                                                <span className="text-slate-400">$</span>
                                                                <input 
                                                                    type="number" 
                                                                    value={label.price} 
                                                                    onChange={(e) => updateLabel(idx, 'price', Number(e.target.value))}
                                                                    className="w-16 py-0.5 outline-none text-center font-bold"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="text-black font-medium">{label.name}</span>
                                                            <div className="flex items-center gap-4">
                                                                <span className="font-bold">$ {label.price}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        {isEditing ? (
                                                            <CheckCircle2 onClick={() => toggleEdit(labelEditKey)} className="w-4 h-4 text-emerald-600 cursor-pointer hover:text-emerald-700" />
                                                        ) : (
                                                            <Edit2 onClick={() => toggleEdit(labelEditKey)} className="w-4 h-4 text-black cursor-pointer hover:text-blue-600" />
                                                        )}
                                                        <Trash2 onClick={() => removeLabel(idx)} className="w-4 h-4 text-black hover:text-rose-500 cursor-pointer" />
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <div className="flex items-center gap-2 mt-3">
                                            <div className="flex items-center border border-slate-300 rounded-sm bg-white w-full max-w-[280px]">
                                                <input
                                                    type="text"
                                                    placeholder="Label Name"
                                                    className="flex-1 px-3 py-2 outline-none border-r border-slate-200"
                                                    value={newLabel.name}
                                                    onChange={e => setNewLabel({ ...newLabel, name: e.target.value })}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Price"
                                                    className="w-24 px-3 py-2 outline-none text-center"
                                                    value={newLabel.price}
                                                    onChange={e => setNewLabel({ ...newLabel, price: e.target.value })}
                                                />
                                            </div>
                                            <button
                                                onClick={addNewLabel}
                                                className="p-2 border border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-sm font-bold shadow-sm flex items-center justify-center transition-all"
                                            >
                                                <Plus className="w-5 h-5 stroke-[2.5]" />
                                            </button>
                                        </div>
                                    </div>
                                    <hr className="border-slate-100" />
                                </div>

                                {/* Free Ad Credit Amount */}
                                <div className="space-y-4">
                                    <h3 className="text-[14px] font-bold text-emerald-700">Free Ad Credit Amount</h3>
                                    <div className="space-y-3">
                                        {premierSettings.freeAdCredits?.map((credit: any, idx: number) => {
                                            const rowId = `credit_${idx}`;
                                            const isEditing = editMode[rowId];
                                            return (
                                                <div key={idx} className="flex items-center gap-3">
                                                    <span className="text-slate-400">$</span>
                                                    <input
                                                        type="number"
                                                        value={credit.amount}
                                                        onChange={e => updateCredit(idx, 'amount', Number(e.target.value))}
                                                        className="w-16 border border-slate-300 px-2 py-1 outline-none text-center font-bold bg-white focus:border-blue-400"
                                                    />
                                                    <span className="text-black font-medium mx-1">For</span>

                                                    {credit.forType === 'all' ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="px-3 py-1 border border-slate-300 text-[12px] font-bold bg-white min-w-[60px] text-center">All</div>
                                                            <div className="flex items-center gap-1">
                                                                <div className="relative flex items-center gap-1">
                                                                    <input
                                                                        type={isEditing ? "date" : "text"}
                                                                        value={isEditing ? (credit.startDate ? new Date(credit.startDate).toISOString().split('T')[0] : '') : (credit.startDate ? new Date(credit.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '00-00-2026')}
                                                                        readOnly={!isEditing}
                                                                        onChange={e => updateCredit(idx, 'startDate', e.target.value)}
                                                                        className="w-[105px] border border-slate-300 p-1 rounded-sm bg-white text-center text-[12px] outline-none"
                                                                    />
                                                                    <Edit2 onClick={() => toggleEdit(rowId)} className="w-3 h-3 text-slate-500 cursor-pointer hover:text-blue-600" />
                                                                </div>
                                                                <span className="text-black mx-1">to</span>
                                                                <div className="relative flex items-center gap-1">
                                                                    <input
                                                                        type={isEditing ? "date" : "text"}
                                                                        value={isEditing ? (credit.endDate ? new Date(credit.endDate).toISOString().split('T')[0] : '') : (credit.endDate ? new Date(credit.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '00-00-2026')}
                                                                        readOnly={!isEditing}
                                                                        onChange={e => updateCredit(idx, 'endDate', e.target.value)}
                                                                        className="w-[105px] border border-slate-300 p-1 rounded-sm bg-white text-center text-[12px] outline-none"
                                                                    />
                                                                    <Edit2 onClick={() => toggleEdit(rowId)} className="w-3 h-3 text-slate-500 cursor-pointer hover:text-blue-600" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : credit.forType === 'product' ? (
                                                        <div className="px-3 py-1 border border-slate-300 text-[12px] font-bold bg-white w-48 text-center">First Product</div>
                                                    ) : (
                                                        <div className="relative">
                                                            <select
                                                                className="w-48 border border-slate-300 px-3 py-1 outline-none text-[12px] font-medium bg-white appearance-none focus:border-blue-400"
                                                                value={credit.forValue}
                                                                onChange={e => updateCredit(idx, 'forValue', e.target.value)}
                                                            >
                                                                <option value="">Select Category</option>
                                                                {categories.map((cat: any) => (
                                                                    <option key={cat} value={cat}>{cat}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-3 ml-auto">
                                                        <span className="text-black font-medium">Status</span>
                                                        <div className="flex items-center gap-3">
                                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    checked={credit.status === true}
                                                                    onChange={() => updateCredit(idx, 'status', true)}
                                                                    className="w-3.5 h-3.5 accent-blue-600"
                                                                />
                                                                <span className="text-[12px] font-medium text-slate-600">Yes</span>
                                                            </label>
                                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                                <input
                                                                    type="radio"
                                                                    checked={credit.status === false}
                                                                    onChange={() => updateCredit(idx, 'status', false)}
                                                                    className="w-3.5 h-3.5 accent-blue-600"
                                                                />
                                                                <span className="text-[12px] font-medium text-slate-600">No</span>
                                                            </label>
                                                        </div>
                                                        <div className="flex items-center gap-1 ml-1">
                                                            <CheckCircle2 onClick={handleSavePremier} className="w-5 h-5 text-black cursor-pointer hover:text-emerald-600" />
                                                            {credit.forType === 'category' && (
                                                                <Trash2 onClick={() => removeCredit(idx)} className="w-4 h-4 text-black cursor-pointer hover:text-rose-500" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <button
                                            onClick={addNewCategoryCredit}
                                            className="px-4 py-1.5 border border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-sm font-bold text-[11px] uppercase tracking-wide mt-2"
                                        >
                                            Add More Credit
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2 justify-end">
                                <button
                                    onClick={handleSavePremier}
                                    disabled={premierSaving}
                                    className="bg-blue-600 text-white px-8 py-2 font-bold rounded-sm border border-blue-700 hover:bg-blue-700 shadow-sm transition-all text-xs uppercase"
                                >
                                    {premierSaving ? 'Processing...' : 'Save Settings'}
                                </button>
                                <button
                                    onClick={() => setShowPremierModal(false)}
                                    className="bg-white text-black px-8 py-2 font-bold rounded-sm border border-slate-300 hover:bg-slate-50 text-xs uppercase"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
            `}</style>
        </div>
    );
}
