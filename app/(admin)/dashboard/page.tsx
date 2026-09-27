"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import {
    Home, Folder, FileText, Inbox,
    ShieldAlert, Users, Box, MessageSquare
} from 'lucide-react';
import { API_BASE_URL } from '@/utils/apiConfig';
import axios from 'axios';


export default function DashboardPage() {
    const router = useRouter();

    const [loading, setLoading] = React.useState(true);
    const [realStats, setRealStats] = React.useState<{
        runningPromoted: number;
        todayPromoted: number;
        totalPost: number;
        approvalWaiting: number;
        totalReport: number;
        totalUser: number;
    } | null>(null);

    useEffect(() => {
        const token = Cookies.get('adminToken');
        if (!token) {
            router.push('/login');
            return;
        }

        const fetchStats = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/admins/dashboard/stats`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                setRealStats(response.data);
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [router]);


    const stats = [
        { title: 'Running Promoted', value: realStats?.runningPromoted.toString() || '0', icon: Folder, color: 'border-blue-500', iconColor: 'text-blue-600' },
        { title: 'Today Promoted', value: realStats?.todayPromoted.toString() || '0', icon: Folder, color: 'border-cyan-400', iconColor: 'text-cyan-500' },
        { title: 'Total Post', icon: FileText, value: realStats?.totalPost.toString() || '0', color: 'border-red-500', iconColor: 'text-red-600' },
        { title: 'Post Approval waiting', value: realStats?.approvalWaiting.toString() || '0', icon: Inbox, color: 'border-green-600', iconColor: 'text-green-600' },
        // {
        //     title: 'PMR Target',
        //     value: '19',
        //     icon: Folder,
        //     color: 'border-amber-400',
        //     iconColor: 'text-amber-500',
        //     subText: true
        // },
        // { title: '', value: '3', icon: MessageSquare, color: 'border-green-400', iconColor: 'text-green-500' },
        // { title: '', value: '109', icon: Folder, color: 'border-blue-400', iconColor: 'text-blue-500' },
        // { title: '', value: '1', icon: ShieldAlert, color: 'border-cyan-400', iconColor: 'text-cyan-500' },
        { title: 'Report', value: realStats?.totalReport.toString() || '0', icon: Box, color: 'border-orange-500', iconColor: 'text-orange-500' },
        // { title: 'Today Product View', value: '3', icon: MessageSquare, color: 'border-green-400', iconColor: 'text-green-500' },
        // { title: 'Total Seller', value: '109', icon: Folder, color: 'border-blue-500', iconColor: 'text-blue-600' },
        { title: 'Total User', value: realStats?.totalUser.toString() || '0', icon: ShieldAlert, color: 'border-cyan-400', iconColor: 'text-cyan-500' },
    ];

    return (
        <div className="space-y-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-black text-xs mb-2 px-1">
                <Home className="w-3.5 h-3.5" />
                <span>/</span>
                <span className="font-normal text-black">Dashboard</span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-1">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.01 }}
                            className={`bg-white border-l-4 ${stat.color} p-4 shadow-md flex justify-between items-start min-h-24 rounded-sm`}
                        >
                            <div className="flex flex-col h-full justify-between">
                                <h3 className="text-4xl font-light text-black leading-none">{stat.value}</h3>
                                {/* {stat.subText ? (
                                    <div className="flex flex-col mt-auto pt-2">
                                        <p className="text-xs text-black font-medium truncate">{stat.title}</p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-black font-medium mt-auto pt-2 truncate">{stat.title}</p>
                                )} */}
                                <p className="text-xs text-black font-medium mt-auto pt-2 truncate">{stat.title}</p>
                            </div>
                            <div className={`${stat.iconColor} pt-0.5 opacity-90`}>
                                <Icon className="w-7 h-7" strokeWidth={1.2} />
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
