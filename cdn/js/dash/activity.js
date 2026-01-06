/* 
   ----------- activity.js -----------
   - Fetches the activity timeline and renders it
   - Now with infinite scroll pagination
*/ 

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

function setCookie(name, value) {
    document.cookie = name + '=' + value + '; path=/';
}

// Utility to format YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Same date logic as behaviour.js
function getFilterDates(filter) {
    const today = new Date();
    let from = null, to = null;

    switch (filter) {
        case 'thisWeek': { const d = new Date(today); d.setDate(today.getDate() - today.getDay()); from = d; to = today; break; }
        case 'lastWeek': { const start = new Date(today); start.setDate(today.getDate() - today.getDay() - 7); const end = new Date(start); end.setDate(start.getDate() + 6); from = start; to = end; break; }
        case 'thisMonth': { from = new Date(today.getFullYear(), today.getMonth(), 1); to = today; break; }
        case 'lastMonth': { from = new Date(today.getFullYear(), today.getMonth() - 1, 1); to = new Date(today.getFullYear(), today.getMonth(), 0); break; }
        case 'last30': { from = new Date(); from.setDate(today.getDate() - 30); to = today; break; }
        case 'last90': { from = new Date(); from.setDate(today.getDate() - 90); to = today; break; }
        case 'sinceAug': { 
            const year = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
            from = new Date(year, 7, 1);
            to = today;
            break;
        }
        case 'custom': return [null, null];
    }
    return [formatDate(from), formatDate(to)];
}

// State for pagination
let currentFrom = null;
let currentTo = null;
let currentLastId = null;
let isLoading = false;
let hasMoreData = true;

// Fetch a single page of activity (10 items)
async function fetchActivityPage(from, to, lastId = null) {
    let session = getCookie('session');
    if (!session) return null;

    let pupilId = localStorage.getItem('pupilId');

    if (!pupilId) {
        const pingResp = await window.CORS.fetchThroughWorker('https://www.classcharts.com/apiv2student/ping', {
            headers: { Authorization: 'Basic ' + session }
        });
        const pingData = await pingResp.json();
        if (pingData?.meta?.session_id) { session = pingData.meta.session_id; setCookie('session', session); }
        pupilId = pingData?.data?.user?.id;
        if (!pupilId) { console.error('No pupil ID'); return null; }
        localStorage.setItem('pupilId', pupilId);
    }

    try {
        let url = `https://www.classcharts.com/apiv2student/activity/${pupilId}`;
        const params = [];
        if (from && to) {
            params.push(`from=${from}`);
            params.push(`to=${to}`);
        }
        if (lastId) {
            params.push(`last_id=${lastId}`);
        }
        if (params.length > 0) {
            url += '?' + params.join('&');
        }

        const resp = await window.CORS.fetchThroughWorker(url, {
            headers: { Authorization: 'Basic ' + session, Accept: 'application/json' }
        });
        const data = await resp.json();
        return data?.data || [];
    } catch (err) {
        console.error('Error fetching activity:', err);
        return [];
    }
}

// Render activity timeline (append mode)
function renderTimeline(activityArray, append = false) {
    const container = document.getElementById('timelineList');
    
    if (!append) {
        container.innerHTML = '';
    }

    // Remove loading indicator if it exists
    const loadingEl = container.querySelector('.loading-more');
    if (loadingEl) loadingEl.remove();

    if (!activityArray || activityArray.length === 0) {
        if (!append) {
            container.innerHTML = '<p class="empty">No activity data for this time range</p>';
        }
        return;
    }

    // When appending, just add new items to existing structure
    if (append) {
        const existingDates = {};
        container.querySelectorAll('.timeline-day').forEach(dayDiv => {
            const dateText = dayDiv.querySelector('.timeline-date').textContent;
            existingDates[dateText] = dayDiv;
        });

        activityArray.forEach(item => {
            const dateObj = new Date(item.timestamp);
            const dateKey = dateObj.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: '2-digit',
                month: 'long'
            });

            if (existingDates[dateKey]) {
                // Add to existing date group
                const actDiv = createActivityElement(item);
                existingDates[dateKey].appendChild(actDiv);
            } else {
                // Create new date group
                const dayDiv = document.createElement('div');
                dayDiv.classList.add('timeline-day');

                const dateHeader = document.createElement('div');
                dateHeader.textContent = dateKey;
                dateHeader.classList.add('timeline-date');
                dayDiv.appendChild(dateHeader);

                const actDiv = createActivityElement(item);
                dayDiv.appendChild(actDiv);

                container.appendChild(dayDiv);
                existingDates[dateKey] = dayDiv;
            }
        });
    } else {
        // Initial render - group by date
        const eventsByDate = {};
        const dateObjects = {};
        
        activityArray.forEach(item => {
            const dateObj = new Date(item.timestamp);
            const dateKey = dateObj.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: '2-digit',
                month: 'long'
            });
            if (!eventsByDate[dateKey]) {
                eventsByDate[dateKey] = [];
                dateObjects[dateKey] = dateObj;
            }
            eventsByDate[dateKey].push(item);
        });

        // Sort by actual date objects, not formatted strings
        Object.keys(eventsByDate).sort((a, b) => dateObjects[b] - dateObjects[a]).forEach(date => {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('timeline-day');

            const dateHeader = document.createElement('div');
            dateHeader.textContent = date;
            dateHeader.classList.add('timeline-date');
            dayDiv.appendChild(dateHeader);

            eventsByDate[date].forEach(act => {
                const actDiv = createActivityElement(act);
                dayDiv.appendChild(actDiv);
            });

            container.appendChild(dayDiv);
        });
    }
}

