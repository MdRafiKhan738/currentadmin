"use client";

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    X, CheckCircle2, Calendar, ChevronDown, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../../../utils/apiConfig';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Cookies from 'js-cookie';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface MetaOption {
    _id: string;
    name: string;
}

interface SearchedUser {
    _id: string;
    mobile: string;
    name: string;
}

export default function NotificationMessaging() {
    // Form State - Default to empty to show only User Type initially
    const [userType, setUserType] = useState<string>('');
    const [categories, setCategories] = useState<string[]>(['All']);
    const [locations, setLocations] = useState<string[]>(['All']);
    const [promotedType, setPromotedType] = useState<string>('');
    const [loginFrom, setLoginFrom] = useState('');
    const [loginTo, setLoginTo] = useState('');
    const [postQuantity, setPostQuantity] = useState('');
    const [gender, setGender] = useState('All');
    const [trustedSeller, setTrustedSeller] = useState('');
    const [sendIn, setSendIn] = useState<string[]>(['Account']);
    const [message, setMessage] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [tempUser, setTempUser] = useState('');
    const [totalUserCount, setTotalUserCount] = useState<number | null>(null);

    // Meta Data
    const [allCategories, setAllCategories] = useState<MetaOption[]>([]);
    const [allLocations, setAllLocations] = useState<MetaOption[]>([]);
    const [showCategorySelector, setShowCategorySelector] = useState(false);
    const [showLocationSelector, setShowLocationSelector] = useState(false);
    const [showQuantitySelector, setShowQuantitySelector] = useState(false);

    // Search State
    const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isFilterAnimating, setIsFilterAnimating] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Refs for outside click handling
    const suggestionRef = useRef<HTMLDivElement>(null);
    const categoryContainerRef = useRef<HTMLDivElement>(null);
    const locationContainerRef = useRef<HTMLDivElement>(null);
    const quantityContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchMeta();
        fetchUserCount();
        const handleClickOutside = (event: MouseEvent) => {
            // Close suggestion dropdown
            if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
            // Close category dropdown
            if (categoryContainerRef.current && !categoryContainerRef.current.contains(event.target as Node)) {
                setShowCategorySelector(false);
            }
            // Close location dropdown
            if (locationContainerRef.current && !locationContainerRef.current.contains(event.target as Node)) {
                setShowLocationSelector(false);
            }
            // Close quantity dropdown
            if (quantityContainerRef.current && !quantityContainerRef.current.contains(event.target as Node)) {
                setShowQuantitySelector(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const searchMobile = async () => {
            if (tempUser.length >= 2) {
                setIsSearching(true);
                try {
                    const token = Cookies.get('adminToken');
                    if (!token) {
                        console.error("No admin token found in cookies");
                        return;
                    }
                    const res = await axios.get(`${API_BASE_URL}/api/admins/users/search-mobile?mobile=${tempUser}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    setSearchResults(res.data);
                    setShowSuggestions(true);
                } catch (err: any) {
                    console.error("Search failed", err);
                    if (err.response?.status === 401) {
                        toast.error("Session expired. Please login again.");
                    }
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowSuggestions(false);
            }
        };

        const timeoutId = setTimeout(searchMobile, 300);
        return () => clearTimeout(timeoutId);
    }, [tempUser]);

    const fetchUserCount = async () => {
        try {
            const token = Cookies.get('adminToken');
            const data = {
                userType,
                categories,
                locations,
                promotedType,
                gender,
                trustedSeller,
                loginFrom,
                loginTo,
                postQuantity,
                selectedUsers
            };
            const res = await axios.post(`${API_BASE_URL}/api/admins/notifications/count`, data, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setTotalUserCount(res.data.count);
        } catch (err) {
            console.error("Failed to fetch user count", err);
        }
    };

    useEffect(() => {
        if (userType) {
            fetchUserCount();
        }
    }, [userType, categories, locations, promotedType, gender, trustedSeller, loginFrom, loginTo, postQuantity, selectedUsers]);

    const fetchMeta = async () => {
        try {
            const [catRes, locRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/categories`),
                axios.get(`${API_BASE_URL}/api/locations`)
            ]);
            setAllCategories(catRes.data.data || []);
            setAllLocations(locRes.data.data || []);
        } catch (err) {
            console.error("Failed to fetch metadata", err);
        }
    };

    const toggleMultiSelect = (current: string[], value: string, setter: (val: string[]) => void) => {
        if (value === 'All') {
            setter(['All']);
            return;
        }
        let next = current.includes('All') ? [value] : (current.includes(value) ? current.filter(c => c !== value) : [...current, value]);
        if (next.length === 0) next = ['All'];
        setter(next);
    };

    const addSelectedUser = (mobile: string) => {
        if (!selectedUsers.includes(mobile)) {
            setSelectedUsers([...selectedUsers, mobile]);
            setTempUser('');
            setShowSuggestions(false);
        }
    };

    const handleSend = async () => {
        if (!message.trim()) {
            return toast.error("Please enter a message");
        }

        setIsSending(true);
        try {
            const token = Cookies.get('adminToken');
            const data = {
                userType,
                categories,
                locations,
                promotedType,
                gender,
                trustedSeller,
                loginFrom,
                loginTo,
                postQuantity,
                sendIn,
                message,
                selectedUsers
            };

            const res = await axios.post(`${API_BASE_URL}/api/admins/notifications/send`, data, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.success) {
                toast.success(res.data.message);

                // Show warning if some users didn't have emails
                if (res.data.usersWithoutEmail && sendIn.includes('Mail')) {
                    const count = res.data.usersWithoutEmail.length;
                    toast.error(`${count} user(s) don't have an email linked to their profile.`, {
                        duration: 5000,
                        icon: '⚠️'
                    });
                    console.log("Users without email:", res.data.usersWithoutEmail);
                }

                setMessage('');
            }
        } catch (err: any) {
            console.error("Failed to send notification", err);
            toast.error(err.response?.data?.message || "Failed to send notification");
        } finally {
            setIsSending(false);
        }
    };

    const Checkbox = ({ selected, onClick, label, isDense = false }: { selected: boolean, onClick: () => void, label: string, isDense?: boolean }) => (
        <div
            onClick={onClick}
            className="flex items-center gap-1.5 cursor-pointer select-none group"
        >
            <div
                className={cn(
                    "w-[13px] h-[13px] rounded-[1px] border flex items-center justify-center transition-colors",
                    selected ? "bg-slate-300 border-slate-400" : "bg-white border-slate-300 group-hover:border-slate-400"
                )}
            >
                {selected && <div className="w-[7px] h-[7px] bg-slate-600 rounded-[1px]" />}
            </div>
            <span className={cn("text-[13px] text-slate-800", isDense ? "leading-tight" : "")}>{label}</span>
        </div>
    );

    const isBulkFilterActive = ['All', 'Seller', 'Customer'].includes(userType);

    return (
        <div className="min-h-[calc(100vh-40px)] p-2 font-sans select-none overflow-hidden flex flex-col items-center">
            {/* Page Header */}
            <div className="w-full max-w-[1200px] mb-2">
                <h1 className="text-2xl text-[#e11d48] leading-tight">Notification & Messaging</h1>
            </div>

            {/* Main Form Container */}
            <div className="bg-white border border-[#e5e5e5] rounded-[4px] p-6 w-full max-w-[1200px] shadow-sm flex flex-col min-h-[400px]">
                <h2 className="text-[15px] font-normal text-slate-800 mb-3">Notify Or Message User</h2>

                <div className="relative grid grid-cols-[1fr_2fr_auto] gap-x-12">
                    {/* Left Section: User Type and Filters */}
                    <div className="col-span-2 space-y-[6px]">

                        {/* User Type (Always Visible) */}
                        <div className="flex items-center">
                            <span className="w-36 text-[15px] text-slate-900 leading-none font-medium">User Type</span>
                            <div className="flex items-center gap-4">
                                {['All', 'Seller', 'Customer', 'Selected'].map(type => (
                                    <Checkbox key={type} selected={userType === type} onClick={() => setUserType(type)} label={type} />
                                ))}
                            </div>
                        </div>

                        {/* Bulk Filters - Shown only if All/Seller/Customer is selected */}
                        <AnimatePresence>
                            {isBulkFilterActive && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    onAnimationComplete={() => setIsFilterAnimating(false)}
                                    onAnimationStart={() => setIsFilterAnimating(true)}
                                    className={cn(
                                        "pt-2 space-y-[6px]",
                                        isFilterAnimating ? "overflow-hidden" : "overflow-visible"
                                    )}
                                >
                                    {/* Category Type */}
                                    <div className="flex items-center">
                                        <span className="w-36 text-[15px] text-slate-900 leading-none">Category Type</span>
                                        <div className="flex items-center gap-4">
                                            <Checkbox selected={categories.includes('All')} onClick={() => setCategories(['All'])} label="All" />
                                            <div className="relative" ref={categoryContainerRef}>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setShowCategorySelector(!showCategorySelector)} className="text-[#3b82f6] text-[13px] hover:underline flex items-center gap-1 font-medium">
                                                        Select
                                                    </button>
                                                    {/* Selected Categories List */}
                                                    {!categories.includes('All') && categories.length > 0 && (
                                                        <span className="text-[12px] text-slate-500 max-w-[250px] truncate" title={categories.join(', ')}>
                                                            {categories.join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                                <AnimatePresence>
                                                    {showCategorySelector && (
                                                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute z-50 top-6 left-0 bg-white border border-slate-200 shadow-lg p-2 w-56 rounded-sm">
                                                            <div className="max-h-48 overflow-y-auto no-scrollbar">
                                                                {allCategories.map(cat => (
                                                                    <div key={cat._id} onClick={() => toggleMultiSelect(categories, cat.name, setCategories)} className="px-2 py-1.5 hover:bg-slate-50 text-[12px] cursor-pointer flex items-center justify-between rounded-sm">
                                                                        {cat.name}
                                                                        {categories.includes(cat.name) && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {/* Confirm Button */}
                                                            <div className="pt-2 mt-1 border-t border-slate-100 flex justify-end">
                                                                <button
                                                                    onClick={() => setShowCategorySelector(false)}
                                                                    className="text-[11px] bg-slate-800 text-white px-3 py-1 rounded-[2px] hover:bg-slate-700 transition-colors"
                                                                >
                                                                    Confirm
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location type */}
                                    <div className="flex items-center">
                                        <span className="w-36 text-[15px] text-slate-900 leading-none">Location type</span>
                                        <div className="flex items-center gap-4">
                                            <Checkbox selected={locations.includes('All')} onClick={() => setLocations(['All'])} label="All" />
                                            <div className="relative" ref={locationContainerRef}>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setShowLocationSelector(!showLocationSelector)} className="text-[#3b82f6] text-[13px] hover:underline flex items-center gap-1 font-medium">
                                                        Select
                                                    </button>
                                                    {/* Selected Locations List */}
                                                    {!locations.includes('All') && locations.length > 0 && (
                                                        <span className="text-[12px] text-slate-500 max-w-[250px] truncate" title={locations.join(', ')}>
                                                            {locations.join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                                <AnimatePresence>
                                                    {showLocationSelector && (
                                                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute z-50 top-6 left-0 bg-white border border-slate-200 shadow-lg p-2 w-56 rounded-sm">
                                                            <div className="max-h-48 overflow-y-auto no-scrollbar">
                                                                {allLocations.map(loc => (
                                                                    <div key={loc._id} onClick={() => toggleMultiSelect(locations, loc.name, setLocations)} className="px-2 py-1.5 hover:bg-slate-50 text-[12px] cursor-pointer flex items-center justify-between rounded-sm">
                                                                        {loc.name}
                                                                        {locations.includes(loc.name) && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            {/* Confirm Button */}
                                                            <div className="pt-2 mt-1 border-t border-slate-100 flex justify-end">
                                                                <button
                                                                    onClick={() => setShowLocationSelector(false)}
                                                                    className="text-[11px] bg-slate-800 text-white px-3 py-1 rounded-[2px] hover:bg-slate-700 transition-colors"
                                                                >
                                                                    Confirm
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Promoted type User */}
                                    <div className="flex items-center">
                                        <span className="w-36 text-[15px] text-slate-900 leading-none">Promoted type User</span>
                                        <div className="flex items-center gap-4">
                                            {['PP', 'Running', 'Never Promoted'].map(type => (
                                                <Checkbox key={type} selected={promotedType === type} onClick={() => setPromotedType(type)} label={type} />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Common Filters for Group Selection */}
                                    <div className="pt-2 space-y-[6px]">
                                        <div className="flex items-center">
                                            <span className="w-36 text-[15px] text-slate-900 leading-none">Login Status</span>
                                            <div className="flex items-center gap-2 border border-[#ccc] rounded-[2px] px-2 py-0.5 w-[360px] bg-white">
                                                <input
                                                    type="date"
                                                    value={loginFrom}
                                                    onChange={(e) => setLoginFrom(e.target.value)}
                                                    className="flex-1 outline-none text-[13px] bg-transparent"
                                                />
                                                <span className="text-[#999] text-[13px]">to</span>
                                                <input
                                                    type="date"
                                                    value={loginTo}
                                                    onChange={(e) => setLoginTo(e.target.value)}
                                                    className="flex-1 outline-none text-[13px] bg-transparent"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center z-30 relative">
                                            <span className="w-36 text-[15px] text-slate-900 leading-none">Post Quantity</span>
                                            <div className="relative w-[360px]" ref={quantityContainerRef}>
                                                <div
                                                    onClick={() => setShowQuantitySelector(!showQuantitySelector)}
                                                    className="flex items-center justify-between border border-[#ccc] rounded-[2px] px-2 py-0.5 w-full bg-white text-[13px] cursor-pointer hover:border-blue-400 transition-colors"
                                                >
                                                    <span>{postQuantity || 'Select Quantity'}</span>
                                                    <ChevronDown className="w-3 h-3 text-slate-600 ml-2" />
                                                </div>
                                                <AnimatePresence>
                                                    {showQuantitySelector && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 5 }}
                                                            className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-lg mt-1 z-50 rounded-sm overflow-hidden"
                                                        >
                                                            {['1+', '5+', '10+', '50+', '100+'].map((qty) => (
                                                                <div
                                                                    key={qty}
                                                                    onClick={() => {
                                                                        setPostQuantity(qty);
                                                                        setShowQuantitySelector(false);
                                                                    }}
                                                                    className={cn(
                                                                        "px-3 py-1.5 text-[13px] cursor-pointer hover:bg-slate-50 flex items-center justify-between",
                                                                        postQuantity === qty ? "bg-slate-50 font-medium" : "text-slate-700"
                                                                    )}
                                                                >
                                                                    {qty}
                                                                    {postQuantity === qty && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                                                </div>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="w-36 text-[15px] text-slate-900 leading-none">Gender</span>
                                            <div className="flex items-center gap-4">
                                                {['All', 'Male', 'Female'].map(type => (
                                                    <Checkbox key={type} selected={gender === type} onClick={() => setGender(type)} label={type} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="w-36 text-[15px] text-slate-900 leading-none">Trusted Seller</span>
                                            <div className="flex items-center gap-4">
                                                {['Yes', 'UnTrusted', 'All'].map(type => (
                                                    <Checkbox key={type} selected={trustedSeller === type} onClick={() => setTrustedSeller(type)} label={type} />
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Send In Options (Positioned after bulk filters but shows for any selection) */}
                        <AnimatePresence>
                            {userType && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="pt-1.5"
                                >
                                    <div className="flex items-center">
                                        <span className="w-36 text-[15px] text-slate-900 leading-none font-medium">Send In</span>
                                        <div className="flex items-center gap-4">
                                            {['Account', 'Mail', 'Mobile'].map(type => (
                                                <Checkbox key={type} selected={sendIn.includes(type)} onClick={() => toggleMultiSelect(sendIn, type, setSendIn)} label={type} />
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right Section: Selected User box */}
                    <AnimatePresence>
                        {userType === 'Selected' && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="w-[340px] pt-1">
                                <div className="mb-2">
                                    <span className="text-[15px] text-slate-900 font-medium">Selected User</span>
                                </div>
                                <div className="relative group">
                                    <div className="border border-[#ccc] rounded-[3px] p-2 min-h-[42px] max-h-[120px] overflow-y-auto flex flex-wrap gap-1.5 focus-within:border-blue-400 transition-colors bg-white">
                                        {selectedUsers.map(user => (
                                            <div key={user} className="bg-black text-white px-1.5 py-[2px] flex items-center gap-1.5 text-[12px] rounded-[1px] shadow-sm">
                                                {user}
                                                <button onClick={() => setSelectedUsers(u => u.filter(x => x !== user))} className="hover:text-red-400 text-[10px] ml-1">
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        ))}
                                        <div className="flex items-center flex-1">
                                            <input
                                                className="outline-none border-none text-[12px] w-full bg-transparent"
                                                value={tempUser}
                                                onChange={(e) => setTempUser(e.target.value)}
                                                placeholder={selectedUsers.length === 0 ? "Type mobile number..." : "..."}
                                            />
                                            {isSearching && <Loader2 className="w-3 h-3 animate-spin text-blue-500 ml-1" />}
                                        </div>
                                    </div>

                                    {/* Suggestions Dropdown */}
                                    <AnimatePresence>
                                        {showSuggestions && searchResults.length > 0 && (
                                            <motion.div
                                                ref={suggestionRef}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                className="absolute top-full left-0 right-0 z-[60] mt-1 bg-white border border-slate-200 shadow-xl max-h-48 overflow-y-auto rounded-sm no-scrollbar"
                                            >
                                                {searchResults.map((user, index) => (
                                                    <div
                                                        key={`${user.mobile}-${index}`}
                                                        onClick={() => addSelectedUser(user.mobile)}
                                                        className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex flex-col border-b border-slate-50 last:border-b-0"
                                                    >
                                                        <span className="text-[13px] font-bold text-slate-900">{user.mobile}</span>
                                                        <span className="text-[11px] text-slate-500">{user.name}</span>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                        {showSuggestions && searchResults.length === 0 && tempUser.length >= 2 && !isSearching && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="absolute top-full left-0 right-0 z-[60] mt-1 bg-white border border-slate-200 shadow-md p-3 text-center rounded-sm"
                                            >
                                                <span className="text-[12px] text-slate-400">User not found in database</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Message Section and Bottom Bar - Hidden until a User Type is selected */}
                <AnimatePresence>
                    {userType && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="mt-6"
                        >
                            <div className="flex items-start">
                                <span className="w-36 text-[15px] text-slate-900 leading-none pt-3">Message</span>
                                <div className="flex-1 flex flex-col gap-5">
                                    <textarea
                                        className="w-full h-32 border border-[#ccc] rounded-[2px] p-3 text-[14px] outline-none focus:border-slate-400 transition-colors resize-none"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Type your notification message..."
                                    />

                                    {/* Bottom Bar */}
                                    <div className="flex h-[42px] overflow-hidden rounded-[2px] border border-[#7c3aed]">
                                        <div className="bg-[#cbd5e1] text-black w-48 flex items-center justify-center font-normal text-[15px] border-r border-[#7c3aed]">
                                            Selected : {userType === 'Selected' ? selectedUsers.length : (totalUserCount !== null ? totalUserCount : '...')}
                                        </div>
                                        <button
                                            onClick={handleSend}
                                            disabled={isSending}
                                            className="flex-1 bg-[#4f46e5]/90 hover:bg-[#4f46e5] text-white flex items-center justify-center text-[16px] font-normal transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
