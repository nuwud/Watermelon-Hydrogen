/**
 * Menu Theme Settings
 * Provides configurable theme settings for the 3D carousel menu.
 */

export const DEFAULT_MENU_THEME = {
    itemBaseColor: '#2a2a4a',
    itemHoverColor: '#3a3a6a',
    itemSelectedColor: '#4a4a8a',
    itemTextColor: '#ffffff',
    itemOpacity: 0.85,
    itemHoverOpacity: 0.95,
    itemSelectedOpacity: 1.0,
    glowEnabled: true,
    glowColor: '#6666ff',
    glowIntensity: 0.3,
    borderEnabled: true,
    borderColor: '#4444aa',
    borderWidth: 2,
    borderOpacity: 0.6,
    submenuBackgroundColor: '#1a1a3a',
    submenuBackgroundOpacity: 0.9,
    submenuItemColor: '#2a2a4a',
    submenuItemOpacity: 0.8,
    backgroundMode: 'hexagons',
    backgroundInteractivityPauseDuration: 2000,
    hoverAnimationDuration: 0.3,
    selectionAnimationDuration: 0.5,
};

const STORAGE_KEY = 'wm_menu_theme_settings';
let cachedSettings = null;
let settingsLoadPromise = null;

export function hexToNumber(hex) {
    if (typeof hex === 'number') return hex;
    return parseInt(hex.replace('#', ''), 16);
}

export function numberToHex(num) {
    if (typeof num === 'string') return num;
    return '#' + num.toString(16).padStart(6, '0');
}

export async function getMenuThemeSettings() {
    if (cachedSettings) return cachedSettings;
    if (settingsLoadPromise) return settingsLoadPromise;
    settingsLoadPromise = loadSettings();
    cachedSettings = await settingsLoadPromise;
    settingsLoadPromise = null;
    return cachedSettings;
}

export function getMenuThemeSettingsSync() {
    if (cachedSettings) return cachedSettings;
    if (typeof window !== 'undefined') {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                cachedSettings = { ...DEFAULT_MENU_THEME, ...JSON.parse(stored) };
                return cachedSettings;
            }
        } catch { /* ignore */ }
    }
    return { ...DEFAULT_MENU_THEME };
}

async function loadSettings() {
    let settings = { ...DEFAULT_MENU_THEME };
    if (typeof window !== 'undefined') {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                settings = { ...settings, ...JSON.parse(stored) };
            }
        } catch { /* ignore */ }
        try {
            const response = await fetch('/api/admin/config');
            if (response.ok) {
                const apiSettings = await response.json();
                if (apiSettings.menuTheme) {
                    settings = { ...settings, ...apiSettings.menuTheme };
                }
            }
        } catch { /* ignore */ }
    }
    return settings;
}

export function saveMenuThemeSettings(settings) {
    if (typeof window === 'undefined') return false;
    try {
        const merged = { ...DEFAULT_MENU_THEME, ...settings };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        cachedSettings = merged;
        window.dispatchEvent(new CustomEvent('wm-menu-theme-changed', { detail: { settings: merged } }));
        return true;
    } catch { return false; }
}

export function resetMenuThemeSettings() {
    if (typeof window === 'undefined') return false;
    try {
        localStorage.removeItem(STORAGE_KEY);
        cachedSettings = { ...DEFAULT_MENU_THEME };
        window.dispatchEvent(new CustomEvent('wm-menu-theme-changed', { detail: { settings: cachedSettings } }));
        return true;
    } catch { return false; }
}

export function updateMenuThemeSetting(key, value) {
    const current = getMenuThemeSettingsSync();
    current[key] = value;
    return saveMenuThemeSettings(current);
}

export function getMenuThemeCSSVariables(settings) {
    const s = settings || getMenuThemeSettingsSync();
    return {
        '--wm-menu-item-color': s.itemBaseColor,
        '--wm-menu-item-hover-color': s.itemHoverColor,
        '--wm-menu-item-selected-color': s.itemSelectedColor,
        '--wm-menu-item-text-color': s.itemTextColor,
        '--wm-menu-item-opacity': s.itemOpacity,
        '--wm-menu-item-hover-opacity': s.itemHoverOpacity,
        '--wm-menu-item-selected-opacity': s.itemSelectedOpacity,
        '--wm-menu-glow-color': s.glowColor,
        '--wm-menu-glow-intensity': s.glowIntensity,
        '--wm-menu-border-color': s.borderColor,
        '--wm-menu-border-width': s.borderWidth + 'px',
        '--wm-menu-border-opacity': s.borderOpacity,
        '--wm-submenu-bg-color': s.submenuBackgroundColor,
        '--wm-submenu-bg-opacity': s.submenuBackgroundOpacity,
    };
}

export function exposeMenuThemeAPI() {
    if (typeof window === 'undefined') return;
    window.__wmMenuTheme = {
        getSettings: getMenuThemeSettingsSync,
        getSettingsAsync: getMenuThemeSettings,
        saveSettings: saveMenuThemeSettings,
        updateSetting: updateMenuThemeSetting,
        resetSettings: resetMenuThemeSettings,
        getDefaults: () => ({ ...DEFAULT_MENU_THEME }),
        getCSSVariables: getMenuThemeCSSVariables,
    };
}

if (typeof window !== 'undefined') exposeMenuThemeAPI();

export default {
    DEFAULT_MENU_THEME,
    getMenuThemeSettings,
    getMenuThemeSettingsSync,
    saveMenuThemeSettings,
    resetMenuThemeSettings,
    updateMenuThemeSetting,
    getMenuThemeCSSVariables,
    hexToNumber,
    numberToHex,
};
