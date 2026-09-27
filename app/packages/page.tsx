"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Edit2, Trash2, Search, CheckCircle, Save, X, Plus, Download, Printer, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../../../utils/apiConfig';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export default function PackagesManagerPage() {
    // --- State: Packages ---
    const [packages, setPackages] = useState<any[]>([]);
    const [packagesLoading, setPackagesLoading] = useState(true);
    const [packageForm, setPackageForm] = useState({
        _id: '', name: '', packageType: 'You', oldPrice: 0, price: 0,
        total_connects: 0, maxProfileView: 0, validDays: 30,
        bestValueSuggestion: false, checkedFeatures: '', uncheckedFeatures: '', isActive: true
    });
    const [isEditingPackage, setIsEditingPackage] = useState(false);
    const [formLoading, setFormLoading] = useState(false);

    // --- State: Premium Zone ---
    const [searchQuery, setSearchQuery] = useState('');
    const [userStats, setUserStats] = useState<any>(null);
    const [userStatsLoading, setUserStatsLoading] = useState(false);
    const [manualInject, setManualInject] = useState({ packageId: '', packageType: 'You', packageName: '', connects: 0, validDays: 0, note: '' });
    const [injectLoading, setInjectLoading] = useState(false);
    const [refundAmount, setRefundAmount] = useState(0);
    const [refundReason, setRefundReason] = useState('');
    const [refundLoading, setRefundLoading] = useState(false);

    // --- State: Transactions ---
    const [transactions, setTransactions] = useState<any[]>([]);
    const [trxLoading, setTrxLoading] = useState(false);
    const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);

    const getHeaders = useCallback(() => {
        return { Authorization: `Bearer ${Cookies.get('adminToken')}` };
    }, []);

    // --- Effects ---
    useEffect(() => {
        fetchPackages();
        fetchTransactions();
        const refreshTimer = window.setInterval(fetchTransactions, 30000);
        return () => window.clearInterval(refreshTimer);
    }, [getHeaders]);

    // --- API: Packages ---
    const fetchPackages = async () => {
        setPackagesLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/packages`);
            setPackages(res.data.data);
        } catch (error) {
            toast.error("Failed to fetch packages");
        } finally {
            setPackagesLoading(false);
        }
    };

    const handlePackageSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const payload = {
                ...packageForm,
                checkedFeatures: packageForm.checkedFeatures.split('\n').map(f => f.trim()).filter(Boolean),
                uncheckedFeatures: packageForm.uncheckedFeatures.split('\n').map(f => f.trim()).filter(Boolean)
            };

            if (isEditingPackage && packageForm._id) {
                await axios.put(`${API_BASE_URL}/api/packages/${packageForm._id}`, payload, { headers: getHeaders() });
                toast.success('Package updated successfully');
            } else {
                await axios.post(`${API_BASE_URL}/api/packages`, payload, { headers: getHeaders() });
                toast.success('Package created successfully');
            }
            
            resetPackageForm();
            fetchPackages();
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setFormLoading(false);
        }
    };

    const handleEditPackage = (pkg: any) => {
        setPackageForm({
            ...pkg,
            checkedFeatures: pkg.checkedFeatures?.join('\n') || '',
            uncheckedFeatures: pkg.uncheckedFeatures?.join('\n') || ''
        });
        setIsEditingPackage(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeletePackage = async (id: string) => {
        if (!confirm('Are you sure you want to delete this package?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/packages/${id}`, { headers: getHeaders() });
            toast.success('Package deleted');
            fetchPackages();
        } catch (error) {
            toast.error("Failed to delete package");
        }
    };

    const resetPackageForm = () => {
        setIsEditingPackage(false);
        setPackageForm({
            _id: '', name: '', packageType: 'You', oldPrice: 0, price: 0,
            total_connects: 0, maxProfileView: 0, validDays: 30,
            bestValueSuggestion: false, checkedFeatures: '', uncheckedFeatures: '', isActive: true
        });
    };

    // --- API: Premium Zone ---
    const handleSearchUser = async () => {
        if (!searchQuery.trim()) return;
        setUserStatsLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/admins/user-stats/${searchQuery.trim()}`, { headers: getHeaders() });
            setUserStats(res.data.data);
            toast.success("User loaded");
        } catch (error) {
            setUserStats(null);
            toast.error("User not found");
        } finally {
            setUserStatsLoading(false);
        }
    };

    const handleManualInject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userStats) return toast.error("Search a user first");
        
        setInjectLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/packages/manual-inject`, {
                userId: userStats.id,
                ...manualInject
            }, { headers: getHeaders() });
            
            toast.success("Connects injected successfully");
            setManualInject({ packageId: '', packageType: 'You', packageName: '', connects: 0, validDays: 0, note: '' });
            handleSearchUser(); // refresh stats
            fetchTransactions(); // refresh report
        } catch (error) {
            toast.error("Injection failed");
        } finally {
            setInjectLoading(false);
        }
    };

    const handleRefund = async () => {
        if (!userStats) return toast.error('Search a user first');
        if (refundAmount <= 0 || !refundReason.trim()) return toast.error('Enter a refund amount and reason');
        setRefundLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/packages/manual-refund`, { userId: userStats.id, amount: refundAmount, reason: refundReason }, { headers: getHeaders() });
            toast.success('Credit refund recorded');
            setRefundAmount(0);
            setRefundReason('');
            handleSearchUser();
        } catch (error) {
            toast.error('Refund could not be completed');
        } finally { setRefundLoading(false); }
    };

    // --- API: Transactions ---
    const fetchTransactions = async () => {
        setTrxLoading(true);
        try {
            const limit = 500;
            const firstPage = await axios.get(`${API_BASE_URL}/api/admins/transactions?page=1&limit=${limit}`, { headers: getHeaders() });
            const allTransactions = [...(firstPage.data.data || [])];
            for (let page = 2; page <= (firstPage.data.pages || 1); page += 1) {
                const pageRes = await axios.get(`${API_BASE_URL}/api/admins/transactions?page=${page}&limit=${limit}`, { headers: getHeaders() });
                allTransactions.push(...(pageRes.data.data || []));
            }
            setTransactions(allTransactions);
            setSelectedTransactionIds((selected) => selected.filter((id) => allTransactions.some((trx: any) => trx._id === id)));
        } catch (error) {
            toast.error("Failed to fetch transactions");
        } finally {
            setTrxLoading(false);
        }
    };

    const downloadTransactions = (rows: any[], filename: string) => {
        if (!rows.length) return toast.error('Select at least one transaction');
        const columns = ['Date', 'Transaction ID', 'User', 'Mobile', 'Amount', 'Payment Type', 'Payee', 'Item', 'Status'];
        const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
        const lines = [columns, ...rows.map((trx) => [
            trx.payTime || trx.createdAt,
            trx.tnxId,
            trx.sellerId?.name || 'N/A',
            trx.sellerId?.mobile || trx.mobileNumber,
            trx.amount,
            trx.payType,
            trx.payeeName,
            trx.item,
            trx.status
        ])].map((row) => row.map(csvCell).join(','));
        const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const printTransactions = (rows: any[]) => {
        if (!rows.length) return toast.error('Select at least one transaction');
        const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
        const printWindow = window.open('', '_blank');
        if (!printWindow) return toast.error('Allow pop-ups to print the report');
        const tableRows = rows.map((trx) => `<tr><td>${escapeHtml(new Date(trx.payTime || trx.createdAt).toLocaleString())}</td><td>${escapeHtml(trx.tnxId)}</td><td>${escapeHtml(trx.sellerId?.name || 'N/A')}</td><td>${escapeHtml(trx.amount)}</td><td>${escapeHtml(trx.payType)}</td><td>${escapeHtml(trx.item)}</td><td>${escapeHtml(trx.status)}</td></tr>`).join('');
        printWindow.document.write(`<!doctype html><html><head><title>Shadamon Transaction Report</title><style>body{font:12px Arial,sans-serif;color:#111;padding:24px}h1{font-size:18px}table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left;border:1px solid #cbd5e1}th{background:#f1f5f9}</style></head><body><h1>Shadamon Transaction Report</h1><table><thead><tr><th>Date</th><th>Transaction ID</th><th>User</th><th>Amount</th><th>Payment Type</th><th>Item</th><th>Status</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    return (
        <div className="flex flex-col gap-8 p-6 bg-slate-50 min-h-screen font-['Tahoma','Verdana',sans-serif]">
            
            {/* --- 1. PACKAGE MANAGER --- */}
            <section className="bg-white border border-slate-200 rounded-sm shadow-sm p-5">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Package Manager</h2>
                    <div className="flex items-center gap-4">
                        <a href="#refund-credit" className="text-xs font-bold text-emerald-700 underline underline-offset-2">Manage refunds</a>
                        {isEditingPackage && (
                            <button onClick={resetPackageForm} className="text-sm font-bold text-rose-500 flex items-center gap-1 hover:text-rose-700">
                                <X className="w-4 h-4" /> Cancel Edit
                            </button>
                        )}
                    </div>
                </div>

                <form onSubmit={handlePackageSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Name</label>
                            <input type="text" required className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" 
                                value={packageForm.name} onChange={e => setPackageForm({...packageForm, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Package Type</label>
                            <select className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                value={packageForm.packageType} onChange={e => setPackageForm({...packageForm, packageType: e.target.value})}>
                                {['You', 'Both'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Total Connects</label>
                            <input type="number" required min="0" className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" 
                                value={packageForm.total_connects} onChange={e => setPackageForm({...packageForm, total_connects: Number(e.target.value)})} />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Old Price (৳)</label>
                            <input type="number" min="0" className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" 
                                value={packageForm.oldPrice} onChange={e => setPackageForm({...packageForm, oldPrice: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Package Price (৳)</label>
                            <input type="number" required min="0" className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" 
                                value={packageForm.price} onChange={e => setPackageForm({...packageForm, price: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Max Profile View</label>
                            <input type="number" required min="0" className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" 
                                value={packageForm.maxProfileView} onChange={e => setPackageForm({...packageForm, maxProfileView: Number(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Total Valid Days</label>
                            <input type="number" required min="1" className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none" 
                                value={packageForm.validDays} onChange={e => setPackageForm({...packageForm, validDays: Number(e.target.value)})} />
                        </div>
                        
                        <div className="flex items-center md:col-span-2 pt-6">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                                <input type="checkbox" className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded border-slate-300"
                                    checked={packageForm.bestValueSuggestion} onChange={e => setPackageForm({...packageForm, bestValueSuggestion: e.target.checked})} />
                                Best Value Suggestion
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700 ml-6">
                                <input type="checkbox" className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded border-slate-300"
                                    checked={packageForm.isActive} onChange={e => setPackageForm({...packageForm, isActive: e.target.checked})} />
                                Is Active
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Checked Features (One per line)</label>
                            <textarea rows={4} className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                                value={packageForm.checkedFeatures} onChange={e => setPackageForm({...packageForm, checkedFeatures: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Unchecked Features (One per line)</label>
                            <textarea rows={4} className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
                                value={packageForm.uncheckedFeatures} onChange={e => setPackageForm({...packageForm, uncheckedFeatures: e.target.value})} />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={formLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-sm text-sm uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50">
                            <Save className="w-4 h-4" /> {isEditingPackage ? 'Update Package' : 'Save Package'}
                        </button>
                    </div>
                </form>

                {/* Packages Table */}
                <div className="mt-8 border border-slate-200 rounded-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-700">
                            <tr>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200">Name</th>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200">Type</th>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200">Connects</th>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200">Price</th>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200">Validity</th>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {packagesLoading ? (
                                <tr><td colSpan={6} className="p-6 text-center text-slate-400">Loading packages...</td></tr>
                            ) : packages.map(pkg => (
                                <tr key={pkg._id} className="hover:bg-slate-50">
                                    <td className="p-3 text-sm font-bold text-slate-800">{pkg.name} {pkg.bestValueSuggestion && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded ml-1 uppercase">Best</span>}</td>
                                    <td className="p-3 text-sm text-slate-600">{pkg.packageType}</td>
                                    <td className="p-3 text-sm text-slate-600 font-semibold">{pkg.maxProfileView || pkg.total_connects}</td>
                                    <td className="p-3 text-sm text-slate-600">
                                        {pkg.oldPrice > 0 && <span className="line-through text-slate-400 mr-2">৳{pkg.oldPrice}</span>}
                                        <span className="font-bold text-emerald-600">৳{pkg.price}</span>
                                    </td>
                                    <td className="p-3 text-sm text-slate-600">{pkg.validDays} Days</td>
                                    <td className="p-3 text-center">
                                        <button onClick={() => handleEditPackage(pkg)} className="text-blue-500 hover:text-blue-700 p-1 mx-1"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeletePackage(pkg._id)} className="text-rose-500 hover:text-rose-700 p-1 mx-1"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* --- 2. PREMIUM ZONE --- */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Search & Stats */}
                <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-5 flex flex-col h-full">
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide mb-4">Premium Zone <span className="text-sm font-normal text-slate-500 lowercase">(Auto manual package run)</span></h2>
                    
                    <div className="flex gap-2 mb-6">
                        <input type="text" placeholder="Search by email / number / Id" className="flex-1 border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchUser()} />
                        <button onClick={handleSearchUser} disabled={userStatsLoading} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-sm text-sm font-bold flex items-center gap-2">
                            <Search className="w-4 h-4" /> {userStatsLoading ? 'Searching...' : 'Search'}
                        </button>
                    </div>

                    {userStats ? (
                        <div className="grid grid-cols-2 gap-4 flex-1">
                            <div className="bg-slate-50 p-4 border border-slate-100 rounded-sm flex flex-col items-center justify-center text-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Connect</span>
                                <span className="text-3xl font-bold text-emerald-600">{userStats.connectsBalance}</span>
                            </div>
                            <div className="bg-slate-50 p-4 border border-slate-100 rounded-sm flex flex-col items-center justify-center text-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Validity Date</span>
                                <span className="text-lg font-bold text-slate-700">
                                    {userStats.validityDate ? new Date(userStats.validityDate).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                            <div className="col-span-2 bg-indigo-50 p-4 border border-indigo-100 rounded-sm">
                                <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-3 text-center">View History</h3>
                                <div className="flex justify-between px-4">
                                    <div className="text-center"><div className="text-xl font-bold text-indigo-600">{userStats.viewHistory.userSeen}</div><div className="text-[10px] uppercase font-bold text-indigo-400">User Seen</div></div>
                                    <div className="text-center"><div className="text-xl font-bold text-indigo-600">{userStats.viewHistory.othersSeen}</div><div className="text-[10px] uppercase font-bold text-indigo-400">Others Seen</div></div>
                                    <div className="text-center"><div className="text-xl font-bold text-indigo-900">{userStats.viewHistory.totalSeen}</div><div className="text-[10px] uppercase font-bold text-indigo-500">Total Seen</div></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-10">
                            <Search className="w-10 h-10 mb-2 opacity-50" />
                            <p className="text-sm font-medium">Search a user to view stats</p>
                        </div>
                    )}
                </div>

                {/* Provide Manually */}
                <div className="bg-white border border-slate-200 rounded-sm shadow-sm p-5 h-full">
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide mb-4 text-center">Provide Manually</h2>
                    
                    <form onSubmit={handleManualInject} className="space-y-4 max-w-sm mx-auto flex flex-col h-[calc(100%-2rem)]">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Package</label>
                            <select required className="w-full border border-slate-300 rounded-sm px-3 py-3 text-sm focus:border-emerald-500 outline-none"
                                value={manualInject.packageId} onChange={e => {
                                    const selected = packages.find(pkg => pkg._id === e.target.value);
                                    setManualInject({ ...manualInject, packageId: e.target.value, packageType: selected?.packageType || 'You', packageName: selected?.name || '', connects: selected?.maxProfileView || selected?.total_connects || 0, validDays: selected?.validDays || 30 });
                                }}>
                                <option value="">Select a package</option>
                                {packages.filter(pkg => pkg.isActive).map(pkg => <option key={pkg._id} value={pkg._id}>{pkg.name} ({pkg.packageType})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Add Connects</label>
                            <input type="number" required min="1" className="w-full border border-slate-300 rounded-sm px-3 py-3 text-lg font-bold text-center focus:border-emerald-500 outline-none"
                                value={manualInject.connects || ''} onChange={e => setManualInject({...manualInject, connects: Number(e.target.value)})} placeholder="0" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Extend Validity (Days)</label>
                            <input type="number" required min="0" className="w-full border border-slate-300 rounded-sm px-3 py-3 text-lg font-bold text-center focus:border-emerald-500 outline-none"
                                value={manualInject.validDays || ''} onChange={e => setManualInject({...manualInject, validDays: Number(e.target.value)})} placeholder="30" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Note / Transaction Item</label>
                            <input type="text" className="w-full border border-slate-300 rounded-sm px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                                value={manualInject.note} onChange={e => setManualInject({...manualInject, note: e.target.value})} placeholder="e.g. Free gift / Manual Bank Pay" />
                        </div>

                        <div className="mt-auto pt-4">
                            <button type="submit" disabled={!userStats || injectLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-sm uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {injectLoading ? 'Processing...' : 'Confirm Injection'}
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            <section id="refund-credit" className="bg-white border border-slate-200 rounded-sm shadow-sm p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                        <h2 className="text-lg font-bold uppercase tracking-wide text-slate-800">Credit Refund</h2>
                        <p className="mt-1 text-xs text-slate-500">{userStats ? `Selected user: ${userStats.name}${userStats.mobile ? ` (${userStats.mobile})` : ''}` : 'Search for an investor or business owner in Premium Zone above before issuing a refund.'}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Refunds are recorded in the transaction report</span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr_auto]">
                    <label className="text-xs font-bold uppercase text-slate-600">Credits
                        <input type="number" min="1" value={refundAmount || ''} onChange={e => setRefundAmount(Number(e.target.value))} placeholder="Amount" className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600" />
                    </label>
                    <label className="text-xs font-bold uppercase text-slate-600">Reason
                        <input value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Refund reason" className="mt-1 w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600" />
                    </label>
                    <button type="button" onClick={handleRefund} disabled={!userStats || refundLoading} className="self-end bg-emerald-700 px-5 py-2.5 text-xs font-bold uppercase text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">{refundLoading ? 'Refunding...' : 'Issue Refund'}</button>
                </div>
            </section>

            {/* --- 3. TRANSACTION REPORT --- */}
            <section className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">Transaction Report (All)</h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => fetchTransactions()} disabled={trxLoading} title="Refresh transactions" className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={cn("h-3.5 w-3.5", trxLoading && "animate-spin")} />Refresh</button>
                        <button type="button" onClick={() => downloadTransactions(transactions.filter((trx) => selectedTransactionIds.includes(trx._id)), 'shadamon-transactions-selected.csv')} disabled={!selectedTransactionIds.length} className="inline-flex items-center gap-1.5 border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><Download className="h-3.5 w-3.5" />Selected ({selectedTransactionIds.length})</button>
                        <button type="button" onClick={() => downloadTransactions(transactions, 'shadamon-transactions.csv')} disabled={!transactions.length} className="inline-flex items-center gap-1.5 border border-emerald-700 bg-emerald-700 px-2.5 py-2 text-xs font-semibold text-white disabled:opacity-50"><Download className="h-3.5 w-3.5" />Excel CSV</button>
                        <button type="button" onClick={() => printTransactions(selectedTransactionIds.length ? transactions.filter((trx) => selectedTransactionIds.includes(trx._id)) : transactions)} disabled={!transactions.length} className="inline-flex items-center gap-1.5 border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs font-semibold text-white disabled:opacity-50"><Printer className="h-3.5 w-3.5" />Print / Save PDF</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-slate-100 text-slate-700">
                            <tr>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200 w-10 text-center"><input type="checkbox" aria-label="Select all transactions" checked={transactions.length > 0 && selectedTransactionIds.length === transactions.length} onChange={(event) => setSelectedTransactionIds(event.target.checked ? transactions.map((trx) => trx._id) : [])} /></th>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200">Trx Date</th>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200">Trx ID</th>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200">Seller ID / Name</th>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200">Amount</th>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200">Pay Type</th>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200">Payee Name</th>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200">Item</th>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200">Status</th>
                                <th className="p-3 text-xs font-bold uppercase border-b border-slate-200">Export</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {trxLoading ? (
                                <tr><td colSpan={10} className="p-6 text-center text-slate-400">Loading transactions...</td></tr>
                            ) : transactions.map(trx => (
                                <tr key={trx._id} className="hover:bg-slate-50">
                                    <td className="p-3 text-center"><input type="checkbox" aria-label={`Select transaction ${trx.tnxId}`} checked={selectedTransactionIds.includes(trx._id)} onChange={(event) => setSelectedTransactionIds((selected) => event.target.checked ? [...selected, trx._id] : selected.filter((id) => id !== trx._id))} /></td>
                                    <td className="p-3 text-sm text-slate-600">{new Date(trx.createdAt).toLocaleDateString()}</td>
                                    <td className="p-3 text-sm font-mono text-slate-700">{trx.tnxId}</td>
                                    <td className="p-3 text-sm text-slate-800 font-medium">{trx.sellerId?.name || 'N/A'}</td>
                                    <td className="p-3 text-sm font-bold text-emerald-600">৳{trx.amount}</td>
                                    <td className="p-3 text-sm text-slate-600">{trx.payType}</td>
                                    <td className="p-3 text-sm text-slate-600">{trx.payeeName}</td>
                                    <td className="p-3 text-sm text-slate-800">{trx.item}</td>
                                    <td className="p-3 text-sm">
                                        <span className={cn("px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider", 
                                            trx.status === 'VALID' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                                            {trx.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center"><button type="button" title="Download this transaction" onClick={() => downloadTransactions([trx], `transaction-${trx.tnxId}.csv`)} className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:bg-blue-50"><Download className="h-4 w-4" /></button></td>
                                </tr>
                            ))}
                            {!trxLoading && transactions.length === 0 && (
                                <tr><td colSpan={10} className="p-6 text-center text-slate-400 font-medium">No transactions found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

        </div>
    );
}
