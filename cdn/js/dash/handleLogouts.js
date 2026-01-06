// handleLogouts.js
// Handles session validation, offline detection, and background login

export async function checkSession() {
    const session = getCookie('session');
    if (!session) {
        console.warn('No session token found.');
        return false;
    }

    const online = await isOnline();
    if (!online) return false;

    const valid = await validateSession(session);
    if (!valid) {
        return await attemptBackgroundLogin();
    }

    return true;
}

// ----------------- Helpers -----------------

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

function setCookie(name, value) {
    document.cookie = `${name}=${value}; path=/`;
}

// Check if API is reachable
async function isOnline() {
    try {
        const response = await fetch('https://api.classchartspro.qzz.io/ping', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || data.pong !== true) {
            showOfflinePopup();
            return false;
        }
        return true;
    } catch (err) {
        showOfflinePopup();
        return false;
    }
}

// Show a simple offline popup
function showOfflinePopup() {
    const popup = document.getElementById('popup');
    const main = document.getElementById('main-content');
    if (!popup || !main) return;

    popup.style.display = 'block';
    main.classList.add('blur');

    const header = popup.querySelector('h1');
    const paragraph = popup.querySelector('p');
    const btn = popup.querySelector('a');

    if (header) header.textContent = 'Warning';
    if (paragraph) paragraph.textContent = 'You are offline';
    if (btn) btn.textContent = 'Okay!';

    const agreeBtn = popup.querySelector('#popup-agree');
    if (agreeBtn) {
        agreeBtn.addEventListener('click', () => {
            popup.style.display = 'none';
            main.classList.remove('blur');
        });
    }
}

// Validate existing session with API ping
async function validateSession(session) {
    try {
        const resp = await fetch(`https://api.classchartspro.qzz.io/?url=https://www.classcharts.com/apiv2student/ping`, {
            headers: { Authorization: 'Basic ' + session }
        });
        const data = await resp.json();
        return data.success === 1;
    } catch (err) {
        console.error('Error validating session:', err);
        return false;
    }
}

// Attempt background login using stored localStorage creds
async function attemptBackgroundLogin() {
    const code = localStorage.getItem('code');
    const dob = localStorage.getItem('dob');

    if (!code || !dob) {
        window.location.href = '/dash/logout.html';
        return false;
    }

    try {
        const payload = new URLSearchParams({
            code,
            dob,
            'recaptcha-token': 'no-token-available'
        });

        const resp = await fetch('https://api.classchartspro.qzz.io/login', {
            method: 'POST',
            body: payload,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const data = await resp.json();
        return handleLoginResponse(data, code, dob);
    } catch (err) {
        console.error('Background login failed:', err);
        return false;
    }
}

function handleLoginResponse(response, code, dob) {
    if (response.success === 1) {
        const sessionToken = response.meta.session_id;
        setCookie('session', sessionToken);

        localStorage.setItem('code', code);
        localStorage.setItem('dob', dob);

        window.location.href = '/dash';
        return true;
    } else {
        window.location.href = '/dash/logout.html';
        return false;
    }
}
