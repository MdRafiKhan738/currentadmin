"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
    Search, LayoutGrid, Eye, CheckCircle, XCircle, Trash2,
    ImageIcon, User, Phone, MapPin, ExternalLink,
    Loader2, Check, HelpCircle, Calendar, AlertCircle, X,
    Edit3, Save, RotateCcw, ArrowLeft, Plus, Edit2, CheckCircle2, ChevronRight, ChevronLeft,
    Bell, Camera, Target
} from 'lucide-react';
import { RiCameraFill } from 'react-icons/ri';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { API_BASE_URL } from '../../../utils/apiConfig';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../../utils/imageUrl';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ITEMS_PER_PAGE = 100;

function parseIntSafe(value: unknown): number {
    const n = parseInt(String(value ?? ''), 10);
    return Number.isFinite(n) ? n : 0;
}

function getPromotionMetrics(ad: Ad) {
    const targetValue = Number(ad.targetValue) || 0;
    const targetD = parseIntSafe(ad.targetD);
    let duration = Number(ad.promoteDuration) || 0;

    // If duration is missing but we have target totals, infer it
    if (duration <= 0 && targetValue > 0 && targetD > 0) {
        duration = Math.ceil(targetValue / targetD);
    }

    const totalTarget =
        targetValue > 0 ? targetValue : (targetD > 0 && duration > 0 ? targetD * duration : 0);

    const achievedSoFar = Number(ad.promotedViews ?? 0) || 0;

    const startMs = ad.promoteStartDate ? new Date(ad.promoteStartDate).getTime() : NaN;
    const adTypeLower = String(ad.adType || '').trim().toLowerCase();
    const isRunning = adTypeLower === 'promoted' || adTypeLower === 'processing';

    let expectedSoFar = 0;
    let dayNumber = 0;
    if (totalTarget > 0) {
        if (isRunning && duration > 0 && Number.isFinite(startMs)) {
            const daysElapsed = Math.min(duration, Math.max(1, Math.floor((Date.now() - startMs) / MS_PER_DAY) + 1));
            expectedSoFar = Math.round((totalTarget / duration) * daysElapsed);
            dayNumber = daysElapsed;
        } else if (!isRunning) {
            expectedSoFar = totalTarget;
        } else {
            expectedSoFar = totalTarget;
        }
    }

    // Day-level metrics
    const dailyTarget = targetD;
    const dailyAchieved = Number(ad.dailyViewsCount) || 0;

    // Slot-level metrics (3 slots per day)
    const slotTarget = targetD > 0 ? Math.ceil(targetD / 3) : 0;
    const slotAchieved = Number(ad.slotViewsCount) || 0;
    const currentSlot = Number(ad.currentSlot) || 0;

    return { totalTarget, expectedSoFar, achievedSoFar, duration, dayNumber, dailyTarget, dailyAchieved, slotTarget, slotAchieved, currentSlot };
}

interface Ad {
    _id: string;
    headline: string;
    description: string;
    pendingDescription?: string;
    category: string;
    subCategory?: string;
    location: string;
    subLocation?: string;
    locations?: string[];
    phone: string;
    hidePhone: boolean;
    url: string; // Action URL
    actionType: string;
    images: string[];
    adType: string;
    status: 'active' | 'pending' | 'rejected' | 'expired' | 'notification' | 'pause' | 'review' | 'atv_msg' | 'unatv_msg' | 'deleted' | 'inactive' | 'delete_request';
    createdAt: string;
    price?: number;
    priceType?: 'Negotiable' | 'Fixed';
    merchantID?: string;
    pwrTarget?: string[];
    targetD?: string;
    slotDeliveryCount?: number;
    slotViewsCount?: number;
    currentSlot?: number;
    notificationDialogue?: string;
    showTill?: string;
    updatedAt?: string;
    rep?: string;
    lgs?: string;
    senBy?: string;
    edBy?: string;
    note?: string;
    user: {
        _id: string;
        name: string;
        email: string;
        mobile: string;
        merchantTrustStatus?: string;
    };
    views: number;
    deliveryCount: number;
    targetValue: number;
    dailyDeliveryCount: number;
    dailyViewsCount: number;
    promotedViews?: number;
    promotedDeliveryCount?: number;
    targetLocations?: string[];
    promotionHistory?: {
        startDate: string;
        endDate: string;
        adType: string;
        promoteType?: string;
        promoteTag?: string;
        budget: number;
        targetD?: string;
        targetValue?: number;
        views: number;
        deliveryCount: number;
    }[];
    promoteStartDate?: string;
    promoteEndDate?: string;
    promoteDuration?: number;
    promoteType?: string;
    promoteTag?: string;
    promoteBudget?: number;
    estimatedReach?: string;
    features?: Record<string, any>;
    isReported?: boolean;
    photoStatus: 'pending' | 'approved' | 'rejected';
    userUpdated?: boolean;
    userNewPhotos?: boolean;
    pendingImages?: string[];
}

interface SubCategory {
    _id: string;
    name: string;
    features?: any[];
    priceBoxShow?: boolean;
    priceBoxName?: string;
}

interface Category {
    _id: string;
    name: string;
    subcategories: SubCategory[];
}

interface Location {
    _id: string;
    name: string;
    subLocations: { name: string }[];
}

function PhotoSlider({ images, adId, photoStatus, updateAdField, setHoveredImage }: any) {
    const [startIndex, setStartIndex] = React.useState(0);
    const visibleImages = images.slice(startIndex, startIndex + 3);

    return (
        <div className="flex items-center gap-1">
            {images.length > 3 && startIndex > 0 && (
                <button
                    onClick={(e) => { e.stopPropagation(); setStartIndex(prev => Math.max(0, prev - 1)); }}
                    className="p-0.5 hover:bg-slate-200 rounded shrink-0"
                >
                    <ChevronLeft className="w-3 h-3 text-black" />
                </button>
            )}
            <div className="flex items-center gap-1">
                {visibleImages.map((img: string, i: number) => (
                    <div
                        key={img + i}
                        className="relative w-12 h-12 rounded-[2px] border border-slate-200 overflow-hidden shrink-0 group/img cursor-pointer"
                        onMouseEnter={() => setHoveredImage(img)}
                        onMouseLeave={() => setHoveredImage(null)}
                    >
                        <img src={getImageUrl(img)} className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute top-0 right-0 flex flex-col gap-[0.5px] p-[1px] bg-white/40 backdrop-blur-[1px] rounded-bl-sm opacity-0 group-hover/img:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    updateAdField(adId, 'photoStatus', 'approved');
                                }}
                                className={cn(
                                    "flex items-center justify-center rounded-full border-[0.5px] border-white transition-all shadow-sm",
                                    photoStatus === 'approved' ? "bg-emerald-500 w-[11px] h-[11px]" : "bg-slate-300 w-[9px] h-[9px] hover:bg-emerald-300 opacity-80"
                                )}
                            >
                                <Check className={cn("text-white shrink-0", photoStatus === 'approved' ? "w-[8px] h-[8px]" : "w-[6px] h-[6px]")} strokeWidth={5} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    updateAdField(adId, 'photoStatus', 'rejected');
                                }}
                                className={cn(
                                    "flex items-center justify-center rounded-full border-[0.5px] border-white transition-all shadow-sm",
                                    photoStatus === 'rejected' ? "bg-rose-500 w-[11px] h-[11px]" : "bg-slate-300 w-[9px] h-[9px] hover:bg-rose-300 opacity-80"
                                )}
                            >
                                <X className={cn("text-white shrink-0", photoStatus === 'rejected' ? "w-[8px] h-[8px]" : "w-[6px] h-[6px]")} strokeWidth={5} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {images.length > 3 && startIndex + 3 < images.length && (
                <button
                    onClick={(e) => { e.stopPropagation(); setStartIndex(prev => Math.min(images.length - 3, prev + 1)); }}
                    className="p-0.5 hover:bg-slate-200 rounded shrink-0"
                >
                    <ChevronRight className="w-3 h-3 text-black" />
                </button>
            )}
        </div>
    );
}

export default function PostManagement() {
    const [ads, setAds] = useState<Ad[]>([]);
    const [filteredAds, setFilteredAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
    const [selectedAds, setSelectedAds] = useState<string[]>([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Edit State
    const [categories, setCategories] = useState<Category[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [pendingDescriptionAction, setPendingDescriptionAction] = useState<string | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<Ad>>({});
    const [saveLoading, setSaveLoading] = useState(false);
    const [merchantName, setMerchantName] = useState<string>('');

    const paginatedAds = filteredAds.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );


    const verifyMerchant = async (id: string) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/user/profile/${id}`);
            if (res.data) {
                setMerchantName(res.data.name || res.data.mobile || 'User Found');
            } else {
                setMerchantName('User not found');
            }
        } catch (error) {
            setMerchantName('User not found');
        }
    };

    // New Modal States
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showShortViewModal, setShowShortViewModal] = useState(false);
    const [hoveredImage, setHoveredImage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'today' | 'running' | 'waiting_promote'>('all');
    const [searchKeys, setSearchKeys] = useState<any>({
        _id: '',
        mobile: '',
        email: '',
        status: '',
        userUpdated: '',
        packages: '',
        condition: '',
        category: '',
        subCategory: '',
        photoStatus: '',
        dateFrom: '',
        dateTo: '',
        promoteTag: '',
        featureName: '',
        featureValue: '',
        subLocation: '',
        actionType: '',
    });
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    // Fetch Ads
    useEffect(() => {
    fetchAds(searchKeys);
}, []);

useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(filteredAds.length / ITEMS_PER_PAGE)));
    setCurrentPage(1);
}, [filteredAds]);

    useEffect(() => {
        fetchMeta();
    }, []);

    const fetchMeta = async () => {
        try {
            const [catRes, subCatRes, locRes, subLocRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/categories`),
                axios.get(`${API_BASE_URL}/api/categories/sub`),
                axios.get(`${API_BASE_URL}/api/locations`),
                axios.get(`${API_BASE_URL}/api/locations/sub`)
            ]);

            const cats = (catRes.data.data || [])
                .map((c: any) => ({
                    ...c,
                    subcategories: (subCatRes.data.data || [])
                        .filter((sc: any) => (sc.category?._id || sc.category) === c._id)
                        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                }))
                .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            setCategories(cats);

            const locs = (locRes.data.data || [])
                .map((l: any) => ({
                    ...l,
                    subLocations: (subLocRes.data.data || [])
                        .filter((sl: any) => (sl.location?._id || sl.location) === l._id)
                        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                }))
                .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            setLocations(locs);
        } catch (error) {
            console.error("Failed to fetch meta", error);
        }
    };

