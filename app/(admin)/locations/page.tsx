"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Search, Plus, Trash2, Edit2, CheckCircle2,
    X, Calendar, CircleDot, Loader2, Home, Minus,
    CheckCircle, XCircle
} from 'lucide-react';
import axios from 'axios';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../../../utils/apiConfig';
import { getImageUrl } from '../../../utils/imageUrl';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface Location {
    _id: string;
    name: string;
    locationNameBn?: string;
    order: number;
    status: boolean;
    image?: string;
}

interface SubLocation {
    _id: string;
    name: string;
    subLocationNameBn?: string;
    location: Location;
    mapLink?: string;
    order: number;
    status: boolean;
    image?: string;
    createdAt: string;
    createdBy?: { adminName: string };
}

export default function LocationsPage() {
    const [subLocations, setSubLocations] = useState<SubLocation[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [showMainModal, setShowMainModal] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);

    const [editingSubLocId, setEditingSubLocId] = useState<string | null>(null);
    const [editingLocId, setEditingLocId] = useState<string | null>(null);

    // Form States - SubLocation (Main Modal)
    const [subLocForm, setSubLocForm] = useState({
        names: [''], // Multiple names support
        nameBns: [''],
        location: '',
        mapLink: '',
        order: 1,
        status: true,
        image: null as File | null,
    });

    // Form States - Location
    const [locForm, setLocForm] = useState({
        name: '',
        locationNameBn: '',
        order: 1,
        status: true,
        image: null as File | null,
    });

    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const [slRes, lRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/locations/sub`),
                axios.get(`${API_BASE_URL}/api/locations`)
            ]);
            setSubLocations((slRes.data.data || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
            setLocations((lRes.data.data || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Failed to load locations');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubLocSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const token = Cookies.get('adminToken');

        try {
            const formData = new FormData();
            subLocForm.names.forEach((nameValue: string, index: number) => {
                const trimmedName = nameValue.trim();
                if (!trimmedName) return;

                formData.append('name', trimmedName);
                formData.append('subLocationNameBn', (subLocForm.nameBns[index] || '').trim());
            });
            formData.append('location', subLocForm.location);
            formData.append('mapLink', subLocForm.mapLink);
            formData.append('order', String(subLocForm.order));
            formData.append('status', String(subLocForm.status));
            if (subLocForm.image) formData.append('image', subLocForm.image);

            if (editingSubLocId) {
                await axios.put(`${API_BASE_URL}/api/locations/sub/${editingSubLocId}`, formData, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('Sub-location updated');
            } else {
                await axios.post(`${API_BASE_URL}/api/locations/sub`, formData, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('Sub-location created');
            }
            setShowMainModal(false);
            setEditingSubLocId(null);
            fetchAllData();
            // Reset form
            setSubLocForm({
                names: [''],
                nameBns: [''],
                location: '',
                mapLink: '',
                order: 1,
                status: true,
                image: null as File | null,
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error saving sub-location');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLocSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const token = Cookies.get('adminToken');
        try {
            const formData = new FormData();
            formData.append('name', locForm.name);
            formData.append('locationNameBn', locForm.locationNameBn);
            formData.append('order', String(locForm.order));
            formData.append('status', String(locForm.status));
            if (locForm.image) formData.append('image', locForm.image);

            if (editingLocId) {
                await axios.put(`${API_BASE_URL}/api/locations/${editingLocId}`, formData, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('Location updated');
            } else {
                await axios.post(`${API_BASE_URL}/api/locations`, formData, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('Location created');
            }
            setShowLocationModal(false);
            setEditingLocId(null);
            fetchAllData();
            // Reset form
            setLocForm({
                name: '',
                locationNameBn: '',
                order: 1,
                status: true,
                image: null as File | null,
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error saving location');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, type: 'sub' | 'loc') => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        const token = Cookies.get('adminToken');
        const urlMap = {
            sub: `${API_BASE_URL}/api/locations/sub/${id}`,
            loc: `${API_BASE_URL}/api/locations/${id}`
        };
        try {
            await axios.delete(urlMap[type], { headers: { 'x-auth-token': token } });
            toast.success('Deleted successfully');
            fetchAllData();
        } catch (error: any) {
            toast.error('Failed to delete');
        }
    };

    const handleEditSubLoc = (sl: SubLocation) => {
        setEditingSubLocId(sl._id);
        setSubLocForm({
            names: [sl.name],
            nameBns: [sl.subLocationNameBn || ''],
            location: sl.location._id,
            mapLink: sl.mapLink || '',
            order: sl.order,
            status: sl.status,
            image: null,
        });
        setShowMainModal(true);
    };

    const handleEditLoc = (l: Location) => {
        setEditingLocId(l._id);
        setLocForm({
            name: l.name,
            locationNameBn: l.locationNameBn || '',
            order: l.order,
            status: l.status,
            image: null,
        });
        setShowLocationModal(true);
    };

    const openNewSubLoc = () => {
        setEditingSubLocId(null);
        setSubLocForm({
            names: [''],
            nameBns: [''],
            location: '',
            mapLink: '',
            order: 1,
            status: true,
            image: null,
        });
        setShowMainModal(true);
    };

    const openNewLoc = () => {
        setEditingLocId(null);
        setLocForm({
            name: '',
            locationNameBn: '',
            order: 1,
            status: true,
            image: null,
        });
        setShowLocationModal(true);
    };

    const filteredSubLocations = subLocations.filter(sl =>
        sl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sl.subLocationNameBn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        sl.location?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sl.location?.locationNameBn || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-[#f1f5f9] min-h-screen p-4 font-['Tahoma','Verdana',sans-serif]">
            {/* Breadcrumb Area */}
            <div className="flex items-center gap-1.5 text-xs text-black mb-3 ml-1">
                <Home className="w-3 h-3" />
                <span>/</span>
                <span className="text-black">Manage Location</span>
            </div>

            {/* Header Area */}
            <div className="bg-white rounded-t-lg border border-slate-200 p-2.5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button className="text-rose-500 hover:opacity-80 transition-opacity">
                        <ArrowLeft className="w-4 h-4 stroke-[3]" />
                    </button>
                    <span className="text-indigo-600 font-bold text-sm tracking-tight">Location</span>
                </div>

                <div className="text-black text-xs font-medium">
                    Total Location <span className="font-bold">({subLocations.length})</span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={openNewSubLoc}
                        className="bg-[#2ecc71] hover:bg-[#27ae60] text-white p-1 rounded transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                    <div className="flex border border-slate-200 rounded overflow-hidden h-7 ml-2">
                        <input
                            type="text"
                            placeholder="Search..."
                            className="px-2 text-xs outline-none w-48 font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button className="bg-white px-2 border-l border-slate-200 hover:bg-slate-50">
                            <Search className="w-3.5 h-3.5 text-black" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white border-x border-b border-slate-200 shadow-sm overflow-hidden mb-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-white text-black font-bold border-b border-slate-100">
                                <th className="px-5 py-3 font-bold w-12 text-center">Image</th>
                                <th className="px-5 py-3 font-bold w-1/4">Sub Location name</th>
                                <th className="px-5 py-3 font-bold">Location name</th>
                                <th className="px-5 py-3 font-bold text-center w-24">Order</th>
                                <th className="px-5 py-3 font-bold text-center w-24">Status</th>
                                <th className="px-5 py-3 font-bold w-48">Entry date</th>
                                <th className="px-5 py-3 font-bold">Created by</th>
                                <th className="px-5 py-3 text-center w-12"><Edit2 className="w-3.5 h-3.5 mx-auto" strokeWidth={3} /></th>
                                <th className="px-5 py-3 text-center w-12"><Trash2 className="w-3.5 h-3.5 mx-auto" strokeWidth={3} /></th>
                            </tr>
                        </thead>
                        <tbody className="text-black">
                            {isLoading ? (
                                <tr><td colSpan={9} className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
                            ) : filteredSubLocations.length === 0 ? (
                                <tr><td colSpan={9} className="py-12 text-center text-black italic">No locations found</td></tr>
                            ) : filteredSubLocations.map((sl) => (
                                <tr key={sl._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-2.5 text-center">
                                        {sl.image ? (
                                            <div className="w-8 h-8 rounded border border-slate-200 overflow-hidden mx-auto bg-white">
                                                <img src={getImageUrl(sl.image)} alt="" className="w-full h-full object-cover" loading="lazy" />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded border border-slate-200 bg-slate-50 mx-auto flex items-center justify-center">
                                                <span className="text-[10px] text-slate-400">No img</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-2.5 text-black">
                                        <div>{sl.name}</div>
                                        {sl.subLocationNameBn && <div className="text-[11px] text-slate-500">{sl.subLocationNameBn}</div>}
                                    </td>
                                    <td className="px-5 py-2.5 text-black">
                                        <div>{sl.location?.name}</div>
                                        {sl.location?.locationNameBn && <div className="text-[11px] text-slate-500">{sl.location.locationNameBn}</div>}
                                    </td>
                                    <td className="px-5 py-2.5 text-center">{sl.order}</td>
                                    <td className="px-5 py-2.5 text-center">
                                        {sl.status ? (
                                            <CheckCircle2 className="w-4 h-4 text-[#2ecc71] mx-auto fill-emerald-50" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-[#e74c3c] mx-auto fill-rose-50" />
                                        )}
                                    </td>
                                    <td className="px-5 py-2.5 text-black">
                                        {new Date(sl.createdAt).toLocaleDateString('en-GB') + ' ' + new Date(sl.createdAt).toLocaleTimeString('en-GB')}
                                    </td>
                                    <td className="px-5 py-2.5 text-black">{sl.createdBy?.adminName || 'System'}</td>
                                    <td className="px-5 py-2.5 text-center">
                                        <button onClick={() => handleEditSubLoc(sl)} className="text-black hover:text-indigo-600 transition-colors">
                                            <Edit2 className="w-3.5 h-3.5 mx-auto" strokeWidth={3} />
                                        </button>
                                    </td>
                                    <td className="px-5 py-2.5 text-center">
                                        <button onClick={() => handleDelete(sl._id, 'sub')} className="text-black hover:text-rose-500 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5 mx-auto" strokeWidth={3} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Main Modal - New Location & Sublocation Create */}
            <AnimatePresence>
                {showMainModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowMainModal(false)} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

                        <motion.div
                            initial={{ scale: 0.98, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.98, opacity: 0, y: 10 }}
                            className="bg-white border border-slate-900 w-full max-w-[98vw] h-[98vh] rounded-sm shadow-2xl relative z-10 flex flex-col"
                        >
                            <div className="flex justify-between items-center p-2 border-b border-slate-200 bg-slate-50">
                                <div className="flex items-center gap-2 font-bold text-xs text-black uppercase">
                                    <CircleDot className="w-4 h-4" /> {editingSubLocId ? 'Edit Location & Sublocation' : 'New Location & Sublocation Create'}
                                </div>
                                <button onClick={() => setShowMainModal(false)} className="hover:bg-slate-200 p-1 rounded transition-colors text-black">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-4 flex gap-6 overflow-hidden flex-1">
                                {/* Left Side Form */}
                                <form onSubmit={handleSubLocSubmit} className="flex-1 space-y-3 text-xs overflow-y-auto pr-4 custom-scrollbar">
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-3">
                                            <div className="flex flex-col gap-1.5">
                                                {subLocForm.names.map((name, index) => (
                                                    <div key={index} className="flex gap-1 items-center">
                                                        <input
                                                            type="text"
                                                            placeholder="Sub Location Name (EN)"
                                                            className="flex-1 border border-slate-300 px-2 py-1.5 outline-none font-medium"
                                                            value={name}
                                                            onChange={e => {
                                                                const newNames = [...subLocForm.names];
                                                                newNames[index] = e.target.value;
                                                                setSubLocForm({ ...subLocForm, names: newNames });
                                                            }}
                                                            required
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Sub Location Name (BN)"
                                                            className="flex-1 border border-slate-300 px-2 py-1.5 outline-none font-medium"
                                                            value={subLocForm.nameBns[index] || ''}
                                                            onChange={e => {
                                                                const newNameBns = [...subLocForm.nameBns];
                                                                newNameBns[index] = e.target.value;
                                                                setSubLocForm({ ...subLocForm, nameBns: newNameBns });
                                                            }}
                                                        />
                                                        {index === subLocForm.names.length - 1 ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setSubLocForm({
                                                                    ...subLocForm,
                                                                    names: [...subLocForm.names, ''],
                                                                    nameBns: [...subLocForm.nameBns, '']
                                                                })}
                                                                className="p-1 px-2 border border-slate-900 bg-white hover:bg-slate-50"
                                                            >
                                                                <Plus className="w-3 h-3 stroke-[3]" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => setSubLocForm({
                                                                    ...subLocForm,
                                                                    names: subLocForm.names.filter((_, i) => i !== index),
                                                                    nameBns: subLocForm.nameBns.filter((_, i) => i !== index)
                                                                })}
                                                                className="p-1 px-2 border border-slate-900 bg-white hover:bg-slate-50"
                                                            >
                                                                <Minus className="w-3 h-3 stroke-[3]" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            <select className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium bg-white"
                                                value={subLocForm.location} onChange={e => setSubLocForm({ ...subLocForm, location: e.target.value })} required>
                                                <option value="">Location</option>
                                                {locations.map(l => <option key={l._id} value={l._id}>{l.name}{l.locationNameBn ? ` (${l.locationNameBn})` : ''}</option>)}
                                            </select>

                                            <input type="number" placeholder="Ordering" className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium"
                                                value={subLocForm.order} onChange={e => setSubLocForm({ ...subLocForm, order: Number(e.target.value) })} />

                                            <div className="bg-[#f0f0f0] border border-slate-300 text-black px-2 py-1.5 text-center">
                                                {new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB')}
                                            </div>

                                            <div className="flex gap-1">
                                                <label className="bg-white border border-slate-300 px-2 py-1 cursor-pointer hover:bg-slate-50 font-bold whitespace-nowrap">
                                                    Choose File
                                                    <input type="file" className="hidden" onChange={e => setSubLocForm({ ...subLocForm, image: e.target.files?.[0] || null })} />
                                                </label>
                                                <span className="text-black self-center truncate max-w-[100px]">{subLocForm.image ? subLocForm.image.name : 'No file chosen'}</span>
                                            </div>

                                            {/* Image Preview */}
                                            <div className="mt-2 h-20 w-20 border border-slate-200 self-end overflow-hidden bg-white rounded-sm flex items-center justify-center">
                                                {subLocForm.image ? (
                                                    <img src={URL.createObjectURL(subLocForm.image)} className="w-full h-full object-cover" />
                                                ) : (editingSubLocId && subLocations.find(s => s._id === editingSubLocId)?.image) ? (
                                                    <img src={getImageUrl(subLocations.find(s => s._id === editingSubLocId)?.image)} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-[10px] text-slate-400">Preview</div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4 py-1">
                                                <span className="text-black font-bold">Status</span>
                                                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-black">
                                                    <input type="radio" checked={subLocForm.status} onChange={() => setSubLocForm({ ...subLocForm, status: true })} className="w-3 h-3 accent-blue-600" /> Yes
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-black">
                                                    <input type="radio" checked={!subLocForm.status} onChange={() => setSubLocForm({ ...subLocForm, status: false })} className="w-3 h-3 accent-blue-600" /> No
                                                </label>
                                            </div>
                                        </div>

                                        <div className="w-1/2">
                                            <input type="text" placeholder="Location Google map Link" className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium h-10 align-top"
                                                value={subLocForm.mapLink} onChange={e => setSubLocForm({ ...subLocForm, mapLink: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="pt-6 flex gap-2">
                                        <button type="submit" className="bg-[#127ef3] text-white flex-1 py-1.5 font-bold rounded-sm border border-blue-800 hover:bg-blue-600 shadow-inner">
                                            {isSaving ? 'Processing...' : 'Save'}
                                        </button>
                                        <button type="button" onClick={() => setShowMainModal(false)} className="bg-white text-black px-6 py-1.5 font-bold rounded-sm border border-slate-300 hover:bg-slate-50">
                                            Cancel
                                        </button>
                                    </div>
                                </form>

                                {/* Right Column Table */}
                                <div className="w-[450px] border-l border-slate-200 pl-6 flex flex-col gap-2 h-full overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-xs font-bold text-black uppercase tracking-tighter">Create Location</span>
                                        <button onClick={openNewLoc} className="bg-white border border-slate-400 p-0.5 px-2 hover:bg-slate-50">
                                            <Plus className="w-3 h-3 stroke-[3]" />
                                        </button>
                                    </div>
                                    <div className="border border-slate-200 rounded-sm h-[200px] overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-xs text-left border-collapse">
                                            <thead className="bg-[#f8f9fa] border-b border-slate-200 sticky top-0">
                                                <tr>
                                                    <th className="px-2 py-2 font-bold whitespace-nowrap text-center w-10">Image</th>
                                                    <th className="px-2 py-2 font-bold whitespace-nowrap italic">Location Name</th>
                                                    <th className="px-2 py-2 font-bold whitespace-nowrap italic">Location Name (BN)</th>
                                                    <th className="px-2 py-2 font-bold italic">Inpute</th>
                                                    <th className="px-2 py-2 font-bold text-center italic">Order</th>
                                                    <th className="px-2 py-2 font-bold text-center italic">Status</th>
                                                    <th className="w-6 px-1 py-2 text-center italic"></th>
                                                    <th className="w-6 px-1 py-2 text-center italic"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {locations.map(l => (
                                                    <tr key={l._id}>
                                                        <td className="px-2 py-1.5 align-middle">
                                                            {l.image ? (
                                                                <div className="w-6 h-6 rounded border border-slate-200 overflow-hidden mx-auto bg-white">
                                                                    <img src={getImageUrl(l.image)} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-6 h-6 rounded border border-slate-200 bg-slate-50 mx-auto" />
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-1.5 font-bold text-black">{l.name}</td>
                                                        <td className="px-2 py-1.5 text-slate-500">{l.locationNameBn || '-'}</td>
                                                        <td className="px-2 py-1.5">Text</td>
                                                        <td className="px-2 py-1.5 text-center">{l.order}</td>
                                                        <td className="px-2 py-1.5 text-center">
                                                            <CheckCircle2 className={cn("w-3 h-3 mx-auto", l.status ? "text-green-500" : "text-black")} />
                                                        </td>
                                                        <td className="px-1 py-1.5"><Edit2 onClick={() => handleEditLoc(l)} className="w-3 h-3 text-black cursor-pointer" /></td>
                                                        <td className="px-1 py-1.5"><Trash2 onClick={() => handleDelete(l._id, 'loc')} className="w-3 h-3 text-black cursor-pointer" /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Nested - Create Location Modal */}
                            <AnimatePresence>
                                {showLocationModal && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                        className="absolute -bottom-5 left-0 w-full p-4 flex justify-center z-[110]"
                                    >
                                        <div className="bg-white border border-slate-900 w-full max-w-[98vw] h-[98vh] shadow-2xl rounded-sm flex flex-col">
                                            <div className="flex justify-between items-center p-2 border-b border-slate-200 bg-slate-50">
                                                <div className="flex items-center gap-2 font-bold text-xs text-black uppercase">
                                                    <CircleDot className="w-4 h-4" /> {editingLocId ? 'Edit Location Name' : 'Location Name'}
                                                </div>
                                                <button onClick={() => setShowLocationModal(false)} className="text-black p-1"><X className="w-4 h-4" /></button>
                                            </div>
                                            <form onSubmit={handleLocSubmit} className="p-6 grid grid-cols-2 gap-x-12 gap-y-4 text-xs">
                                                <input type="text" placeholder="Location Name" className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium"
                                                    value={locForm.name} onChange={e => setLocForm({ ...locForm, name: e.target.value })} required />

                                                <input type="text" placeholder="Location Name (BN)" className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium"
                                                    value={locForm.locationNameBn} onChange={e => setLocForm({ ...locForm, locationNameBn: e.target.value })} />

                                                <div className="flex gap-2">
                                                    <label className="bg-white border border-slate-300 px-3 py-1 cursor-pointer hover:bg-slate-50 font-bold self-start">
                                                        Choose File
                                                        <input type="file" className="hidden" onChange={e => setLocForm({ ...locForm, image: e.target.files?.[0] || null })} />
                                                    </label>
                                                    <span className="text-black self-center truncate max-w-[150px]">{locForm.image ? locForm.image.name : 'No file chosen'}</span>
                                                </div>

                                                {/* Edit Preview */}
                                                <div className="w-16 h-16 border border-slate-200 mt-2 bg-white rounded-sm overflow-hidden flex items-center justify-center">
                                                    {locForm.image ? (
                                                        <img src={URL.createObjectURL(locForm.image)} className="w-full h-full object-cover" />
                                                    ) : (editingLocId && locations.find(l => l._id === editingLocId)?.image) ? (
                                                        <img src={getImageUrl(locations.find(l => l._id === editingLocId)?.image)} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="text-[10px] text-slate-400">Preview</div>
                                                    )}
                                                </div>

                                                <div className="bg-[#f0f0f0] border border-slate-300 text-black px-2 py-1.5 text-center">
                                                    {new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB')}
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <span className="text-black font-bold">Status</span>
                                                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-black">
                                                        <input type="radio" checked={locForm.status} onChange={() => setLocForm({ ...locForm, status: true })} className="w-3 h-3 accent-blue-600" /> Yes
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-black">
                                                        <input type="radio" checked={!locForm.status} onChange={() => setLocForm({ ...locForm, status: false })} className="w-3 h-3 accent-blue-600" /> No
                                                    </label>
                                                </div>

                                                <input type="number" placeholder="Ordering" className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium"
                                                    value={locForm.order} onChange={e => setLocForm({ ...locForm, order: Number(e.target.value) })} />

                                                <div className="flex gap-2 h-max self-end">
                                                    <button type="submit" className="bg-[#127ef3] text-white flex-1 py-2 font-bold rounded-sm border border-blue-800 shadow-inner px-12">
                                                        Save
                                                    </button>
                                                    <button type="button" onClick={() => setShowLocationModal(false)} className="bg-white text-black px-8 py-2 font-bold rounded-sm border border-slate-300">
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
        </div>
    );
}
