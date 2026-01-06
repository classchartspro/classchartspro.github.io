// Cookie helpers
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function setCookie(name, value) { 
  document.cookie = name + '=' + value + '; path=/'; 
}

// Utility to format date YYYY-MM-DD
function formatDate(date) { 
  return date.toISOString().split('T')[0]; 
}

// map filter to dates
function getFilterDates(filter) {
    const today = new Date();
    let from = null, to = today;

    switch (filter) {
        case 'last31': return [null, null];
        case 'thisWeek': {
            const d = new Date(today);
            d.setDate(today.getDate() - today.getDay());
            from = d;
            break;
        }
        case 'lastWeek': {
            const start = new Date(today);
            start.setDate(today.getDate() - today.getDay() - 7);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            from = start;
            to = end;
            break;
        }
        case 'thisMonth':
            from = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'lastMonth':
            from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            to = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
        case 'last30':
            from = new Date();
            from.setDate(today.getDate() - 30);
            break;
        case 'last90':
            from = new Date();
            from.setDate(today.getDate() - 90);
            break;
        case 'sinceAug': {
            // If before August, pick August last year
            const year = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
            from = new Date(year, 7, 1);
            break;
        }
        case 'custom':
            return [null, null];
    }

    return [formatDate(from), formatDate(to)];
}

// fetch behavior JSON with explicit from/to
async function fetchBehaviorData(from, to) {
  let session = getCookie('session');
  if (!session) { 
    return null; 
  }

  let pupilId = localStorage.getItem('pupilId');
  if (!pupilId) {
    const pingResp = await window.CORS.fetchThroughWorker('https://www.classcharts.com/apiv2student/ping', {
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

  let url = `https://www.classcharts.com/apiv2student/behaviour/${pupilId}`;
  if (from && to) url += `?from=${from}&to=${to}`;

  const activityResp = await window.CORS.fetchThroughWorker(url, {
    headers: { Authorization: 'Basic ' + session, Accept: 'application/json' }
  });

  const activityData = await activityResp.json();
  return activityData?.data || null;
}

function renderChart(behavior) {
    const chartContainer = document.getElementById('behaviorChart');

    // Clear previous content
    chartContainer.innerHTML = '';

    // Check if behavior data is empty
    const hasData =
        (behavior.positive_reasons && Object.keys(behavior.positive_reasons).length > 0) ||
        (behavior.negative_reasons && Object.keys(behavior.negative_reasons).length > 0);

    if (!hasData) {
        // Show "No data" message
        const msg = document.createElement('div');
        msg.style.textAlign = 'center';
        msg.style.padding = '40px';
        msg.style.color = '#aaa';
        msg.style.fontSize = '18px';
        msg.textContent = 'No data for this time range';
        chartContainer.appendChild(msg);
        return;
    }

    // Otherwise, render chart as usual
    const outerData = [];

    for (const [name, count] of Object.entries(behavior.positive_reasons || {})) {
        outerData.push({ name, y: count, color: '#8AC44B' });
    }
    for (const [name, count] of Object.entries(behavior.negative_reasons || {})) {
        outerData.push({ name, y: count, color: '#BB2D2D' });
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

async function loadChart(filter, customFrom = null, customTo = null) {
  let [from, to] = getFilterDates(filter);
  if (filter === 'custom') { from = customFrom; to = customTo; }
  const behavior = await fetchBehaviorData(from, to);
  if (!behavior) {
    console.warn('No data available for this filter');
    return;
  }
  renderChart(behavior);
}

// Expose globally so dash.js can call it
window.loadChart = loadChart;

// Initial load default since August
loadChart('sinceAug');