const fetchAds = async (filters: any = {}) => {
    setLoading(true);

    try {
        const token = Cookies.get("adminToken");
        const perPageLimit = 100;

        const firstRes = await axios.get(
            `${API_BASE_URL}/api/ads/admin/all`,
            {
                headers: {
                    "x-auth-token": token,
                },
                params: {
                    page: 1,
                    limit: perPageLimit,
                    ...filters,
                },
            }
        );
        const allAds = [...firstRes.data.data];

        if (!firstRes.data.success) {
            setAds([]);
            setFilteredAds([]);
            setTotalPages(Math.ceil(allAds.length / 100));
            return;
        }

        const totalServerPages = firstRes.data.pages || 1;

        if (totalServerPages > 1) {
            const requests = [];

            for (let page = 2; page <= totalServerPages; page++) {
                requests.push(
                    axios.get(`${API_BASE_URL}/api/ads/admin/all`, {
                        headers: {
                            "x-auth-token": token,
                        },
                        params: {
                            page,
                            limit: perPageLimit,
                            ...filters,
                        },
                    })
                );
            }

            const responses = await Promise.all(requests);

            responses.forEach((res) => {
                if (res.data.success) {
                    allAds.push(...res.data.data);
                }
            });
        }

        setAds(allAds);
        setFilteredAds(allAds);
    } catch (error) {
        console.error("Failed to fetch ads", error);
    } finally {
        setLoading(false);
    }
};

    // Search & Tab Filter
    useEffect(() => {
        let filtered = ads;
        const normalizeText = (value: unknown) => String(value ?? '').trim().toLowerCase();

        // Apply Tab Filter
        if (activeTab === 'pending') {
            // Show all posts except active ones, OR active ones with pending updates
            filtered = filtered.filter(ad => ad.status !== 'active' || ad.userUpdated || ad.userNewPhotos);
        } else if (activeTab === 'today') {
            // Today Promoted
            const today = new Date().toISOString().split('T')[0];
            filtered = filtered.filter(ad =>
                normalizeText(ad.adType) === 'promoted' &&
                ad.createdAt && ad.createdAt.split('T')[0] === today
            );
        } else if (activeTab === 'running') {
            // Currently Running Promotion
            filtered = filtered.filter(ad =>
                normalizeText(ad.adType) === 'promoted' &&
                ad.status === 'active' &&
                ad.promoteEndDate && new Date(ad.promoteEndDate) >= new Date()
            );
        } else if (activeTab === 'waiting_promote') {
            // Processing ads
            filtered = filtered.filter(ad => normalizeText(ad.adType) === 'processing');
        }

        // Apply Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(ad =>
                ad.headline.toLowerCase().includes(query) ||
                ad.description.toLowerCase().includes(query) ||
                ad.user?.name.toLowerCase().includes(query) ||
                ad.phone.includes(query)
            );
        }

        setFilteredAds(filtered);
    }, [searchQuery, ads, activeTab]);

    // Handle Status Update
    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const token = Cookies.get('adminToken');
            const res = await axios.put(`${API_BASE_URL}/api/ads/admin/${id}/status`, { status: newStatus }, {
                headers: { 'x-auth-token': token }
            });

            if (res.data.success && res.data.data) {
                const updatedAd = res.data.data;
                // Update local list
                setAds(prev => prev.map(ad => ad._id === id ? updatedAd : ad));
                if (selectedAd && selectedAd._id === id) {
                    setSelectedAd(updatedAd);
                }
                toast.success(`Status updated to ${newStatus}`);
            } else {
                // Fallback UI update
                setAds(prev => prev.map(ad => ad._id === id ? { ...ad, status: newStatus as any } : ad));
                if (selectedAd && selectedAd._id === id) {
                    setSelectedAd(prev => prev ? { ...prev, status: newStatus as any } : null);
                }
            }
        } catch (error) {
            console.error("Update failed", error);
            toast.error("Failed to update status");
        }
    };

    const handlePublishAndNext = async (currentId: string) => {
        try {
            const token = Cookies.get('adminToken');

            // Collect all changes from local state
            const updatePayload = {
                ...editFormData,
                status: 'active',
                pendingDescriptionAction: pendingDescriptionAction
            };

            const res = await axios.put(`${API_BASE_URL}/api/ads/admin/${currentId}/update`, updatePayload, {
                headers: { 'x-auth-token': token }
            });

            if (res.data.success) {
                const updatedAd = res.data.data;
                // Update local list
                setAds(prev => prev.map(ad => ad._id === currentId ? updatedAd : ad));

                // Find next 'review' ad in current filteredAds
                const currentIndex = filteredAds.findIndex(ad => ad._id === currentId);
                const nextReviewAd = filteredAds.slice(currentIndex + 1).find(ad => ad.status === 'review');

                if (nextReviewAd) {
                    setSelectedAd(nextReviewAd);
                    setEditFormData(nextReviewAd); // Initialize form for next ad
                    setPendingDescriptionAction(null); // Reset description action
                    markAdAsSeen(nextReviewAd._id);
                    toast.success("Published! Opening next review post...", { duration: 1000 });
                } else {
                    // Check if any review ads exist before this one
                    const remainingReviewAd = filteredAds.find(ad => ad.status === 'review' && ad._id !== currentId);
                    if (remainingReviewAd) {
                        setSelectedAd(remainingReviewAd);
                        setEditFormData(remainingReviewAd);
                        setPendingDescriptionAction(null);
                        markAdAsSeen(remainingReviewAd._id);
                        toast.success("Published! Opening next review post...", { duration: 1000 });
                    } else {
                        setShowShortViewModal(false);
                        setSelectedAd(null);
                        setPendingDescriptionAction(null);
                        setEditFormData({});
                        toast.success("All review posts in this view processed!");
                    }
                }
            }
        } catch (error) {
            console.error("Publish failed", error);
            toast.error("Failed to publish ad");
        }
    };

    // Handle Inline Field Update
    const updateAdField = async (id: string, field: string, value: any) => {
        try {
            const token = Cookies.get('adminToken');
            const res = await axios.put(`${API_BASE_URL}/api/ads/admin/${id}/update`, { [field]: value }, {
                headers: { 'x-auth-token': token }
            });
            // Update UI with response data which contains updated edBy
            if (res.data.success && res.data.data) {
                const updatedAd = res.data.data;
                setAds(prev => prev.map(ad => ad._id === id ? updatedAd : ad));
                if (selectedAd && selectedAd._id === id) {
                    setSelectedAd(updatedAd);
                }
            } else {
                setAds(prev => prev.map(ad => ad._id === id ? { ...ad, [field]: value } : ad));
                if (selectedAd && selectedAd._id === id) {
                    setSelectedAd(prev => prev ? { ...prev, [field]: value } : null);
                }
            }
        } catch (error) {
            console.error("Update failed", error);
            alert(`Failed to update ${field}`);
        }
    };

    const markAdAsSeen = async (adId: string) => {
        try {
            const token = Cookies.get('adminToken');
            const res = await axios.put(`${API_BASE_URL}/api/ads/admin/${adId}/see`, {}, {
                headers: { 'x-auth-token': token }
            });
            if (res.data.success) {
                setAds(prev => prev.map(ad =>
                    ad._id === adId ? { ...ad, senBy: res.data.data.senBy } : ad
                ));
            }
        } catch (error) {
            console.error("Failed to mark as seen", error);
        }
    };

    // Handle Image Delete
    const deleteImage = async (adId: string, imageUrl: string, index?: number) => {
        if (!confirm("Delete this photo?")) return;

        try {
            const token = Cookies.get('adminToken');
            await axios.delete(`${API_BASE_URL}/api/ads/admin/${adId}/image`, {
                headers: { 'x-auth-token': token },
                data: { imageUrl } // Send body in delete request
            });

            // Update UI list
            setAds(prev => prev.map(ad => {
                if (ad._id === adId) {
                    return { ...ad, images: ad.images.filter(img => img !== imageUrl) };
                }
                return ad;
            }));

            if (selectedAd && selectedAd._id === adId) {
                setSelectedAd(prev => prev ? { ...prev, images: prev.images.filter(img => img !== imageUrl) } : null);
            }

            // Sync with Edit State if index provided
            if (editFormData && selectedAd?._id === adId) {
                const newImages = [...(editFormData.images || [])];
                if (index !== undefined) {
                    newImages[index] = "";
                    const newFiles = [...selectedFiles];
                    newFiles[index] = undefined as any;
                    setSelectedFiles(newFiles);
                } else {
                    // Fallback for cases where index isn't provided (e.g. from table or different view)
                    const idx = newImages.findIndex(img => img === imageUrl);
                    if (idx !== -1) {
                        newImages[idx] = "";
                        const newFiles = [...selectedFiles];
                        newFiles[idx] = undefined as any;
                        setSelectedFiles(newFiles);
                    }
                }
                setEditFormData(prev => ({ ...prev, images: newImages }));
            }
            toast.success("Image removed successfully");
        } catch (error) {
            console.error("Image delete failed", error);
            toast.error("Failed to remove image");
        }
    };

    const deleteAd = async (id: string) => {
        if (!confirm("Are you sure you want to delete this ad?")) return;
        try {
            const token = Cookies.get('adminToken');
            await axios.delete(`${API_BASE_URL}/api/ads/admin/${id}`, {
                headers: { 'x-auth-token': token }
            });
            setAds(prev => prev.filter(ad => ad._id !== id));
            setSelectedAds(prev => prev.filter(adId => adId !== id));
            setShowEditModal(false);
            setShowShortViewModal(false);
            setSelectedAd(null);
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete ad");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedAds.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedAds.length} selected ads?`)) return;

        try {
            const token = Cookies.get('adminToken');
            await Promise.all(selectedAds.map(id =>
                axios.delete(`${API_BASE_URL}/api/ads/admin/${id}`, {
                    headers: { 'x-auth-token': token }
                })
            ));

            setAds(prev => prev.filter(ad => !selectedAds.includes(ad._id)));
            setSelectedAds([]);
        } catch (error) {
            console.error("Bulk delete failed", error);
            alert("Some ads could not be deleted.");
        }
    };

    const toggleSelectAd = (id: string) => {
        setSelectedAds(prev =>
            prev.includes(id) ? prev.filter(adId => adId !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedAds.length === filteredAds.length) {
            setSelectedAds([]);
        } else {
            setSelectedAds(filteredAds.map(ad => ad._id));
        }
    };

    const startEdit = () => {
        if (!selectedAd) return;
        setEditFormData({
            headline: selectedAd.headline,
            description: selectedAd.description,
            category: selectedAd.category,
            subCategory: selectedAd.subCategory,
            location: selectedAd.location,
            subLocation: selectedAd.subLocation,
            phone: selectedAd.phone,
            hidePhone: selectedAd.hidePhone,
            url: selectedAd.url,
            actionType: selectedAd.actionType,
            adType: selectedAd.adType,
            targetValue: selectedAd.targetValue,
            targetD: selectedAd.targetD,
            targetLocations: selectedAd.targetLocations || [],
            photoStatus: selectedAd.photoStatus,
            images: [...selectedAd.images],
            features: { ...(selectedAd.features || {}) },
            price: selectedAd.price,
            priceType: selectedAd.priceType || 'Negotiable'
        });
        setIsEditing(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // 5MB Limit Check
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File is too large! Max 5MB allowed.");
                e.target.value = ''; // Reset input
                return;
            }

            const newFiles = [...selectedFiles];
            newFiles[index] = file;
            setSelectedFiles(newFiles);

            // Generate preview
            const reader = new FileReader();
            reader.onload = (event) => {
                const newImages = [...(editFormData.images || [])];
                newImages[index] = event.target?.result as string;
                setEditFormData({ ...editFormData, images: newImages });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleEditChange = (name: string, value: any) => {
        setEditFormData(prev => ({ ...prev, [name]: value }));

        // Reset sub fields if parent changes
        if (name === 'category') setEditFormData(prev => ({ ...prev, subCategory: '' }));
        if (name === 'location') setEditFormData(prev => ({ ...prev, subLocation: '' }));
    };

    const handleSaveEdit = async () => {
        setSaveLoading(true);
        try {
            const token = Cookies.get('adminToken');

            // Use FormData for image upload
            const formData = new FormData();
            Object.keys(editFormData).forEach(key => {
                if (key !== 'images' && key !== 'user') {
                    const value = editFormData[key as keyof Ad];
                    if (value !== undefined) {
                        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
                    }
                }
            });

            // Append images
            selectedFiles.forEach((file) => {
                if (file) formData.append('images', file);
            });

            if (pendingDescriptionAction) {
                formData.append('pendingDescriptionAction', pendingDescriptionAction);
            }

            let res;
            if (selectedAd?._id) {
                // UPDATE
                res = await axios.put(`${API_BASE_URL}/api/ads/admin/${selectedAd._id}/update`, formData, {
                    headers: {
                        'x-auth-token': token,
                        'Content-Type': 'multipart/form-data'
                    }
                });
            } else {
                // CREATE
                res = await axios.post(`${API_BASE_URL}/api/ads/admin/create`, formData, {
                    headers: {
                        'x-auth-token': token,
                        'Content-Type': 'multipart/form-data'
                    }
                });
            }

            if (res.data.success) {
                const updatedAd = res.data.data;
                if (selectedAd?._id) {
                    setAds(prev => prev.map(a => a._id === updatedAd._id ? updatedAd : a));
                } else {
                    setAds(prev => [updatedAd, ...prev]);
                }
                setFilteredAds(prev => {
                    if (selectedAd?._id) return prev.map(a => a._id === updatedAd._id ? updatedAd : a);
                    return [updatedAd, ...prev];
                });
                setShowEditModal(false);
                setSelectedFiles([]);
                setPendingDescriptionAction(null);
                setMerchantName('');
                toast.success(selectedAd?._id ? "Ad updated successfully!" : "Ad created successfully!");
                fetchAds(
                    searchKeys
                );
            }
        } catch (error) {
            console.error("Save failed", error);
            toast.error("Failed to save ad details");
        } finally {
            setSaveLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'expired': return 'bg-slate-100 text-black border-slate-200';
            case 'deleted': return 'bg-red-100 text-red-700 border-red-200 font-bold';
            default: return 'bg-slate-100 text-black border-slate-200';
        }
    };

    const getVisiblePages = (): Array<number | string> => {
        const total = Math.max(1, totalPages || 1);

        if (total <= 10) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }

        if (currentPage <= 5) {
            return [1, 2, 3, 4, 5, 'ellipsis-right', total - 2, total - 1, total];
        }

        if (currentPage >= total - 4) {
            return [1, 2, 3, 'ellipsis-left', total - 4, total - 3, total - 2, total - 1, total];
        }

        return [
            1,
            2,
            'ellipsis-left',
            currentPage - 1,
            currentPage,
            currentPage + 1,
            'ellipsis-right',
            total - 1,
            total,
        ];
    };

    return (
        <div className="bg-[#f1f5f9] min-h-[calc(100vh-4rem)] p-2 font-['Tahoma','Verdana',sans-serif] overflow-y-auto text-xs">
            {/* Top Navigation & Status Bar */}
            <div className="bg-white rounded-t-md border border-slate-200 p-2 flex items-center justify-between shadow-sm mb-1">
                <div className="flex items-center gap-4">
                    <button className="text-rose-500 hover:opacity-80 transition-opacity">
                        <ArrowLeft className="w-4 h-4 stroke-[3]" />
                    </button>

                    <div className="flex items-center gap-4 text-xs font-bold">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={cn("hover:text-indigo-600 transition-colors", activeTab === 'all' && "text-indigo-600 border-b-2 border-indigo-600")}
                        >
                            All Post ({ads.length})
                        </button>
                        <span className="text-black">|</span>
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={cn("hover:text-indigo-600 transition-colors", activeTab === 'pending' && "text-indigo-600 border-b-2 border-indigo-600")}
                        >
                            Inapprove ({ads.filter(a => a.status !== 'active' || a.userUpdated || a.userNewPhotos).length})
                        </button>
                        <span className="text-black">|</span>
                        <button
                            onClick={() => setActiveTab('today')}
                            className={cn("hover:text-indigo-600 transition-colors", activeTab === 'today' && "text-indigo-600 border-b-2 border-indigo-600")}
                        >
                            Today Promote ({
                                ads.filter(a =>
                                    a.adType === 'Promoted' &&
                                    a.createdAt?.split('T')[0] === new Date().toISOString().split('T')[0]
                                ).length
                            })
                        </button>
                        <span className="text-black">|</span>
                        <button
                            onClick={() => setActiveTab('running')}
                            className={cn("hover:text-indigo-600 transition-colors", activeTab === 'running' && "text-indigo-600 border-b-2 border-indigo-600")}
                        >
                            Running Promote ({
                                ads.filter(a =>
                                    a.adType === 'Promoted' &&
                                    a.status === 'active' &&
                                    a.promoteEndDate && new Date(a.promoteEndDate) >= new Date()
                                ).length
                            })
                        </button>

                        <span className="text-black">|</span>
                        <button
                            onClick={() => setActiveTab('waiting_promote')}
                            className={cn("hover:text-indigo-600 transition-colors whitespace-nowrap", activeTab === 'waiting_promote' && "text-indigo-600 border-b-2 border-indigo-600")}
                        >
                            Waiting Promote ({
                                ads.filter(a => a.adType === 'Processing').length
                            })
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={handleBulkDelete}
                        disabled={selectedAds.length === 0}
                        className={cn(
                            "p-1.5 rounded-sm transition-all shadow-sm",
                            selectedAds.length > 0 ? "bg-rose-600 text-white scale-110 shadow-lg" : "bg-rose-400 text-rose-100 cursor-not-allowed"
                        )}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => {
                            setSelectedAd(null);
                            setEditFormData({
                                adType: 'Free',
                                priceType: 'Negotiable',
                                status: 'active',
                                features: {}
                            });
                            setMerchantName('');
                            setShowEditModal(true);
                        }}
                        className="bg-emerald-500 text-white p-1.5 rounded-sm hover:bg-emerald-600 transition-colors shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setShowSearchModal(true)}
                        className="bg-emerald-500 text-white p-1.5 rounded-sm hover:bg-emerald-600 transition-colors shadow-sm"
                    >
                        <Search className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Ads Table */}
            <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-black border-b border-slate-200 text-xs">
                                <th className="px-2 py-2 w-8 border-r border-slate-300 bg-slate-50">
                                    <input
                                        type="checkbox"
                                        className="w-3 h-3 cursor-pointer"
                                        checked={selectedAds.length === filteredAds.length && filteredAds.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-1 py-1.5 font-normal uppercase whitespace-nowrap border-r border-slate-300 bg-slate-50">Product Picture</th>
                                <th className="px-1 py-1.5 font-normal uppercase whitespace-nowrap border-r border-slate-300 bg-slate-50">Product ID</th>
                                <th className="px-1 py-1.5 font-normal uppercase whitespace-nowrap text-center border-r border-slate-300 bg-slate-50">Produ Sts</th>
                                <th className="px-1 py-1.5 font-normal uppercase whitespace-nowrap border-r border-slate-300 bg-slate-50">Categorie</th>
                                <th className="px-1 py-1.5 font-normal uppercase whitespace-nowrap border-r border-slate-300 bg-slate-50">Location</th>
                                <th className="px-1 py-1.5 font-normal uppercase whitespace-nowrap border-r border-slate-300 bg-slate-50">Price</th>
                                <th className="px-1 py-1.5 font-normal uppercase whitespace-nowrap border-r border-slate-300 bg-slate-50">AD Type</th>
                                <th className="px-1 py-1.5 font-normal uppercase whitespace-nowrap border-r border-slate-300 bg-slate-50">P Target</th>
                                <th className="px-1 py-1.5 font-normal uppercase whitespace-nowrap border-r border-slate-300 bg-slate-50">Target/D</th>
                                <th className="px-1 py-1.5 font-normal uppercase whitespace-nowrap border-r border-slate-300 bg-slate-50">Rep</th>
                                {/* <th className="px-1 py-1.5 font-normal uppercase whitespace-nowrap border-r border-slate-300 bg-slate-50">Lgs</th> */}
                                <th className="px-1 py-1.5 font-normal uppercase whitespace-nowrap border-r border-slate-300 bg-slate-50">Sen/Ed</th>
                                <th className="px-1 py-1.5 font-normal uppercase whitespace-nowrap border-r border-slate-300 bg-slate-50">Date</th>
                                <th className="px-1 py-1.5 font-normal uppercase whitespace-nowrap text-right pr-2 bg-slate-50">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-black text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan={14} className="py-20 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
                                    </td>
                                </tr>
                            ) : filteredAds.length === 0 ? (
                                <tr>
                                    <td colSpan={14} className="py-20 text-center text-black">No posts found</td>
                                </tr>
                            ) : (
                                paginatedAds.map((ad, idx) => (
                                    <React.Fragment key={ad._id}>
                                        <tr className={cn(
                                            idx % 2 === 0 ? "bg-white" : "bg-slate-100",
                                            selectedAds.includes(ad._id) && "bg-rose-50/50",
                                            "h-12"
                                        )}>
                                            <td className="px-1 py-1 border-r border-b border-slate-300 align-top" rowSpan={2}>
                                                <input
                                                    type="checkbox"
                                                    className="w-3 h-3 cursor-pointer"
                                                    checked={selectedAds.includes(ad._id)}
                                                    onChange={() => toggleSelectAd(ad._id)}
                                                />
                                            </td>
                                            <td className="px-1 py-1 border-r border-b border-slate-300 align-top" rowSpan={2}>
                                                <PhotoSlider
                                                    images={ad.images}
                                                    adId={ad._id}
                                                    photoStatus={ad.photoStatus}
                                                    updateAdField={updateAdField}
                                                    setHoveredImage={setHoveredImage}
                                                />
                                            </td>
                                            <td className="px-1 py-1 text-black whitespace-nowrap border-r border-b border-slate-300 align-top" rowSpan={2}>
                                                <div className="flex flex-col">
                                                    <span>{ad._id}</span>
                                                    <div className="flex gap-1 mt-0.5">
                                                        {ad.userUpdated && (
                                                            <div className="bg-white p-0.5 shadow-sm border border-black" title="Updated by User">
                                                                <Bell className="w-3 h-3 text-black fill-black" />
                                                            </div>
                                                        )}
                                                        {ad.userNewPhotos && (
                                                            <div className="bg-white p-0.5 shadow-sm border border-black" title="New Photo added by User">
                                                                <RiCameraFill className="w-3 h-3 text-black" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-1 py-1 border-r border-b border-slate-300 align-top" rowSpan={2}>
                                                <select
                                                    value={ad.status}
                                                    onChange={(e) => updateStatus(ad._id, e.target.value)}
                                                    className="border-[1.5px] border-slate-900 rounded-px px-1 py-0 h-6 w-full max-w-[70px] bg-white text-xs outline-none shadow-sm uppercase leading-none"
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                    <option value="notification">Notification</option>
                                                    <option value="pause">Pause</option>
                                                    <option value="review">Review</option>
                                                    <option value="delete_request">Delete Request</option>
                                                </select>
                                            </td>
                                            <td className="px-1 py-1 border-r border-b border-slate-300 align-top" rowSpan={2}>
                                                <div className="flex flex-col gap-1 items-center">
                                                    <select
                                                        value={ad.category}
                                                        onChange={(e) => updateAdField(ad._id, 'category', e.target.value)}
                                                        className="bg-transparent text-black border-none outline-none cursor-pointer w-full text-xs text-center"
                                                    >
                                                        <option value="">Select Category</option>
                                                        {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                                    </select>
                                                    <span className="text-black font-normal">{ad.subCategory}</span>
                                                </div>
                                            </td>

                                            {/* Dynamic Region - Row 1 */}
                                            <td className="px-1 pt-1 pb-0 text-black border-r border-slate-300 align-top min-w-[120px]">
                                                <span className="px-1">{ad.location}</span>
                                            </td>
                                            <td className="px-1 pt-1 pb-0 text-rose-500 border-r border-slate-300 align-top">{ad.price || '00'}</td>
                                            <td className="px-1 pt-1 pb-0 text-emerald-600 capitalize border-r border-slate-300 align-top">{ad.adType}</td>
                                            <td className="px-1 pt-1 pb-0 border-r border-slate-300 align-top">
                                                <div className="flex items-center px-0.5">
                                                    <div className={cn(
                                                        "w-6 h-4 rounded-[1px] shadow-sm",
                                                        (() => {
                                                            const { totalTarget, achievedSoFar } = getPromotionMetrics(ad);
                                                            if (totalTarget <= 0) return "bg-slate-200";
                                                            if (achievedSoFar > totalTarget) return "bg-blue-600";
                                                            if (achievedSoFar === totalTarget) return "bg-purple-600";
                                                            if (achievedSoFar >= totalTarget * 0.7) return "bg-sky-400";
                                                            return "bg-black";
                                                        })()
                                                    )} />
                                                </div>
                                            </td>

                                            {/* Columns 10-15 with rowSpan=2 */}
                                            <td className="px-1 py-1 text-black whitespace-nowrap border-r border-b border-slate-300 align-top text-center" rowSpan={2}>
                                                {(() => {
                                                    const { totalTarget, achievedSoFar, duration, dayNumber, dailyTarget, dailyAchieved, slotTarget, slotAchieved, currentSlot } = getPromotionMetrics(ad);
                                                    if (totalTarget <= 0) return <span className="text-slate-400 text-[10px]">—</span>;
                                                    return (
                                                        <div className="flex flex-col items-center gap-0.5 mt-0.5 leading-none">
                                                            <span className="text-[9px] font-semibold text-slate-700">
                                                                {totalTarget}/{duration}D[{totalTarget}-&gt;{achievedSoFar}]
                                                            </span>
                                                            <span className="text-[9px] font-semibold text-blue-600">
                                                                D{dayNumber}[{dailyTarget}-&gt;{dailyAchieved}]
                                                            </span>
                                                            <span className="text-[9px] font-semibold text-emerald-600">
                                                                S{currentSlot}[{slotTarget}-&gt;{slotAchieved}]
                                                            </span>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-1 py-1 border-r border-b border-slate-300 align-top text-center" rowSpan={2}>
                                                <div className={cn("mt-1.5 font-bold", ad.isReported ? "text-rose-600" : "text-black")}>
                                                    {ad.isReported ? "YES" : "-"}
                                                </div>
                                            </td>
                                            {/* <td className="px-1 py-1 border-r border-b border-slate-300 align-top" rowSpan={2}>
                                                <div className="flex flex-col items-center mt-1">
                                                    <ImageIcon className="w-2.5 h-2.5 text-cyan-500" />
                                                    <Save className="w-2.5 h-2.5 text-orange-500" />
                                                </div>
                                            </td> */}
                                            <td className="px-1 py-1 border-r border-b border-slate-300 align-top text-center" rowSpan={2}>
                                                <div className="mt-1 flex flex-col items-center gap-1">
                                                    {ad.edBy ? (
                                                        <>
                                                            <span className="bg-emerald-600 text-white px-1 py-0.5 rounded-[2px] text-[8px] font-bold uppercase min-w-[30px] leading-none">
                                                                {ad.edBy.split(' ')[0]}
                                                            </span>
                                                            <div className="w-6 h-6 rounded-[1px] shadow-sm bg-emerald-500 border border-emerald-600 mt-0.5" />
                                                        </>
                                                    ) : (
                                                        <div className={cn(
                                                            "w-6 h-6 rounded-[1px] shadow-sm mt-1.5",
                                                            ad.senBy ? "bg-amber-400 border border-amber-500" : "bg-rose-500 border border-rose-600"
                                                        )} />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-1 py-1 whitespace-nowrap border-r border-b border-slate-300 align-top" rowSpan={2}>
                                                <div className="flex flex-col text-xs leading-tight mt-0.5">
                                                    <span>{new Date(ad.createdAt).toLocaleDateString()}</span>
                                                    <span className="text-black">{new Date(ad.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {/* {ad.showTill && (
                                                        <div className="mt-1 flex flex-col border-[0.5px] border-rose-200 bg-rose-50/50 p-0.5 rounded-[2px] items-start">
                                                            <span className="text-[8px] text-rose-400 font-bold uppercase leading-none italic">Show Till</span>
                                                            <span className="text-[10px] text-rose-600 font-bold leading-tight">
                                                                {new Date(ad.showTill).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    )} */}
                                                </div>
                                            </td>
                                            <td className="px-1 py-1 border-b border-slate-300 align-top" rowSpan={2}>
                                                <div className="flex flex-col items-end gap-1 px-1">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAd(ad);
                                                            setEditFormData({
                                                                ...ad,
                                                                merchantID: ad.merchantID || ad.user?._id || ''
                                                            });
                                                            setPendingDescriptionAction(null);
                                                            setShowShortViewModal(true);
                                                            markAdAsSeen(ad._id);
                                                        }}
                                                        className="bg-emerald-500 text-white px-2 h-5 flex items-center justify-center rounded-sm text-xs shadow-sm uppercase min-w-max"
                                                    >
                                                        Short
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedAd(ad);
                                                            setEditFormData({
                                                                ...ad,
                                                                merchantID: ad.merchantID || ad.user?._id || ''
                                                            });
                                                            setMerchantName('');
                                                            setPendingDescriptionAction(null);
                                                            setShowEditModal(true);
                                                            markAdAsSeen(ad._id);
                                                        }}
                                                        className="bg-emerald-600 text-white px-2 h-5 flex items-center justify-center rounded-sm text-xs shadow-sm uppercase min-w-max"
                                                    >
                                                        Detail
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Headline Row - Spans exactly across Location, Price, AD Type, PWR Target */}
                                        <tr className={cn(
                                            idx % 2 === 0 ? "bg-white" : "bg-slate-100",
                                            selectedAds.includes(ad._id) && "bg-rose-50/50",
                                            "h-4"
                                        )}>
                                            <td colSpan={4} className="px-2 py-0 border-r border-b border-t border-slate-300 text-[12px] text-black truncate max-w-0">
                                                <div className="mt-[-4px]">{ad.headline}</div>
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Controls */}
                <div className="flex items-center justify-center gap-2 p-3 border-t border-slate-200 bg-white shadow-inner flex-wrap">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || loading}
                        className={cn("px-4 py-1.5 text-xs font-bold rounded-sm border shadow-sm transition-colors", currentPage === 1 || loading ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50")}
                    >
                        Previous
                    </button>

                    <div className="flex items-center gap-1">
                        {getVisiblePages().map((item, index) => {
                            if (typeof item !== 'number') {
                                return (
                                    <span key={`${item}-${index}`} className="px-2 py-1 text-xs text-slate-500 select-none">
                                        ..
                                    </span>
                                );
                            }

                            const isActive = item === currentPage;

                            return (
                                <button
                                    key={item}
                                    onClick={() => setCurrentPage(item)}
                                    disabled={loading}
                                    className={cn(
                                        "min-w-8 px-2 py-1.5 text-xs rounded-sm border shadow-sm transition-colors",
                                        loading
                                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                            : isActive
                                                ? "bg-blue-50 text-blue-600 border-blue-300 font-bold"
                                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    {item}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages || loading}
                        className={cn("px-4 py-1.5 text-xs font-bold rounded-sm border shadow-sm transition-colors", currentPage >= totalPages || loading ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50")}
                    >
                        Next
                    </button>
                </div>
            </div >

            {/* SEARCH MODAL */}
            <AnimatePresence>
                {
                    showSearchModal && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSearchModal(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white border border-slate-900 w-full max-w-[95vw] rounded-sm shadow-2xl relative z-10 p-5 font-['Tahoma','Verdana',sans-serif]">
                                <div className="flex items-center justify-between mb-4 border-b pb-2">
                                    <span className="text-sm font-bold text-black uppercase tracking-tight">Search By Item</span>
                                    <button onClick={() => setShowSearchModal(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors"><X className="w-5 h-5 text-black" /></button>
                                </div>

                                <div className="grid grid-cols-5 gap-y-4 gap-x-3 mb-6">
                                    {/* Row 1 */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Product Tracing ID</label>
                                        <input
                                            type="text"
                                            placeholder="Tracing ID..."
                                            className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors rounded-[2px]"
                                            value={searchKeys._id}
                                            onChange={(e) => setSearchKeys({ ...searchKeys, _id: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Mobile</label>
                                        <input
                                            type="text"
                                            placeholder="Mobile..."
                                            className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors rounded-[2px]"
                                            value={searchKeys.mobile}
                                            onChange={(e) => setSearchKeys({ ...searchKeys, mobile: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Email</label>
                                        <input
                                            type="text"
                                            placeholder="Email..."
                                            className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors rounded-[2px]"
                                            value={searchKeys.email}
                                            onChange={(e) => setSearchKeys({ ...searchKeys, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Active Status</label>
                                        <select
                                            className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors bg-white rounded-[2px]"
                                            value={searchKeys.status}
                                            onChange={(e) => setSearchKeys({ ...searchKeys, status: e.target.value })}
                                        >
                                            <option value="">Select</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="notification">Notification</option>
                                            <option value="pause">Pause</option>
                                            <option value="review">Review</option>
                                            <option value="delete_request">Delete Request</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Edit Status</label>
                                        <select
                                            className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors bg-white rounded-[2px]"
                                            value={searchKeys.userUpdated}
                                            onChange={(e) => setSearchKeys({ ...searchKeys, userUpdated: e.target.value })}
                                        >
                                            <option value="">Select</option>
                                            <option value="true">Edited (Pending Review)</option>
                                            <option value="false">Not Edited</option>
                                        </select>
                                    </div>

                                    {/* Row 2 */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Packages</label>
                                        <select
                                            className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors bg-white rounded-[2px]"
                                            value={searchKeys.packages}
                                            onChange={(e) => setSearchKeys({ ...searchKeys, packages: e.target.value })}
                                        >
                                            <option value="">Free/Today/Running PKG</option>
                                            <option value="Free">Free</option>
                                            <option value="Today">Today Promoted</option>
                                            <option value="Running">Running Promote</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Condition</label>
                                        <select
                                            className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors bg-white rounded-[2px]"
                                            value={searchKeys.condition}
                                            onChange={(e) => setSearchKeys({ ...searchKeys, condition: e.target.value })}
                                        >
                                            <option value="">Select</option>
                                            <option value="New">New</option>
                                            <option value="Used">Used</option>
                                            <option value="Reconditioned">Reconditioned</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Categorie</label>
                                        <select
                                            className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors bg-white rounded-[2px]"
                                            value={searchKeys.category}
                                            onChange={(e) => setSearchKeys({ ...searchKeys, category: e.target.value, subCategory: '' })}
                                        >
                                            <option value="">Select</option>
                                            {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Sub Categorie</label>
                                        <select
                                            className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors bg-white rounded-[2px]"
                                            value={searchKeys.subCategory}
                                            onChange={(e) => setSearchKeys({ ...searchKeys, subCategory: e.target.value })}
                                        >
                                            <option value="">Select</option>
                                            {categories.find(c => c.name === searchKeys.category)?.subcategories.map((s, i) => (
                                                <option key={i} value={s.name}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Photo Accept Request</label>
                                        <select
                                            className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors bg-white rounded-[2px]"
                                            value={searchKeys.photoStatus}
                                            onChange={(e) => setSearchKeys({ ...searchKeys, photoStatus: e.target.value })}
                                        >
                                            <option value="">Select</option>
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>

                                    {/* Row 3 */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Registration Date From</label>
                                        <div className="flex border border-slate-300 h-9 rounded-[2px] overflow-hidden focus-within:border-black transition-colors">
                                            <input
                                                type="date"
                                                className="flex-1 px-2 outline-none text-xs bg-transparent"
                                                value={searchKeys.dateFrom}
                                                onChange={(e) => setSearchKeys({ ...searchKeys, dateFrom: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Registration Date To</label>
                                        <div className="flex border border-slate-300 h-9 rounded-[2px] overflow-hidden focus-within:border-black transition-colors">
                                            <input
                                                type="date"
                                                className="flex-1 px-2 outline-none text-xs bg-transparent"
                                                value={searchKeys.dateTo}
                                                onChange={(e) => setSearchKeys({ ...searchKeys, dateTo: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Badge/Tag</label>
                                        <select
                                            className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors bg-white rounded-[2px]"
                                            value={searchKeys.promoteTag}
                                            onChange={(e) => setSearchKeys({ ...searchKeys, promoteTag: e.target.value })}
                                        >
                                            <option value="">Select</option>
                                            <option value="Urgent">Urgent</option>
                                            <option value="Discount">Discount</option>
                                            <option value="Offer">Offer</option>
                                            <option value="Highlights">Highlights</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Sub Location</label>
                                        <select
                                            className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors bg-white rounded-[2px]"
                                            value={searchKeys.subLocation}
                                            onChange={(e) => setSearchKeys({ ...searchKeys, subLocation: e.target.value })}
                                        >
                                            <option value="">Select</option>
                                            {locations.flatMap(l => l.subLocations).map((s, i) => (
                                                <option key={i} value={s.name}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-bold text-slate-700">Detail Request</label>
                                        <select
                                            className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors bg-white rounded-[2px]"
                                            value={searchKeys.actionType}
                                            onChange={(e) => setSearchKeys({ ...searchKeys, actionType: e.target.value })}
                                        >
                                            <option value="">Select</option>
                                            <option value="detail">Detail View</option>
                                            <option value="click">Direct Click</option>
                                        </select>
                                    </div>

                                    {/* Row 4: Dynamic Features */}
                                    {(() => {
                                        const selectedSubCat = categories.flatMap(c => c.subcategories).find(s => s.name === searchKeys.subCategory);
                                        const features = selectedSubCat?.features || [];
                                        if (features.length === 0) return null;

                                        return (
                                            <>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[11px] font-bold text-slate-700">Feature Type</label>
                                                    <select
                                                        className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors bg-white rounded-[2px]"
                                                        value={searchKeys.featureName}
                                                        onChange={(e) => setSearchKeys({ ...searchKeys, featureName: e.target.value, featureValue: '' })}
                                                    >
                                                        <option value="">Select Feature</option>
                                                        {features.map((f: any, i: number) => (
                                                            <option key={i} value={f.name}>{f.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[11px] font-bold text-slate-700">Feature Value</label>
                                                    <select
                                                        className="border border-slate-300 h-9 px-2 text-xs outline-none focus:border-black transition-colors bg-white rounded-[2px]"
                                                        value={searchKeys.featureValue}
                                                        onChange={(e) => setSearchKeys({ ...searchKeys, featureValue: e.target.value })}
                                                        disabled={!searchKeys.featureName}
                                                    >
                                                        <option value="">Select Value</option>
                                                        {features.find((f: any) => f.name === searchKeys.featureName)?.buttonItemNames?.map((v: string, i: number) => (
                                                            <option key={i} value={v}>{v}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                    <button
                                        onClick={() => {
                                            setSearchKeys({
                                                _id: '', mobile: '', email: '', status: '', userUpdated: '',
                                                packages: '', condition: '', category: '', subCategory: '',
                                                photoStatus: '', dateFrom: '', dateTo: '', promoteTag: '',
                                                featureName: '', featureValue: '',
                                                subLocation: '', actionType: ''
                                            });
                                            fetchAds();
                                            setShowSearchModal(false);
                                        }}
                                        className="bg-[#2d3436] text-white px-5 py-2 font-bold rounded-[3px] text-xs shadow-md border hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <RotateCcw className="w-4 h-4" /> Hide Search
                                    </button>
                                    <button
                                        onClick={() => {
                                            fetchAds(searchKeys);
                                            setShowSearchModal(false);
                                        }}
                                        className="bg-[#00b894] text-white px-6 py-2 font-bold rounded-[3px] text-xs shadow-md border hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <Search className="w-4 h-4" /> Search
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

            {/* ADD/EDIT MODAL */}
            <AnimatePresence>
                {
                    showEditModal && (
                        <div className="fixed inset-0 z-[110] flex items-start justify-center pt-8 px-4 pb-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEditModal(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="bg-white border-[1px] border-slate-300 w-full max-w-[98vw] rounded-sm shadow-xl relative z-10 flex flex-col h-[93vh] text-xs font-['Tahoma','Verdana',sans-serif]">
                                {/* Top Bar Navigation */}
                                <div className="p-2 px-6 flex items-center justify-between border-b bg-white">
                                    <div className="flex items-center gap-2">
                                        <LayoutGrid className="w-4 h-4 text-black" />
                                        <span className="text-black text-base">/</span>
                                        <span className="font-bold text-black text-base">{selectedAd?._id ? "Edit Post" : "Add Post"}</span>
                                        <span className="bg-emerald-600 text-white px-2 ml-4 rounded-[2px] text-[10px] py-0.5 font-bold uppercase tracking-wider">Publish Mode</span>
                                    </div>
                                    <button onClick={() => setShowEditModal(false)} className="hover:bg-slate-100 p-1.5 rounded-full transition-colors"><X className="w-6 h-6 text-black stroke-[2px]" /></button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 grid grid-cols-[1fr_1fr] gap-3 bg-white">
                                    {/* Left Column */}
                                    <div className="flex flex-col gap-2">
                                        <div className="border border-slate-200 p-2 rounded-sm space-y-2">
                                            <input
                                                placeholder="Heading"
                                                className="w-full border border-slate-200 px-2 h-7 outline-none font-bold text-xs placeholder:text-black"
                                                value={editFormData.headline || ''}
                                                onChange={(e) => handleEditChange('headline', e.target.value)}
                                            />
                                            {(editFormData.pendingDescription && editFormData.pendingDescription !== editFormData.description) ? (
                                                <>
                                                    <div className="space-y-0.5">
                                                        <div className="text-sm text-black font-bold">Active Description</div>
                                                        <textarea
                                                            className="w-full border border-slate-200 p-1.5 outline-none text-sm h-28 resize-none bg-slate-100 text-slate-500 font-medium"
                                                            value={editFormData.description || ''}
                                                            readOnly
                                                        />
                                                    </div>
                                                    <div className="space-y-1 bg-rose-50/30 p-2 border border-rose-100 rounded-sm">
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-[11px] text-rose-600 font-black uppercase italic tracking-tighter">User Updated Version (Pending)</div>
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    onClick={() => setPendingDescriptionAction('accept')}
                                                                    className={cn(
                                                                        "px-2 py-0.5 text-[10px] font-bold border rounded-[2px] transition-colors",
                                                                        pendingDescriptionAction === 'accept'
                                                                            ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                                                                            : "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                                                    )}
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => setPendingDescriptionAction('decline')}
                                                                    className={cn(
                                                                        "px-2 py-0.5 text-[10px] font-bold border rounded-[2px] transition-colors",
                                                                        pendingDescriptionAction === 'decline'
                                                                            ? "bg-rose-600 text-white border-rose-700 shadow-sm"
                                                                            : "bg-white text-rose-600 border-rose-200 hover:bg-rose-50"
                                                                    )}
                                                                >
                                                                    Discard
                                                                </button>
                                                                {pendingDescriptionAction && (
                                                                    <button
                                                                        onClick={() => setPendingDescriptionAction(null)}
                                                                        className="text-slate-400 hover:text-black"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <textarea
                                                            className="w-full border border-rose-200 p-1.5 outline-none text-sm h-36 resize-none bg-white font-bold text-black shadow-inner"
                                                            value={editFormData.pendingDescription || ''}
                                                            onChange={(e) => handleEditChange('pendingDescription', e.target.value)}
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="space-y-0.5">
                                                    <div className="text-xs text-black font-bold">Description</div>
                                                    <textarea
                                                        className="w-full border border-slate-200 p-1.5 outline-none text-sm h-64 resize-none bg-white font-medium"
                                                        value={editFormData.description || ''}
                                                        onChange={(e) => handleEditChange('description', e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            {['category', 'subCategory', 'location', 'subLocation'].map((name) => (
                                                <select
                                                    key={name}
                                                    className="border border-slate-200 h-7 outline-none text-xs bg-white px-1"
                                                    value={editFormData[name as keyof typeof editFormData] as string || ''}
                                                    onChange={(e) => handleEditChange(name, e.target.value)}
                                                >
                                                    <option value="">{name === 'category' ? 'Categorie' : name === 'subCategory' ? 'Sub Catagoeie' : name === 'location' ? 'Location' : 'Sub Location'}</option>
                                                    {name === 'category' && categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                                    {name === 'subCategory' && categories.find(c => c.name === editFormData.category)?.subcategories.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
                                                    {name === 'location' && locations.map(l => <option key={l._id} value={l.name}>{l.name}</option>)}
                                                    {name === 'subLocation' && locations.find(l => l.name === editFormData.location)?.subLocations.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
                                                </select>
                                            ))}
                                        </div>

                                        <div className="border border-slate-200 p-2 rounded-sm space-y-2">
                                            <div className="flex gap-1.5 items-center">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        className={cn("border border-slate-200 h-7 outline-none w-56 px-2 font-bold text-black text-xs", selectedAd?._id ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-white focus:border-black")}
                                                        value={editFormData.merchantID || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            handleEditChange('merchantID', val);
                                                            if (val.length === 24) {
                                                                verifyMerchant(val);
                                                            } else {
                                                                setMerchantName('');
                                                            }
                                                        }}
                                                        disabled={!!selectedAd?._id}
                                                        placeholder="Enter User ID"
                                                    />
                                                    <span className="absolute -top-3 left-0 text-[10px] text-slate-400 font-bold uppercase tracking-wider">Merchant ID</span>
                                                    {merchantName && !selectedAd?._id && (
                                                        <span className={cn("absolute -bottom-4 left-0 text-[10px] font-bold", merchantName === 'User not found' ? 'text-rose-500' : 'text-emerald-600')}>{merchantName}</span>
                                                    )}
                                                </div>
                                                <div className="ml-0.5 flex items-center justify-center h-7 text-black font-bold text-lg">+</div>
                                                <div className="ml-4 flex-1">
                                                    {(() => {
                                                        const currentSubCat = categories
                                                            .find(c => c.name === editFormData.category)
                                                            ?.subcategories.find((s: any) => s.name === editFormData.subCategory);

                                                        if (currentSubCat?.priceBoxShow || editFormData.price) {
                                                            return (
                                                                <div className="flex gap-1.5 pt-1">
                                                                    <div className="flex-1 relative">
                                                                        <input
                                                                            type="number"
                                                                            placeholder={currentSubCat?.priceBoxName || "Price"}
                                                                            className="border border-slate-200 h-7 px-2 outline-none text-xs w-full font-bold text-black"
                                                                            value={editFormData.price || ''}
                                                                            onChange={(e) => handleEditChange('price', e.target.value)}
                                                                        />
                                                                        <span className="absolute -top-3 left-0 text-[10px] text-slate-400 uppercase font-bold">
                                                                            {currentSubCat?.priceBoxName || "Price"}
                                                                        </span>
                                                                    </div>
                                                                    <select
                                                                        value={editFormData.priceType || 'Negotiable'}
                                                                        onChange={(e) => handleEditChange('priceType', e.target.value)}
                                                                        className="border border-slate-200 h-7 px-1 outline-none text-[10px] bg-white font-bold max-w-[80px]"
                                                                    >
                                                                        <option value="Negotiable">Negotiable</option>
                                                                        <option value="Fixed">Fixed</option>
                                                                    </select>
                                                                </div>
                                                            );
                                                        }
                                                        return <div className="text-[10px] text-slate-400 italic pt-1">No price for this subcategory</div>;
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="pt-2 space-y-2">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">Features / Attributes</div>
                                                {categories.find(c => c.name === editFormData.category)?.subcategories.find((s: any) => s.name === editFormData.subCategory)?.features?.map((feature: any) => (
                                                    <div key={feature._id} className="space-y-1 py-1 px-1 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{feature.name}</label>

                                                        {feature.buttonType === 'Radio' && (
                                                            <div className="flex flex-wrap gap-2 pt-0.5">
                                                                {feature.buttonItemNames.map((item: string) => {
                                                                    const currentVal = editFormData.features?.[feature.name];
                                                                    const isSelected = feature.selectionType === 'Multi'
                                                                        ? (Array.isArray(currentVal) && currentVal.includes(item))
                                                                        : currentVal === item;

                                                                    return (
                                                                        <button
                                                                            key={item}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                if (feature.selectionType === 'Multi') {
                                                                                    const vals = Array.isArray(currentVal) ? currentVal : (currentVal ? [currentVal] : []);
                                                                                    const newVals = vals.includes(item) ? vals.filter((v: string) => v !== item) : [...vals, item];
                                                                                    setEditFormData(prev => ({ ...prev, features: { ...prev.features, [feature.name]: newVals } }));
                                                                                } else {
                                                                                    setEditFormData(prev => ({ ...prev, features: { ...prev.features, [feature.name]: item } }));
                                                                                }
                                                                            }}
                                                                            className={cn(
                                                                                "px-2 py-0.5 text-[11px] rounded transition-all border",
                                                                                isSelected
                                                                                    ? "bg-black text-white border-black"
                                                                                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                                                                            )}
                                                                        >
                                                                            {item}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}

                                                        {feature.buttonType === 'Box' && feature.buttonItemNames.length === 1 && (
                                                            <input
                                                                className="w-full border border-slate-200 h-7 px-2 outline-none text-xs bg-white focus:border-black transition-colors"
                                                                placeholder={feature.boxFadeName || feature.buttonItemNames[0]}
                                                                value={editFormData.features?.[feature.name] || ''}
                                                                onChange={(e) => setEditFormData(prev => ({
                                                                    ...prev,
                                                                    features: { ...prev.features, [feature.name]: e.target.value }
                                                                }))}
                                                            />
                                                        )}

                                                        {feature.buttonType === 'Box' && feature.buttonItemNames.length > 1 && (
                                                            feature.selectionType === 'Multi' ? (
                                                                <div className="grid grid-cols-3 gap-1 pt-0.5">
                                                                    {feature.buttonItemNames.map((item: string) => {
                                                                        const currentVal = editFormData.features?.[feature.name];
                                                                        const isSelected = Array.isArray(currentVal) && currentVal.includes(item);

                                                                        return (
                                                                            <button
                                                                                key={item}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const vals = Array.isArray(currentVal) ? currentVal : (currentVal ? [currentVal] : []);
                                                                                    const newVals = vals.includes(item) ? vals.filter((v: string) => v !== item) : [...vals, item];
                                                                                    setEditFormData(prev => ({ ...prev, features: { ...prev.features, [feature.name]: newVals } }));
                                                                                }}
                                                                                className={cn(
                                                                                    "px-1 py-1 text-[10px] text-left rounded border transition-all truncate",
                                                                                    isSelected
                                                                                        ? "bg-black text-white border-black"
                                                                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                                                                                )}
                                                                            >
                                                                                {item}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <select
                                                                    className="w-full border border-slate-200 h-7 px-1 outline-none text-xs bg-white focus:border-black transition-colors"
                                                                    value={editFormData.features?.[feature.name] || ''}
                                                                    onChange={(e) => setEditFormData(prev => ({
                                                                        ...prev,
                                                                        features: { ...prev.features, [feature.name]: e.target.value }
                                                                    }))}
                                                                >
                                                                    <option value="">Select {feature.name}</option>
                                                                    {feature.buttonItemNames.map((item: string) => (
                                                                        <option key={item} value={item}>{item}</option>
                                                                    ))}
                                                                </select>
                                                            )
                                                        )}
                                                    </div>
                                                ))}
                                                {(!editFormData.subCategory || !(categories.find(c => c.name === editFormData.category)?.subcategories.find((s: any) => s.name === editFormData.subCategory)?.features?.length)) && (
                                                    <div className="text-center text-slate-400 py-1 italic">No features for this subcategory</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-1">
                                            <button onClick={() => setShowEditModal(false)} className="flex-1 bg-[#d9534f] text-white py-2 font-bold rounded-sm text-xs uppercase">Cancel</button>
                                            <button
                                                onClick={() => selectedAd && deleteAd(selectedAd._id)}
                                                className="flex-1 bg-[#f0ad4e] text-white py-2 font-bold rounded-sm text-xs uppercase"
                                            >
                                                Delete
                                            </button>
                                            <button onClick={handleSaveEdit} className="grow-[1.5] bg-[#5cb85c] text-white py-2 font-bold rounded-sm text-xs uppercase flex items-center justify-center gap-2">
                                                {saveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="flex flex-col gap-2">
                                        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 border border-slate-200 p-2 rounded-sm bg-white">
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-xs text-black font-bold italic">Show Till (Date)</label>
                                                <input
                                                    type="date"
                                                    className="border border-slate-200 h-6 outline-none text-xs px-1 w-full"
                                                    value={editFormData.showTill ? new Date(editFormData.showTill).toISOString().split('T')[0] : ''}
                                                    onChange={(e) => handleEditChange('showTill', e.target.value)}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-xs text-black">Post Entry</label>
                                                <div className="text-xs font-bold text-black leading-tight">
                                                    {selectedAd?._id ? (
                                                        <>
                                                            {new Date(selectedAd.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}<br />
                                                            {new Date(selectedAd.createdAt).toLocaleDateString()}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}<br />
                                                            {new Date().toLocaleDateString()}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-xs text-black">Post Modify</label>
                                                <div className="text-xs font-bold text-black leading-tight">
                                                    {selectedAd?.updatedAt ? (
                                                        <>
                                                            {new Date(selectedAd.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}<br />
                                                            {new Date(selectedAd.updatedAt).toLocaleDateString()}
                                                        </>
                                                    ) : selectedAd?._id ? (
                                                        <>
                                                            {new Date(selectedAd.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}<br />
                                                            {new Date(selectedAd.createdAt).toLocaleDateString()}
                                                        </>
                                                    ) : (
                                                        <span className="text-black font-normal">--:--<br />--/--/--</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-0.5 relative">
                                                <label className="text-xs text-black">Promote Type</label>
                                                <select
                                                    className="border border-slate-200 h-6 outline-none text-xs px-1 bg-white"
                                                    value={editFormData.adType || 'Free'}
                                                    onChange={(e) => handleEditChange('adType', e.target.value)}
                                                >
                                                    <option value="Free">Free</option>
                                                    <option value="Promoted">Promoted</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-xs text-black font-bold">Product ID</label>
                                                <div className="text-xs font-bold text-black border border-slate-200 px-2 py-1 bg-slate-50 rounded min-w-[120px]">{selectedAd?._id || 'Generated on save'}</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-[1.5fr_2.5fr] gap-2 border border-slate-200 p-2 rounded-sm bg-white relative">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-black">Product Status</span>
                                                        <ArrowLeft className="w-2.5 h-2.5 text-blue-500 rotate-[30deg]" />
                                                    </div>
                                                    <select
                                                        value={editFormData.status || 'pending'}
                                                        onChange={(e) => handleEditChange('status', e.target.value)}
                                                        className="w-full border border-slate-300 h-7 text-xs outline-none px-1 bg-white"
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
                                                        <option value="notification">Notification</option>
                                                        <option value="pause">Pause</option>
                                                        <option value="review">Review</option>
                                                        <option value="delete_request">Delete Request</option>
                                                    </select>
                                                </div>
                                                {/* <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-xs text-black">Target Value</label>
                                                        <input
                                                            type="number"
                                                            className="h-7 border border-slate-200 flex items-center px-1.5 text-xs font-bold text-black outline-none"
                                                            value={editFormData.targetValue || 0}
                                                            onChange={(e) => handleEditChange('targetValue', parseInt(e.target.value))}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-xs text-black">Target/D</label>
                                                        <input
                                                            className="h-7 border border-slate-200 flex items-center px-1.5 text-xs font-bold text-black outline-none"
                                                            value={editFormData.targetD || ''}
                                                            onChange={(e) => handleEditChange('targetD', e.target.value)}
                                                        />
                                                    </div>
                                                </div> */}
                                                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth">
                                                    <div className="grid grid-cols-4 gap-2 flex-grow min-w-[320px]">
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[10px] text-black font-bold uppercase">Delivery (Lifetime)</label>
                                                            <div className="h-6 border border-slate-200 flex items-center px-1.5 text-xs font-bold text-black bg-slate-50">
                                                                {editFormData.deliveryCount || 0}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[10px] text-black font-bold uppercase">Views (Lifetime)</label>
                                                            <div className="h-6 border border-slate-200 flex items-center px-1.5 text-xs font-bold text-black bg-slate-50">
                                                                {editFormData.views || 0}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[10px] text-black font-bold uppercase">Delivery (Daily)</label>
                                                            <div className="h-6 border border-slate-200 flex items-center px-1.5 text-xs font-bold text-black bg-slate-50">
                                                                {editFormData.dailyDeliveryCount || 0}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[10px] text-black font-bold uppercase">Views (Daily)</label>
                                                            <div className="h-6 border border-slate-200 flex items-center px-1.5 text-xs font-bold text-black bg-slate-50">
                                                                {editFormData.dailyViewsCount || 0}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {((editFormData.adType === 'Promoted') || (editFormData.promotionHistory && editFormData.promotionHistory.length > 0)) && (
                                                        <div className="flex items-center gap-2 border-l border-slate-300 pl-2">
                                                            {/* Current Promotion Period */}
                                                            {editFormData.adType === 'Promoted' && (
                                                                <div className="flex flex-col justify-center min-w-[140px] border border-blue-200 p-1 rounded-sm bg-blue-50/50 shadow-sm shrink-0">
                                                                    <div className="text-[8px] bg-blue-600 text-white w-fit px-1 font-black mb-1 italic">ACTIVE</div>
                                                                    <div className="text-[9px] font-black text-slate-600 leading-none mb-1">
                                                                        {editFormData.promoteStartDate ? new Date(editFormData.promoteStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : '--'} - {editFormData.promoteEndDate ? new Date(editFormData.promoteEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : '--'}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold text-blue-700 bg-white px-1 border border-blue-100 flex justify-between">
                                                                        <span>D: {editFormData.promotedDeliveryCount || 0}</span>
                                                                        <span className="text-slate-200">|</span>
                                                                        <span>V: {editFormData.promotedViews || 0}</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Historical Periods */}
                                                            {editFormData.promotionHistory && [...editFormData.promotionHistory].reverse().map((hist, idx) => (
                                                                <div key={idx} className="flex flex-col justify-center min-w-[140px] border border-slate-100 p-1 rounded-sm bg-white shadow-sm shrink-0 opacity-70">
                                                                    <div className="text-[8px] bg-slate-400 text-white w-fit px-1 font-black mb-1 uppercase">Past</div>
                                                                    <div className="text-[9px] font-black text-slate-500 leading-none mb-1">
                                                                        {new Date(hist.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} - {new Date(hist.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                                                                    </div>
                                                                    <div className="text-[10px] font-bold text-black bg-slate-50 px-1 border border-slate-100 flex justify-between">
                                                                        <span>D: {hist.deliveryCount}</span>
                                                                        <span className="text-slate-200">|</span>
                                                                        <span>V: {hist.views}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Target Locations Section for Promoted Ads */}
                                                {editFormData.adType === 'Promoted' && editFormData.targetLocations && editFormData.targetLocations.length > 0 && (
                                                    <div className="flex flex-col gap-1 border-t border-slate-100 pt-2 mt-1">
                                                        <label className="text-[10px] text-blue-600 font-bold uppercase tracking-wider flex items-center gap-1">
                                                            <Target className="w-3 h-3" /> Target Locations
                                                        </label>
                                                        <div className="flex flex-wrap gap-1">
                                                            {editFormData.targetLocations.map((loc, idx) => (
                                                                <span key={idx} className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 border border-blue-100 rounded-sm">
                                                                    {loc}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-xs text-black">Notification Dialogue</label>
                                                        <button
                                                            onClick={() => handleEditChange('notificationDialogue', '')}
                                                            className="text-[10px] text-rose-500 hover:underline font-bold"
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>
                                                    <input
                                                        className="w-full border border-slate-200 h-7 text-xs outline-none px-2 font-bold text-black"
                                                        value={editFormData.notificationDialogue || ''}
                                                        onChange={(e) => handleEditChange('notificationDialogue', e.target.value)}
                                                        placeholder=""
                                                    />
                                                </div>
                                                {/* <div className="grid grid-cols-[1fr_1fr_0.8fr] gap-1.5">
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-xs text-black whitespace-nowrap">View From</label>
                                                        <div className="flex border border-slate-200 h-7 items-center justify-center bg-slate-50"><Calendar className="w-3 h-3 text-black" /></div>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-xs text-black whitespace-nowrap">View Till</label>
                                                        <div className="flex border border-slate-200 h-7 items-center justify-center bg-slate-50"><Calendar className="w-3 h-3 text-black" /></div>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-xs text-black">Result</label>
                                                        <div className="h-7 border border-slate-200 bg-slate-50"></div>
                                                    </div>
                                                </div> */}
                                            </div>
                                        </div>

                                        <div className="border border-slate-200 p-2 rounded-sm space-y-1 bg-white">
                                            <label className="text-xs text-black">Note</label>
                                            <input
                                                className="w-full border border-slate-200 h-7 text-xs outline-none px-2"
                                                value={editFormData.note || ''}
                                                onChange={(e) => handleEditChange('note', e.target.value)}
                                            />
                                        </div>

                                        <div className="border border-slate-200 p-2 rounded-sm bg-white">
                                            <div className="text-xs font-bold text-black mb-2">Photo Zone</div>
                                            <div className="flex gap-2.5 items-start">
                                                {[...Array(5)].map((_, i) => (
                                                    <div key={i} className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-3">
                                                            <label className="text-xs text-black cursor-pointer hover:text-emerald-600 transition-colors uppercase font-bold">
                                                                Choose File
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept="image/*"
                                                                    onChange={(e) => handleFileChange(e, i)}
                                                                />
                                                            </label>
                                                            {/* <label className="flex items-center gap-0.5 cursor-pointer leading-none">
                                                                <input type="checkbox" className="w-2.5 h-2.5" />
                                                                <span className="text-xs text-black whitespace-nowrap">Long Img?</span>
                                                            </label> */}
                                                        </div>
                                                        <div className="w-[78px] h-[52px] border border-slate-200 rounded-[1px] bg-slate-50 relative overflow-hidden flex items-center justify-center group/p">
                                                            {editFormData.images?.[i] ? (
                                                                <>
                                                                    <img
                                                                        src={
                                                                            selectedFiles[i]
                                                                                ? URL.createObjectURL(selectedFiles[i])
                                                                                : getImageUrl(editFormData.images?.[i] || '')
                                                                        }
                                                                        className="w-full h-full object-cover"
                                                                        loading="lazy"
                                                                    />
                                                                    <div className="absolute top-0 right-0 flex gap-0.5 p-0.5 opacity-0 group-hover/p:opacity-100 transition-opacity">
                                                                        <div className="bg-[#5cb85c] rounded-full p-0.5 border-[0.5px] border-white shadow-sm cursor-pointer whitespace-nowrap"><Check className="w-2 h-2 text-white" strokeWidth={4} /></div>
                                                                        <div
                                                                            onClick={() => {
                                                                                const imageUrl = editFormData.images?.[i];
                                                                                if (selectedAd?._id && imageUrl && !selectedFiles[i]) {
                                                                                    // Existing image on server
                                                                                    deleteImage(selectedAd._id, imageUrl, i);
                                                                                } else {
                                                                                    // Local file or just clearing UI
                                                                                    const newImages = [...(editFormData.images || [])];
                                                                                    newImages[i] = "";
                                                                                    const newFiles = [...selectedFiles];
                                                                                    newFiles[i] = undefined as any;
                                                                                    setEditFormData({ ...editFormData, images: newImages });
                                                                                    setSelectedFiles(newFiles);
                                                                                }
                                                                            }}
                                                                            className="bg-[#d9534f] rounded-full p-0.5 border-[0.5px] border-white shadow-sm cursor-pointer"
                                                                        >
                                                                            <X className="w-2 h-2 text-white" strokeWidth={4} />
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <ImageIcon className="w-4 h-4 text-white" />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="flex items-end h-[52px]">
                                                    <ChevronRight className="w-4 h-4 text-black ml-1" />
                                                </div>
                                            </div>
                                        </div>

                                        {editFormData.userNewPhotos && (
                                            <div className="border border-slate-200 p-2 rounded-sm space-y-1.5 bg-white">
                                                <div className="text-xs font-extrabold text-black uppercase flex items-center justify-between">
                                                    <span>Approve photo</span>
                                                    <span className="bg-amber-100 text-amber-700 px-1 rounded text-[10px] lowercase font-bold italic">New Photos Requested</span>
                                                </div>
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="border-b border-slate-100 italic">
                                                            <th className="text-left font-bold pb-1 w-1/4">Photo</th>
                                                            <th className="text-left font-bold pb-1 w-1/4 text-center">Type</th>
                                                            <th className="text-right font-bold pb-1 w-1/4 px-2 text-center whitespace-nowrap">Accept Request</th>
                                                            <th className="text-right font-bold pb-1 w-1/4 pr-4">#</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(editFormData.pendingImages && editFormData.pendingImages.length > 0 ? editFormData.pendingImages : editFormData.images)?.map((img, i) => (
                                                            <tr key={i} className="border-b border-slate-50 last:border-0">
                                                                <td className="py-2">
                                                                    <div className="w-[100px] h-[60px] border border-slate-200 rounded-[1px] overflow-hidden">
                                                                        <img
                                                                            src={getImageUrl(img)}
                                                                            className="w-full h-full object-cover"
                                                                            loading="lazy"
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="py-1 text-center font-bold text-black text-xs">Product</td>
                                                                <td className="py-1 text-center px-4">
                                                                    <button
                                                                        onClick={() => selectedAd && updateAdField(selectedAd._id, 'photoStatus', 'approved')}
                                                                        className="bg-[#f0ad4e] text-white px-3 py-1 rounded-[1px] font-bold text-xs w-full shadow-sm"
                                                                    >
                                                                        Accept
                                                                    </button>
                                                                </td>
                                                                <td className="py-1 text-right pr-4">
                                                                    <button
                                                                        onClick={() => selectedAd && deleteImage(selectedAd._id, img)}
                                                                        className="bg-[#d9534f] text-white px-2 py-1 rounded-[1px] font-bold text-xs shadow-sm"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

            {/* SHORT VIEW MODAL */}
            <AnimatePresence>
                {
                    showShortViewModal && selectedAd && (
                        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowShortViewModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white border-[1.5px] border-slate-900 w-full max-w-4xl rounded-sm shadow-2xl relative z-10 p-6 font-['Tahoma','Verdana',sans-serif] max-h-[90vh] overflow-y-auto no-scrollbar">
                                <div className="flex items-center justify-between mb-6 pb-2 border-b">
                                    <div className="flex items-center gap-2">
                                        <ArrowLeft className="w-4 h-4 text-rose-500" />
                                        <span className="text-sm font-bold text-black uppercase tracking-tight">/ Short View Post Moderation</span>
                                        <span className={cn(
                                            "px-2 rounded-sm text-[11px] py-0.5 uppercase font-bold text-white ml-2",
                                            selectedAd.status === 'active' ? "bg-emerald-600" :
                                                selectedAd.status === 'pending' ? "bg-amber-500" :
                                                    selectedAd.status === 'deleted' ? "bg-red-600" : "bg-slate-500"
                                        )}>
                                            {selectedAd.status === 'deleted' ? 'Deleted' :
                                                selectedAd.status === 'pause' ? 'Paused' :
                                                    selectedAd.status === 'rejected' ? 'Rejected' :
                                                        selectedAd.status}
                                        </span>
                                    </div>
                                    <button onClick={() => setShowShortViewModal(false)} className="hover:bg-slate-100 p-1 rounded-full"><X className="w-5 h-5 text-black" /></button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-8">
                                    {/* Content Column */}
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Heading</label>
                                            <div className="text-[13px] font-bold text-black border-b border-slate-200 pb-2">{selectedAd.headline}</div>
                                        </div>

                                        {/* Description Area */}
                                        {(editFormData.pendingDescription && editFormData.pendingDescription !== editFormData.description) ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-black text-rose-500 uppercase italic tracking-widest">MODERATION: Description Update Request</label>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setPendingDescriptionAction('accept'); }}
                                                            className={cn(
                                                                "px-3 py-1 rounded-sm text-[10px] font-bold transition-colors shadow-sm",
                                                                pendingDescriptionAction === 'accept' ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600 hover:bg-emerald-100"
                                                            )}
                                                        >
                                                            Approve New
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setPendingDescriptionAction('decline'); }}
                                                            className={cn(
                                                                "px-3 py-1 rounded-sm text-[10px] font-bold transition-colors shadow-sm",
                                                                pendingDescriptionAction === 'decline' ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-600 hover:bg-rose-100"
                                                            )}
                                                        >
                                                            Discard
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Live Description</span>
                                                        <div className="text-[12px] text-slate-500 max-h-48 overflow-y-auto bg-slate-50 p-3 border border-slate-100 leading-relaxed italic whitespace-pre-wrap">{editFormData.description}</div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <span className="text-[9px] font-bold text-rose-600 uppercase">Requested Edit</span>
                                                        <div className="text-[12px] text-black max-h-48 overflow-y-auto bg-rose-50/20 p-3 border border-rose-200 leading-relaxed font-bold shadow-sm whitespace-pre-wrap">{editFormData.pendingDescription}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Post Description</label>
                                                <div className="text-[12px] text-black max-h-64 overflow-y-auto bg-slate-50 p-4 border border-slate-200 leading-relaxed rounded-sm whitespace-pre-wrap">{editFormData.description}</div>
                                            </div>
                                        )}

                                        <div className="space-y-4 pt-4 border-t">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Photo Moderation</label>
                                                <div className="flex gap-4 text-[11px] font-bold">
                                                    <label className="flex items-center gap-1.5 cursor-pointer text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                                        <input
                                                            type="radio"
                                                            name="short_photo_status"
                                                            className="w-3 h-3 accent-emerald-600"
                                                            checked={editFormData.photoStatus === 'approved'}
                                                            onChange={() => handleEditChange('photoStatus', 'approved')}
                                                        />
                                                        ACCEPT ALL
                                                    </label>
                                                    <label className="flex items-center gap-1.5 cursor-pointer text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                                                        <input
                                                            type="radio"
                                                            name="short_photo_status"
                                                            className="w-3 h-3 accent-rose-600"
                                                            checked={editFormData.photoStatus === 'rejected'}
                                                            onChange={() => handleEditChange('photoStatus', 'rejected')}
                                                        />
                                                        REJECT
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar">
                                                {(editFormData.pendingImages && editFormData.pendingImages.length > 0 ? editFormData.pendingImages : editFormData.images)?.map((img, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-20 h-20 border border-slate-200 rounded overflow-hidden shrink-0 relative group shadow-sm hover:border-blue-400 transition-all cursor-crosshair"
                                                        onMouseEnter={() => setHoveredImage(img)}
                                                        onMouseLeave={() => setHoveredImage(null)}
                                                    >
                                                        <img src={getImageUrl(img)} className="w-full h-full object-cover" loading="lazy" />
                                                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Eye className="w-5 h-5 text-white drop-shadow-md" />
                                                        </div>
                                                        <div className="absolute top-1 right-1 p-0.5 flex gap-0.5">
                                                            <div className="bg-emerald-500 w-1.5 h-1.5 rounded-full border border-white shadow-sm" />
                                                            <div className="bg-rose-500 w-1.5 h-1.5 rounded-full border border-white shadow-sm" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details Column */}
                                    <div className="bg-slate-50/80 p-5 border border-slate-200 rounded-sm space-y-6">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Category</label>
                                                    <select
                                                        className="w-full bg-transparent text-xs font-bold text-black border-b border-slate-300 pb-1 outline-none cursor-pointer"
                                                        value={editFormData.category || ''}
                                                        onChange={(e) => handleEditChange('category', e.target.value)}
                                                    >
                                                        {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Sub Category</label>
                                                    <select
                                                        className="w-full bg-transparent text-xs text-black border-b border-slate-300 pb-1 outline-none cursor-pointer"
                                                        value={editFormData.subCategory || ''}
                                                        onChange={(e) => handleEditChange('subCategory', e.target.value)}
                                                    >
                                                        <option value="">N/A</option>
                                                        {categories.find(c => c.name === editFormData.category)?.subcategories.map((s, i) => (
                                                            <option key={i} value={s.name}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Location</label>
                                                    <select
                                                        className="w-full bg-transparent text-xs font-bold text-black border-b border-slate-300 pb-1 outline-none cursor-pointer"
                                                        value={editFormData.location || ''}
                                                        onChange={(e) => handleEditChange('location', e.target.value)}
                                                    >
                                                        {locations.map(l => <option key={l._id} value={l.name}>{l.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase">Sub Location</label>
                                                    <select
                                                        className="w-full bg-transparent text-xs text-black border-b border-slate-300 pb-1 outline-none cursor-pointer"
                                                        value={editFormData.subLocation || ''}
                                                        onChange={(e) => handleEditChange('subLocation', e.target.value)}
                                                    >
                                                        <option value="">N/A</option>
                                                        {locations.find(l => l.name === editFormData.location)?.subLocations.map((s, i) => (
                                                            <option key={i} value={s.name}>{s.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="pt-4 space-y-4">
                                                <div className="p-3 bg-white border border-slate-200 rounded-px shadow-inner">
                                                    <label className="text-[11px] font-black text-emerald-600 uppercase mb-1 block">Price (Payable)</label>
                                                    <div className="flex items-center text-lg font-black text-black">
                                                        <span className="text-sm mr-1">৳</span>
                                                        <input
                                                            type="number"
                                                            className="w-full bg-transparent outline-none border-none p-0 focus:ring-0"
                                                            value={editFormData.price || ''}
                                                            onChange={(e) => handleEditChange('price', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                {selectedAd.showTill && (
                                                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-px">
                                                        <label className="text-[11px] font-black text-rose-500 uppercase underline mb-1 block italic">SHOW TILL!</label>
                                                        <div className="text-sm font-black text-rose-600 flex items-center gap-2">
                                                            <Calendar className="w-4 h-4" />
                                                            {new Date(selectedAd.showTill).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Target Locations Section for Promoted Ads */}
                                                {editFormData.adType === 'Promoted' && editFormData.targetLocations && editFormData.targetLocations.length > 0 && (
                                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-px">
                                                        <label className="text-[11px] font-black text-blue-600 uppercase underline mb-2 block italic">Target Locations</label>
                                                        <div className="flex flex-wrap gap-1">
                                                            {editFormData.targetLocations.map((loc, idx) => (
                                                                <span key={idx} className="bg-white text-blue-700 text-[10px] font-bold px-2 py-0.5 border border-blue-100 rounded-sm shadow-sm">
                                                                    {loc}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-6 space-y-2 border-t border-slate-200">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (selectedAd && confirm("Confirm delete ad?")) {
                                                            const id = selectedAd._id;
                                                            axios.delete(`${API_BASE_URL}/api/ads/admin/${id}`, {
                                                                headers: { 'x-auth-token': Cookies.get('adminToken') }
                                                            }).then(() => {
                                                                setAds(prev => prev.filter(a => a._id !== id));
                                                                setShowShortViewModal(false);
                                                            });
                                                        }
                                                    }}
                                                    className="flex-1 bg-amber-500 text-white py-2 font-black rounded-sm text-[11px] uppercase tracking-wider shadow-sm hover:bg-amber-600 transition-all border-b-2 border-amber-700"
                                                >
                                                    Delete Post
                                                </button>
                                                <button
                                                    onClick={() => setShowShortViewModal(false)}
                                                    className="flex-1 border-2 border-slate-300 text-slate-500 py-2 font-black rounded-sm text-[11px] uppercase tracking-wider hover:bg-slate-100 transition-all"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (selectedAd) {
                                                        handlePublishAndNext(selectedAd._id);
                                                    }
                                                }}
                                                className="w-full bg-emerald-600 text-white py-3 font-black rounded-sm text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-emerald-700 transition-all border-b-4 border-emerald-800"
                                            >
                                                Publish Ad
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )
                }
            </AnimatePresence >

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* Photo Long View Simple Floating Preview */}
            <AnimatePresence>
                {hoveredImage && (
                    <div
                        className="fixed right-4 top-1/2 -translate-y-1/2 w-[650px] max-h-[95vh] bg-white border-2 border-slate-400 shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[200] flex flex-col rounded-sm overflow-hidden"
                    >
                        <div className="flex-1 overflow-y-auto no-scrollbar p-1">
                            <img
                                src={getImageUrl(hoveredImage)}
                                className="w-full h-auto"
                                alt="Preview"
                            />
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}
