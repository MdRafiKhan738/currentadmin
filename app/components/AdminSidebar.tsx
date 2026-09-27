"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Home, Folder, User, FileText, Megaphone, Terminal,
    UserPlus, Bell, LayoutGrid, Layers, MapPin, Settings,
    FileEdit, List, LogOut
} from 'lucide-react';
import Cookies from 'js-cookie';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface AdminSidebarProps {
    isCollapsed: boolean;
    toggleCollapse: () => void;
}

export default function AdminSidebar({ isCollapsed, toggleCollapse }: AdminSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<{ email: string, permissions?: Record<string, boolean> } | null>(null);

    useEffect(() => {
        const loadUser = () => {
            const userStr = Cookies.get('adminUser');
            if (userStr) {
                try {
                    setUser(JSON.parse(userStr));
                } catch (e) {
                    console.error("Failed to parse user cookie");
                }
            }
        };

        loadUser();

        // Listen for updates from Layout sync
        window.addEventListener('admin-user-updated', loadUser);
        return () => window.removeEventListener('admin-user-updated', loadUser);
    }, []);

    const menuItems = [
        { href: '/dashboard', label: 'Dashboard', icon: Home },
        { href: '/posts', label: 'Post', icon: Folder },
        { href: '/users', label: 'User', icon: User },
        { href: '/reports', label: 'Report', icon: FileText },
        { href: '/promoted-ads', label: 'Promote Management', icon: Megaphone },
        { href: '/transaction-manager', label: 'Transaction Manager', icon: Terminal },
        { href: '/admin-create', label: 'Admin Create', icon: UserPlus },
        { href: '/notifications', label: 'Notification & Messaging', icon: Bell },
        { href: '/ad-position', label: 'AD Position (W/A/Q)', icon: LayoutGrid },
        { href: '/categories', label: 'Categorie Manager', icon: Layers },
        { href: '/locations', label: 'Location Manager', icon: MapPin },
        { href: '/all-settings', label: 'Settings & Others', icon: Settings },
    ];

    const filteredMenuItems = menuItems.filter(item => {
        if (!user) return false;
        if (item.label === 'Dashboard') return true;

        // Check permissions
        return user.permissions?.[item.label] === true;
    });

    const MenuItem = ({ item, isSub = false }: { item: any, isSub?: boolean }) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
            <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "flex items-center gap-2.5 px-4 py-1 transition-all text-sm font-medium group relative overflow-hidden whitespace-nowrap",
                    isActive
                        ? "text-blue-600 border-l-4 border-blue-600 bg-blue-50/70"
                        : "text-black hover:text-black hover:bg-slate-50",
                    isCollapsed ? "justify-center px-0 border-l-0" : ""
                )}
            >
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-blue-600" : "text-black group-hover:text-black")} strokeWidth={1.5} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                {isActive && isCollapsed && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                )}
            </Link>
        );
    };

    return (
        <aside
            className={cn(
                "fixed left-0 top-10 h-[calc(100vh-2.5rem)] bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-50 overflow-hidden",
                isCollapsed ? "w-16" : "w-56"
            )}
        >
            <div className="flex-1 py-3 flex flex-col gap-0.5 overflow-y-auto no-scrollbar">
                {filteredMenuItems.map((item) => (
                    <MenuItem key={item.href} item={item} />
                ))}
            </div>

            <div className="p-1.5 border-t border-slate-50 shrink-0">
                <button
                    onClick={() => {
                        Cookies.remove('adminToken');
                        Cookies.remove('adminUser');
                        router.push('/login');
                    }}
                    className={cn(
                        "flex items-center gap-2.5 px-3 py-1.5 rounded text-rose-500 hover:bg-rose-50 transition-all text-xs font-semibold w-full",
                        isCollapsed ? "justify-center px-0" : ""
                    )}
                >
                    <LogOut className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
}
