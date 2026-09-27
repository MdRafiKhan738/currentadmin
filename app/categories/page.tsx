"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Search, Plus, Trash2, Edit2, CheckCircle2,
    Shuffle, X, Calendar, CircleDot, Loader2, Home, Minus,
    CheckCircle, XCircle, ChevronLeft, ChevronDown
} from 'lucide-react';
import axios from 'axios';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '@/utils/apiConfig';
import { getImageUrl } from '@/utils/imageUrl';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface Feature {
    _id: string;
    name: string;
    inputType: string;
    order: number;
    status: boolean;
    buttonType?: string;
    selectionType?: 'Single' | 'Multi';
    boxFadeName?: string;
    buttonItemNames?: string[];
    subcategory?: SubCategory;
}

interface Category {
    _id: string;
    name: string;
    categoryNameBn?: string;
    inputType: string;
    order: number;
    status: boolean;
    icon?: string;
}

interface SubCategory {
    _id: string;
    name: string;
    subCategoryNameBn?: string;
    category: Category;
    features?: Feature[];
    buttonType?: string;
    freePost?: number;
    order: number;
    status: boolean;
    image?: string;
    priceBoxShow: boolean;
    priceBoxName?: string;
    tags: string[];
    createdAt: string;
    createdBy?: { adminName: string };
}

