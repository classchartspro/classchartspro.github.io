// ====== HELPERS ======

// Get cookie helper
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

// Get pupilId from localStorage
function getPupilId() {
    return localStorage.getItem('pupilId');
}

// Format date as dd/mm/yyyy
function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

// Format date with weekday
function formatDateWithDay(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Determine homework status
function getHomeworkStatus(hw) {
    const ticked = hw.status?.ticked === 'yes';
    const state = hw.status?.state?.toLowerCase() || null;

    if (ticked) {
        switch (state) {
            case null: return 'completed';
            case 'not_completed': return 'not submitted';
            case 'late': return 'submitted late';
            case 'completed': return 'submitted';
            default: return 'completed';
        }
    } else {
        switch (state) {
            case 'not_completed': return 'not submitted';
            case null: return 'todo';
            default: return 'todo';
        }
    }
}

function formatDateForApi(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
}

// Calculate filter dates
function getFilterDates(filter) {
    const today = new Date();
    let from = null, to = null;

    switch (filter) {
        // Future filters
        case 'nextWeek': {
            const d = new Date(today);
            d.setDate(today.getDate() + 1); // start tomorrow
            from = d;
            to = new Date(d);
            to.setDate(from.getDate() + 6); // next 7 days
            break;
        }
        case 'next30': {
            from = new Date(today);
            to = new Date(today);
            to.setDate(today.getDate() + 30);
            break;
        }
        case 'next90': {
            from = new Date(today);
            to = new Date(today);
            to.setDate(today.getDate() + 90);
            break;
        }

        // Past filters
        case 'lastWeek': {
            const start = new Date(today);
            start.setDate(today.getDate() - today.getDay() - 7); // last week start
            const end = new Date(start);
            end.setDate(start.getDate() + 6); // last week end
            from = start;
            to = end;
            break;
        }
        case 'last30': {
            from = new Date(today);
            from.setDate(today.getDate() - 30);
            to = today;
            break;
        }
        case 'last90': {
            from = new Date(today);
            from.setDate(today.getDate() - 90);
            to = today;
            break;
        }
        case 'sinceAug': {
            const year = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
            from = new Date(year, 7, 1);
            to = today;
            break;
        }

        // Custom 7–30 day filter
        case 'weekToMonth': {
            from = new Date(today);
            from.setDate(today.getDate() - 7);
            to = new Date(today);
            to.setDate(today.getDate() + 30);
            break;
        }

        // Default or custom input
        case 'custom': return [null, null];
    }

    // Format as YYYY-MM-DD for API
    function formatForApi(d) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${year}-${month}-${day}`;
    }

    return [formatForApi(from), formatForApi(to)];
}


// ====== GLOBAL STATE ======
let homeworkData = [];

// ====== HOMEWORK POPUP ======
function showHomeworkDetails(id) {
    const hw = homeworkData.find(h => h.id === id);
    if (!hw) return;

    const popup = document.getElementById("homeworkInfo");
    const container = document.getElementById("main-content");
    const titleEl = popup?.querySelector("#homeworkInfo-title");
    const detailsEl = popup?.querySelector("#homeworkInfo-details");

    if (!popup || !titleEl || !detailsEl) return;

    // Update URL for debugging
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('homeworkid', hw.id);
    window.history.replaceState({}, '', newUrl.toString());

    // Populate popup
    titleEl.textContent = hw.title || 'Homework Details';
    const isCompleted = hw.status?.ticked === 'yes';
    detailsEl.innerHTML = `
        <p><strong>Subject:</strong> ${hw.subject || 'N/A'}</p>
        <p><strong>Lesson:</strong> ${hw.lesson || 'N/A'}</p>
        <p><strong>Teacher:</strong> ${hw.teacher || 'N/A'}</p>
        <p><strong>Type:</strong> ${hw.homework_type || 'Homework'}</p>
        <p><strong>Issue Date:</strong> ${hw.issue_date ? formatDateWithDay(hw.issue_date) : 'N/A'}</p>
        <p><strong>Due Date:</strong> ${hw.due_date ? formatDateWithDay(hw.due_date) : 'N/A'}</p>
        <p>
            <strong>Completed:</strong>
            <input type="checkbox" id="hwCheckbox" ${isCompleted ? 'checked' : ''}>
        </p>
        <p>${hw.description || 'No additional information'}</p>
    `;

    const checkbox = document.getElementById("hwCheckbox");
    checkbox.addEventListener('change', () => toggleHomework(hw.status.id, checkbox.checked));

    popup.style.display = 'flex';
    container.classList.add('blur-bg'); // Only blur main content
}

function closeHomeworkInfo() {
    const popup = document.getElementById("homeworkInfo");
    const container = document.getElementById("main-content");
    popup.style.display = 'none';
    container.classList.remove('blur-bg');
}

// ====== TOGGLE HOMEWORK ======
async function toggleHomework(homeworkId, completed) {
    const session = getCookie('session');
    const pupilId = getPupilId();
    if (!session || !pupilId) return console.error('Missing session or pupil ID');

    try {
        const url = `https://www.classcharts.com/apiv2student/homeworkticked/${homeworkId}?pupil_id=${pupilId}`;
        const response = await window.CORS.fetchThroughWorker(url, {
            method: 'GET',
            headers: { 'Authorization': `Basic ${session}` }
        });

        const data = await response.json();
        if (!data.success) console.error('Failed to toggle homework completion:', data.error);
        else {
            const filterSelect = document.getElementById('filterSelect');
            const [from, to] = getFilterDates(filterSelect.value);
            loadHomework(from, to);
        }
    } catch (err) {
        console.error('Error toggling homework:', err);
    }
}

