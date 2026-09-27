"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Search, Trash2, Check,
    ChevronDown, ChevronUp, Send, Loader2, AlertCircle, Trash,
    Trash2Icon,
    X
} from 'lucide-react';
import Cookies from 'js-cookie';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { API_BASE_URL } from '../../../utils/apiConfig';
import { getImageUrl } from '../../../utils/imageUrl';
import toast from 'react-hot-toast';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const API_BASE = `${API_BASE_URL}/api/reports`;

export default function ReportManagement() {
    const [groupedReports, setGroupedReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedAds, setExpandedAds] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [categories, setCategories] = useState<any[]>([]);
    const [notifyMessages, setNotifyMessages] = useState<Record<string, string>>({});
    const [limit, setLimit] = useState(100);
    const [selectedAds, setSelectedAds] = useState<string[]>([]);
    const [selectedReports, setSelectedReports] = useState<string[]>([]);

    const [searchFilters, setSearchFilters] = useState({
        userId: '',
        productId: '',
        mobile: '',
        category: 'Select',
        cusSeller: 'Select'
    });

    useEffect(() => {
        fetchMeta();
        fetchReports();
    }, [statusFilter, currentPage, limit]);

    const fetchMeta = async () => {
        try {
            const catRes = await axios.get(`${API_BASE_URL}/api/categories`);
            setCategories(catRes.data.data || []);
        } catch (err) {
            console.error("Failed to fetch categories", err);
        }
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = Cookies.get('adminToken');
            const params = new URLSearchParams();

            if (statusFilter !== 'All') params.append('status', statusFilter);
            params.append('page', currentPage.toString());
            params.append('limit', limit.toString());

            Object.entries(searchFilters).forEach(([key, value]) => {
                if (value && value !== 'Select') {
                    params.append(key, value);
                }
            });

            const res = await axios.get(`${API_BASE}?${params.toString()}`, {
                headers: { 'x-auth-token': token }
            });

            if (res.data.success) {
                setGroupedReports(res.data.data);
                setTotalPages(res.data.pages || 1);
                setTotalItems(res.data.total || 0);
            }
        } catch (err) {
            console.error("Failed to fetch reports", err);
            toast.error("Failed to fetch reports");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setCurrentPage(1);
        fetchReports();
    };

    const toggleExpandAd = (adId: string) => {
        setExpandedAds(prev =>
            prev.includes(adId) ? prev.filter(id => id !== adId) : [...prev, adId]
        );
    };

    const handleDeleteAdReports = async (adId: string) => {
        if (!confirm("Are you sure you want to delete all reports for this ad?")) return;
        try {
            const token = Cookies.get('adminToken');
            await axios.delete(`${API_BASE}/${adId}?deleteAllForAd=true`, {
                headers: { 'x-auth-token': token }
            });
            toast.success("Reports deleted");
            fetchReports();
        } catch (err) {
            toast.error("Failed to delete reports");
        }
    };

    const handleDeleteSingleReport = async (reportId: string, adId: string) => {
        if (!confirm("Are you sure you want to delete this report?")) return;
        try {
            const token = Cookies.get('adminToken');
            await axios.delete(`${API_BASE}/${reportId}`, {
                headers: { 'x-auth-token': token }
            });
            toast.success("Report deleted");
            fetchReports();
        } catch (err) {
            toast.error("Failed to delete report");
        }
    };

    const handleSendNotify = async (targetUserMobile: string, targetType: 'reporter' | 'owner') => {
        const message = notifyMessages[`${targetUserMobile}-${targetType}`];
        if (!message) {
            toast.error("Please enter a message");
            return;
        }

        try {
            const token = Cookies.get('adminToken');
            await axios.post(`${API_BASE_URL}/api/admins/notifications/send`, {
                userType: 'Selected',
                selectedUsers: [targetUserMobile],
                message: message,
                sendIn: ['Account']
            }, {
                headers: { 'x-auth-token': token }
            });

            toast.success("Notification sent!");
            setNotifyMessages(prev => {
                const updated = { ...prev };
                delete updated[`${targetUserMobile}-${targetType}`];
                return updated;
            });
        } catch (err) {
            console.error("Failed to send notification", err);
            toast.error("Failed to send notification");
        }
    };

    const handleBulkDelete = async () => {
        const total = selectedAds.length + selectedReports.length;
        if (total === 0) return;
        if (!confirm(`Are you sure you want to delete ${total} selected item(s)?`)) return;

        try {
            const token = Cookies.get('adminToken');

            // Delete all reports for selected Ads
            if (selectedAds.length > 0) {
                await Promise.all(selectedAds.map(adId =>
                    axios.delete(`${API_BASE}/${adId}?deleteAllForAd=true`, {
                        headers: { 'x-auth-token': token }
                    })
                ));
            }

            // Delete individual selected Reports
            if (selectedReports.length > 0) {
                await Promise.all(selectedReports.map(id =>
                    axios.delete(`${API_BASE}/${id}`, {
                        headers: { 'x-auth-token': token }
                    })
                ));
            }

            toast.success("Items deleted successfully");
            setSelectedAds([]);
            setSelectedReports([]);
            fetchReports();
        } catch (err) {
            console.error("Bulk delete failed", err);
            toast.error("Failed to delete some items");
        }
    };

    const toggleSelectAd = (adId: string) => {
        setSelectedAds(prev =>
            prev.includes(adId) ? prev.filter(id => id !== adId) : [...prev, adId]
        );
    };

    const toggleSelectReport = (reportId: string) => {
        setSelectedReports(prev =>
            prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId]
        );
    };

    const toggleSelectAllAds = () => {
        if (selectedAds.length === groupedReports.length) {
            setSelectedAds([]);
        } else {
            setSelectedAds(groupedReports.map(item => item.ad._id));
        }
    };

    const statsConfig = [
        { label: 'All', color: 'bg-slate-500 text-white' },
        { label: 'Sold', color: 'bg-emerald-600 text-white' },
        { label: 'Fraud', color: 'bg-slate-400 text-white' },
        { label: 'Duplicate', color: 'bg-orange-500 text-white' },
        { label: 'Spam', color: 'bg-rose-500 text-white' },
        { label: 'Wrong Catagorie', color: 'bg-[#1e1b4b] text-white' },
        { label: 'Others', color: 'bg-slate-400 text-white' },
        { label: 'Maximum Report', color: 'bg-[#4f46e5] text-white' },
    ];

    return (
        <div className="bg-[#f1f5f9] min-h-screen font-['Tahoma','Verdana',sans-serif] text-xs p-2 flex flex-col gap-2">
            <h1 className="text-sm font-bold text-slate-700 uppercase tracking-wider px-1">Report Management</h1>

            {/* Search Filters */}
            <div className="bg-white border border-slate-200 p-2 rounded-sm shadow-sm flex flex-wrap items-center gap-3">
                <div className="flex bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 focus-within:border-blue-400 transition-colors">
                    <input
                        placeholder="User ID"
                        className="bg-transparent outline-none w-24"
                        value={searchFilters.userId}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, userId: e.target.value }))}
                    />
                </div>
                <div className="flex bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 focus-within:border-blue-400 transition-colors">
                    <input
                        placeholder="Product ID"
                        className="bg-transparent outline-none w-24"
                        value={searchFilters.productId}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, productId: e.target.value }))}
                    />
                </div>
                <div className="flex bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 focus-within:border-blue-400 transition-colors">
                    <input
                        placeholder="Mobile"
                        className="bg-transparent outline-none w-28"
                        value={searchFilters.mobile}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, mobile: e.target.value }))}
                    />
                </div>

                <div className="flex bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 focus-within:border-blue-400 transition-colors">
                    <select
                        className="bg-transparent outline-none w-24 cursor-pointer"
                        value={searchFilters.category}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, category: e.target.value }))}
                    >
                        <option>Categorie</option>
                        {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>

                {/* <div className="flex bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 focus-within:border-blue-400 transition-colors">
                    <select 
                        className="border border-slate-200 rounded px-1 py-0.5 outline-none bg-slate-50 text-[10px] font-bold cursor-pointer"
                        value={limit}
                        onChange={(e) => {
                            setLimit(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div> */}

                <button
                    onClick={handleSearch}
                    className="bg-black text-white px-8 py-1.5 rounded-full font-bold hover:bg-slate-800 transition-colors"
                >
                    Search
                </button>
            </div>

            {/* Tabs & Batch Actions */}
            <div className="flex items-center justify-between px-1">
                <div className="flex flex-wrap items-center gap-1.5">
                    {statsConfig.map((tab) => (
                        <button
                            key={tab.label}
                            onClick={() => {
                                setStatusFilter(tab.label);
                                setCurrentPage(1);
                            }}
                            className={cn(
                                "px-3 py-1 rounded-full font-bold text-[10px] border transition-all",
                                statusFilter === tab.label
                                    ? `${tab.color} border-transparent ring-2 ring-offset-1 ring-slate-400`
                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                            )}
                        >
                            {tab.label}
                            {tab.label === 'All' && ` (${totalItems})`}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {(selectedAds.length > 0 || selectedReports.length > 0) && (
                        <button
                            onClick={handleBulkDelete}
                            className="p-1.5 bg-rose-600 text-white rounded-sm hover:bg-rose-700 transition-all scale-110 shadow-lg"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Reports Table */}
            <div className="bg-[#1e293b] rounded-t-sm shadow-sm overflow-hidden border border-slate-800">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="text-[10px] text-white uppercase tracking-tight font-medium bg-[#1e293b]">
                            <th className="w-10 px-2 py-2 text-left border-r border-slate-700">
                                <input
                                    type="checkbox"
                                    className="w-3 h-3 accent-slate-600 cursor-pointer"
                                    checked={groupedReports.length > 0 && selectedAds.length === groupedReports.length}
                                    onChange={toggleSelectAllAds}
                                />
                            </th>
                            <th className="px-2 py-2 text-left border-r border-slate-700">Product Title</th>
                            <th className="px-2 py-2 text-left border-r border-slate-700">Price/Sallery</th>
                            <th className="px-2 py-2 text-left border-r border-slate-700">Categorie</th>
                            <th className="px-2 py-2 text-left border-r border-slate-700">Product ID</th>
                            <th className="px-2 py-2 text-left border-r border-slate-700">Seller Number</th>
                            <th className="px-2 py-2 text-left border-r border-slate-700">Report Reason</th>
                            <th className="px-2 py-2 text-left border-r border-slate-700">Product Entry</th>
                            <th className="px-2 py-2 text-left border-r border-slate-700">Post Ad</th>
                            <th className="px-2 py-2 text-left">Notify</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {loading ? (
                            <tr>
                                <td colSpan={10} className="py-20 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                                </td>
                            </tr>
                        ) : groupedReports.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="py-10 text-center text-slate-400 italic">
                                    No reports found matching your criteria.
                                </td>
                            </tr>
                        ) : groupedReports.map((item, idx) => (
                            <React.Fragment key={item.ad._id}>
                                <tr className={cn("border-b border-slate-100 group cursor-pointer hover:bg-slate-50 transition-colors", expandedAds.includes(item.ad._id) && "bg-slate-50")}>
                                    <td className="px-2 py-2 border-r border-slate-100 text-center">
                                        <input
                                            type="checkbox"
                                            className="w-3 h-3 accent-blue-600 cursor-pointer"
                                            checked={selectedAds.includes(item.ad._id)}
                                            onChange={() => toggleSelectAd(item.ad._id)}
                                        />
                                    </td>
                                    <td className="px-2 py-2 border-r border-slate-100" onClick={() => toggleExpandAd(item.ad._id)}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-6 bg-slate-900 rounded overflow-hidden flex items-center justify-center shrink-0">
                                                {item.ad.images?.[0] ? (
                                                    <img src={getImageUrl(item.ad.images[0])} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-800" />
                                                )}
                                            </div>
                                            <span className="flex-1 truncate max-w-[180px] font-medium text-slate-800">{item.ad.headline}</span>
                                            {expandedAds.includes(item.ad._id) ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                                        </div>
                                    </td>
                                    <td className="px-2 py-2 border-r border-slate-100 text-slate-700 font-medium">৳{item.ad.price}</td>
                                    <td className="px-2 py-2 border-r border-slate-100 text-slate-600">{item.ad.category}</td>
                                    <td className="px-2 py-2 border-r border-slate-100 text-slate-500 font-mono text-[9px]">{item.ad._id}</td>
                                    <td className="px-2 py-2 border-r border-slate-100 text-slate-700 font-medium">{item.ad.user?.mobile || item.ad.phone}</td>
                                    <td className="px-2 py-2 border-r border-slate-100">
                                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-sm font-bold border border-rose-100">{item.mainReason}</span>
                                    </td>
                                    <td className="px-2 py-2 border-r border-slate-100 text-slate-500">
                                        {new Date(item.ad.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-2 py-2 border-r border-slate-100 text-center text-slate-700 font-bold">
                                        {item.owner?.totalPostAd || 0}
                                    </td>
                                    <td className="px-2 py-2">
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex-1 flex bg-slate-50 border border-slate-200 rounded-full px-3 py-1 items-center">
                                                <input
                                                    className="bg-transparent outline-none w-full text-[10px]"
                                                    placeholder="Send notification..."
                                                    value={notifyMessages[`${item.ad.user?.mobile || item.ad.phone}-owner`] || ''}
                                                    onChange={(e) => setNotifyMessages(prev => ({ ...prev, [`${item.ad.user?.mobile || item.ad.phone}-owner`]: e.target.value }))}
                                                />
                                            </div>
                                            <button
                                                onClick={() => handleSendNotify(item.ad.user?.mobile || item.ad.phone, 'owner')}
                                                className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-black transition-colors"
                                            >
                                                <Send className="w-3 h-3 ml-0.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {/* Expanded Inner Table for Reporters */}
                                {expandedAds.includes(item.ad._id) && (
                                    <tr>
                                        <td colSpan={10} className="bg-slate-50/50 p-2 pl-12 border-b border-slate-200 shadow-inner">
                                            <div className="bg-white border border-blue-100 rounded-sm overflow-hidden shadow-sm">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="bg-slate-50 text-[9px] text-slate-500 uppercase font-bold border-b border-slate-100">
                                                            <th className="w-8 px-2 py-1.5">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-3 h-3 cursor-pointer"
                                                                    checked={item.reporters.every((r: any) => selectedReports.includes(r.reportId))}
                                                                    onChange={() => {
                                                                        const allIds = item.reporters.map((r: any) => r.reportId);
                                                                        const isAllSelected = allIds.every((id: string) => selectedReports.includes(id));
                                                                        if (isAllSelected) {
                                                                            setSelectedReports(prev => prev.filter(id => !allIds.includes(id)));
                                                                        } else {
                                                                            setSelectedReports(prev => [...new Set([...prev, ...allIds])]);
                                                                        }
                                                                    }}
                                                                />
                                                            </th>
                                                            <th className="px-2 py-1.5 text-left">Name</th>
                                                            <th className="px-2 py-1.5 text-left">Reporter ID</th>
                                                            <th className="px-2 py-1.5 text-left">Mobile/Email</th>
                                                            <th className="px-2 py-1.5 text-center">Post Ad</th>
                                                            <th className="px-2 py-1.5 text-left">User From</th>
                                                            {/* <th className="px-2 py-1.5 text-left">Total Report</th>
                                                            <th className="px-2 py-1.5 text-left">Post Ad</th> */}
                                                            <th className="px-2 py-1.5 text-left">Notify</th>
                                                            <th className="w-10"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {item.reporters.map((rep: any) => (
                                                            <tr key={rep.reportId} className="hover:bg-blue-50/30 transition-colors">
                                                                <td className="px-2 py-1.5 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-3 h-3 cursor-pointer"
                                                                        checked={selectedReports.includes(rep.reportId)}
                                                                        onChange={() => toggleSelectReport(rep.reportId)}
                                                                    />
                                                                </td>
                                                                <td className="px-2 py-1.5">
                                                                    <div className="flex items-center gap-2">
                                                                        {/* <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center border border-slate-100">
                                                                            <User className="w-3 h-3 text-slate-400" />
                                                                        </div> */}
                                                                        <span className="font-bold text-slate-700">{rep.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-2 py-1.5 font-mono text-slate-400 text-[9px]">{rep._id}</td>
                                                                <td className="px-2 py-1.5">
                                                                    <div className="flex flex-col leading-tight">
                                                                        <span className="text-slate-800 font-medium">{rep.mobile}</span>
                                                                        <span className="text-slate-400 text-[9px]">{rep.email}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-2 py-1.5 text-center text-slate-700 font-bold">
                                                                    {rep.totalPostAd || 0}
                                                                </td>
                                                                <td className="px-2 py-1.5 text-slate-500">
                                                                    {new Date(rep.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                                </td>
                                                                {/* <td className="px-2 py-1.5 text-center text-slate-700 font-bold">{rep.totalReport || 0}</td> */}
                                                                {/* <td className="px-2 py-1.5 text-center text-slate-700 font-bold">2</td> */}
                                                                <td className="px-2 py-1.5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="flex-1 flex bg-slate-50 border border-slate-100 rounded-full px-3 py-0.5 items-center">
                                                                            <input
                                                                                className="bg-transparent outline-none w-full text-[10px]"
                                                                                placeholder="Notify reporter..."
                                                                                value={notifyMessages[`${rep.mobile}-reporter`] || ''}
                                                                                onChange={(e) => setNotifyMessages(prev => ({ ...prev, [`${rep.mobile}-reporter`]: e.target.value }))}
                                                                            />
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleSendNotify(rep.mobile, 'reporter')}
                                                                            className="w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center hover:bg-black transition-colors"
                                                                        >
                                                                            <Send className="w-2.5 h-2.5 ml-0.5" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                                <td className="px-2 py-1.5 flex gap-1">
                                                                    <button onClick={() => handleDeleteSingleReport(rep.reportId, item.ad._id)} className="text-rose-500 hover:text-rose-700 transition-colors">
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-2 border border-slate-200 bg-white rounded-b-sm shadow-sm mt-auto">
                <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || loading}
                    className={cn("px-6 py-1.5 text-xs font-bold rounded-sm border shadow-sm transition-colors", currentPage === 1 || loading ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50")}
                >
                    Previous
                </button>
                <span className="text-xs text-slate-600 font-bold bg-slate-100 px-3 py-1.5 rounded-sm border border-slate-200">
                    Page {currentPage} of {totalPages || 1}
                </span>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages || loading}
                    className={cn("px-6 py-1.5 text-xs font-bold rounded-sm border shadow-sm transition-colors", currentPage >= totalPages || loading ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50")}
                >
                    Next
                </button>
            </div>
        </div>
    );
}

function User({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    )
}
