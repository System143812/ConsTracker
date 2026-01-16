import { fetchData, fetchPostJson } from "/js/apiURL.js";
import { alertPopup } from "/js/popups.js";

const FONT_SIZES = {
    sm: '13px',
    md: '14px',
    lg: '16px'
};

function normalizeFontSizeKey(key) {
    const k = String(key || 'md').toLowerCase();
    return (k === 'sm' || k === 'md' || k === 'lg') ? k : 'md';
}

export function applyThemeAndFont(settings = {}) {
    const darkMode = settings.dark_mode == 1 || settings.dark_mode === true;
    const fontKey = normalizeFontSizeKey(settings.font_size);

    document.body.classList.toggle('theme-dark', darkMode);
    document.documentElement.setAttribute('data-font-size', fontKey);
    document.documentElement.style.fontSize = FONT_SIZES[fontKey] || FONT_SIZES.md;

    // Cache locally as a fallback
    try {
        localStorage.setItem('constracker_theme_dark', darkMode ? '1' : '0');
        localStorage.setItem('constracker_font_size', fontKey);
    } catch (_) {}
}

export async function initAndApplyUserPreferences() {
    let settings;
    try {
        settings = await fetchData('/api/settings');
        if (settings === 'error') throw new Error('network');
    } catch (_) {
        // Local fallback if the API is unavailable
        const dark = (localStorage.getItem('constracker_theme_dark') === '1');
        const fontKey = normalizeFontSizeKey(localStorage.getItem('constracker_font_size'));
        settings = { dark_mode: dark ? 1 : 0, font_size: fontKey, avatar_path: null, avatar_url: null };
    }

    applyThemeAndFont(settings);
    return settings;
}

export function resolveAvatarUrl(settings = {}) {
    if (settings.avatar_path) return `/avatarImages/${settings.avatar_path}`;
    if (settings.avatar_url) return settings.avatar_url;
    return null;
}

export function applyAvatarToElement(el, settings = {}, fallbackText = '') {
    if (!el) return;
    const url = resolveAvatarUrl(settings);
    if (url) {
        el.style.backgroundImage = `url('${url}')`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.classList.add('has-avatar');
        el.innerText = '';
    } else {
        el.style.backgroundImage = '';
        el.classList.remove('has-avatar');
        el.innerText = fallbackText;
    }
}

function el(tag, className = '', text = '') {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== '') n.innerText = text;
    return n;
}

function settingsCard(title, subtitle) {
    const card = el('div', 'settings-card');
    const header = el('div', 'settings-card-header');
    header.append(
        el('div', 'settings-card-title', title),
        el('div', 'settings-card-subtitle', subtitle)
    );
    const body = el('div', 'settings-card-body');
    card.append(header, body);
    return { card, body };
}

