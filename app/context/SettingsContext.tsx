"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../utils/apiConfig';
import Cookies from 'js-cookie';

interface Settings {
    siteLogo?: string;
    favIcon?: string;
    watermarkLogo?: string;
    userRepeatAdViewTime?: number;
    adReShowAfterMinutes?: number;
    productPhotoLimit?: number;
    blockCheckInHeadline?: string[];
    blockCheckInDescription?: string[];
}

interface SettingsContextType {
    settings: Settings;
    loading: boolean;
    fetchSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Settings>({});
    const [loading, setLoading] = useState(false);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            // Using the public endpoint specifically designed for branding/meta
            const res = await fetch(`${API_BASE_URL}/api/settings/dashboard`);
            const data = await res.json();
            if (data.success) {
                setSettings(data.data || {});
            }
        } catch (error) {
            console.error("Failed to fetch settings in admin:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return (
        <SettingsContext.Provider value={{ settings, loading, fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
