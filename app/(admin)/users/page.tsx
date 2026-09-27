"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, User, Plus, Search, Edit2, Trash2, X, Check,
    MoreHorizontal, MapPin, Tag, ShieldCheck, Mail,
    Phone, Store, Calendar, HelpCircle, Loader2, AlertCircle,
    ArrowLeft, XCircle, PlusCircle, MessageSquare, ImageIcon,
    Minus, CheckCircle2, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { API_BASE_URL } from '../../../utils/apiConfig';
import { getImageUrl } from '../../../utils/imageUrl';
import toast from 'react-hot-toast';
import { RiCheckboxCircleFill } from 'react-icons/ri';

const VerifiedBadge = () => (
    <div className="relative group/badge flex items-center justify-center -mt-0.5 ml-1">
        <RiCheckboxCircleFill className="w-4 h-4 text-[#0088cc] shrink-0 cursor-pointer" />
        <div className="absolute bottom-full left-1/2 -translate-x-[20%] lg:-translate-x-1/2 mb-2 hidden group-hover/badge:block w-[190px] bg-white/95 backdrop-blur-[2px] border border-slate-200/90 shadow-[0_12px_26px_rgba(15,23,42,0.16)] rounded-xl px-2.5 py-2 z-[100] animate-in fade-in zoom-in-95 duration-200 pointer-events-none text-left">
            <p className="text-[12px] text-slate-700 font-medium leading-[1.15] whitespace-normal break-words normal-case">
                <span className="font-bold text-black">Verified</span> by mobile number & additional checks to ensure authenticity.
            </p>
            <div className="absolute top-full left-[20%] lg:left-1/2 -translate-x-1/2 -mt-[1px]">
                <div className="w-3 h-3 bg-white border-b border-r border-slate-200 transform rotate-45" />
            </div>
        </div>
    </div>
);

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const API_BASE = `${API_BASE_URL}/api/admins/users`;
const WEBSITE_BASE_URL = 'https://shadamon.com';
// const WEBSITE_BASE_URL = 'http://localhost:3001';

interface UserFormData {
    name: string;
    email: string;
    password?: string;
    dob: string;
    gender: string;
    mobile: string;
    mobileVerified: boolean;
    education: string;
    currentJob: string;
    jobExperience: string;
    note: string;
    storeName: string;
    accountStatus: string;
    verifiedBy: string;
    location: string;
    category: string;
    sellerPageUrl: string;
    merchantType: string;
    rating: number | string;
    storeBannerStatus: string;
    storeLogoStatus: string;
    photoStatus: string;
    photo?: string;
    storeLogo?: string;
    storeBanner?: string;
    mVerified: boolean;
    merchantTrustStatus: string;
    additionalMobiles?: string[];
    lastLogin?: string;
}