// Create a single activity element
function createActivityElement(act) {
    const time = new Date(act.timestamp).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const actDiv = document.createElement('div');
    actDiv.classList.add('timeline-event');

    if (act.type === 'behaviour') {
        if (act.polarity === 'positive' && act.score > 0) actDiv.classList.add('positive');
        else if (act.polarity === 'negative' && act.score < 0) actDiv.classList.add('negative');
        else actDiv.classList.add('neutral');
    } else if (act.type === 'detention') actDiv.classList.add('detention');

    const scoreText = act.type === 'detention' ? 'Detention' : (act.score >= 0 ? `+${act.score}` : `${act.score}`);
    let description = '';
    if (act.type === 'detention') {
        description = `Detention issued for ${act.reason || 'No reason'}<br> Location: ${act.detention_location || 'Unknown'}<br> Type: ${act.detention_type || 'Detention'}<br> Date: ${act.detention_date || 'Unknown'}<br> Time: ${act.detention_time || 'Unknown'}`;
    } else if (act.type === 'behaviour') {
        description = `${act.reason}${act.teacher_name ? ' awarded by ' + act.teacher_name : ''}${act.lesson_name ? ' in ' + act.lesson_name : ''}.`;
    }

    actDiv.innerHTML = `<div class="score">${scoreText}</div>
                        <div class="name">${act.pupil_name}</div>
                        <div class="description">${description}</div>
                        <div class="time">${time}</div>`;
    return actDiv;
}

// Show loading indicator
function showLoading() {
    const container = document.getElementById('timelineList');
    const loadingEl = document.createElement('div');
    loadingEl.className = 'loading-more';
    loadingEl.style.textAlign = 'center';
    loadingEl.style.padding = '20px';
    loadingEl.style.color = '#aaa';
    loadingEl.textContent = 'Loading more...';
    container.appendChild(loadingEl);
}

// Load more data
async function loadMoreActivity() {
    if (isLoading || !hasMoreData) return;
    
    isLoading = true;
    showLoading();
    
    const items = await fetchActivityPage(currentFrom, currentTo, currentLastId);
    
    if (items.length === 0) {
        hasMoreData = false;
        const container = document.getElementById('timelineList');
        const loadingEl = container.querySelector('.loading-more');
        if (loadingEl) loadingEl.remove();
    } else {
        console.log(`%cACTIVITY REEL%c Last item ID: ${items[items.length - 1].id}`, 
            "background: #df5900ff; border-radius: 20px; color: black; padding: 2px 4px;", 
            "color: white;"
        );
        currentLastId = items[items.length - 1].id;
        renderTimeline(items, true);
    }
    
    isLoading = false;
}

// Set up infinite scroll
function setupInfiniteScroll() {
    // Listen to window scroll instead
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;
        
        // Load more when user is 150px from bottom
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        
        if (distanceFromBottom < 150 && !isLoading && hasMoreData) {
            loadMoreActivity();
        }
    });
}

// Load timeline for a given filter
async function loadTimeline(filter, customFrom = null, customTo = null) {
    let [from, to] = getFilterDates(filter);
    if (filter === 'custom') { from = customFrom; to = customTo; }

    // Reset pagination state
    currentFrom = from;
    currentTo = to;
    currentLastId = null;
    hasMoreData = true;
    isLoading = false;

    const activityArray = await fetchActivityPage(from, to);
    
    if (activityArray.length > 0) {
        currentLastId = activityArray[activityArray.length - 1].id;
    } else {
        hasMoreData = false;
    }
    
    renderTimeline(activityArray, false);
}

// Expose globally so dash.js can call it
window.loadTimeline = loadTimeline;

// Initial load (default: since August)
loadTimeline('sinceAug');

// Set up infinite scroll after initial load
setupInfiniteScroll();