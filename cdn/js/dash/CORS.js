/* 
    ------ CORS.js ------
    - Why?
      > Classcharts has VERY strict CORS rules <
      > so this gets around them, but Im cheap <
      > and I dont want to pay for more worker <
      > usage so this fixes that               <
    -  
*/ 

const WORKERS = [
    'https://api.classchartspro.qzz.io',
    'https://api.classchartspro2.workers.dev/'
];

// Cookie helpers
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

function setCookie(name, value, hours = 1) {
    const expires = new Date();
    expires.setTime(expires.getTime() + hours * 60 * 60 * 1000);
    document.cookie = name + '=' + value + '; expires=' + expires.toUTCString() + '; path=/';
}

// Test if a worker responds with pong
async function pingWorker(workerUrl) {
    try {
        const response = await fetch(workerUrl + '/ping', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) return false;
        
        const data = await response.json();
        return data.pong === true;
    } catch (err) {
        console.log(`Worker ${workerUrl} ping failed:`, err.message);
        return false;
    }
}

// Find first working worker from the list
async function findWorkingWorker() {
    console.log('Finding working CORS worker...');
    
    for (const worker of WORKERS) {
        console.log(`Testing worker: ${worker}`);
        const isAlive = await pingWorker(worker);
        
        if (isAlive) {
            console.log(`✓ Worker ${worker} is responding`);
            return worker;
        }
    }
    
    console.error('All workers failed to respond!');
    return null;
}

// Get the current working worker (with caching)
async function getWorkingWorker(forceRefresh = false) {
    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
        const cached = getCookie('workerUse');
        if (cached) {
            // Verify cached worker still works
            const isStillAlive = await pingWorker(cached);
            if (isStillAlive) {
                return cached;
            } else {
                console.log('Cached worker is down, finding new one...');
            }
        }
    }
    
    // Find a working worker
    const worker = await findWorkingWorker();
    
    if (worker) {
        // Cache for 1 hour
        setCookie('workerUse', worker, 1);
    }
    
    return worker;
}

// Initialize and expose globally
let currentWorker = null;

async function initializeWorker() {
    currentWorker = await getWorkingWorker();
    
    if (!currentWorker) {
            console.error(`%cAPI MANAGER%cError: No working api endpoints available!`,
                "background: #0b8300ff; color: white; border-radius: 20px 0px 0px 20px; padding: 2px 4px;",
                "background: #ff0000ff; color: white; border-radius: 0 20px 20px 0; padding: 2px 4px;",
                "color: white;"
            );
        // Could show user-facing error here
    } else {
        console.log("%cAPI MANAGER%c No session token, skipping ping", 
            "background: #0b8300ff; border-radius: 20px; color: white; padding: 2px 4px;", 
            "color: white;"
        );
    }
    
    return currentWorker;
}

// Wrapper function for making requests through the worker
async function fetchThroughWorker(url, options = {}) {
    if (!currentWorker) {
        await initializeWorker();
    }
    
    if (!currentWorker) {
        throw new Error('No CORS workers available');
    }
    
    try {
        const proxyUrl = currentWorker + '/?url=' + encodeURIComponent(url);
        const response = await fetch(proxyUrl, options);
        
        // If we get a 429 or 5xx error, the worker might be exhausted
        if (response.status === 429 || response.status >= 500) {
            console.warn('Current worker returned error, trying another...');
            currentWorker = await getWorkingWorker(true); // Force refresh
            
            if (currentWorker) {
                // Retry with new worker
                const retryUrl = currentWorker + '/?url=' + encodeURIComponent(url);
                return await fetch(retryUrl, options);
            }
        }
        
        return response;
    } catch (err) {
            console.error(`%cAPI MANAGER%cError: ${err}!`,
                "background: #0b8300ff; color: white; border-radius: 20px 0px 0px 20px; padding: 2px 4px;",
                "background: #ff0000ff; color: white; border-radius: 0 20px 20px 0; padding: 2px 4px;",
                "color: white;"
            );
        
        // Try to find another worker
        currentWorker = await getWorkingWorker(true);
        
        if (currentWorker) {
            console.log('Retrying with new worker...');
            const retryUrl = currentWorker + '/?url=' + encodeURIComponent(url);
            return await fetch(retryUrl, options);
        }
        
        throw err;
    }
}

// Expose globally
window.CORS = {
    initializeWorker,
    fetchThroughWorker,
    getWorkingWorker,
    getCurrentWorker: () => currentWorker
};

// Auto-initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWorker);
} else {
    initializeWorker();
}