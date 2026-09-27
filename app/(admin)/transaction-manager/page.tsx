"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Search, ChevronDown, ArrowLeft, Calendar, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { format } from 'date-fns';

export default function TransactionManagerPage() {
    // Manual Promotion State
    const [manualPromote, setManualPromote] = useState({
        productId: '',
        adType: 'Free',
        amount: '',
        runTill: '',
        sellerId: '',
        isVerifyBadge: 'No',
        level: '',
        labels: [] as string[],
        promoteType: 'call_msg',
        trafficLink: ''
    });
    const [manualErrors, setManualErrors] = useState<{
        productId?: string;
        sellerId?: string;
        amount?: string;
        runTill?: string;
        trafficLink?: string;
    }>({});
    const [manualSaving, setManualSaving] = useState(false);

    // Premier Opportunity State for Labels
    const [premierSettings, setPremierSettings] = useState<any>({
        labels: []
    });

    // Transaction Report State
    const [transactions, setTransactions] = useState<any[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Filter States
    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        tnxId: '',
        productId: '',
        sellerMobile: '',
        sellerId: '',
        item: '',
        mode: ''
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalTransactions, setTotalTransactions] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        fetchTransactions(currentPage);
    }, [currentPage]);

    const fetchData = async () => {
        try {
            const token = Cookies.get('adminToken');
            const premierRes = await axios.get(`${API_BASE_URL}/api/premier-opportunity`, {
                headers: { 'Authorization': `Bearer ${token}`, 'x-auth-token': token }
            }).catch(() => null);

            if (premierRes && premierRes.data && premierRes.data.data) {
                const data = premierRes.data.data;
                setPremierSettings({
                    labels: data.labels && data.labels.length > 0 ? data.labels : [{ name: 'Discount', price: 500 }],
                });
            }
        } catch (err) {
            console.error("Fetch error:", err);
        }
    };

    const fetchTransactions = async (page = 1) => {
        setLoading(true);
        try {
            const token = Cookies.get('adminToken');

            const params = new URLSearchParams();
            if (filters.tnxId) params.append('tnxId', filters.tnxId);
            if (filters.productId) params.append('productId', filters.productId);
            if (filters.sellerMobile) params.append('sellerMobile', filters.sellerMobile);
            if (filters.sellerId) params.append('sellerId', filters.sellerId);
            if (filters.item) params.append('item', filters.item);
            if (filters.mode) params.append('mode', filters.mode);
            if (filters.fromDate) params.append('fromDate', filters.fromDate);
            if (filters.toDate) params.append('toDate', filters.toDate);

            params.append('status', 'VALID');
            params.append('page', page.toString());
            params.append('limit', '100');

            const res = await axios.get(`${API_BASE_URL}/api/admins/transactions?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'x-auth-token': token }
            });

            if (res.data.success) {
                setTransactions(res.data.data);
                setFilteredTransactions(res.data.data);
                setCurrentPage(res.data.page || 1);
                setTotalPages(res.data.pages || 1);
                setTotalTransactions(res.data.total || res.data.data.length);
            }
        } catch (err) {
            console.error("Fetch transactions error:", err);
            toast.error("Failed to fetch transactions");
        } finally {
            setLoading(false);
        }
    };

    const handleManualPromote = async () => {
        const productId = manualPromote.productId.trim();
        const sellerId = manualPromote.sellerId.trim();

        const nextErrors: typeof manualErrors = {};

        if (!productId && !sellerId) {
            nextErrors.productId = "Either Product ID or Seller ID is required";
            nextErrors.sellerId = "Either Product ID or Seller ID is required";
        }

        // If Product ID is provided, date + amount are mandatory
        if (productId) {
            if (!manualPromote.runTill) nextErrors.runTill = "Run Till date is required";
            if (!manualPromote.amount.trim()) nextErrors.amount = "Amount is required";
            if (manualPromote.promoteType === 'traffic' && !manualPromote.trafficLink.trim()) {
                nextErrors.trafficLink = "Traffic link is required for Traffic promotion";
            }
        }

        if (Object.keys(nextErrors).length > 0) {
            setManualErrors(nextErrors);
            const firstError = Object.values(nextErrors).find(Boolean);
            if (firstError) toast.error(firstError);
            return;
        }

        setManualErrors({});
        setManualSaving(true);
        try {
            const token = Cookies.get('adminToken');
            const res = await axios.post(`${API_BASE_URL}/api/admins/manual-promote`, manualPromote, {
                headers: { 'Authorization': `Bearer ${token}`, 'x-auth-token': token }
            });
            toast.success(res.data?.message || (productId ? "Ad promoted successfully!" : "Seller verification updated"));
            setManualPromote({ productId: '', adType: 'Free', amount: '', runTill: '', sellerId: '', isVerifyBadge: 'No', level: '', labels: [], promoteType: 'call_msg', trafficLink: '' });
            fetchTransactions(1); // Refresh table
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to promote ad");
        } finally {
            setManualSaving(false);
        }
    };

    const toggleManualLabel = (labelName: string) => {
        setManualPromote(prev => {
            const currentLabels = Array.isArray(prev.labels) ? prev.labels : [];
            const nextLabels = currentLabels.includes(labelName)
                ? currentLabels.filter(l => l !== labelName)
                : [...currentLabels, labelName];

            return {
                ...prev,
                labels: nextLabels,
                level: nextLabels[0] || '' // keep a primary label for backward compatibility
            };
        });
    };

    const handleSearch = () => {
        let result = transactions;

        if (filters.tnxId) {
            result = result.filter(t => t.tnxId?.toLowerCase().includes(filters.tnxId.toLowerCase()));
        }
        if (filters.productId) {
            result = result.filter(t => t.productId?._id?.toLowerCase().includes(filters.productId.toLowerCase()));
        }
        if (filters.sellerMobile) {
            result = result.filter(t => t.mobileNumber?.includes(filters.sellerMobile));
        }
        if (filters.sellerId) {
            result = result.filter(t => t.sellerId?._id?.toLowerCase().includes(filters.sellerId.toLowerCase()));
        }
        if (filters.item) {
            result = result.filter(t => t.item?.toLowerCase().includes(filters.item.toLowerCase()));
        }
        if (filters.mode) {
            result = result.filter(t => t.mode?.toLowerCase().includes(filters.mode.toLowerCase()));
        }
        if (filters.fromDate) {
            const start = new Date(filters.fromDate).setHours(0, 0, 0, 0);
            result = result.filter(t => new Date(t.payTime).getTime() >= start);
        }
        if (filters.toDate) {
            const end = new Date(filters.toDate).setHours(23, 59, 59, 999);
            result = result.filter(t => new Date(t.payTime).getTime() <= end);
        }

        setFilteredTransactions(result);
        setCurrentPage(1);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this transaction?")) return;
        try {
            const token = Cookies.get('adminToken');
            await axios.delete(`${API_BASE_URL}/api/admins/transactions/${id}`, {
                headers: { 'Authorization': `Bearer ${token}`, 'x-auth-token': token }
            });
            toast.success("Transaction deleted");
            fetchTransactions();
        } catch (err) {
            toast.error("Failed to delete transaction");
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.length === 0) return toast.error("No transactions selected");
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} transactions?`)) return;

        try {
            const token = Cookies.get('adminToken');
            await Promise.all(selectedIds.map(id =>
                axios.delete(`${API_BASE_URL}/api/admins/transactions/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}`, 'x-auth-token': token }
                })
            ));
            toast.success("Selected transactions deleted");
            setSelectedIds([]);
            fetchTransactions();
        } catch (err) {
            toast.error("Some deletions failed");
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredTransactions.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredTransactions.map(t => t._id));
        }
    };

    return (
        <div className="bg-[#f1f5f9] min-h-screen p-3 text-xs">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="text-rose-500 bg-white p-1 rounded-sm border border-slate-200 block">
                        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={3} />
                    </Link>
                    <h1 className="text-sm font-bold text-blue-700 uppercase tracking-tight">Transaction Manager</h1>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* Manual Promotion Section */}
                <div className="bg-white/50 p-3 rounded-sm border border-slate-100 max-w-3xl">
                    <h2 className="text-xs font-bold text-black mb-2 flex items-center gap-1.5 uppercase">
                        Promote Manually
                    </h2>

                    <div className="grid grid-cols-4 gap-3 mb-3">
                        <div className="space-y-2">
                            <div className="relative">
                                 <input
                                     placeholder="Product ID"
                                     className={`w-full border ${manualErrors.productId ? 'border-red-500' : 'border-slate-300'} px-2 h-8 outline-none text-xs placeholder:font-normal bg-white`}
                                     value={manualPromote.productId}
                                     onChange={(e) => {
                                         setManualPromote({ ...manualPromote, productId: e.target.value });
                                         setManualErrors(prev => ({ ...prev, productId: undefined }));
                                     }}
                                 />
                                 <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-600" />
                             </div>
                             <input
                                 placeholder="Seller ID For Verify Badge"
                                 className={`w-full border ${manualErrors.sellerId ? 'border-red-500' : 'border-slate-300'} px-2 h-8 outline-none text-xs placeholder:font-normal bg-white`}
                                 value={manualPromote.sellerId}
                                 onChange={(e) => {
                                     setManualPromote({ ...manualPromote, sellerId: e.target.value });
                                     setManualErrors(prev => ({ ...prev, sellerId: undefined }));
                                 }}
                             />
                         </div>

                         <div className="space-y-2">
                             <div className="relative">
                                 <input
                                     type="date"
                                     className={`w-full border ${manualErrors.runTill ? 'border-red-500' : 'border-slate-300'} px-2 h-8 outline-none text-xs bg-white text-slate-500 appearance-none uppercase`}
                                     value={manualPromote.runTill}
                                     onChange={(e) => {
                                         setManualPromote({ ...manualPromote, runTill: e.target.value });
                                         setManualErrors(prev => ({ ...prev, runTill: undefined }));
                                     }}
                                 />
                             </div>
                             <div className="relative">
                                 <select
                                    className="w-full border border-slate-300 px-2 h-8 outline-none text-xs bg-white text-slate-500 appearance-none"
                                    value={manualPromote.isVerifyBadge}
                                    onChange={(e) => setManualPromote({ ...manualPromote, isVerifyBadge: e.target.value })}
                                >
                                    <option value="" disabled>Verify Badge Yes/No</option>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black pointer-events-none" />
                            </div>
                        </div>

                         <div className="space-y-2">
                             <input
                                 placeholder="Amount"
                                 className={`w-full border ${manualErrors.amount ? 'border-red-500' : 'border-slate-300'} px-2 h-8 outline-none text-xs placeholder:font-normal bg-white`}
                                 value={manualPromote.amount}
                                 onChange={(e) => {
                                     setManualPromote({ ...manualPromote, amount: e.target.value });
                                     setManualErrors(prev => ({ ...prev, amount: undefined }));
                                 }}
                             />
                             <div className="border border-slate-300 bg-white px-2 py-1.5 rounded-[1px]">
                                 <div className="flex items-center justify-between mb-1">
                                     <span className="text-[11px] font-bold text-slate-700 uppercase">Labels</span>
                                     <span className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                        {manualPromote.labels?.length ? manualPromote.labels.join(', ') : 'None'}
                                    </span>
                                </div>
                                <div className="max-h-20 overflow-auto pr-1 space-y-1">
                                    {premierSettings.labels?.map((label: any) => {
                                        const labelName = String(label?.name || '').trim();
                                        if (!labelName) return null;
                                        const checked = Array.isArray(manualPromote.labels) && manualPromote.labels.includes(labelName);
                                        return (
                                            <label key={labelName} className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    className="w-3 h-3"
                                                    checked={checked}
                                                    onChange={() => toggleManualLabel(labelName)}
                                                />
                                                <span className="text-[11px] text-slate-700">{labelName}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="relative">
                                <select
                                    className="w-full border border-slate-300 px-2 h-8 outline-none text-xs bg-white text-slate-500 appearance-none"
                                    value={manualPromote.promoteType}
                                    onChange={(e) => setManualPromote({ ...manualPromote, promoteType: e.target.value })}
                                >
                                    <option value="" disabled>Promote Type</option>
                                    <option value="call_msg">Call & Message</option>
                                    <option value="traffic">Traffic</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black pointer-events-none" />
                            </div>
                             {manualPromote.promoteType === 'traffic' && (
                                 <input
                                     placeholder="Link (If Select Traffic)"
                                     className={`w-full border ${manualErrors.trafficLink ? 'border-red-500' : 'border-slate-300'} px-2 h-8 outline-none text-xs placeholder:font-normal bg-white`}
                                     value={manualPromote.trafficLink}
                                     onChange={(e) => {
                                         setManualPromote({ ...manualPromote, trafficLink: e.target.value });
                                         setManualErrors(prev => ({ ...prev, trafficLink: undefined }));
                                     }}
                                 />
                             )}
                         </div>
                     </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleManualPromote}
                            disabled={manualSaving}
                            className="bg-[#00a65a] text-white px-5 py-1.5 rounded-[1px] font-bold text-xs shadow-sm hover:bg-[#008d4c] uppercase flex items-center gap-2 disabled:bg-slate-300"
                        >
                            {manualSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                            onClick={() => setManualPromote({ productId: '', adType: 'Free', amount: '', runTill: '', sellerId: '', isVerifyBadge: 'No', level: '', labels: [], promoteType: 'call_msg', trafficLink: '' })}
                            className="bg-white border border-slate-300 text-black px-5 py-1.5 rounded-[1px] font-bold text-xs shadow-sm hover:bg-slate-50 uppercase"
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                {/* Transaction Report Section */}
                <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden flex flex-col">
                    <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-xs font-bold text-black uppercase">Transaction Report ({totalTransactions})</h2>
                    </div>

                    {/* Filters */}
                    <div className="p-3 flex items-center gap-2 flex-wrap border-b border-slate-100 bg-white">
                        <button
                            onClick={handleBatchDelete}
                            className="p-1.5 border border-slate-300 rounded-sm bg-slate-100 hover:bg-slate-200"
                            title="Delete Selected"
                        >
                            <Trash2 className="w-3.5 h-3.5 text-black" />
                        </button>

                        <div className="flex items-center gap-2 border border-slate-200 rounded-sm bg-white px-2 h-9">
                            <span className="text-slate-500 shrink-0">From Date</span>
                            <input
                                type="date"
                                className="outline-none text-xs w-28 bg-transparent"
                                value={filters.fromDate}
                                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                            />
                        </div>

                        <div className="flex items-center gap-2 border border-slate-200 rounded-sm bg-white px-2 h-9">
                            <span className="text-slate-500 shrink-0">To Date</span>
                            <input
                                type="date"
                                className="outline-none text-xs w-28 bg-transparent"
                                value={filters.toDate}
                                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                            />
                        </div>

                        <input
                            placeholder="Txn ID..."
                            className="h-9 border border-slate-300 px-3 outline-none text-xs w-32 bg-white"
                            value={filters.tnxId}
                            onChange={(e) => setFilters({ ...filters, tnxId: e.target.value })}
                        />
                        <input
                            placeholder="Product ID"
                            className="h-9 border border-slate-300 px-3 outline-none text-xs w-32 bg-white"
                            value={filters.productId}
                            onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
                        />
                        <input
                            placeholder="Seller Mobile"
                            className="h-9 border border-slate-300 px-3 outline-none text-xs w-32 bg-white"
                            value={filters.sellerMobile}
                            onChange={(e) => setFilters({ ...filters, sellerMobile: e.target.value })}
                        />
                        <input
                            placeholder="Seller ID"
                            className="h-9 border border-slate-300 px-3 outline-none text-xs w-28 bg-white"
                            value={filters.sellerId}
                            onChange={(e) => setFilters({ ...filters, sellerId: e.target.value })}
                        />
                        <input
                            placeholder="Item"
                            className="h-9 border border-slate-300 px-3 outline-none text-xs w-28 bg-white"
                            value={filters.item}
                            onChange={(e) => setFilters({ ...filters, item: e.target.value })}
                        />
                        <input
                            placeholder="Trx Mode"
                            className="h-9 border border-slate-300 px-3 outline-none text-xs w-28 bg-white"
                            value={filters.mode}
                            onChange={(e) => setFilters({ ...filters, mode: e.target.value })}
                        />

                        <button
                            onClick={handleSearch}
                            className="bg-[#00a65a] text-white px-4 h-9 rounded-sm font-bold text-xs uppercase flex items-center gap-2 shadow-sm hover:bg-emerald-700 ml-auto"
                        >
                            <Search className="w-3.5 h-3.5" />
                            Search
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto min-h-[400px]">
                        {loading ? (
                            <div className="p-10 text-center text-slate-500">Loading transactions...</div>
                        ) : (
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="text-left bg-slate-50/50 border-b border-slate-100">
                                        <th className="p-2 w-10 text-center">
                                            <input
                                                type="checkbox"
                                                className="w-3 h-3"
                                                checked={filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="p-2 text-black border-r border-slate-100">Tnx ID</th>
                                        <th className="p-2 text-black border-r border-slate-100 text-center">Trx Mode</th>
                                        <th className="p-2 text-black border-r border-slate-100 text-center">Seller ID</th>
                                        <th className="p-2 text-black border-r border-slate-100 text-center">Product ID</th>
                                        <th className="p-2 text-black border-r border-slate-100 text-center">Mobile Number</th>
                                        <th className="p-2 text-black border-r border-slate-100 text-center">Amount</th>
                                        <th className="p-2 text-black border-r border-slate-100 text-center">Pay Type</th>
                                        <th className="p-2 text-black border-r border-slate-100">Payee Name</th>
                                        <th className="p-2 text-black border-r border-slate-100">Item</th>
                                        <th className="p-2 text-black border-r border-slate-100 whitespace-nowrap">Pay Time</th>
                                        <th className="p-2 text-black text-center whitespace-nowrap">Status</th>
                                        <th className="p-2 text-black text-center whitespace-nowrap">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredTransactions.map((row) => (
                                        <tr key={row._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-3 h-3"
                                                    checked={selectedIds.includes(row._id)}
                                                    onChange={() => toggleSelect(row._id)}
                                                />
                                            </td>
                                            <td className="p-2 font-mono text-[11px] text-slate-600 border-r border-slate-100">{row.tnxId}</td>
                                            <td className="p-2 text-center text-slate-700 border-r border-slate-100">{row.mode}</td>
                                            <td className="p-2 text-center text-slate-700 border-r border-slate-100" title={row.sellerId?._id}>
                                                {row.sellerId?._id || '----'}
                                            </td>
                                            <td className="p-2 text-center text-slate-700 border-r border-slate-100" title={row.productId?._id}>
                                                {row.productId?._id || '----'}
                                            </td>
                                            <td className="p-2 text-center text-slate-700 border-r border-slate-100">{row.mobileNumber}</td>
                                            <td className="p-2 text-center font-bold text-slate-800 border-r border-slate-100">Tk. {row.amount}</td>
                                            <td className="p-2 text-center text-slate-700 border-r border-slate-100">{row.payType}</td>
                                            <td className="p-2 text-blue-600 border-r border-slate-100">{row.payeeName}</td>
                                            <td className="p-2 text-slate-700 border-r border-slate-100">{row.item}</td>
                                            <td className="p-2 text-[11px] text-slate-600 border-r border-slate-100 whitespace-nowrap">
                                                {row.payTime ? format(new Date(row.payTime), 'yyyy-MM-dd HH:mm:ss') : '----'}
                                            </td>
                                            <td className="p-2 text-center">
                                                <span className={`${row.status === 'VALID' ? 'bg-emerald-600' :
                                                    row.status === 'FAILED' ? 'bg-rose-600' :
                                                        row.status === 'CANCELLED' ? 'bg-amber-600' : 'bg-slate-400'
                                                    } text-white px-2 py-0.5 rounded-[1px] text-[10px] font-bold`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="p-2 text-center">
                                                <button
                                                    onClick={() => handleDelete(row._id)}
                                                    className="p-1 hover:bg-rose-50 text-rose-500 rounded"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTransactions.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={13} className="p-10 text-center text-slate-500">No transactions found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between p-2 border-t border-slate-200 bg-white shadow-inner">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || loading}
                            className={`px-6 py-1.5 text-[10px] font-bold rounded-sm border shadow-sm transition-colors ${currentPage === 1 || loading
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                                }`}
                        >
                            Previous
                        </button>
                        <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-3 py-1.5 rounded-sm border border-slate-200">
                            Page {currentPage} of {totalPages || 1}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage >= totalPages || loading}
                            className={`px-6 py-1.5 text-[10px] font-bold rounded-sm border shadow-sm transition-colors ${currentPage >= totalPages || loading
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                                }`}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>


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
