import { API_BASE_URL } from "./apiConfig";

export const getImageUrl = (path: string | null | undefined): string => {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path;

    // Handle raw base64 strings (longer than 200 chars) that might be missing the data: prefix
    if (path.length > 200 && !path.includes('/') && !path.includes('.')) {
        let mime = 'image/png';
        if (path.startsWith('/9j/')) mime = 'image/jpeg';
        else if (path.startsWith('R0lGOD')) mime = 'image/gif';
        else if (path.startsWith('UklGR')) mime = 'image/webp';
        return `data:${mime};base64,${path}`;
    }

    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};