export async function renderSettingsPage(targetElOrId) {
    const target = typeof targetElOrId === 'string' ? document.getElementById(targetElOrId) : targetElOrId;
    if (!target) return;

    target.innerHTML = '';

    // Data
    const [profile, settings] = await Promise.all([
        fetchData('/profile'),
        fetchData('/api/settings')
    ]);

    const safeProfile = profile && profile !== 'error' ? profile : { full_name: '', email: '' };
    const safeSettings = settings && settings !== 'error' ? settings : { dark_mode: 0, font_size: 'md', avatar_path: null, avatar_url: null };

    // Layout
    const grid = el('div', 'settings-grid');

    // Appearance
    const { card: appearanceCard, body: appearanceBody } = settingsCard(
        'Appearance',
        'Control theme and readability across the dashboard.'
    );

    const darkRow = el('div', 'settings-row');
    const darkMeta = el('div', 'settings-row-meta');
    darkMeta.append(
        el('div', 'settings-row-label', 'Dark mode'),
        el('div', 'settings-row-help', 'Apply a darker color scheme site-wide.')
    );
    const darkToggle = el('label', 'settings-switch');
    const darkInput = document.createElement('input');
    darkInput.type = 'checkbox';
    darkInput.checked = safeSettings.dark_mode == 1;
    const darkSlider = el('span', 'settings-slider');
    darkToggle.append(darkInput, darkSlider);
    darkRow.append(darkMeta, darkToggle);

    const fontRow = el('div', 'settings-row');
    const fontMeta = el('div', 'settings-row-meta');
    fontMeta.append(
        el('div', 'settings-row-label', 'Font size'),
        el('div', 'settings-row-help', 'Adjust the base font size for better legibility.')
    );
    const fontSelect = document.createElement('select');
    fontSelect.className = 'settings-select';
    const currentFont = normalizeFontSizeKey(safeSettings.font_size);
    fontSelect.innerHTML = `
        <option value="sm" ${currentFont === 'sm' ? 'selected' : ''}>Small</option>
        <option value="md" ${currentFont === 'md' ? 'selected' : ''}>Default</option>
        <option value="lg" ${currentFont === 'lg' ? 'selected' : ''}>Large</option>
    `;
    fontRow.append(fontMeta, fontSelect);

    const appearanceActions = el('div', 'settings-actions');
    const saveAppearance = document.createElement('button');
    saveAppearance.type = 'button';
    saveAppearance.className = 'solid-buttons blue white';
    saveAppearance.innerText = 'Save appearance';
    appearanceActions.append(saveAppearance);

    appearanceBody.append(darkRow, fontRow, appearanceActions);

    // Profile
    const { card: profileCard, body: profileBody } = settingsCard(
        'Profile',
        'Update your display name and avatar.'
    );

    const profileRow = el('div', 'settings-profile-row');

    const avatarPreview = el('div', 'settings-avatar');
    const fallbackInitials = String(safeProfile.full_name || '?')
        .match(/\b\w/g)?.slice(0, 2)?.join('')?.toUpperCase() || 'U';
    applyAvatarToElement(avatarPreview, safeSettings, fallbackInitials);

    const profileFields = el('div', 'settings-profile-fields');

    // Full name
    const nameField = el('div', 'settings-field');
    nameField.append(el('div', 'settings-field-label', 'Full name'));
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'settings-input';
    nameInput.value = safeProfile.full_name || '';
    nameInput.placeholder = 'Enter your full name';
    nameField.append(nameInput);

    // Avatar upload
    const uploadField = el('div', 'settings-field');
    uploadField.append(el('div', 'settings-field-label', 'Avatar upload (max 5 MB)'));
    const uploadWrap = el('div', 'settings-inline');
    const uploadInput = document.createElement('input');
    uploadInput.type = 'file';
    uploadInput.accept = 'image/*';
    uploadInput.className = 'settings-file';
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = 'glass-buttons';
    uploadBtn.innerText = 'Upload image';
    uploadWrap.append(uploadInput, uploadBtn);
    uploadField.append(uploadWrap);

    // Avatar URL
    const urlField = el('div', 'settings-field');
    urlField.append(el('div', 'settings-field-label', 'Avatar image URL'));
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.className = 'settings-input';
    urlInput.placeholder = 'https://...';
    urlInput.value = safeSettings.avatar_url || '';
    urlField.append(urlInput);

    const profileActions = el('div', 'settings-actions');
    const saveProfile = document.createElement('button');
    saveProfile.type = 'button';
    saveProfile.className = 'solid-buttons blue white';
    saveProfile.innerText = 'Save profile';
    const removeAvatar = document.createElement('button');
    removeAvatar.type = 'button';
    removeAvatar.className = 'glass-buttons';
    removeAvatar.innerText = 'Remove avatar';
    profileActions.append(saveProfile, removeAvatar);

    profileFields.append(nameField, uploadField, urlField, profileActions);
    profileRow.append(avatarPreview, profileFields);
    profileBody.append(profileRow);

    // Events (instant preview)
    const tempSettings = { ...safeSettings };

    darkInput.addEventListener('change', () => {
        tempSettings.dark_mode = darkInput.checked ? 1 : 0;
        applyThemeAndFont(tempSettings);
    });

    fontSelect.addEventListener('change', () => {
        tempSettings.font_size = normalizeFontSizeKey(fontSelect.value);
        applyThemeAndFont(tempSettings);
    });

    uploadBtn.addEventListener('click', () => uploadInput.click());

    uploadInput.addEventListener('change', () => {
        const file = uploadInput.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            uploadInput.value = '';
            return alertPopup('warn', 'Max image size is 5 MB');
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result;
            if (typeof dataUrl === 'string') {
                avatarPreview.style.backgroundImage = `url('${dataUrl}')`;
                avatarPreview.style.backgroundSize = 'cover';
                avatarPreview.style.backgroundPosition = 'center';
                avatarPreview.classList.add('has-avatar');
                avatarPreview.innerText = '';
            }
        };
        reader.readAsDataURL(file);
    });

    

    // Remove avatar
    removeAvatar.addEventListener('click', async () => {
        try {
            const resp = await fetchPostJson('/api/profile/avatar/remove', 'PUT', {}, null);
            if (resp === 'error') return alertPopup('error', 'Network Connection Error');
            if (resp.status !== 'success') return alertPopup('error', resp.message || 'Failed to remove avatar');

            tempSettings.avatar_path = null;
            tempSettings.avatar_url = null;
            urlInput.value = '';
            uploadInput.value = '';
            applyAvatarToElement(avatarPreview, tempSettings, fallbackInitials);

            const headerIcon = document.getElementById('profileIcon');
            const headerName = document.getElementById('profileName');
            const nameForInitials = headerName?.innerText || String(nameInput.value || '').trim();
            const initials = nameForInitials.match(/\b\w/g)?.slice(0, 2)?.join('')?.toUpperCase() || fallbackInitials;

            alertPopup('success', 'Avatar removed');
        } catch (e) {
            alertPopup('error', 'Failed to remove avatar');
        }
    });