export default function CategoriesPage() {
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [features, setFeatures] = useState<Feature[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal States
    const [showMainModal, setShowMainModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showFeatureModal, setShowFeatureModal] = useState(false);

    const [editingSubCatId, setEditingSubCatId] = useState<string | null>(null);
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [editingFeatId, setEditingFeatId] = useState<string | null>(null);

    // Form States - SubCategory (Main Modal)
    const [subCatForm, setSubCatForm] = useState({
        names: [''], // Multiple names support
        nameBns: [''],
        category: '',
        features: [''], // Multiple features support
        buttonType: 'Call, Message, Send CV',
        freePost: 1,
        order: 1,
        status: true,
        priceBoxShow: false,
        priceBoxName: '',
        tags: [''],
        image: null as File | null,
    });

    // Form States - Category
    const [catForm, setCatForm] = useState({
        name: '',
        categoryNameBn: '',
        inputType: 'Text',
        order: 1,
        status: true,
        icon: null as File | null,
        investmentEnabled: false,
        minInvestment: 0,
        maxInvestment: 0,
        expectedReturn: 0,
    });

    // Form States - Feature
    const [featForm, setFeatForm] = useState({
        name: '',
        subcategory: '',
        inputType: 'Text',
        order: 1,
        status: true,
        buttonType: '',
        selectionType: 'Single' as 'Single' | 'Multi',
        boxFadeName: '',
        buttonItemNames: [''],
    });

    const [isSaving, setIsSaving] = useState(false);
    const [showButtonTypeDropdown, setShowButtonTypeDropdown] = useState(false);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            const [scRes, cRes, fRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/categories/sub`),
                axios.get(`${API_BASE_URL}/api/categories`),
                axios.get(`${API_BASE_URL}/api/categories/features`)
            ]);
            setSubCategories((scRes.data.data || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
            setCategories((cRes.data.data || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
            setFeatures((fRes.data.data || []).sort((a: any, b: any) => {
                const subA = a.subcategory?.name || "";
                const subB = b.subcategory?.name || "";
                if (subA !== subB) return subA.localeCompare(subB);
                return (a.order || 0) - (b.order || 0);
            }));
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubCatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const token = Cookies.get('adminToken');

        try {
            const formData = new FormData();
            subCatForm.names.forEach((nameValue: string, index: number) => {
                const trimmedName = nameValue.trim();
                if (!trimmedName) return;

                formData.append('name', trimmedName);
                formData.append('subCategoryNameBn', (subCatForm.nameBns[index] || '').trim());
            });
            formData.append('category', subCatForm.category);
            formData.append('features', JSON.stringify(subCatForm.features.filter(f => f.trim())));
            formData.append('buttonType', subCatForm.buttonType);
            formData.append('freePost', String(subCatForm.freePost));
            formData.append('order', String(subCatForm.order));
            formData.append('status', String(subCatForm.status));
            formData.append('priceBoxShow', String(subCatForm.priceBoxShow));
            formData.append('priceBoxName', subCatForm.priceBoxName);
            subCatForm.tags.filter(t => t.trim()).forEach(tag => formData.append('tags', tag));
            if (subCatForm.image) formData.append('image', subCatForm.image);

            if (editingSubCatId) {
                await axios.put(`${API_BASE_URL}/api/categories/sub/${editingSubCatId}`, formData, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('SubCategory updated');
            } else {
                await axios.post(`${API_BASE_URL}/api/categories/sub`, formData, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('SubCategory created');
            }
            setShowMainModal(false);
            setEditingSubCatId(null);
            fetchAllData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error saving SubCategory');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const token = Cookies.get('adminToken');
        try {
            const formData = new FormData();
            formData.append('name', catForm.name);
            formData.append('categoryNameBn', catForm.categoryNameBn);
            formData.append('inputType', catForm.inputType);
            formData.append('order', String(catForm.order));
            formData.append('status', String(catForm.status));
            if (catForm.icon) formData.append('icon', catForm.icon);
            formData.append('investmentEnabled', String(catForm.investmentEnabled));
            formData.append('minInvestment', String(catForm.minInvestment || 0));
            formData.append('maxInvestment', String(catForm.maxInvestment || 0));
            formData.append('expectedReturn', String(catForm.expectedReturn || 0));

            if (editingCatId) {
                await axios.put(`${API_BASE_URL}/api/categories/${editingCatId}`, formData, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('Category updated');
            } else {
                await axios.post(`${API_BASE_URL}/api/categories`, formData, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('Category created');
            }
            setShowCategoryModal(false);
            setEditingCatId(null);
            fetchAllData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error saving Category');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFeatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const token = Cookies.get('adminToken');
        try {
            const payload = {
                ...featForm,
                subcategory: featForm.subcategory,
                buttonItemNames: featForm.buttonItemNames.filter(n => n.trim())
            };
            if (editingFeatId) {
                await axios.put(`${API_BASE_URL}/api/categories/features/${editingFeatId}`, payload, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('Feature updated');
            } else {
                await axios.post(`${API_BASE_URL}/api/categories/features`, payload, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('Feature created');
            }
            setShowFeatureModal(false);
            setEditingFeatId(null);
            fetchAllData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error saving Feature');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, type: 'sub' | 'cat' | 'feat') => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        const token = Cookies.get('adminToken');
        const urlMap = {
            sub: `${API_BASE_URL}/api/categories/sub/${id}`,
            cat: `${API_BASE_URL}/api/categories/${id}`,
            feat: `${API_BASE_URL}/api/categories/features/${id}`
        };
        try {
            await axios.delete(urlMap[type], { headers: { 'x-auth-token': token } });
            toast.success('Deleted successfully');
            fetchAllData();
        } catch (error: any) {
            toast.error('Failed to delete');
        }
    };

    const handleEditSubCat = (sc: SubCategory) => {
        setEditingSubCatId(sc._id);
        setSubCatForm({
            names: [sc.name],
            nameBns: [sc.subCategoryNameBn || ''],
            category: sc.category._id,
            features: sc.features?.length ? sc.features.map(f => f._id) : [''],
            buttonType: sc.buttonType || 'Call, Message, Send CV',
            freePost: Number(sc.freePost) || 0,
            order: sc.order,
            status: sc.status,
            priceBoxShow: sc.priceBoxShow || false,
            priceBoxName: sc.priceBoxName || '',
            tags: sc.tags.length > 0 ? sc.tags : [''],
            image: null,
        });
        setShowMainModal(true);
    };

    const handleEditCat = (c: Category) => {
        setEditingCatId(c._id);
        setCatForm({
            name: c.name,
            categoryNameBn: c.categoryNameBn || '',
            inputType: c.inputType,
            order: c.order,
            status: c.status,
            icon: null,
            investmentEnabled: Boolean((c as Category & { investmentEnabled?: boolean }).investmentEnabled),
            minInvestment: Number((c as Category & { minInvestment?: number }).minInvestment) || 0,
            maxInvestment: Number((c as Category & { maxInvestment?: number }).maxInvestment) || 0,
            expectedReturn: Number((c as Category & { expectedReturn?: number }).expectedReturn) || 0,
        });
        setShowCategoryModal(true);
    };

    const handleEditFeat = (f: Feature) => {
        setEditingFeatId(f._id);
        setFeatForm({
            name: f.name,
            subcategory: f.subcategory?._id || '',
            inputType: f.inputType,
            order: f.order,
            status: f.status,
            buttonType: f.buttonType || '',
            selectionType: f.selectionType || 'Single',
            boxFadeName: f.boxFadeName || '',
            buttonItemNames: f.buttonItemNames?.length ? f.buttonItemNames : [''],
        });
        setShowFeatureModal(true);
    };

    const openNewSubCat = () => {
        setEditingSubCatId(null);
        setSubCatForm({
            names: [''],
            nameBns: [''],
            category: '',
            features: [''],
            buttonType: 'Call, Message, Send CV',
            freePost: 1,
            order: 1,
            status: true,
            priceBoxShow: false,
            priceBoxName: '',
            tags: [''],
            image: null,
        });
        setShowMainModal(true);
    };

    const openNewCat = () => {
        setEditingCatId(null);
        setCatForm({
            name: '',
            categoryNameBn: '',
            inputType: 'Text',
            order: 1,
            status: true,
            icon: null,
            investmentEnabled: false,
            minInvestment: 0,
            maxInvestment: 0,
            expectedReturn: 0,
        });
        setShowCategoryModal(true);
    };

    const openNewFeat = () => {
        setEditingFeatId(null);
        setFeatForm({
            name: '',
            subcategory: '',
            inputType: 'Text',
            order: 1,
            status: true,
            buttonType: '',
            selectionType: 'Single',
            boxFadeName: '',
            buttonItemNames: [''],
        });
        setShowFeatureModal(true);
    };

    const filteredSubCategories = subCategories.filter(sc =>
        sc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sc.subCategoryNameBn || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        sc.category?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sc.category?.categoryNameBn || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-[#f1f5f9] min-h-screen p-4 font-['Tahoma','Verdana',sans-serif]">
            {/* Breadcrumb Area */}
            <div className="flex items-center gap-1.5 text-xs text-black mb-3 ml-1">
                <Home className="w-3 h-3" />
                <span>/</span>
                <span>Manage SubCategories</span>
            </div>

            {/* Header Area */}
            <div className="bg-white rounded-t-lg border border-slate-200 p-2.5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button className="text-rose-500 hover:opacity-80 transition-opacity">
                        <ArrowLeft className="w-4 h-4 stroke-[3]" />
                    </button>
                    <span className="text-indigo-600 font-bold text-sm tracking-tight">SubCategories</span>
                </div>

                <div className="text-black text-xs font-medium">
                    Total Sub Categories <span className="font-bold">({subCategories.length})</span>
                </div>

                <button
                    onClick={openNewSubCat}
                    className="bg-[#2ecc71] hover:bg-[#27ae60] text-white p-1 rounded transition-all shadow-sm"
                >
                    <Plus className="w-4 h-4 stroke-[3]" />
                </button>
            </div>

            {/* Table Area */}
            <div className="bg-white border-x border-b border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-white text-black font-bold border-b border-slate-100">
                                <th className="px-5 py-3 font-bold w-1/4">Sub Category name</th>
                                <th className="px-5 py-3 font-bold">Category name</th>
                                <th className="px-5 py-3 font-bold">Button Type</th>
                                <th className="px-5 py-3 font-bold text-center w-24">Free Post</th>
                                <th className="px-5 py-3 font-bold text-center w-24">Order</th>
                                <th className="px-5 py-3 font-bold text-center w-24">Status</th>
                                <th className="px-5 py-3 font-bold w-48">Entry date</th>
                                <th className="px-5 py-3 font-bold">Created by</th>
                                <th className="px-5 py-3 text-center w-12"><Edit2 className="w-3.5 h-3.5 mx-auto" /></th>
                                <th className="px-5 py-3 text-center w-12"><Trash2 className="w-3.5 h-3.5 mx-auto" /></th>
                            </tr>
                        </thead>
                        <tbody className="text-black">
                            {isLoading ? (
                                <tr><td colSpan={10} className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
                            ) : filteredSubCategories.length === 0 ? (
                                <tr><td colSpan={10} className="py-12 text-center text-black italic">No subcategories found</td></tr>
                            ) : filteredSubCategories.map((sc) => (
                                <tr key={sc._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-2.5 text-black">
                                        <div>{sc.name}</div>
                                        {sc.subCategoryNameBn && <div className="text-[11px] text-slate-500">{sc.subCategoryNameBn}</div>}
                                    </td>
                                    <td className="px-5 py-2.5 text-black">
                                        <div>{sc.category?.name}</div>
                                        {sc.category?.categoryNameBn && <div className="text-[11px] text-slate-500">{sc.category.categoryNameBn}</div>}
                                    </td>
                                    <td className="px-5 py-2.5 text-black">
                                        <div className="flex flex-wrap gap-1">
                                            {sc.buttonType?.split(',').map(t => (
                                                <span key={t} className="bg-slate-100 px-1 rounded-sm text-[10px] uppercase font-medium">{t.trim()}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-5 py-2.5 text-center">{sc.freePost || 0}</td>
                                    <td className="px-5 py-2.5 text-center">{sc.order}</td>
                                    <td className="px-5 py-2.5 text-center">
                                        {sc.status ? (
                                            <CheckCircle2 className="w-4 h-4 text-[#2ecc71] mx-auto fill-emerald-50" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-[#e74c3c] mx-auto fill-rose-50" />
                                        )}
                                    </td>
                                    <td className="px-5 py-2.5 text-black">
                                        {new Date(sc.createdAt).toLocaleDateString('en-GB') + ' ' + new Date(sc.createdAt).toLocaleTimeString('en-GB')}
                                    </td>
                                    <td className="px-5 py-2.5 text-black">{sc.createdBy?.adminName || 'System'}</td>
                                    <td className="px-5 py-2.5 text-center">
                                        <button onClick={() => handleEditSubCat(sc)} className="text-black hover:text-indigo-600 transition-colors">
                                            <Edit2 className="w-3.5 h-3.5 mx-auto" strokeWidth={2.5} />
                                        </button>
                                    </td>
                                    <td className="px-5 py-2.5 text-center">
                                        <button onClick={() => handleDelete(sc._id, 'sub')} className="text-black hover:text-rose-500 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5 mx-auto" strokeWidth={2.5} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Main Modal - New Category */}
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
                                    <CircleDot className="w-4 h-4" /> {editingSubCatId ? 'Edit category' : 'New category'}
                                </div>
                                <button onClick={() => setShowMainModal(false)} className="hover:bg-slate-200 p-1 rounded transition-colors text-black">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-4 flex gap-6 overflow-hidden flex-1">
                                {/* Left/Middle Column Form */}
                                <form onSubmit={handleSubCatSubmit} className="flex-1 grid grid-cols-2 gap-x-6 gap-y-3 text-xs overflow-y-auto pr-4 custom-scrollbar">
                                    {/* Sub Category Name */}
                                    <div className="space-y-1 col-span-1">
                                        <label className="text-black font-bold">Sub Catagorie Name</label>
                                        <div className="flex flex-col gap-1.5">
                                            {subCatForm.names.map((name: string, index: number) => (
                                                <div key={index} className="flex gap-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Sub Category Name (EN)"
                                                        className="flex-1 border border-slate-300 px-2 py-1.5 outline-none font-medium bg-[#f9fbff]"
                                                        value={name}
                                                        onChange={e => {
                                                            const newNames = [...subCatForm.names];
                                                            newNames[index] = e.target.value;
                                                            setSubCatForm({ ...subCatForm, names: newNames });
                                                        }}
                                                        required
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Sub Category Name (BN)"
                                                        className="flex-1 border border-slate-300 px-2 py-1.5 outline-none font-medium bg-[#f9fbff]"
                                                        value={subCatForm.nameBns[index] || ''}
                                                        onChange={e => {
                                                            const newNameBns = [...subCatForm.nameBns];
                                                            newNameBns[index] = e.target.value;
                                                            setSubCatForm({ ...subCatForm, nameBns: newNameBns });
                                                        }}
                                                    />
                                                    {index === subCatForm.names.length - 1 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSubCatForm({
                                                                ...subCatForm,
                                                                names: [...subCatForm.names, ''],
                                                                nameBns: [...subCatForm.nameBns, '']
                                                            })}
                                                            className="p-1 px-2 border border-slate-900 bg-white hover:bg-slate-50"
                                                        >
                                                            <Plus className="w-3 h-3 stroke-[3]" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSubCatForm({
                                                                ...subCatForm,
                                                                names: subCatForm.names.filter((_: string, i: number) => i !== index),
                                                                nameBns: subCatForm.nameBns.filter((_: string, i: number) => i !== index)
                                                            })}
                                                            className="p-1 px-2 border border-slate-900 bg-white hover:bg-slate-50"
                                                        >
                                                            <Minus className="w-3 h-3 stroke-[3]" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Button Type */}
                                    <div className="space-y-1 col-span-1">
                                        <label className="text-black font-bold">Button Type</label>
                                        <div className="relative">
                                            <div
                                                className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium bg-[#f9fbff] flex items-center justify-between cursor-pointer min-h-[32px]"
                                                onClick={() => setShowButtonTypeDropdown(!showButtonTypeDropdown)}
                                            >
                                                <div className="flex flex-wrap gap-1">
                                                    {subCatForm.buttonType ? subCatForm.buttonType.split(',').map(t => (
                                                        <span key={t.trim()} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-sm text-[10px] flex items-center gap-1 font-bold">
                                                            {t.trim()}
                                                        </span>
                                                    )) : <span className="text-slate-400">Select...</span>}
                                                </div>
                                                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showButtonTypeDropdown && "rotate-180")} />
                                            </div>
                                            {showButtonTypeDropdown && (
                                                <>
                                                    <div className="fixed inset-0 z-[110]" onClick={() => setShowButtonTypeDropdown(false)} />
                                                    <div className="absolute top-full left-0 w-full bg-white border border-slate-300 shadow-xl z-[120] mt-1 rounded-sm py-1 overflow-hidden">
                                                        {['Call', 'Message', 'Send CV'].map(type => {
                                                            const isSelected = subCatForm.buttonType.split(',').map(t => t.trim()).includes(type);
                                                            return (
                                                                <label key={type} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer transition-colors group">
                                                                    <div className={cn(
                                                                        "w-3.5 h-3.5 border rounded-[2px] flex items-center justify-center transition-all",
                                                                        isSelected ? "bg-blue-600 border-blue-600" : "border-slate-300 group-hover:border-blue-400"
                                                                    )}>
                                                                        {isSelected && <CheckCircle2 className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                                                                    </div>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="hidden"
                                                                        checked={isSelected}
                                                                        onChange={() => {
                                                                            let types = subCatForm.buttonType.split(',').map(t => t.trim()).filter(Boolean);
                                                                            if (isSelected) {
                                                                                types = types.filter(t => t !== type);
                                                                            } else {
                                                                                types.push(type);
                                                                            }
                                                                            setSubCatForm({ ...subCatForm, buttonType: types.join(', ') });
                                                                        }}
                                                                    />
                                                                    <span className={cn("text-xs transition-colors", isSelected ? "text-blue-700 font-bold" : "text-black")}>
                                                                        {type}
                                                                    </span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Categories Dropdown */}
                                    <div className="space-y-1 col-span-1">
                                        <label className="text-black font-bold">Catagorie</label>
                                        <select className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium bg-white"
                                            value={subCatForm.category} onChange={e => setSubCatForm({ ...subCatForm, category: e.target.value })} required>
                                            <option value="">Select Category</option>
                                            {categories.map(c => <option key={c._id} value={c._id}>{c.name}{c.categoryNameBn ? ` (${c.categoryNameBn})` : ''}</option>)}
                                        </select>
                                    </div>

                                    {/* Free Post */}
                                    <div className="space-y-1 col-span-1">
                                        <label className="text-black font-bold">Free Post</label>
                                        <input type="number" className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium bg-[#f9fbff]"
                                            value={subCatForm.freePost} onChange={e => setSubCatForm({ ...subCatForm, freePost: Number(e.target.value) })} />
                                    </div>

                                    {/* Feature Name */}
                                    <div className="space-y-1 col-span-1">
                                        <label className="text-black font-bold">Feature Name</label>
                                        <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                            {subCatForm.features.map((featureId, index) => (
                                                <div key={index} className="flex gap-1">
                                                    <select
                                                        className="flex-1 border border-slate-300 px-2 py-1.5 outline-none font-medium bg-white"
                                                        value={featureId}
                                                        onChange={e => {
                                                            const newFeatures = [...subCatForm.features];
                                                            newFeatures[index] = e.target.value;
                                                            setSubCatForm({ ...subCatForm, features: newFeatures });
                                                        }}
                                                    >
                                                        <option value="">Select Feature</option>
                                                        {features.map(f => (
                                                            <option key={f._id} value={f._id}>
                                                                {f.name}{f.subcategory?.name ? ` - (${f.subcategory.name}${f.subcategory?.subCategoryNameBn ? ` / ${f.subcategory.subCategoryNameBn}` : ''})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {index === subCatForm.features.length - 1 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSubCatForm({ ...subCatForm, features: [...subCatForm.features, ''] })}
                                                            className="p-1 px-2 border border-slate-900 bg-white hover:bg-slate-50"
                                                        >
                                                            <Plus className="w-3 h-3 stroke-[3]" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSubCatForm({ ...subCatForm, features: subCatForm.features.filter((_, i) => i !== index) })}
                                                            className="p-1 px-2 border border-slate-900 bg-white hover:bg-slate-50"
                                                        >
                                                            <Minus className="w-3 h-3 stroke-[3]" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* PriceBox Section */}
                                    <div className="space-y-1 col-span-1">
                                        <div className="flex items-center gap-4 py-1">
                                            <span className="text-black font-bold">PriceBox Show</span>
                                            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-black text-[13px]">
                                                <input type="radio" checked={subCatForm.priceBoxShow} onChange={() => setSubCatForm({ ...subCatForm, priceBoxShow: true })} className="w-3.5 h-3.5 accent-blue-600" /> Yes
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-black text-[13px]">
                                                <input type="radio" checked={!subCatForm.priceBoxShow} onChange={() => setSubCatForm({ ...subCatForm, priceBoxShow: false })} className="w-3.5 h-3.5 accent-blue-600" /> No
                                            </label>
                                        </div>
                                        {subCatForm.priceBoxShow && (
                                            <input
                                                type="text"
                                                placeholder="PriceBox Name"
                                                className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium bg-white text-black text-[13px]"
                                                value={subCatForm.priceBoxName}
                                                onChange={e => setSubCatForm({ ...subCatForm, priceBoxName: e.target.value })}
                                            />
                                        )}
                                    </div>
                                    {/* Order */}
                                    <div className="space-y-1 col-span-1">
                                        <label className="text-black font-bold text-[13px]">Order</label>
                                        <input type="number" className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium bg-[#f9fbff] text-black text-[13px]"
                                            value={subCatForm.order} onChange={e => setSubCatForm({ ...subCatForm, order: Number(e.target.value) })} />
                                    </div>
                                    {/* Date and File */}
                                    <div className="space-y-1 col-span-1 flex flex-col justify-end">
                                        <div className="bg-[#f0f0f0] border border-slate-300 text-black px-2 py-1.5 text-center mb-1">
                                            {new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB')}
                                        </div>
                                        <div className="flex gap-1">
                                            <label className="bg-white border border-slate-300 px-2 py-1 cursor-pointer hover:bg-slate-50 font-bold whitespace-nowrap">
                                                Choose File
                                                <input type="file" className="hidden" onChange={e => setSubCatForm({ ...subCatForm, image: e.target.files?.[0] || null })} />
                                            </label>
                                            <span className="text-black self-center truncate max-w-[100px]">{subCatForm.image ? subCatForm.image.name : 'No file chosen'}</span>
                                        </div>

                                        {/* Image Preview */}
                                        <div className="mt-2 h-20 w-20 border border-slate-200 self-end overflow-hidden bg-white rounded-sm flex items-center justify-center">
                                            {subCatForm.image ? (
                                                <img src={URL.createObjectURL(subCatForm.image)} className="w-full h-full object-cover" />
                                            ) : (editingSubCatId && subCategories.find(s => s._id === editingSubCatId)?.image) ? (
                                                <img src={getImageUrl(subCategories.find(s => s._id === editingSubCatId)?.image)} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-[10px] text-slate-400">Preview</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="col-span-1"></div>
                                    <div className="col-span-1 flex items-center gap-4 py-1">
                                        <span className="text-black font-bold">Status</span>
                                        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-black">
                                            <input type="radio" name="subcat-status" checked={subCatForm.status} onChange={() => setSubCatForm({ ...subCatForm, status: true })} className="w-3 h-3 accent-blue-600" /> Yes
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer font-bold text-black">
                                            <input type="radio" name="subcat-status" checked={!subCatForm.status} onChange={() => setSubCatForm({ ...subCatForm, status: false })} className="w-3 h-3 accent-blue-600" /> No
                                        </label>
                                    </div>

                                    {/* Form Buttons */}
                                    <div className="col-span-2 pt-6 flex gap-2">
                                        <button type="submit" className="bg-[#127ef3] text-white flex-1 py-1.5 font-bold rounded-sm border border-blue-800 hover:bg-blue-600 shadow-inner">
                                            {isSaving ? 'Processing...' : 'Save'}
                                        </button>
                                        <button type="button" onClick={() => setShowMainModal(false)} className="bg-white text-black px-6 py-1.5 font-bold rounded-sm border border-slate-300 hover:bg-slate-50">
                                            Cancel
                                        </button>
                                    </div>
                                </form>

                                {/* Right Column Tables */}
                                <div className="w-[450px] flex flex-col gap-4 border-l border-slate-200 pl-6 h-full overflow-y-auto pr-2 custom-scrollbar">
                                    {/* Category Section */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-xs font-bold text-black uppercase tracking-tighter">Create Catagorie</span>
                                            <button onClick={openNewCat} className="bg-white border border-slate-400 p-0.5 px-2 hover:bg-slate-50">
                                                <Plus className="w-3 h-3 stroke-[3]" />
                                            </button>
                                        </div>
                                        <div className="border border-slate-200 rounded-sm max-h-[280px] overflow-y-auto custom-scrollbar">
                                            <table className="w-full text-xs text-left border-collapse">
                                                <thead className="bg-[#f8f9fa] border-b border-slate-200 sticky top-0 z-10 transition-colors shadow-sm">
                                                    <tr>
                                                        <th className="px-2 py-2 font-bold whitespace-nowrap text-center w-10 bg-[#f8f9fa]">Icon</th>
                                                        <th className="px-2 py-2 font-bold whitespace-nowrap bg-[#f8f9fa]">Catagorie Name</th>
                                                        <th className="px-2 py-2 font-bold whitespace-nowrap bg-[#f8f9fa]">Catagorie Name (BN)</th>
                                                        <th className="px-2 py-2 font-bold bg-[#f8f9fa]">Inpute</th>
                                                        <th className="px-2 py-2 font-bold text-center bg-[#f8f9fa]">Order</th>
                                                        <th className="px-2 py-2 font-bold text-center bg-[#f8f9fa]">Status</th>
                                                        <th className="w-6 px-1 py-2 text-center bg-[#f8f9fa]"></th>
                                                        <th className="w-6 px-1 py-2 text-center bg-[#f8f9fa]"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {categories.map(c => (
                                                        <tr key={c._id}>
                                                            <td className="px-2 py-1.5 align-middle">
                                                                {c.icon ? (
                                                                    <div className="w-6 h-6 rounded border border-slate-200 overflow-hidden mx-auto bg-white">
                                                                        <img src={getImageUrl(c.icon)} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-6 h-6 rounded border border-slate-200 bg-slate-50 mx-auto" />
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-1.5 font-bold text-black">{c.name}</td>
                                                            <td className="px-2 py-1.5 text-slate-500">{c.categoryNameBn || '-'}</td>
                                                            <td className="px-2 py-1.5">{c.inputType}</td>
                                                            <td className="px-2 py-1.5 text-center">{c.order}</td>
                                                            <td className="px-2 py-1.5 text-center">
                                                                <CheckCircle2 className={cn("w-3 h-3 mx-auto", c.status ? "text-green-500" : "text-black")} />
                                                            </td>
                                                            <td className="px-1 py-1.5"><Edit2 onClick={() => handleEditCat(c)} className="w-3 h-3 text-black cursor-pointer" /></td>
                                                            <td className="px-1 py-1.5"><Trash2 onClick={() => handleDelete(c._id, 'cat')} className="w-3 h-3 text-black cursor-pointer" /></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Feature Section */}
                                    <div className="space-y-2 pb-4">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-xs font-bold text-black uppercase tracking-tighter">Create Feature</span>
                                            <button onClick={openNewFeat} className="bg-white border border-slate-400 p-0.5 px-2 hover:bg-slate-50">
                                                <Plus className="w-3 h-3 stroke-[3]" />
                                            </button>
                                        </div>
                                        <div className="border border-slate-200 rounded-sm max-h-[350px] overflow-y-auto custom-scrollbar">
                                            <table className="w-full text-xs text-left border-collapse">
                                                <thead className="bg-[#f8f9fa] border-b border-slate-200 sticky top-0 z-10 transition-colors shadow-sm">
                                                    <tr>
                                                        <th className="px-2 py-2 font-bold whitespace-nowrap bg-[#f8f9fa]">Feature name</th>
                                                        <th className="px-2 py-2 font-bold bg-[#f8f9fa]">SubCategory</th>
                                                        <th className="px-2 py-2 font-bold text-center bg-[#f8f9fa]">Order</th>
                                                        <th className="px-2 py-2 font-bold text-center bg-[#f8f9fa]">Status</th>
                                                        <th className="w-6 px-1 py-2 text-center bg-[#f8f9fa]"></th>
                                                        <th className="w-6 px-1 py-2 text-center bg-[#f8f9fa]"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {features.map(f => (
                                                        <tr key={f._id}>
                                                            <td className="px-2 py-1.5 font-bold text-black">{f.name}</td>
                                                            <td className="px-2 py-1.5">{f.subcategory?.name}</td>
                                                            <td className="px-2 py-1.5 text-center">{f.order}</td>
                                                            <td className="px-2 py-1.5 text-center">
                                                                <CheckCircle2 className={cn("w-3 h-3 mx-auto", f.status ? "text-green-500" : "text-black")} />
                                                            </td>
                                                            <td className="px-1 py-1.5"><Edit2 onClick={() => handleEditFeat(f)} className="w-3 h-3 text-black cursor-pointer" /></td>
                                                            <td className="px-1 py-1.5"><Trash2 onClick={() => handleDelete(f._id, 'feat')} className="w-3 h-3 text-black cursor-pointer" /></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Nested - Create Category Modal */}
                            <AnimatePresence>
                                {showCategoryModal && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                        className="absolute -bottom-5 left-0 w-full p-4 flex justify-center z-[110]"
                                    >
                                        <div className="bg-white border border-slate-900 w-full max-w-[98vw] h-[98vh] shadow-2xl rounded-sm flex flex-col">
                                            <div className="flex justify-between items-center p-2 border-b border-slate-200 bg-slate-50">
                                                <div className="flex items-center gap-2 font-bold text-xs text-black uppercase">
                                                    <CircleDot className="w-4 h-4" /> {editingCatId ? 'Edit Catagorie' : 'Catagorie Name'}
                                                </div>
                                                <button onClick={() => setShowCategoryModal(false)} className="text-black p-1"><X className="w-4 h-4" /></button>
                                            </div>
                                            <form onSubmit={handleCatSubmit} className="p-4 grid grid-cols-2 gap-x-12 gap-y-3 text-xs">
                                                <div className="space-y-1">
                                                    <input type="text" placeholder="Catagorie Name" className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium bg-white"
                                                        value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required />
                                                    <input type="text" placeholder="Catagorie Name (BN)" className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium bg-white"
                                                        value={catForm.categoryNameBn} onChange={e => setCatForm({ ...catForm, categoryNameBn: e.target.value })} />
                                                </div>
                                                <div className="flex gap-2">
                                                    <label className="bg-white border border-slate-300 px-3 py-1 cursor-pointer hover:bg-slate-50 font-bold self-start">
                                                        Choose File
                                                        <input type="file" className="hidden" onChange={e => setCatForm({ ...catForm, icon: e.target.files?.[0] || null })} />
                                                    </label>
                                                    <span className="text-black self-center">{catForm.icon ? catForm.icon.name : 'No file chosen'}</span>
                                                </div>

                                                {/* Edit Preview */}
                                                <div className="w-16 h-16 border border-slate-200 mt-2 bg-white rounded-sm overflow-hidden flex items-center justify-center">
                                                    {catForm.icon ? (
                                                        <img src={URL.createObjectURL(catForm.icon)} className="w-full h-full object-cover" />
                                                    ) : (editingCatId && categories.find(c => c._id === editingCatId)?.icon) ? (
                                                        <img src={getImageUrl(categories.find(c => c._id === editingCatId)?.icon)} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="text-[10px] text-slate-400">Icon</div>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="border border-slate-200 px-2 py-1.5 bg-[#f4f4f4] text-black">
                                                        {new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB')}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-black font-bold lowercase">Status</span>
                                                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-black">
                                                        <input type="radio" checked={catForm.status} onChange={() => setCatForm({ ...catForm, status: true })} className="w-3 h-3 accent-blue-600" /> Yes
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-black">
                                                        <input type="radio" checked={!catForm.status} onChange={() => setCatForm({ ...catForm, status: false })} className="w-3 h-3 accent-blue-600" /> No
                                                    </label>
                                                </div>
                                                <div className="space-y-1">
                                                    <input type="number" placeholder="Ordering" className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium bg-white text-black"
                                                        value={catForm.order} onChange={e => setCatForm({ ...catForm, order: Number(e.target.value) })} />
                                                </div>

                                                <div className="flex gap-2 h-max self-end mt-1">
                                                <div className="col-span-2 rounded border border-slate-200 bg-slate-50 p-3 space-y-3">
                                                    <div className="font-bold text-black">Investment Configuration</div>
                                                    <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={catForm.investmentEnabled} onChange={e=>setCatForm({...catForm,investmentEnabled:e.target.checked})}/> Investment Enabled</label>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <input type="number" min="0" placeholder="Min Investment" className="border border-slate-300 px-2 py-1.5" value={catForm.minInvestment} onChange={e=>setCatForm({...catForm,minInvestment:Number(e.target.value)})}/>
                                                        <input type="number" min="0" placeholder="Max Investment" className="border border-slate-300 px-2 py-1.5" value={catForm.maxInvestment} onChange={e=>setCatForm({...catForm,maxInvestment:Number(e.target.value)})}/>
                                                        <input type="number" min="0" step="0.01" placeholder="Expected Return %" className="border border-slate-300 px-2 py-1.5" value={catForm.expectedReturn} onChange={e=>setCatForm({...catForm,expectedReturn:Number(e.target.value)})}/>
                                                    </div>
                                                </div>
                                                    <button type="submit" className="bg-[#127ef3] text-white flex-1 py-1.5 font-bold rounded-sm border border-blue-800 shadow-inner px-12">
                                                        Save
                                                    </button>
                                                    <button type="button" onClick={() => setShowCategoryModal(false)} className="bg-white text-black px-8 py-1.5 font-bold rounded-sm border border-slate-300">
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Nested - Create Feature Modal */}
                            <AnimatePresence>
                                {showFeatureModal && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                        className="absolute -bottom-5 left-0 w-full p-4 flex justify-center z-[110]"
                                    >
                                        <div className="bg-white border border-slate-900 w-full max-w-[98vw] h-[98vh] shadow-2xl rounded-sm flex flex-col">
                                            <div className="flex justify-between items-center p-2 border-b border-slate-200 bg-slate-50">
                                                <div className="flex items-center gap-2 font-bold text-xs text-black uppercase">
                                                    <CircleDot className="w-4 h-4" /> New Feature
                                                </div>
                                                <button onClick={() => setShowFeatureModal(false)} className="text-black p-1"><X className="w-4 h-4" /></button>
                                            </div>
                                            <form onSubmit={handleFeatSubmit} className="p-4 grid grid-cols-2 gap-x-12 gap-y-3 text-xs">
                                                <div className="space-y-1">
                                                    <input type="text" placeholder="Feature Name" className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium"
                                                        value={featForm.name} onChange={e => setFeatForm({ ...featForm, name: e.target.value })} required />
                                                </div>
                                                <div className="space-y-1">
                                                    <select className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium bg-white"
                                                        value={featForm.subcategory} onChange={e => setFeatForm({ ...featForm, subcategory: e.target.value })} required>
                                                        <option value="">Select Sub Category</option>
                                                        {subCategories.map(sc => <option key={sc._id} value={sc._id}>{sc.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="border border-slate-200 px-2 py-1.5 bg-[#f4f4f4] text-black text-center">
                                                        {new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB')}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <select className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium bg-white"
                                                        value={featForm.buttonType} onChange={e => setFeatForm({ ...featForm, buttonType: e.target.value })}>
                                                        <option value="">Button Type</option>
                                                        <option value="Box">Box</option>
                                                        <option value="Radio">Radio</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <input type="number" placeholder="Ordering" className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium"
                                                        value={featForm.order} onChange={e => setFeatForm({ ...featForm, order: Number(e.target.value) })} />
                                                </div>
                                                <div className="flex items-center gap-4 mt-1">
                                                    <label className="flex items-center gap-1.5 cursor-pointer text-black">
                                                        <input type="radio" checked={featForm.selectionType === 'Single'} onChange={() => setFeatForm({ ...featForm, selectionType: 'Single' })} className="w-3 h-3 accent-blue-600" /> Single
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer text-black">
                                                        <input type="radio" checked={featForm.selectionType === 'Multi'} onChange={() => setFeatForm({ ...featForm, selectionType: 'Multi' })} className="w-3 h-3 accent-blue-600" /> Multi
                                                    </label>
                                                </div>

                                                {featForm.buttonType === 'Box' && (
                                                    <div className="space-y-1">
                                                        <input type="text" placeholder="Box Fade Name" className="w-full border border-slate-300 px-2 py-1.5 outline-none font-medium"
                                                            value={featForm.boxFadeName} onChange={e => setFeatForm({ ...featForm, boxFadeName: e.target.value })} />
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 mt-1">
                                                    <span className="text-black font-bold lowercase">Status</span>
                                                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-black">
                                                        <input type="radio" checked={featForm.status} onChange={() => setFeatForm({ ...featForm, status: true })} className="w-3 h-3 accent-blue-600" /> Yes
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer font-bold text-black">
                                                        <input type="radio" checked={!featForm.status} onChange={() => setFeatForm({ ...featForm, status: false })} className="w-3 h-3 accent-blue-600" /> No
                                                    </label>
                                                </div>

                                                {['Radio', 'Box'].includes(featForm.buttonType) && (
                                                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                                        {featForm.buttonItemNames.map((name, idx) => (
                                                            <div key={idx} className="flex gap-1 mb-1">
                                                                <input type="text" placeholder="Button Item Name" className="flex-1 border border-slate-300 px-2 py-1.5 outline-none font-medium"
                                                                    value={name} onChange={e => {
                                                                        const newItems = [...featForm.buttonItemNames];
                                                                        newItems[idx] = e.target.value;
                                                                        setFeatForm({ ...featForm, buttonItemNames: newItems });
                                                                    }} />
                                                                <button type="button" onClick={() => {
                                                                    setFeatForm({ ...featForm, buttonItemNames: [...featForm.buttonItemNames, ''] });
                                                                }} className="p-1 px-2 border border-slate-900 bg-white hover:bg-slate-50"><Plus className="w-3 h-3 stroke-[3]" /></button>
                                                                {featForm.buttonItemNames.length > 1 && (
                                                                    <button type="button" onClick={() => {
                                                                        const newItems = featForm.buttonItemNames.filter((_, i) => i !== idx);
                                                                        setFeatForm({ ...featForm, buttonItemNames: newItems });
                                                                    }} className="p-1 px-2 border border-slate-900 bg-white hover:bg-slate-50"><Minus className="w-3 h-3 stroke-[3]" /></button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex gap-2 h-max self-end mt-1">
                                                    <button type="submit" className="bg-[#127ef3] text-white flex-1 py-1.5 font-bold rounded-sm border border-blue-800 shadow-inner px-12">
                                                        Save
                                                    </button>
                                                    <button type="button" onClick={() => setShowFeatureModal(false)} className="bg-white text-black px-8 py-1.5 font-bold rounded-sm border border-slate-300">
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
        </div >
    );
}
