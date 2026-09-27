"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Search, Plus, Trash2, Edit2, CheckCircle2,
    Shuffle, X, Calendar, CircleDot, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { API_BASE_URL } from '../../../utils/apiConfig';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface Admin {
    _id: string;
    email: string;
    staffName?: string;
    staffType?: string;
    status?: boolean;
    createdAt?: string;
    updatedAt?: string;
    permissions?: Record<string, boolean>;
}

const API_URL = `${API_BASE_URL}/api/admins`;

export default function AdminCreatePage() {
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
    const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Form States
    const [formData, setFormData] = useState({
        staffName: '',
        email: '',
        entryDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-') + ' ' + new Date().toLocaleTimeString('en-GB'),
        staffType: 'Uploader',
        password: '',
        status: true
    });

    const [permissions, setPermissions] = useState<Record<string, boolean>>({
        'Post': false,
        'User': false,
        'Report': false,
        'Promote Management': false,
        'Transaction Manager': false,
        'Admin Create': false,
        'Notification & Messaging': false,
        'AD Position (W/A/Q)': false,
        'Categorie Manager': false,
        'Location Manager': false,
        'Settings & Others': false,
    });

    const router = useRouter();

    useEffect(() => {
        const token = Cookies.get('adminToken');
        if (!token) {
            router.push('/login');
            return;
        }
        fetchAdmins(token);
    }, [router]);

    const fetchAdmins = async (token: string) => {
        try {
            setIsLoading(true);
            const res = await axios.get(API_URL, {
                headers: { 'x-auth-token': token }
            });
            setAdmins(res.data);
            setIsLoading(false);
        } catch (error: any) {
            console.error('Failed to fetch admins:', error);
            setIsLoading(false);
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = Cookies.get('adminToken');
        if (!token) return;

        try {
            const payload = {
                email: formData.email,
                staffName: formData.staffName,
                staffType: formData.staffType,
                status: formData.status,
                ...(formData.password ? { password: formData.password } : {})
            };

            if (editingAdminId) {
                await axios.put(`${API_URL}/${editingAdminId}`, payload, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('Admin updated successfully');
            } else {
                await axios.post(API_URL, payload, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('Admin created successfully');
            }

            setShowCreateModal(false);
            setEditingAdminId(null);
            setFormData({
                staffName: '',
                email: '',
                entryDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-') + ' ' + new Date().toLocaleTimeString('en-GB'),
                staffType: 'Uploader',
                password: '',
                status: true
            });
            fetchAdmins(token);
        } catch (error: any) {
            console.error('Error saving admin:', error);
            toast.error(error.response?.data?.message || 'Failed to save admin');
        }
    };

    const handleEdit = (admin: Admin) => {
        setEditingAdminId(admin._id);
        setFormData({
            staffName: admin.staffName || '',
            email: admin.email,
            entryDate: admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '',
            staffType: admin.staffType || 'Uploader',
            password: '', // Don't populate password
            status: admin.status !== undefined ? admin.status : true
        });
        setShowCreateModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this admin?')) return;
        const token = Cookies.get('adminToken');
        if (!token) return;

        try {
            await axios.delete(`${API_URL}/${id}`, {
                headers: { 'x-auth-token': token }
            });
            toast.success('Admin deleted successfully');
            fetchAdmins(token);
        } catch (error: any) {
            console.error('Error deleting admin:', error);
            toast.error('Failed to delete admin');
        }
    };

    const handlePermissionSubmit = async () => {
        if (!selectedAdmin) return;
        const token = Cookies.get('adminToken');
        if (!token) return;

        try {
            await axios.put(`${API_URL}/${selectedAdmin._id}`, {
                permissions
            }, {
                headers: { 'x-auth-token': token }
            });
            toast.success('Permissions updated successfully');
            setShowPermissionModal(false);
            fetchAdmins(token);
        } catch (error: any) {
            console.error('Error updating permissions:', error);
            toast.error('Failed to update permissions');
        }
    };

    const filteredAdmins = admins.filter(a =>
        (a.staffName?.toLowerCase() || a.email.toLowerCase()).includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-[#f1f5f9] min-h-[calc(100vh-4rem)] p-4 font-['Tahoma','Verdana',sans-serif] overflow-y-auto">
            {/* Top Bar */}
            <div className="bg-white rounded-t-md border border-slate-200 p-2 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <button className="text-rose-500 hover:opacity-80 transition-opacity">
                        <ArrowLeft className="w-4 h-4 stroke-[3]" />
                    </button>
                    <span className="text-indigo-600 font-bold text-sm tracking-tight">Manage Admin Users</span>
                </div>

                <div className="text-black text-xs font-medium">
                    Total Users <span className="font-bold">({admins.length})</span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex border border-slate-200 rounded overflow-hidden h-7">
                        <input
                            type="text"
                            placeholder="Search here..."
                            className="px-2 text-xs outline-none w-48 font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button className="bg-white px-2 border-l border-slate-200 hover:bg-slate-50">
                            <Search className="w-3.5 h-3.5 text-black" />
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setEditingAdminId(null);
                            setFormData({
                                staffName: '',
                                email: '',
                                entryDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '-') + ' ' + new Date().toLocaleTimeString('en-GB'),
                                staffType: 'Uploader',
                                password: '',
                                status: true
                            });
                            setShowCreateModal(true);
                        }}
                        className="bg-[#5c67f2] text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1 shadow-md hover:bg-[#4a55e0] transition-all"
                    >
                        <Plus className="w-3 h-3" /> Create User
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white border-x border-b border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-white text-black font-bold border-b border-slate-200">
                                <th className="px-4 py-3 font-extrabold w-1/4">Staff name</th>
                                <th className="px-4 py-3 font-extrabold w-32">#</th>
                                <th className="px-4 py-3 font-extrabold">Staff type</th>
                                <th className="px-4 py-3 font-extrabold text-center w-20">Status</th>
                                <th className="px-4 py-3 font-extrabold">Entry date</th>
                                <th className="px-4 py-3 font-extrabold">Modify date</th>
                                <th className="px-4 py-3 text-center w-12">
                                    <Trash2 className="w-4 h-4 mx-auto text-black" />
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-black">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                                    </td>
                                </tr>
                            ) : filteredAdmins.map((admin, idx) => (
                                <tr key={admin._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2 flex items-center gap-2">
                                        <button
                                            onClick={() => handleEdit(admin)}
                                            className="border border-slate-400 p-0.5 rounded-sm hover:bg-slate-100"
                                        >
                                            <Edit2 className="w-2.5 h-2.5 text-black" />
                                        </button>
                                        <span className="text-blue-500">{admin.staffName || admin.email.split('@')[0]}</span>
                                    </td>
                                    <td className="px-4 py-2">
                                        <button
                                            onClick={() => {
                                                setSelectedAdmin(admin);
                                                // Reset permissions to default then merge with admin permissions
                                                const defaultPerms = {
                                                    'Post': false,
                                                    'User': false,
                                                    'Report': false,
                                                    'Promote Management': false,
                                                    'Transaction Manager': false,
                                                    'Admin Create': false,
                                                    'Notification & Messaging': false,
                                                    'AD Position (W/A/Q)': false,
                                                    'Categorie Manager': false,
                                                    'Location Manager': false,
                                                    'Settings & Others': false,
                                                };
                                                setPermissions({ ...defaultPerms, ...(admin.permissions || {}) });
                                                setShowPermissionModal(true);
                                            }}
                                            className="text-cyan-500 flex items-center gap-1.5 hover:underline"
                                        >
                                            <Shuffle className="w-3.5 h-3.5 rotate-90" /> Permission
                                        </button>
                                    </td>
                                    <td className="px-4 py-2 text-black">{admin.staffType || 'Administrator'}</td>
                                    <td className="px-4 py-2 text-center">
                                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto fill-green-50" />
                                    </td>
                                    <td className="px-4 py-2 text-black">
                                        {admin.createdAt ? (
                                            <div className="flex flex-col">
                                                <span>{new Date(admin.createdAt).toLocaleDateString()}</span>
                                                <span className="text-xs opacity-70">{new Date(admin.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 text-black">
                                        {admin.updatedAt ? (
                                            <div className="flex flex-col">
                                                <span>{new Date(admin.updatedAt).toLocaleDateString()}</span>
                                                <span className="text-xs opacity-70">{new Date(admin.updatedAt).toLocaleTimeString()}</span>
                                            </div>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            onClick={() => handleDelete(admin._id)}
                                            className="text-black hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4 mx-auto" strokeWidth={2.5} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showPermissionModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPermissionModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white border border-slate-900 w-full max-w-[98vw] h-[98vh] rounded-sm shadow-2xl relative z-10 flex flex-col"
                        >
                            <div className="flex justify-between items-center p-2 border-b border-slate-200 bg-slate-50">
                                <div className="flex items-center gap-2 font-bold text-xs text-black">
                                    <Shuffle className="w-3.5 h-3.5" /> User Permission
                                </div>
                                <button onClick={() => setShowPermissionModal(false)} className="hover:bg-slate-200 p-1 rounded transition-colors text-black">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-4">
                                <p className="text-xs text-black font-bold mb-3">Select staff permission:</p>
                                <div className="grid grid-cols-1 gap-1 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                                    {Object.entries(permissions).map(([name, checked]) => (
                                        <label key={name} className="flex items-center gap-2 cursor-pointer group hover:bg-slate-50 p-1 rounded transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => setPermissions(prev => ({ ...prev, [name]: !prev[name] }))}
                                                className="w-3.5 h-3.5 accent-blue-600 border border-slate-400 rounded-sm"
                                            />
                                            <span className="text-xs font-medium text-black">{name}</span>
                                        </label>
                                    ))}
                                </div>
                                <div className="mt-6 flex justify-end gap-1.5 pt-4 border-t border-slate-100">
                                    <button
                                        onClick={handlePermissionSubmit}
                                        className="bg-[#d9534f] text-white px-4 py-1.5 text-xs font-bold rounded-sm border border-rose-800 hover:bg-rose-700 shadow-sm transition-all"
                                    >
                                        Update Permission
                                    </button>
                                    <button
                                        onClick={() => setShowPermissionModal(false)}
                                        className="bg-[#1a1a1a] text-white px-4 py-1.5 text-xs font-bold rounded-sm border border-black hover:bg-black shadow-sm transition-all"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white border border-slate-900 w-full max-w-[98vw] h-[98vh] rounded-sm shadow-2xl relative z-10 flex flex-col"
                        >
                            <div className="flex justify-between items-center p-2 border-b border-slate-200 bg-slate-50">
                                <div className="flex items-center gap-2 font-bold text-xs text-black">
                                    <CircleDot className="w-3.5 h-3.5" /> {editingAdminId ? 'Staff Edit' : 'New Staff'}
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="hover:bg-slate-200 p-1 rounded transition-colors text-black">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleCreateSubmit} className="p-4 text-xs">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="space-y-1">
                                        <label className="text-black font-bold">Staff name:</label>
                                        <input
                                            type="text"
                                            className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all rounded-sm"
                                            value={formData.staffName}
                                            onChange={(e) => setFormData(p => ({ ...p, staffName: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-black font-bold">Staff type:</label>
                                        <select
                                            className="w-full border border-slate-300 px-1 py-1.5 outline-none font-medium bg-white focus:border-blue-500 rounded-sm"
                                            value={formData.staffType}
                                            onChange={(e) => setFormData(p => ({ ...p, staffType: e.target.value }))}
                                        >
                                            <option>Uploader</option>
                                            <option>Admin</option>
                                            <option>Administrator</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-black font-bold">Email:</label>
                                        <input
                                            type="email"
                                            className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium bg-[#f9fbff] focus:border-blue-500 rounded-sm"
                                            value={formData.email}
                                            onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-black font-bold">Password:</label>
                                        <input
                                            type="password"
                                            className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium bg-[#f9fbff] focus:border-blue-500 rounded-sm"
                                            value={formData.password}
                                            onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                                            placeholder={editingAdminId ? "•••••••• (Leave blank to keep)" : "••••••••"}
                                            required={!editingAdminId}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-black font-bold">Entry date:</label>
                                        <div className="flex border border-slate-300 rounded-sm bg-slate-50">
                                            <input
                                                type="text"
                                                className="flex-1 px-2 py-1.5 outline-none font-medium bg-transparent text-black cursor-not-allowed"
                                                value={editingAdminId ? (admins.find(a => a._id === editingAdminId)?.createdAt ? new Date(admins.find(a => a._id === editingAdminId)!.createdAt!).toLocaleString() : 'N/A') : formData.entryDate}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-black font-bold">Modify date:</label>
                                        <div className="flex border border-slate-300 rounded-sm bg-slate-50">
                                            <input
                                                type="text"
                                                className="flex-1 px-2 py-1.5 outline-none font-medium bg-transparent text-black cursor-not-allowed"
                                                value={editingAdminId && admins.find(a => a._id === editingAdminId)?.updatedAt ? new Date(admins.find(a => a._id === editingAdminId)!.updatedAt!).toLocaleString() : 'N/A'}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-black font-bold">Publishing status:</label>
                                        <div className="flex items-center gap-6 py-2">
                                            <label className="flex items-center gap-2 cursor-pointer font-bold text-black">
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    checked={formData.status === true}
                                                    onChange={() => setFormData(p => ({ ...p, status: true }))}
                                                    className="w-4 h-4 accent-blue-600"
                                                /> Yes
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer font-medium text-black">
                                                <input
                                                    type="radio"
                                                    name="status"
                                                    checked={formData.status === false}
                                                    onChange={() => setFormData(p => ({ ...p, status: false }))}
                                                    className="w-4 h-4 accent-blue-600"
                                                /> No
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end gap-2 pt-4 border-t border-slate-100">
                                    <button
                                        type="submit"
                                        className="bg-[#2a68e6] text-white px-6 py-2 text-xs font-bold rounded-sm border border-blue-800 hover:bg-blue-700 shadow-sm transition-all"
                                    >
                                        {editingAdminId ? 'Update Staff Member' : 'Save Staff Member'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="bg-white text-black px-6 py-2 text-xs font-bold rounded-sm border border-slate-300 hover:bg-slate-50 shadow-sm transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
