function getCookie(name) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? match[2] : null;
}

function setCookie(name, value) {
    document.cookie = name + "=" + value + "; path=/";
}

document.addEventListener("DOMContentLoaded", async () => {
    const session = getCookie("session");
    const base = 'https://api.classchartspro.qzz.io/?url=';

    if (!session) {
        console.error("No session cookie found.");
        return;
    }

    try {
        // Ping API to get pupil info & possibly a new session
        const pingResp = await fetch(base + encodeURIComponent("https://www.classcharts.com/apiv2student/ping"), {
            headers: {
                Authorization: "Basic " + session
            }
        });

        const pingData = await pingResp.json();
        const user = pingData?.data?.user;
        if (!user) {
            console.error("No user data returned from ping");
            return;
        }

        // Store globally for other scripts if needed
        window.dashUser = user;

        // Update session if the API provides a new one
        const newSession = pingData?.meta?.session_id || session;
        if (pingData?.meta?.session_id) {
            localStorage.setItem("session", pingData.meta.session_id);
        }

        // -------------------------
        // Menu hiding logic
        // -------------------------
        const NAV_CACHE_KEY = 'nav_permissions_v1';
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

        function applyMenu(u, animate = false) {
            document.querySelectorAll('[data-feature]').forEach(el => {
                const flag = FEATURE_MAP[el.dataset.feature];
                if (!flag) return;
                if (!u[flag]) {
                    if (animate) {
                        el.classList.add('nav-hidden');
                        setTimeout(() => el.remove(), 120);
                    } else {
                        el.remove();
                    }
                }
            });
        }

        // Apply cached permissions first
        const cached = localStorage.getItem(NAV_CACHE_KEY);
        if (cached) applyMenu(JSON.parse(cached), false);

        // Animate removals if first time
        if (!cached) applyMenu(user, true);

        // Background: update cache if anything changed
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
    } catch (err) {
        console.error("Error fetching data:", err);
    }
});