// ====== RENDER HOMEWORK ======
function renderHomework(list) {
    const categories = ['todo', 'completed', 'submitted late', 'not submitted', 'submitted'];
    const grouped = { 'todo': [], 'completed': [], 'submitted late': [], 'not submitted': [], 'submitted': [] };

    list.forEach(hw => grouped[getHomeworkStatus(hw)].push(hw));

    categories.forEach(cat => {
        const tbody = document.getElementById(`tbody-${cat.replace(' ', '-')}`);
        const countEl = document.getElementById(`count-${cat.replace(' ', '-')}`);
        const items = grouped[cat];

        if (!tbody || !countEl) return;
        countEl.textContent = items.length;

        if (!items.length) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;">No homework in this category</td></tr>`;
        else {
            tbody.innerHTML = items.map(hw => `
                <tr>
                    <td>
                        <button class="more-info-btn" onclick="showHomeworkDetails(${hw.id})">
                            <span class="MuiIconButton-label">
                                <svg class="MuiSvgIcon-root" focusable="false" viewBox="0 0 24 24" aria-hidden="true" style="width:20px;height:20px;">
                                    <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                                </svg>
                            </span>
                        </button>
                    </td>
                    <td>${hw.title || 'Untitled'}</td>
                    <td>${hw.teacher || 'N/A'}</td>
                    <td>${hw.lesson || 'N/A'}</td>
                    <td>${hw.subject || 'N/A'}</td>
                    <td>${hw.issue_date ? formatDate(hw.issue_date) : 'N/A'}</td>
                    <td>${hw.due_date ? formatDate(hw.due_date) : 'N/A'}</td>
                    <td>${hw.completion_time_value && hw.completion_time_unit ? hw.completion_time_value + ' ' + hw.completion_time_unit : ''}</td>
                    <td>${hw.homework_type || 'Homework'}</td>
                </tr>
            `).join('');
        }
    });
}

// ====== LOAD HOMEWORK ======
async function loadHomework(from, to) {
    const loading = document.getElementById('loading-state');
    const sections = document.getElementById('homework-sections');
    loading.style.display = 'block';
    sections.style.display = 'none';

    try {
        const session = getCookie('session');
        if (!session) throw new Error('No session token');

        // Use the API with query params
        const url = `https://www.classcharts.com/apiv2student/homeworks/?from=${from}&to=${to}`;
        const response = await window.CORS.fetchThroughWorker(url, {
            method: 'GET',
            headers: { 'Authorization': `Basic ${session}`, 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = await response.json();
        homeworkData = data.data || [];

        renderHomework(homeworkData);
        loading.style.display = 'none';
        sections.style.display = 'block';
    } catch (err) {
        console.error('Error loading homework:', err);
        loading.innerHTML = `<p style="color:red;">Error loading homework: ${err.message}</p>`;
    }
}

// ====== SECTION COLLAPSE ======
function toggleSection(header) {
    header.classList.toggle('collapsed');
    const content = header.nextElementSibling;
    if (content) content.classList.toggle('collapsed');
    const svg = header.querySelector('.MuiSvgIcon-root');
    if (svg) svg.style.transform = header.classList.contains('collapsed') ? 'rotate(0deg)' : 'rotate(180deg)';
}

// ====== INIT ======
document.addEventListener('DOMContentLoaded', async () => {
    await window.CORS.initializeWorker();

    const filterSelect = document.getElementById('filterSelect');
    const customDiv = document.getElementById('customDates');
    const applyBtn = document.getElementById('applyCustom');
    const closeBtn = document.getElementById('homeworkInfo-close');
    const homeworkInfo = document.getElementById('homeworkInfo');

    if (closeBtn) closeBtn.addEventListener('click', closeHomeworkInfo);
    if (homeworkInfo) homeworkInfo.addEventListener('click', e => { if (e.target === homeworkInfo) closeHomeworkInfo(); });

    // Filter toggle
    filterSelect.addEventListener('change', () => {
        if (filterSelect.value === 'custom') customDiv.style.display = 'flex';
        else {
            customDiv.style.display = 'none';
            const [from, to] = getFilterDates(filterSelect.value);
            loadHomework(from, to);
        }
    });

    applyBtn.addEventListener('click', () => {
        const from = document.getElementById('fromDate').value;
        const to = document.getElementById('toDate').value;
        if (!from || !to) return alert('Please select both from and to dates');
        loadHomework(from, to);
    });

    document.querySelectorAll('.homework-header').forEach(h => h.addEventListener('click', () => toggleSection(h)));

    const [from, to] = getFilterDates('weekToMonth');
    loadHomework(from, to);
});
