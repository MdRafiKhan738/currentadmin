"use client";

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { 
    Plus, 
    Calendar, 
    Save, 
    Edit2,
    Loader2
} from 'lucide-react';
import { API_BASE_URL } from '../../../utils/apiConfig';
import { getImageUrl } from '../../../utils/imageUrl';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface AdPosition {
    _id?: string;
    positionId: number;
    placeName: string;
    deskWidth: string;
    deskHeight: string;
    mobWidth: string;
    mobHeight: string;
    link: string;
    endDate: string;
    status: 'Yes' | 'No';
    imageDesk: any; // Can be string path or File object or Base64 for preview
    imageMob: any;
}

export default function AdPositionPage() {
    const [positions, setPositions] = useState<AdPosition[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editData, setEditData] = useState<AdPosition | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [saving, setSaving] = useState(false);

    // Track newly selected files separately for FormData
    const [selectedFiles, setSelectedFiles] = useState<{ desk?: File, mob?: File }>({});

    const deskFileInputRef = useRef<HTMLInputElement>(null);
    const mobFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchPositions();
    }, []);

    const fetchPositions = async () => {
        setLoading(true);
        try {
            const token = Cookies.get('adminToken');
            const res = await axios.get(`${API_BASE_URL}/api/admins/ad-positions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPositions(res.data);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to fetch ad positions");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (pos: AdPosition) => {
        setEditingId(pos.positionId);
        // Format date for input
        const formData = { ...pos };
        if (formData.endDate) {
            formData.endDate = new Date(formData.endDate).toISOString().split('T')[0];
        } else {
            formData.endDate = "";
        }
        setEditData(formData);
        setSelectedFiles({});
        setIsDirty(false);
    };

    const handleInputChange = (field: keyof AdPosition, value: any) => {
        if (!editData) return;
        setEditData({ ...editData, [field]: value });
        setIsDirty(true);
    };

    const handleFileChange = (type: 'desk' | 'mob', file: File) => {
        if (!editData) return;
        
        // Local preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setEditData({ 
                ...editData, 
                [type === 'desk' ? 'imageDesk' : 'imageMob']: e.target?.result 
            });
        };
        reader.readAsDataURL(file);

        setSelectedFiles(prev => ({ ...prev, [type]: file }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (!editData || !editData._id) return;
        setSaving(true);
        try {
            const token = Cookies.get('adminToken');
            const formData = new FormData();
            
            // Append non-file fields
            formData.append('placeName', editData.placeName);
            formData.append('deskWidth', editData.deskWidth);
            formData.append('deskHeight', editData.deskHeight);
            formData.append('mobWidth', editData.mobWidth);
            formData.append('mobHeight', editData.mobHeight);
            formData.append('link', editData.link);
            formData.append('endDate', editData.endDate);
            formData.append('status', editData.status);

            // Append files if selected
            if (selectedFiles.desk) {
                formData.append('imageDesk', selectedFiles.desk);
            }
            if (selectedFiles.mob) {
                formData.append('imageMob', selectedFiles.mob);
            }

            const res = await axios.put(`${API_BASE_URL}/api/admins/ad-positions/${editData._id}`, formData, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            setPositions(prev => prev.map(p => p.positionId === editData.positionId ? res.data : p));
            setEditingId(null);
            setEditData(null);
            setSelectedFiles({});
            setIsDirty(false);
            toast.success("Ad position updated successfully");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to update ad position");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#f8fafc]">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="bg-[#f8fafc] min-h-[calc(100vh-4rem)] p-4 font-['Tahoma','Verdana',sans-serif]">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-normal text-[#334155] border-b border-slate-200 pb-2">AD POSITION</h1>
            </div>

            {/* Table */}
            <div className="bg-white rounded-sm border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                    <thead>
                        <tr className="bg-[#f1f5f9] text-[#64748b] text-[13px] border-b border-slate-200">
                            <th className="px-3 py-3 font-medium border-r border-slate-200">Place Name</th>
                            <th className="px-3 py-3 font-medium border-r border-slate-200">Image Desk</th>
                            <th className="px-3 py-3 font-medium border-r border-slate-200">Size(px)</th>
                            <th className="px-3 py-3 font-medium border-r border-slate-200">Image Mob</th>
                            <th className="px-3 py-3 font-medium border-r border-slate-200">Size(px)</th>
                            <th className="px-3 py-3 font-medium border-r border-slate-200">Link</th>
                            <th className="px-3 py-3 font-medium border-r border-slate-200">End Date</th>
                            <th className="px-3 py-3 font-medium border-r border-slate-200 text-center">Status</th>
                            <th className="px-3 py-3 font-medium text-center">Edit-Save</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {positions.map((pos) => {
                            const isEditing = editingId === pos.positionId;
                            const displayData = isEditing ? editData! : pos;

                            // End date display normalization
                            let endDateStr = "";
                            if (displayData.endDate) {
                                try {
                                    endDateStr = new Date(displayData.endDate).toISOString().split('T')[0];
                                } catch (e) {
                                    endDateStr = "";
                                }
                            }

                            return (
                                <tr key={pos.positionId} className="text-[#334155] text-[13px] hover:bg-slate-50 transition-colors">
                                    {/* Place Name */}
                                    <td className="px-3 py-4 border-r border-slate-200 align-middle">
                                        {displayData.placeName}
                                    </td>

                                    {/* Image Desk */}
                                    <td className="px-3 py-2 border-r border-slate-200 align-middle">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-10 bg-slate-100 rounded-[2px] border border-slate-200 overflow-hidden flex items-center justify-center">
                                                {displayData.imageDesk ? (
                                                    <img src={getImageUrl(displayData.imageDesk)} className="object-cover w-full h-full" alt="desk-preview" />
                                                ) : (
                                                    <div className="flex flex-col items-center opacity-30">
                                                        <Plus className="w-4 h-4 translate-y-1" />
                                                        <span className="text-[8px] font-bold">IMAGE</span>
                                                    </div>
                                                )}
                                            </div>
                                            {isEditing && (
                                                <button 
                                                    onClick={() => deskFileInputRef.current?.click()}
                                                    className="w-10 h-10 rounded-full border-2 border-slate-900 flex items-center justify-center hover:bg-slate-100 transition-colors"
                                                >
                                                    <Plus className="w-5 h-5 text-slate-900 stroke-[3]" />
                                                </button>
                                            )}
                                        </div>
                                    </td>

                                    {/* Size Desk */}
                                    <td className="px-3 py-2 border-r border-slate-200 align-middle">
                                        <div className="flex gap-1">
                                            <input 
                                                disabled={!isEditing}
                                                className="w-14 h-8 border border-slate-300 rounded-[2px] px-1 text-center focus:border-blue-500 outline-none disabled:bg-slate-100"
                                                value={displayData.deskWidth}
                                                onChange={(e) => handleInputChange('deskWidth', e.target.value)}
                                            />
                                            <input 
                                                disabled={!isEditing}
                                                className="w-14 h-8 border border-slate-300 rounded-[2px] px-1 text-center focus:border-blue-500 outline-none disabled:bg-slate-100"
                                                value={displayData.deskHeight}
                                                onChange={(e) => handleInputChange('deskHeight', e.target.value)}
                                            />
                                        </div>
                                    </td>

                                    {/* Image Mob */}
                                    <td className="px-3 py-2 border-r border-slate-200 align-middle">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-10 bg-slate-100 rounded-[2px] border border-slate-200 overflow-hidden flex items-center justify-center">
                                                {displayData.imageMob ? (
                                                    <img src={getImageUrl(displayData.imageMob)} className="object-cover w-full h-full" alt="mob-preview" />
                                                ) : (
                                                    <div className="flex flex-col items-center opacity-30">
                                                        <Plus className="w-4 h-4 translate-y-1" />
                                                        <span className="text-[8px] font-bold">IMAGE</span>
                                                    </div>
                                                )}
                                            </div>
                                            {isEditing && (
                                                <button 
                                                    onClick={() => mobFileInputRef.current?.click()}
                                                    className="w-10 h-10 rounded-full border-2 border-slate-900 flex items-center justify-center hover:bg-slate-100 transition-colors"
                                                >
                                                    <Plus className="w-5 h-5 text-slate-900 stroke-[3]" />
                                                </button>
                                            )}
                                        </div>
                                    </td>

                                    {/* Size Mob */}
                                    <td className="px-3 py-2 border-r border-slate-200 align-middle">
                                        <div className="flex gap-1">
                                            <input 
                                                disabled={!isEditing}
                                                className="w-14 h-8 border border-slate-300 rounded-[2px] px-1 text-center focus:border-blue-500 outline-none disabled:bg-slate-100"
                                                value={displayData.mobWidth}
                                                onChange={(e) => handleInputChange('mobWidth', e.target.value)}
                                            />
                                            <input 
                                                disabled={!isEditing}
                                                className="w-14 h-8 border border-slate-300 rounded-[2px] px-1 text-center focus:border-blue-500 outline-none disabled:bg-slate-100"
                                                value={displayData.mobHeight}
                                                onChange={(e) => handleInputChange('mobHeight', e.target.value)}
                                            />
                                        </div>
                                    </td>

                                    {/* Link */}
                                    <td className="px-3 py-2 border-r border-slate-200 align-middle">
                                        <input 
                                            disabled={!isEditing}
                                            className="w-full h-8 border border-slate-300 rounded-[2px] px-2 focus:border-blue-500 outline-none disabled:bg-slate-100"
                                            value={displayData.link}
                                            onChange={(e) => handleInputChange('link', e.target.value)}
                                        />
                                    </td>

                                    {/* End Date */}
                                    <td className="px-3 py-2 border-r border-slate-200 align-middle">
                                        <div className="flex items-center border border-slate-300 rounded-[2px] h-8 bg-white overflow-hidden w-40">
                                            <input 
                                                type="date"
                                                disabled={!isEditing}
                                                className="flex-1 px-2 outline-none text-[12px] bg-transparent disabled:bg-slate-100 cursor-pointer"
                                                value={endDateStr}
                                                onChange={(e) => handleInputChange('endDate', e.target.value)}
                                            />
                                        </div>
                                    </td>

                                    {/* Status */}
                                    <td className="px-3 py-2 border-r border-slate-200 align-middle">
                                        <div className="flex items-center justify-center gap-3">
                                            <label className="flex items-center gap-1 cursor-pointer select-none">
                                                <input 
                                                    type="radio"
                                                    disabled={!isEditing}
                                                    checked={displayData.status === 'Yes'}
                                                    onChange={() => handleInputChange('status', 'Yes')}
                                                    className="w-3.5 h-3.5 text-blue-600 border-slate-300 focus:ring-blue-500"
                                                />
                                                <span className="text-[12px] text-slate-700">Yes</span>
                                            </label>
                                            <label className="flex items-center gap-1 cursor-pointer select-none">
                                                <input 
                                                    type="radio"
                                                    disabled={!isEditing}
                                                    checked={displayData.status === 'No'}
                                                    onChange={() => handleInputChange('status', 'No')}
                                                    className="w-3.5 h-3.5 text-blue-600 border-slate-300 focus:ring-blue-500"
                                                />
                                                <span className="text-[12px] text-slate-700">No</span>
                                            </label>
                                        </div>
                                    </td>

                                    {/* Edit-Save Buttons */}
                                    <td className="px-3 py-2 align-middle">
                                        <div className="flex flex-col gap-1 items-center justify-center">
                                            {isEditing ? (
                                                <>
                                                    {isDirty && (
                                                        <button 
                                                            onClick={handleSave}
                                                            disabled={saving}
                                                            className="w-16 h-7 bg-[#2563eb] text-white rounded-[4px] text-[12px] font-medium flex items-center justify-center gap-1 hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                                                        >
                                                            {saving ? <Loader2 className="w-3 h-3 animate-spin"/> : "Save"}
                                                        </button>
                                                    )}
                                                    <button 
                                                        disabled={saving}
                                                        onClick={() => {
                                                            setEditingId(null);
                                                            setEditData(null);
                                                            setSelectedFiles({});
                                                            setIsDirty(false);
                                                        }}
                                                        className="w-16 h-7 bg-slate-100 text-slate-600 border border-slate-200 rounded-[4px] text-[12px] font-medium hover:bg-slate-200 transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <button 
                                                    onClick={() => handleEdit(pos)}
                                                    className="w-16 h-7 bg-white text-slate-700 border border-slate-300 rounded-[4px] text-[12px] font-medium hover:bg-slate-50 transition-all shadow-sm"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Hidden Input for file upload */}
            <input 
                type="file" 
                ref={deskFileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange('desk', file);
                }}
            />
            <input 
                type="file" 
                ref={mobFileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange('mob', file);
                }}
            />
        </div>
    );
}
