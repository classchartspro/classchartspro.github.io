// dash.js
// Main orchestrator for the /dash folder

import { loadActivity } from './activity.js';
import { loadBehavior } from './behaviour.js';
import { checkSession } from './handleLogouts.js';

// ----------------- Cookie helpers -----------------
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

// ----------------- Menu logic -----------------
const FEATURE_MAP = {
    behaviour: 'display_behaviour',
    homework: 'display_homework',
    rewards: 'display_rewards',
    detentions: 'display_detentions',
    classes: 'display_classes',
    announcements: 'display_announcements',
    attendance: 'display_attendance',
    timetable: 'display_timetable',
    badges: 'display_event_badges',
    logout: null,
    config: null,
    mycode: null
};
const NAV_CACHE_KEY = 'nav_permissions_v1';

function applyMenu(user, animate = false) {
    document.querySelectorAll('[data-feature]').forEach(el => {
        const flag = FEATURE_MAP[el.dataset.feature];
        if (!flag) return;

        if (!user[flag]) {
            if (animate) {
                el.classList.add('nav-hidden');
                setTimeout(() => el.remove(), 120);
            } else {
                el.remove();
            }
        }
    });
}

// ----------------- Main Orchestration -----------------
document.addEventListener('DOMContentLoaded', async () => {
    const session = getCookie('session');
    if (!session) {
        console.warn('No session found, cannot proceed.');
        return;
    }

    const online = await checkSession();
    if (!online) return;

    // ----------------- Load user info from ping -----------------
    try {
        const base = 'https://api.classchartspro.qzz.io/?url=';
        const pingResp = await fetch(base + encodeURIComponent('https://www.classcharts.com/apiv2student/ping'), {
            headers: { Authorization: 'Basic ' + session }
        });
        const pingData = await pingResp.json();
        const user = pingData?.data?.user;
        if (!user) {
            console.error('No user data from ping');
            return;
        }

        // Save user globally if needed
        window.dashUser = user;

        // Update session if a new one was returned
        const newSession = pingData?.meta?.session_id;
        if (newSession) localStorage.setItem('session', newSession);

        // ----------------- Menu -----------------
        const cached = localStorage.getItem(NAV_CACHE_KEY);
        if (cached) applyMenu(JSON.parse(cached), false);
        else applyMenu(user, true);

        // Update cache if anything changed
        const cachedUser = cached ? JSON.parse(cached) : {};
        let changed = false;
        Object.keys(FEATURE_MAP).forEach(feature => {
            const flag = FEATURE_MAP[feature];
            if (!flag) return;
            if (user[flag] !== cachedUser[flag]) {
                changed = true;
                if (!user[flag]) {
                    const el = document.querySelector(`[data-feature="${feature}"]`);
                    if (el) {
                        el.classList.add('nav-hidden');
                        setTimeout(() => el.remove(), 120);
                    }
                }
            }
        });
        if (changed) localStorage.setItem(NAV_CACHE_KEY, JSON.stringify(user));

        // ----------------- Load modules -----------------
        loadActivity();
        loadBehavior('sinceAug');

    } catch (err) {
        console.error('Error during dash orchestration:', err);
    }
});
