"use client";

import React, { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { useSettings } from '../context/SettingsContext';
import { getImageUrl } from '../../utils/imageUrl';
import { useEffect } from 'react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Menu, Moon, User, AlertTriangle } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/apiConfig';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { settings } = useSettings();
    const pathname = usePathname();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    const routeToPermission: Record<string, string> = {
        '/posts': 'Post',
        '/users': 'User',
        '/reports': 'Report',
        '/promoted-ads': 'Promote Management',
        '/transaction-manager': 'Transaction Manager',
        '/admin-create': 'Admin Create',
        '/notifications': 'Notification & Messaging',
        '/ad-position': 'AD Position (W/A/Q)',
        '/categories': 'Categorie Manager',
        '/locations': 'Location Manager',
        '/all-settings': 'Settings & Others',
    };

    const syncUserData = async (token: string) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/admins/me`, {
                headers: { 'x-auth-token': token }
            });
            const freshUser = res.data;
            // Update cookie with fresh permissions
            Cookies.set('adminUser', JSON.stringify(freshUser), { expires: 1 });

            // Notify other components (like Sidebar) to refresh their state
            window.dispatchEvent(new Event('admin-user-updated'));

            // Re-check authorization with fresh data
            const requiredPermission = routeToPermission[pathname];
            if (requiredPermission) {
                const hasPermission = freshUser.permissions?.[requiredPermission] === true;
                if (!hasPermission) {
                    toast.error(`Access Denied: Permission removed for ${requiredPermission}`, {
                        id: 'permission-denied',
                        icon: <AlertTriangle className="w-5 h-5 text-rose-500" />
                    });
                    router.push('/dashboard');
                    setIsAuthorized(false);
                } else {
                    setIsAuthorized(true);
                }
            } else {
                setIsAuthorized(true);
            }
        } catch (e) {
            console.error("Failed to sync user data", e);
        }
    };

    useEffect(() => {
        const userStr = Cookies.get('adminUser');
        const token = Cookies.get('adminToken');

        if (!token || !userStr) {
            router.push('/login');
            return;
        }

        try {
            const user = JSON.parse(userStr);
            const requiredPermission = routeToPermission[pathname];

            if (requiredPermission) {
                const hasPermission = user.permissions?.[requiredPermission] === true;
                if (!hasPermission) {
                    toast.error(`Access Denied: You don't have permission for ${requiredPermission}`, {
                        id: 'permission-denied',
                        icon: <AlertTriangle className="w-5 h-5 text-rose-500" />
                    });
                    router.push('/dashboard');
                    setIsAuthorized(false);
                    return;
                }
            }
            setIsAuthorized(true);

            // Fetch fresh data in background to sync permissions
            syncUserData(token);
        } catch (e) {
            console.error("Auth check failed", e);
            router.push('/login');
        }
    }, [pathname, router]);

    // Apply favicon
    useEffect(() => {
        if (settings.favIcon) {
            const faviconUrl = getImageUrl(settings.favIcon);
            let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.href = faviconUrl;

            let appleIcon: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
            if (!appleIcon) {
                appleIcon = document.createElement('link');
                appleIcon.rel = 'apple-touch-icon';
                document.getElementsByTagName('head')[0].appendChild(appleIcon);
            }
            appleIcon.href = faviconUrl;
        }
    }, [settings.favIcon]);

    return (
        <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans">
            {/* Top Header */}
            <header className="fixed top-0 left-0 right-0 h-10 bg-white border-b border-slate-200 z-[60] flex items-center justify-between px-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="p-1.5 hover:bg-slate-50 rounded transition-colors"
                    >
                        <Menu className="w-4 h-4 text-black" />
                    </button>
                    {settings.siteLogo ? (
                        <div className="flex items-center">
                            <img
                                src={getImageUrl(settings.siteLogo)}
                                alt="Logo"
                                className="h-6 w-auto object-contain block"
                                style={{ maxWidth: '120px' }}
                            />
                        </div>
                    ) : (
                        <span className="font-black text-sm tracking-[0.1em] text-black">SHADAMON</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button className="p-1.5 hover:bg-slate-50 rounded-full transition-colors text-black">
                        <Moon className="w-4 h-4 fill-slate-700" />
                    </button>
                    <button className="p-1 hover:bg-slate-50 rounded-full transition-colors text-black">
                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                            <User className="w-3.5 h-3.5" />
                        </div>
                    </button>
                </div>
            </header>

            <div className="flex flex-1 pt-10">
                {/* Sidebar */}
                <AdminSidebar
                    isCollapsed={isSidebarCollapsed}
                    toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />

                {/* Main Content */}
                <main
                    className={cn(
                        "flex-1 min-h-screen transition-all duration-300 ease-in-out",
                        isSidebarCollapsed ? "pl-12" : "pl-53"
                    )}
                >
                    <div className="w-full p-3 pt-4">
                        {isAuthorized === true ? children : (
                            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
                                <AlertTriangle className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-sm font-medium">Checking authorization...</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