export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [userTypeFilter, setUserTypeFilter] = useState('both');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [loginAsLoadingUserId, setLoginAsLoadingUserId] = useState<string | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File }>({});
    const [locations, setLocations] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [searchFilters, setSearchFilters] = useState({
        id: '',
        mobile: '',
        email: '',
        category: 'Select',
        location: 'Select',
        status: 'Select',
        merchantType: 'both',
        dateFrom: '',
        dateTo: ''
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    const [formData, setFormData] = useState<UserFormData>({
        name: '',
        email: '',
        password: '',
        dob: '',
        gender: '',
        mobile: '',
        mobileVerified: true,
        education: '',
        currentJob: '',
        jobExperience: '',
        note: '',
        storeName: '',
        accountStatus: 'review',
        verifiedBy: 'Not Verified',
        location: '',
        category: '',
        sellerPageUrl: '',
        merchantType: 'Free',
        rating: '',
        storeBannerStatus: 'pending',
        storeLogoStatus: 'pending',
        photoStatus: 'pending',
        photo: '',
        storeLogo: '',
        storeBanner: '',
        mVerified: false,
        merchantTrustStatus: 'Untrusted',
        additionalMobiles: [],
        lastLogin: ''
    });
    const [tempMobile, setTempMobile] = useState('');

    useEffect(() => {
        fetchMeta();
    }, []);

    useEffect(() => {
        fetchUsers(searchFilters, currentPage);
    }, [currentPage]);

    const fetchMeta = async () => {
        try {
            const [locRes, catRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/locations`),
                axios.get(`${API_BASE_URL}/api/categories`)
            ]);
            setLocations((locRes.data.data || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
            setCategories((catRes.data.data || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
        } catch (err) {
            console.error("Failed to fetch meta data", err);
        }
    };

    const fetchUsers = async (filters: any = searchFilters, page = 1) => {
        setLoading(true);
        try {
            const token = Cookies.get('adminToken');
            const params = new URLSearchParams();

            Object.entries(filters).forEach(([key, value]) => {
                if (value && value !== 'Select' && value !== 'Both' && value !== 'All' && value !== 'both') {
                    params.append(key, String(value));
                }
            });

            params.append('page', page.toString());
            params.append('limit', '100');

            const res = await axios.get(`${API_BASE}?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data && res.data.success) {
                setUsers(res.data.data);
                setTotalPages(res.data.pages || 1);
                setCurrentPage(res.data.page || 1);
                setTotalUsers(res.data.total || res.data.data.length);
            } else {
                setUsers(res.data); // Fallback if backend hasn't updated or different format
                setTotalUsers(res.data.length || 0);
            }
        } catch (err: any) {
            console.error("Failed to fetch users", err);
            setError(`Failed to fetch users: ${err.message}`);
        } finally {
            setLoading(false);
            setSelectedUsers([]);
        }
    };

    const handleOpenModal = (user: any = null) => {
        setError('');
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name || '',
                email: user.email || '',
                password: '',
                dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
                gender: user.gender || '',
                mobile: user.mobile || '',
                mobileVerified: user.mobileVerified ?? true,
                education: user.education || '',
                currentJob: user.currentJob || '',
                jobExperience: user.jobExperience || '',
                note: user.note || '',
                storeName: user.storeName || '',
                accountStatus: user.accountStatus || 'review',
                verifiedBy: user.verifiedBy || 'Not Verified',
                location: user.location || '',
                category: user.category || '',
                sellerPageUrl: user.sellerPageUrl || '',
                merchantType: user.merchantType || 'Free',
                rating: user.rating || '',
                storeBannerStatus: user.storeBannerStatus || 'pending',
                storeLogoStatus: user.storeLogoStatus || 'pending',
                photoStatus: user.photoStatus || 'pending',
                photo: user.photo || '',
                storeLogo: user.storeLogo || '',
                storeBanner: user.storeBanner || '',
                mVerified: user.mVerified ?? false,
                merchantTrustStatus: user.merchantTrustStatus || 'Untrusted',
                additionalMobiles: user.additionalMobiles || [],
                lastLogin: user.lastLogin || ''
            });
            setTempMobile('');
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                dob: '',
                gender: '',
                mobile: '',
                mobileVerified: true,
                education: '',
                currentJob: '',
                jobExperience: '',
                note: '',
                storeName: '',
                accountStatus: 'review',
                verifiedBy: 'Not Verified',
                location: '',
                category: '',
                sellerPageUrl: '',
                merchantType: 'Free',
                rating: '',
                storeBannerStatus: 'pending',
                storeLogoStatus: 'pending',
                photoStatus: 'pending',
                photo: '',
                storeLogo: '',
                storeBanner: '',
                mVerified: false,
                merchantTrustStatus: 'Untrusted',
                additionalMobiles: [],
                lastLogin: ''
            });
            setTempMobile('');
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setFormData({
            name: '',
            email: '',
            password: '',
            dob: '',
            gender: '',
            mobile: '',
            mobileVerified: true,
            education: '',
            currentJob: '',
            jobExperience: '',
            note: '',
            storeName: '',
            accountStatus: 'review',
            verifiedBy: 'Not Verified',
            location: '',
            category: '',
            sellerPageUrl: '',
            merchantType: 'Free',
            rating: '',
            storeBannerStatus: 'pending',
            storeLogoStatus: 'pending',
            photoStatus: 'pending',
            photo: '',
            storeLogo: '',
            storeBanner: '',
            mVerified: false,
            merchantTrustStatus: 'Untrusted',
            additionalMobiles: []
        });
        setTempMobile('');
        setSelectedFiles({});
    };

    const handleInputChange = (field: keyof UserFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCheckUsername = async () => {
        if (!formData.sellerPageUrl) {
            toast.error("Please enter a username");
            return;
        }
        try {
            const token = Cookies.get('adminToken');
            const res = await axios.post(`${API_BASE}/check-username`, {
                sellerPageUrl: formData.sellerPageUrl,
                userId: editingUser?._id
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.data.available) {
                toast.success("Username is available!");
            } else {
                toast.error("Username already taken!");
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to check username");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFiles(prev => ({ ...prev, [field]: file }));

            // Preview
            const reader = new FileReader();
            reader.onload = (event) => {
                handleInputChange(field as keyof UserFormData, event.target?.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setError('');
        try {
            const token = Cookies.get('adminToken');

            // Use FormData for image upload
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                const value = formData[key as keyof UserFormData];
                if (value !== undefined && key !== 'photo' && key !== 'storeLogo' && key !== 'storeBanner' && key !== 'additionalMobiles') {
                    data.append(key, String(value));
                }
            });

            // Append additionalMobiles
            if (formData.additionalMobiles && formData.additionalMobiles.length > 0) {
                formData.additionalMobiles.forEach(m => data.append('additionalMobiles[]', m));
            }

            // Append actual files
            if (selectedFiles.photo) data.append('photo', selectedFiles.photo);
            if (selectedFiles.storeLogo) data.append('storeLogo', selectedFiles.storeLogo);
            if (selectedFiles.storeBanner) data.append('storeBanner', selectedFiles.storeBanner);

            if (editingUser) {
                await axios.put(`${API_BASE}/${editingUser._id}`, data, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                toast.success('User updated successfully');
            } else {
                await axios.post(API_BASE, data, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                toast.success('User created successfully');
            }
            fetchUsers();
            handleCloseModal();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Operation failed');
            toast.error(err.response?.data?.message || 'Operation failed');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            const token = Cookies.get('adminToken');
            await axios.delete(`${API_BASE}/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUsers(users.filter(u => u._id !== id));
            setSelectedUsers(prev => prev.filter(userId => userId !== id));
        } catch (err) {
            console.error("Failed to delete user", err);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedUsers.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedUsers.length} selected users?`)) return;

        try {
            const token = Cookies.get('adminToken');
            // Assuming the backend supports bulk delete or we loop
            await Promise.all(selectedUsers.map(id =>
                axios.delete(`${API_BASE}/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ));

            setUsers(users.filter(u => !selectedUsers.includes(u._id)));
            setSelectedUsers([]);
        } catch (err) {
            console.error("Failed to delete selected users", err);
            setError("Some users could not be deleted.");
        }
    };

    const handleLoginAsUser = async (user: any) => {
        if (!user?._id) {
            toast.error('Invalid user selected');
            return;
        }

        try {
            const token = Cookies.get('adminToken');
            if (!token) {
                toast.error('Admin session expired. Please login again.');
                return;
            }

            setLoginAsLoadingUserId(user._id);
            const res = await axios.post(`${API_BASE}/${user._id}/login-as`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const loginToken = res.data?.token;
            if (!loginToken) {
                throw new Error('No login token returned from server');
            }

            const loginUrl = `${WEBSITE_BASE_URL}/?adminLoginToken=${encodeURIComponent(loginToken)}&adminLogin=1`;
            const popup = window.open(loginUrl, '_blank', 'noopener,noreferrer');

            if (!popup) {
                window.location.href = loginUrl;
            }

            toast.success('Opened user session on website');
        } catch (err: any) {
            console.error('Login as user failed', err);
            toast.error(err.response?.data?.message || 'Could not login as user automatically');

            const fallbackDetails = [
                `Name: ${user?.name || 'N/A'}`,
                `Mobile: ${user?.mobile || 'N/A'}`,
                `Email: ${user?.email || 'N/A'}`
            ].join('\n');

            alert(
                `Auto-login failed.\n\nUser details:\n${fallbackDetails}\n\nPassword is never visible in admin for security reasons.`
            );
        } finally {
            setLoginAsLoadingUserId(null);
        }
    };

    const toggleSelectUser = (id: string) => {
        setSelectedUsers(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map(u => u._id));
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            !searchQuery ||
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.storeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.mobile?.toLowerCase().includes(searchQuery.toLowerCase());

        const isSeller = user.merchantType === 'Premium' || user.merchantType === 'Free Saller';
        const isCustomer = user.merchantType === 'Free';

        const matchesType =
            userTypeFilter === 'both' ||
            (userTypeFilter === 'seller' && isSeller) ||
            (userTypeFilter === 'customer' && isCustomer);

        return matchesSearch && matchesType;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'inactive': return 'bg-slate-100 text-black border-slate-200';
            case 'review':
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'active_message': return 'bg-teal-100 text-teal-700 border-teal-200';
            case 'inactive_message': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'r_delete': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-black border-slate-200';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'Active';
            case 'inactive': return 'Inactive';
            case 'review':
            case 'pending': return 'Review';
            case 'active_message': return 'Active & Message';
            case 'inactive_message': return 'Inactive & Message';
            case 'r_delete': return 'R-Delete';
            default: return status;
        }
    };

    return (
        <div className="bg-[#f1f5f9] min-h-screen font-['Tahoma','Verdana',sans-serif] text-xs p-2 flex flex-col gap-1">
            {/* Header / Nav Bar */}
            <div className="bg-white border border-slate-200 p-2 flex items-center justify-between rounded-t-sm shadow-sm">
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-2">
                        <button className="text-rose-500"><ArrowLeft className="w-3.5 h-3.5" strokeWidth={3} /></button>
                        <span className="font-bold text-blue-600 text-xs">Users</span>
                    </div>
                    <div className="text-black font-bold text-xs">Total Users ({totalUsers})</div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 p-0.5 rounded-sm overflow-hidden border border-slate-200">
                        <button
                            onClick={() => {
                                setUserTypeFilter('both');
                                setSearchFilters(prev => ({ ...prev, merchantType: 'both' }));
                                setCurrentPage(1);
                                fetchUsers({ ...searchFilters, merchantType: 'both' }, 1);
                            }}
                            className={cn("px-2 py-1 text-xs font-bold rounded-sm transition-colors", userTypeFilter === 'both' ? "bg-rose-500 text-white" : "text-black")}
                        >
                            ⇋ Both
                        </button>
                        <button
                            onClick={() => {
                                setUserTypeFilter('seller');
                                setSearchFilters(prev => ({ ...prev, merchantType: 'seller' }));
                                setCurrentPage(1);
                                fetchUsers({ ...searchFilters, merchantType: 'seller' }, 1);
                            }}
                            className={cn("px-2 py-1 text-xs font-bold rounded-sm transition-colors", userTypeFilter === 'seller' ? "bg-emerald-600 text-white" : "text-black")}
                        >
                            Seller
                        </button>
                        <button
                            onClick={() => {
                                setUserTypeFilter('customer');
                                setSearchFilters(prev => ({ ...prev, merchantType: 'customer' }));
                                setCurrentPage(1);
                                fetchUsers({ ...searchFilters, merchantType: 'customer' }, 1);
                            }}
                            className={cn("px-2 py-1 text-xs font-bold rounded-sm transition-colors", userTypeFilter === 'customer' ? "bg-emerald-600 text-white" : "text-black")}
                        >
                            Customer
                        </button>
                    </div>
                    <button
                        onClick={handleBulkDelete}
                        className={cn(
                            "p-1.5 rounded-sm transition-all",
                            selectedUsers.length > 0 ? "bg-rose-600 text-white scale-110 shadow-lg" : "bg-rose-400 text-rose-100 cursor-not-allowed"
                        )}
                        disabled={selectedUsers.length === 0}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setShowSearchModal(true)} className="p-1.5 bg-emerald-600 text-white rounded-sm"><Search className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleOpenModal()} className="px-3 py-1.5 bg-indigo-600 text-white rounded-sm font-bold flex items-center gap-1 shadow-sm">+ Create User</button>
                </div>
            </div>

            {/* User List Table */}
            <div className="bg-white border-x border-b border-slate-200 shadow-sm overflow-hidden flex-1 no-scrollbar">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-white z-10">
                        <tr className="border-b border-slate-200">
                            <th className="px-2 py-2 text-left w-10">
                                <input
                                    type="checkbox"
                                    className="w-3 h-3 cursor-pointer"
                                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="px-2 py-2 text-left font-bold text-black uppercase tracking-tight text-[10px]">Id</th>
                            <th className="px-2 py-2 text-left font-bold text-black uppercase tracking-tight text-[10px]">M Name</th>
                            <th className="px-2 py-2 text-left font-bold text-black uppercase tracking-tight text-[10px]">Phone</th>
                            <th className="px-2 py-2 text-left font-bold text-black uppercase tracking-tight text-[10px]">Email</th>
                            <th className="px-2 py-2 text-left font-bold text-black uppercase tracking-tight text-[10px]">Categorie</th>
                            <th className="px-2 py-2 text-left font-bold text-black uppercase tracking-tight text-[10px]">Location</th>
                            <th className="px-2 py-2 text-left font-bold text-black uppercase tracking-tight text-[10px]">Created Date</th>
                            <th className="px-2 py-2 text-left font-bold text-black uppercase tracking-tight w-28 text-[10px]">Status</th>
                            <th className="px-2 py-2 text-left font-bold text-black uppercase tracking-tight text-[10px]">Last Login</th>
                            <th className="px-2 py-2 text-center font-bold text-black uppercase tracking-tight text-[10px]">Rating</th>
                            <th className="px-2 py-2 text-center font-bold text-black uppercase tracking-tight text-[10px]">Edit by</th>
                            <th className="px-2 py-2 text-center font-bold text-black uppercase tracking-tight text-[10px]">Edit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={13} className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></td></tr>
                        ) : filteredUsers.map((user) => (
                            <tr key={user._id} className={cn("hover:bg-slate-50 transition-colors", selectedUsers.includes(user._id) && "bg-rose-50/50")}>
                                <td className="px-2 py-1.5">
                                    <input
                                        type="checkbox"
                                        className="w-3 h-3 cursor-pointer"
                                        checked={selectedUsers.includes(user._id)}
                                        onChange={() => toggleSelectUser(user._id)}
                                    />
                                </td>
                                <td className="px-2 py-1.5 text-xs text-black">{user._id}</td>
                                <td className="px-2 py-1.5 text-black">
                                    <div className="flex items-center">
                                        {user.name}
                                        {user.mVerified && <VerifiedBadge />}
                                    </div>
                                </td>
                                <td className="px-2 py-1.5 text-black text-xs">{user.mobile}</td>
                                <td className="px-2 py-1.5 text-black">{user.email || ''}</td>
                                <td className="px-2 py-1.5 text-black">{user.category}</td>
                                <td className="px-2 py-1.5 text-black">{user.location}</td>
                                <td
                                    className="px-2 py-1.5 text-black cursor-pointer select-none"
                                    onDoubleClick={() => handleLoginAsUser(user)}
                                    title="Double-click to login as user"
                                >{new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit' })}</td>
                                <td className="px-2 py-1.5">
                                    <select
                                        className="border border-slate-300 rounded-sm h-6 text-xs outline-none px-1 w-full bg-white"
                                        value={user.accountStatus}
                                        onChange={(e) => { }} // Handle status update
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">UnActive</option>
                                        <option value="r_delete">R-Delete</option>
                                    </select>
                                </td>
                                <td className="px-2 py-1.5 text-black text-[10px]">
                                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString('en-GB', { day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                </td>
                                <td className="px-2 py-1.5 text-center text-black">{user.rating || ''}</td>
                                <td className="px-2 py-1.5 text-center text-black">Admin</td>
                                <td className="px-2 py-1.5 text-center">
                                    <button onClick={() => handleOpenModal(user)} className="text-blue-500 hover:underline">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-2 border-t border-slate-200 bg-white shadow-inner">
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

            {/* SEARCH MODAL */}
            <AnimatePresence>
                {
                    showSearchModal && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSearchModal(false)} className="absolute inset-0 bg-black/10" />
                            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white border border-slate-900 w-full max-w-[98vw] rounded-sm shadow-2xl relative z-10 p-4 font-['Tahoma','Verdana',sans-serif]">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-black">Searching</span>
                                    <button onClick={() => setShowSearchModal(false)}><X className="w-4 h-4 text-black" /></button>
                                </div>

                                <div className="border border-slate-200 p-3 space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <div className="flex bg-slate-100 p-0.5 rounded-sm overflow-hidden border border-slate-200">
                                            <button
                                                onClick={() => setSearchFilters(prev => ({ ...prev, merchantType: 'both' }))}
                                                className={cn("px-2 py-1 text-xs font-bold rounded-sm transition-colors", searchFilters.merchantType === 'both' ? "bg-rose-500 text-white" : "text-black")}
                                            >
                                                Both
                                            </button>
                                            <button
                                                onClick={() => setSearchFilters(prev => ({ ...prev, merchantType: 'seller' }))}
                                                className={cn("px-2 py-1 text-xs font-bold rounded-sm transition-colors", searchFilters.merchantType === 'seller' ? "bg-emerald-600 text-white" : "text-black")}
                                            >
                                                Seller
                                            </button>
                                            <button
                                                onClick={() => setSearchFilters(prev => ({ ...prev, merchantType: 'customer' }))}
                                                className={cn("px-2 py-1 text-xs font-bold rounded-sm transition-colors", searchFilters.merchantType === 'customer' ? "bg-emerald-600 text-white" : "text-black")}
                                            >
                                                Customer
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => {
                                                    const reset = {
                                                        id: '',
                                                        mobile: '',
                                                        email: '',
                                                        category: 'Select',
                                                        location: 'Select',
                                                        status: 'Select',
                                                        merchantType: 'both',
                                                        dateFrom: '',
                                                        dateTo: ''
                                                    };
                                                    setSearchFilters(reset);
                                                    fetchUsers(reset);
                                                }}
                                                className="p-1 bg-rose-500 text-white rounded-sm" title="Reset Search">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                            <button className="p-1 bg-emerald-600 text-white rounded-sm"><Plus className="w-3 h-3" /></button>
                                            <button onClick={() => fetchUsers(searchFilters)} className="p-1 bg-emerald-600 text-white rounded-sm"><Search className="w-3 h-3" /></button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-6 gap-3">
                                        {[
                                            { label: 'Seller ID', placeholder: 'ID...', value: searchFilters.id, name: 'id' },
                                            { label: 'Mobile', placeholder: 'Mobile...', value: searchFilters.mobile, name: 'mobile' },
                                            { label: 'Email', placeholder: 'Email...', value: searchFilters.email, name: 'email' },
                                            { label: 'Categorie', placeholder: 'Select', type: 'select', name: 'category', options: ['Select', ...categories.map(c => c.name)] },
                                            { label: 'Location', placeholder: 'Select', type: 'select', name: 'location', options: ['Select', ...locations.map(l => l.name)] },
                                            { label: 'Active Status', placeholder: 'Select', type: 'select', name: 'status', options: ['Select', 'active', 'inactive', 'review', 'active_message', 'inactive_message', 'r_delete'] }
                                        ].map((f, i) => (
                                            <div key={i} className="flex flex-col gap-0.5 border border-slate-200 p-1.5 rounded-sm">
                                                <label className="text-xs font-bold text-black uppercase leading-none">{f.label}</label>
                                                {f.type === 'select' ? (
                                                    <select
                                                        className="text-xs text-black outline-none w-full bg-transparent h-4"
                                                        value={f.value}
                                                        onChange={(e) => setSearchFilters(prev => ({ ...prev, [f.name as string]: e.target.value }))}
                                                    >
                                                        {f.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                ) : (
                                                    <input
                                                        className="text-xs text-black outline-none w-full bg-transparent h-4"
                                                        placeholder={f.placeholder}
                                                        value={f.value || ''}
                                                        onChange={(e) => setSearchFilters(prev => ({ ...prev, [f.name as string]: e.target.value }))}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { label: 'Registration Date From', name: 'dateFrom', value: searchFilters.dateFrom },
                                            { label: 'Registration Date To', name: 'dateTo', value: searchFilters.dateTo },
                                        ].map((f, i) => (
                                            <div key={f.label} className="flex flex-col gap-0.5 border border-slate-200 p-1 rounded-sm">
                                                <label className="text-xs font-bold text-black uppercase leading-none">{f.label}</label>
                                                <div className="flex items-center gap-2 h-5 text-black">
                                                    <Calendar className="w-3 h-3 text-black" />
                                                    <input
                                                        type="date"
                                                        className="text-xs text-black outline-none bg-transparent w-full"
                                                        value={f.value}
                                                        onChange={(e) => setSearchFilters(prev => ({ ...prev, [f.name]: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex bg-slate-100 p-0.5 rounded-sm overflow-hidden border border-slate-200">
                                            <button
                                                onClick={() => setSearchFilters(prev => ({ ...prev, merchantType: 'both' }))}
                                                className={cn("px-2 py-1 text-xs font-bold rounded-sm transition-colors", searchFilters.merchantType === 'both' ? "bg-slate-600 text-white" : "text-black")}
                                            >
                                                Both
                                            </button>
                                            <button
                                                onClick={() => setSearchFilters(prev => ({ ...prev, merchantType: 'seller' }))}
                                                className={cn("px-2 py-1 text-xs font-bold rounded-sm transition-colors", searchFilters.merchantType === 'seller' ? "bg-slate-600 text-white" : "text-black")}
                                            >
                                                Seller
                                            </button>
                                            <button
                                                onClick={() => setSearchFilters(prev => ({ ...prev, merchantType: 'customer' }))}
                                                className={cn("px-2 py-1 text-xs font-bold rounded-sm transition-colors", searchFilters.merchantType === 'customer' ? "bg-slate-600 text-white" : "text-black")}
                                            >
                                                Customer
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => setShowSearchModal(false)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs font-bold rounded-sm shadow-sm"><X className="w-3 h-3" /> Hide Search</button>
                                            <button
                                                onClick={() => {
                                                    setCurrentPage(1);
                                                    fetchUsers(searchFilters, 1);
                                                    setShowSearchModal(false);
                                                }}
                                                className="flex items-center gap-1.5 px-6 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-sm shadow-sm"
                                            >
                                                <Search className="w-3 h-3" /> Search
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence>

            {/* ADD/EDIT MODAL */}
            <AnimatePresence>
                {
                    isModalOpen && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-2">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleCloseModal} className="absolute inset-0 bg-black/10" />
                            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white border border-slate-900 w-full max-w-[98vw] rounded-sm shadow-2xl relative z-10 flex flex-col h-[98vh] overflow-hidden font-['Tahoma','Verdana',sans-serif]">
                                <div className="bg-indigo-50/50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                    <span className="text-xs font-normal text-black uppercase">User Info <span className="text-black capitalize font-normal">(Edit or Add)</span></span>
                                    <button onClick={handleCloseModal} className="hover:bg-indigo-100 p-1 rounded-sm"><X className="w-4 h-4 text-black" /></button>
                                </div>

                                <form onSubmit={handleSubmit} className="p-2.5 space-y-2.5 overflow-y-auto no-scrollbar">
                                    {/* Top Row: Basic Info and Mobile Info Combined for Horizontal Flow */}
                                    <div className="grid grid-cols-[1fr_1fr_1fr_1.2fr_1fr] gap-2">
                                        <div className="flex flex-col gap-0.5 border border-slate-200 p-1.5 rounded-sm relative">
                                            <label className="text-xs font-normal text-black uppercase leading-none">Person Name</label>
                                            <input className="text-xs font-bold text-black outline-none w-full bg-transparent h-5" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} />
                                        </div>
                                        <div className="flex flex-col gap-0.5 border border-slate-200 p-1.5 rounded-sm bg-white">
                                            <label className="text-xs font-normal text-black uppercase leading-none">Account Status</label>
                                            <div className="relative flex items-center">
                                                <select className="text-xs font-bold text-black outline-none w-full bg-transparent h-5 appearance-none cursor-pointer pr-4" value={formData.accountStatus} onChange={(e) => handleInputChange('accountStatus', e.target.value)}>
                                                    <option value="active">Active</option>
                                                    <option value="inactive">UnActive</option>
                                                    <option value="review">Review</option>
                                                    <option value="atv_msg">Atv & Msg</option>
                                                    <option value="unatv_msg">UnA & Msg</option>
                                                    <option value="r_delete">R-Delete</option>
                                                </select>
                                                <ChevronDown className="w-2.5 h-2.5 absolute right-0 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-0.5 border border-slate-200 p-1.5 rounded-sm">
                                            <label className="text-xs font-normal text-black uppercase leading-none">Email</label>
                                            <input className="text-xs font-bold text-black outline-none w-full bg-transparent h-5" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                                        </div>
                                        <div className="flex flex-col gap-0.5 border border-slate-200 p-1.5 rounded-sm bg-white">
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <span className="text-xs font-normal text-black leading-none">Verified By</span>
                                                <div className="flex bg-blue-50 p-0.5 rounded-sm">
                                                    <span className="px-1 text-blue-600 text-[10px] font-bold rounded-[1px] uppercase">{formData.verifiedBy}</span>
                                                </div>
                                            </div>
                                            <select className="text-xs font-bold text-black outline-none w-full bg-transparent h-4" value={formData.verifiedBy} onChange={(e) => handleInputChange('verifiedBy', e.target.value)}>
                                                <option value="Not Verified">Not Verified</option>
                                                <option value="Mobile">Mobile</option>
                                                <option value="Email">Email</option>
                                                <option value="Google">Google</option>
                                                <option value="Facebook">Facebook</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-0.5 border border-slate-200 p-1.5 rounded-sm bg-white relative">
                                            <label className="text-xs font-normal text-black uppercase leading-none">Location</label>
                                            <div className="relative flex items-center">
                                                <select className="text-xs font-bold text-black outline-none w-full bg-transparent h-5 appearance-none pr-4 cursor-pointer" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)}>
                                                    <option value="">Select Location</option>
                                                    {locations.map(loc => (
                                                        <option key={loc._id} value={loc.name}>{loc.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="w-2.5 h-2.5 absolute right-0 text-slate-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle Row: Combined Grid for More Horizontal Spread */}
                                    <div className="grid grid-cols-[repeat(6,1fr)_1.5fr_1.5fr] gap-2">
                                        {/* DOB - Date Picker */}
                                        <div className="flex flex-col gap-0.5 border border-slate-200 p-1.5 rounded-sm bg-white">
                                            <label className="text-xs font-normal text-black uppercase leading-none">DOB</label>
                                            <input
                                                type="date"
                                                className="text-xs font-bold text-black outline-none w-full bg-transparent h-4 p-0 appearance-none"
                                                value={formData.dob}
                                                onChange={(e) => handleInputChange('dob', e.target.value)}
                                            />
                                        </div>

                                        {[
                                            { label: 'Gender', key: 'gender', type: 'select', opts: ['Male', 'Female', 'Other'] },
                                            { label: 'Edu', key: 'education', type: 'select', opts: ['Less than high school', 'SSC', 'Inter', 'Diploma', 'Undergraduate', 'Associate degree', 'Bachelor', 'Masters', 'Doctorate'] },
                                            { label: 'Job', key: 'currentJob', type: 'select', opts: ['Select', 'Developer', 'Designer', 'Manager'] },
                                            { label: 'Exp', key: 'jobExperience', type: 'select', opts: ['Select', '1 Year', '2 Years', '5+ Years'] }
                                        ].map((f) => (
                                            <div key={f.key} className="flex flex-col gap-0.5 border border-slate-200 p-1.5 rounded-sm bg-white relative">
                                                <label className="text-xs font-normal text-black uppercase leading-none">{f.label}</label>
                                                <div className="relative flex items-center">
                                                    <select
                                                        className="text-xs font-bold text-black outline-none w-full bg-transparent h-4 appearance-none pr-4 cursor-pointer"
                                                        value={formData[f.key as keyof UserFormData] as string}
                                                        onChange={(e) => handleInputChange(f.key as keyof UserFormData, e.target.value)}
                                                    >
                                                        {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                                                    </select>
                                                    {['education', 'gender', 'currentJob', 'jobExperience'].includes(f.key) && <ChevronDown className="w-2.5 h-2.5 absolute right-0 text-slate-400 pointer-events-none" />}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Editable Verified Mobile */}
                                        <div className="flex flex-col gap-0.5 border border-slate-200 p-1.5 rounded-sm bg-white">
                                            <label className="text-xs font-normal text-black uppercase leading-none">Verified Mobile</label>
                                            <div className="flex items-center justify-between h-4 px-0.5">
                                                <div className="flex items-center gap-1 text-blue-500 font-bold text-xs w-full">
                                                    <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                                                    <input
                                                        className="w-full bg-transparent outline-none text-blue-600 font-bold"
                                                        value={formData.mobile}
                                                        onChange={(e) => handleInputChange('mobile', e.target.value)}
                                                        placeholder="017..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Editable Password */}
                                        <div className="flex flex-col gap-0.5 border border-slate-200 p-1.5 rounded-sm bg-white">
                                            <label className="text-xs font-normal text-black uppercase leading-none italic font-serif">Password</label>
                                            <input
                                                type="text"
                                                value={formData.password}
                                                onChange={(e) => handleInputChange('password', e.target.value)}
                                                placeholder="******"
                                                className="text-xs font-bold text-black outline-none w-full bg-transparent h-4"
                                            />
                                        </div>

                                        {/* Last Login Date - Only in Edit Mode */}
                                        {editingUser && (
                                            <div className="flex flex-col gap-0.5 border border-slate-200 p-1.5 rounded-sm bg-white">
                                                <label className="text-xs font-normal text-black uppercase leading-none italic font-serif">Last Login Date</label>
                                                <div className="text-[10px] font-bold text-blue-600 h-4 flex items-center">
                                                    {formData.lastLogin ? new Date(formData.lastLogin as string).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-[1fr_2fr] gap-3">
                                        <div className="flex flex-col gap-0.5 border border-slate-200 p-1.5 rounded-sm bg-white h-12">
                                            <label className="text-xs font-normal text-black uppercase leading-none">Note</label>
                                            <textarea className="text-xs font-bold text-black outline-none w-full bg-transparent h-full resize-none leading-tight" value={formData.note} onChange={(e) => handleInputChange('note', e.target.value)} />
                                        </div>

                                        <div className="flex flex-col gap-0.5 border border-slate-200 p-1.5 rounded-sm bg-white min-h-[48px]">
                                            <label className="text-xs font-normal text-black uppercase leading-none">New Mobile number</label>

                                            {/* List of additional numbers */}
                                            {formData.additionalMobiles && formData.additionalMobiles.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1 mb-1">
                                                    {formData.additionalMobiles?.map((m, i) => (
                                                        <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-xs font-bold rounded flex items-center gap-1">
                                                            {m}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newMobiles = [...(formData.additionalMobiles || [])];
                                                                    newMobiles.splice(i, 1);
                                                                    setFormData(prev => ({ ...prev, additionalMobiles: newMobiles }));
                                                                }}
                                                            >
                                                                <X className="w-2 h-2 text-rose-500" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 mt-auto">
                                                <input
                                                    className="text-xs font-bold text-black outline-none w-full bg-transparent border-b border-slate-100"
                                                    placeholder="01XXX XXXXXX"
                                                    value={tempMobile}
                                                    onChange={(e) => setTempMobile(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (tempMobile) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                additionalMobiles: [...(prev.additionalMobiles || []), tempMobile]
                                                            }));
                                                            setTempMobile('');
                                                        }
                                                    }}
                                                    className="text-emerald-600 bg-emerald-50 p-1 rounded-full flex-shrink-0"
                                                >
                                                    <PlusCircle className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Merchant Section: Compact Heading */}
                                    <div className="bg-slate-100 px-3 py-1 border-y border-slate-200 mx-[-0.625rem]">
                                        <span className="text-xs font-normal text-black uppercase flex items-center gap-2">
                                            <Store className="w-3 h-3" /> Merchant Information
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.8fr] gap-2">
                                        <div className="border border-slate-200 p-1.5 rounded-sm relative bg-white">
                                            <label className="text-xs font-normal text-black uppercase absolute top-[-4px] left-1.5 bg-white px-0.5">Store Name</label>
                                            <input className="text-xs font-bold text-black outline-none w-full h-5 mt-1" value={formData.storeName} onChange={(e) => handleInputChange('storeName', e.target.value)} />
                                        </div>
                                        <div className="border border-slate-200 p-1.5 rounded-sm relative bg-white flex flex-col justify-center">
                                            <label className="text-xs font-normal text-black uppercase absolute top-[-4px] left-1.5 bg-white px-0.5">M-Verified By</label>
                                            <select className="text-xs font-bold text-black outline-none bg-transparent mt-1" value={formData.mVerified ? "Yes" : "No"} onChange={(e) => handleInputChange('mVerified', e.target.value === 'Yes')}>
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </div>
                                        <div className="border border-slate-200 p-1.5 rounded-sm relative bg-white flex flex-col justify-center">
                                            <label className="text-xs font-normal text-black uppercase absolute top-[-4px] left-1.5 bg-white px-0.5">Merchant Type</label>
                                            <select className="text-xs font-bold text-black outline-none bg-transparent mt-1" value={formData.merchantTrustStatus} onChange={(e) => handleInputChange('merchantTrustStatus', e.target.value)}>
                                                <option value="Untrusted">Untrusted</option>
                                                <option value="Trusted">Trusted</option>
                                            </select>
                                        </div>
                                        <div className="border border-slate-200 p-1.5 rounded-sm relative bg-white flex flex-col justify-center">
                                            <label className="text-xs font-normal text-black uppercase absolute top-[-4px] left-1.5 bg-white px-0.5">Type</label>
                                            <select className="text-xs font-bold text-black outline-none bg-transparent mt-1" value={formData.merchantType} onChange={(e) => handleInputChange('merchantType', e.target.value)}>
                                                <option>Free</option>
                                                <option>Premium</option>
                                            </select>
                                        </div>
                                        <div className="border border-slate-200 p-1.5 rounded-sm relative bg-white flex flex-col justify-center">
                                            <label className="text-xs font-normal text-black uppercase absolute top-[-4px] left-1.5 bg-white px-0.5">Category</label>
                                            <select className="text-xs font-bold text-black outline-none bg-transparent mt-1" value={formData.category} onChange={(e) => handleInputChange('category', e.target.value)}>
                                                <option value="">Select</option>
                                                {categories.map(cat => (
                                                    <option key={cat._id} value={cat.name}>{cat.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="border border-slate-200 p-1.5 rounded-sm relative flex flex-col justify-center bg-white">
                                            <label className="text-xs font-normal text-black uppercase absolute top-[-4px] left-1.5 bg-white px-0.5">Rating</label>
                                            <input className="text-xs font-bold text-black outline-none w-full h-5 mt-1" value={formData.rating} onChange={(e) => handleInputChange('rating', e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 p-1.5 rounded-sm relative flex items-center gap-2 bg-white">
                                        <label className="text-xs font-normal text-black uppercase absolute top-[-5px] left-2 bg-white px-1">Page Username</label>
                                        <span className="text-xs text-black italic">shadamon.com/</span>
                                        <input className="text-xs font-bold text-black outline-none flex-1 border-b border-slate-100 bg-transparent h-5" value={formData.sellerPageUrl} onChange={(e) => handleInputChange('sellerPageUrl', e.target.value)} />
                                        <div className="flex gap-1">
                                            <button type="button" onClick={() => handleInputChange('sellerPageUrl', '')} className="bg-slate-50 text-black px-2 py-0.5 rounded-[1px] text-xs font-bold border border-slate-200 hover:bg-slate-100 transition-colors">Change</button>
                                            <button type="button" onClick={handleCheckUsername} className="bg-indigo-600 text-white px-3 py-0.5 rounded-[1px] text-xs font-bold shadow-sm">Check</button>
                                        </div>
                                    </div>

                                    {/* Upload Area: Very Compact */}
                                    <div className="flex items-center gap-6 justify-between border border-slate-100 p-2 rounded-sm bg-slate-50/30">
                                        <div className="flex items-center gap-4">
                                            {[
                                                { label: 'User Image', key: 'photo' },
                                                { label: 'Shop Logo', key: 'storeLogo' },
                                                { label: 'Shop Banner', key: 'storeBanner' }
                                            ].map(u => (
                                                <div key={u.label} className="flex items-center gap-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-black leading-none mb-1">{u.label}</span>
                                                        <label className="w-[80px] h-[50px] border border-dashed border-slate-300 rounded-sm bg-white flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-blue-400 transition-colors">
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => handleFileChange(e, u.key)}
                                                            />
                                                            {formData[u.key as keyof UserFormData] ? (
                                                                <img
                                                                    src={getImageUrl(formData[u.key as keyof UserFormData] as string)}
                                                                    alt={u.label}
                                                                    className="w-full h-full object-cover"
                                                                    loading="lazy"
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        target.onerror = null;
                                                                        target.src = 'https://via.placeholder.com/80x50?text=Error';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <ImageIcon className="w-5 h-5 text-black group-hover:text-blue-400" />
                                                            )}
                                                            <div className="absolute top-0.5 right-0.5 flex gap-0.5">
                                                                <div className="bg-slate-200 text-white p-0.5 rounded-full"><Minus className="w-2 h-2" /></div>
                                                                <div className="bg-blue-400 text-white p-0.5 rounded-full"><CheckCircle2 className="w-2 h-2" /></div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                    <div className="flex flex-col gap-1 self-center">
                                                        <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold">
                                                            <input
                                                                type="radio"
                                                                className="w-2 h-2"
                                                                name={u.key + "status"}
                                                                checked={formData[(u.key + 'Status') as keyof UserFormData] === 'approved'}
                                                                onChange={() => handleInputChange((u.key + 'Status') as keyof UserFormData, 'approved')}
                                                            />
                                                            ACC
                                                        </label>
                                                        <label className="flex items-center gap-1 cursor-pointer text-[10px] font-bold text-rose-500">
                                                            <input
                                                                type="radio"
                                                                className="w-2 h-2"
                                                                name={u.key + "status"}
                                                                checked={formData[(u.key + 'Status') as keyof UserFormData] === 'rejected'}
                                                                onChange={() => handleInputChange((u.key + 'Status') as keyof UserFormData, 'rejected')}
                                                            />
                                                            DEC
                                                        </label>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-2 h-10 items-end">
                                            {editingUser && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleDeleteUser(editingUser._id);
                                                        handleCloseModal();
                                                    }}
                                                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-[2px] text-xs shadow-sm uppercase mr-auto"
                                                >
                                                    Delete User
                                                </button>
                                            )}
                                            <button type="button" onClick={handleCloseModal} className="px-5 py-2 bg-[#d9534f] text-white font-black rounded-[2px] text-xs shadow-sm uppercase ml-auto">Cancel</button>
                                            <button type="submit" className="px-10 py-2 bg-[#00a65a] text-white font-black rounded-[2px] text-xs shadow-sm uppercase flex items-center justify-center gap-2">
                                                {formLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : 'Save Profile'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
