// activity.js

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

document.addEventListener('DOMContentLoaded', async () => {
    const session = getCookie('session');
    if (!session) {
        return;
    }

    const proxyBase = 'https://api.classchartspro.qzz.io/?url=';
    const url = proxyBase + encodeURIComponent('https://www.classcharts.com/apiv2student/activity');

    const container = document.getElementById('timelineList');
    container.innerHTML = '<p class="loading">Loading activity...</p>';

    try {
        const resp = await fetch(url, {
            headers: { Authorization: 'Basic ' + session }
        });

        const data = await resp.json();
        const activityArray = data?.data || [];

        renderTimeline(activityArray);
    } catch (err) {
        console.error('Error fetching activity:', err);
        container.innerHTML = '<p class="error">Error loading activity</p>';
    }
});

function renderTimeline(activityArray) {
    const container = document.getElementById('timelineList');
    container.innerHTML = '';

    if (!activityArray || activityArray.length === 0) {
        container.innerHTML = '<p class="empty">No activity data</p>';
        return;
    }

    const eventsByDate = {};
    activityArray.forEach(item => {
        const date = new Date(item.timestamp).toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'long' });
        if (!eventsByDate[date]) eventsByDate[date] = [];
        eventsByDate[date].push(item);
    });

    Object.keys(eventsByDate)
        .sort((a, b) => new Date(b) - new Date(a))
        .forEach(date => {
            const dayDiv = document.createElement('div');
            dayDiv.classList.add('timeline-day');

            const dateHeader = document.createElement('div');
            dateHeader.textContent = date;
            dateHeader.classList.add('timeline-date');
            dayDiv.appendChild(dateHeader);

            eventsByDate[date].forEach(act => {
                const time = new Date(act.timestamp).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
                const actDiv = document.createElement('div');
                actDiv.classList.add('timeline-event');

                if (act.type === 'behaviour') {
                    if (act.polarity === 'positive' && act.score > 0) actDiv.classList.add('positive');
                    else if (act.polarity === 'negative' && act.score < 0) actDiv.classList.add('negative');
                    else actDiv.classList.add('neutral');
                } else if (act.type === 'detention') {
                    actDiv.classList.add('detention');
                }

                let scoreText = act.type === 'detention' ? 'Detention' : (act.score >= 0 ? `+${act.score}` : `${act.score}`);

                let description = '';
                if (act.type === 'detention') {
                    description = `Detention issued for ${act.reason || 'No reason'}<br>
                                   Location: ${act.detention_location || 'Unknown'}<br>
                                   Type: ${act.detention_type || 'Detention'}<br>
                                   Date: ${act.detention_date || 'Unknown'}<br>
                                   Time: ${act.detention_time || 'Unknown'}`;
                } else if (act.type === 'behaviour') {
                    description = `${act.reason}${act.teacher_name ? ' awarded by ' + act.teacher_name : ''}${act.lesson_name ? ' in ' + act.lesson_name : ''}.`;
                }

                actDiv.innerHTML = `
                    <div class="score">${scoreText}</div>
                    <div class="name">${act.pupil_name}</div>
                    <div class="description">${description}</div>
                    <div class="time">${time}</div>
                `;

                dayDiv.appendChild(actDiv);
            });

            container.appendChild(dayDiv);
        });
}
