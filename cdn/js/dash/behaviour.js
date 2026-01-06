// behaviour.js
// Handles fetching and rendering the behaviour chart

export async function loadBehavior(filter = 'sinceAug', customFrom = null, customTo = null) {
    const behavior = await fetchBehaviorData(filter, customFrom, customTo);
    renderChart(behavior);
}

// ----------------- Fetch behaviour data -----------------
async function fetchBehaviorData(filter, customFrom, customTo) {
    let session = getCookie('session');
    if (!session) return null;

    const proxyBase = 'https://api.classchartspro.qzz.io/?url=';
    let pupilId = localStorage.getItem('pupilId');

    if (!pupilId) {
        // Ping API to get pupil ID and possibly new session
        const pingResp = await fetch(proxyBase + encodeURIComponent('https://www.classcharts.com/apiv2student/ping'), {
            headers: { Authorization: 'Basic ' + session }
        });
        const pingData = await pingResp.json();

        if (pingData?.meta?.session_id) {
            session = pingData.meta.session_id;
            setCookie('session', session);
        }

        pupilId = pingData?.data?.user?.id;
        if (!pupilId) {
            console.error('No pupil ID');
            return null;
        }
        localStorage.setItem('pupilId', pupilId);
    }

    let from, to;
    if (filter === 'custom') {
        from = customFrom;
        to = customTo;
    } else {
        [from, to] = getFilterDates(filter);
    }

    let url = `https://www.classcharts.com/apiv2student/behaviour/${pupilId}`;
    if (from && to) url += `?from=${from}&to=${to}`;
    const proxyUrl = proxyBase + encodeURIComponent(url);

    try {
        const resp = await fetch(proxyUrl, {
            headers: { Authorization: 'Basic ' + session, Accept: 'application/json' }
        });
        const data = await resp.json();
        return data?.data || null;
    } catch (err) {
        console.error('Error fetching behaviour data:', err);
        return null;
    }
}

// ----------------- Render chart -----------------
function renderChart(behavior) {
    if (!behavior) {
        console.error('No behaviour data to render');
        return;
    }

    const outerData = [];

    if (behavior.positive_reasons && typeof behavior.positive_reasons === 'object') {
        for (const [name, count] of Object.entries(behavior.positive_reasons)) {
            outerData.push({ name, y: count, color: '#8AC44B' });
        }
    }

    if (behavior.negative_reasons && typeof behavior.negative_reasons === 'object') {
        for (const [name, count] of Object.entries(behavior.negative_reasons)) {
            outerData.push({ name, y: count, color: '#BB2D2D' });
        }
    }

    const totalPositive = Object.values(behavior.positive_reasons || {}).reduce((a, b) => a + b, 0);
    const totalNegative = Object.values(behavior.negative_reasons || {}).reduce((a, b) => a + b, 0);

    const innerData = [
        { name: 'Positive', y: totalPositive, color: '#8AC44B' },
        { name: 'Negative', y: totalNegative, color: '#BB2D2D' }
    ];

    Highcharts.chart('behaviorChart', {
        chart: { type: 'pie' },
        title: { text: 'Behaviour score breakdown' },
        tooltip: { pointFormat: '{point.name}: <b>{point.y}</b> ({point.percentage:.1f}%)' },
        legend: { enabled: false },
        plotOptions: {
            pie: {
                allowPointSelect: false,
                cursor: 'default',
                center: ['50%', '50%'],
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b> +{point.y} ({point.percentage:.0f}%)',
                    connectorColor: 'silver'
                },
                point: { events: { click: function () { return false; } } }
            }
        },
        series: [
            { name: 'Summary', data: innerData, size: '50%', dataLabels: { enabled: false } },
            { name: 'Details', data: outerData, size: '100%', innerSize: '50%', showInLegend: false }
        ],
        responsive: {
            rules: [{
                condition: { maxWidth: 1024 },
                chartOptions: { plotOptions: { pie: { dataLabels: { enabled: false } } } }
            }]
        }
    });
}

// ----------------- Utility functions -----------------
function getFilterDates(filter) {
    const today = new Date();
    let from = null, to = null;

    switch (filter) {
        case 'last31': return [null, null];
        case 'thisWeek': { const d = new Date(today); d.setDate(today.getDate() - today.getDay()); from = d; to = today; break; }
        case 'lastWeek': { const start = new Date(today); start.setDate(today.getDate() - today.getDay() - 7); const end = new Date(start); end.setDate(start.getDate() + 6); from = start; to = end; break; }
        case 'thisMonth': { from = new Date(today.getFullYear(), today.getMonth(), 1); to = today; break; }
        case 'lastMonth': { from = new Date(today.getFullYear(), today.getMonth() - 1, 1); to = new Date(today.getFullYear(), today.getMonth(), 0); break; }
        case 'last30': { from = new Date(); from.setDate(today.getDate() - 30); to = today; break; }
        case 'last90': { from = new Date(); from.setDate(today.getDate() - 90); to = today; break; }
        case 'sinceAug': { from = new Date(today.getFullYear(), 7, 1); to = today; break; }
        case 'custom': return [null, null];
    }

    return [formatDate(from), formatDate(to)];
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

function setCookie(name, value) {
    document.cookie = name + '=' + value + '; path=/';
}