// Save handlers
    saveAppearance.addEventListener('click', async () => {
        try {
            const payload = {
                dark_mode: darkInput.checked,
                font_size: normalizeFontSizeKey(fontSelect.value)
            };
            const resp = await fetchPostJson('/api/settings', 'PUT', payload, null);
            if (resp === 'error') return alertPopup('error', 'Network Connection Error');
            alertPopup('success', 'Appearance saved');
        } catch (e) {
            alertPopup('error', 'Failed to save appearance');
        }
    });

    saveProfile.addEventListener('click', async () => {
        try {
            // 1) Name
            const newName = String(nameInput.value || '').trim();
            if (!newName) return alertPopup('warn', 'Full name is required');

            const nameResp = await fetchPostJson('/api/profile/full-name', 'PUT', { full_name: newName }, null);
            if (nameResp === 'error') return alertPopup('error', 'Network Connection Error');

            // 2) Avatar (upload wins if selected)
            const file = uploadInput.files?.[0];
            let avatarResp = null;
            if (file) {
                const form = new FormData();
                form.append('avatar', file);
                const r = await fetch('/api/profile/avatar/upload', { method: 'POST', body: form });
                avatarResp = await r.json();
                if (!r.ok || avatarResp.status !== 'success') {
                    return alertPopup('error', avatarResp.message || 'Avatar upload failed');
                }
                tempSettings.avatar_path = avatarResp.avatar_path;
                tempSettings.avatar_url = null;
                urlInput.value = '';
                uploadInput.value = '';
            } else {
                const url = String(urlInput.value || '').trim();
                const urlResp = await fetchPostJson('/api/profile/avatar/url', 'PUT', { avatar_url: url }, null);
                if (urlResp === 'error') return alertPopup('error', 'Network Connection Error');
                if (urlResp.status !== 'success') {
                    return alertPopup('error', urlResp.message || 'Failed to update avatar URL');
                }
                tempSettings.avatar_url = url || null;
                tempSettings.avatar_path = null;
            }

            // Update header avatar + name if present
            const headerName = document.getElementById('profileName');
            if (headerName) headerName.innerText = newName;
            const headerIcon = document.getElementById('profileIcon');
            const initials = newName.match(/\b\w/g)?.slice(0, 2)?.join('')?.toUpperCase() || fallbackInitials;
            applyAvatarToElement(headerIcon, tempSettings, initials);

            alertPopup('success', 'Profile updated');
        } catch (e) {
            alertPopup('error', 'Failed to update profile');
        }
    });

    grid.append(appearanceCard, profileCard);
    target.append(grid);
}
