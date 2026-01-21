/* 
    - Why?
      Classcharts has VERY strict CORS rules
      so this gets around them, but Im cheap
      and I dont want to pay for more worker
      usage so this fixes that              
    --------------------------------------------
    - There are two workers in use, one primary
      one connected to the frontend, and a 
      backup. I don't expect to need more then
      this but its a possibility.
*/ 
const DEBUG = false; // MAKE ABSOLUTELY SURE THIS IS FALSE BEFORE PUSHING. It just shows debug logs

const WORKERS = [
    'https://api.classchartspro2.workers.dev/'
];

// cookie stuff
function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

function setCookie(name, value, hours = 1) {
    const expires = new Date();
    expires.setTime(expires.getTime() + hours * 60 * 60 * 1000);
    document.cookie = name + '=' + value + '; expires=' + expires.toUTCString() + '; path=/';
}

// Make sure the worker responds with pong, if not, return false
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
        if (DEBUG) console.log(`[DEBUG]: Worker ${workerUrl} ping failed:`, err.message);
        return false;
    }
}

// Get the first worker in the WORKERS list, then STOP
async function findWorkingWorker() {
    if (DEBUG) console.log('[DEBUG]: Finding working CORS worker...');
    
    for (const worker of WORKERS) {
        if (DEBUG) console.log(`[DEBUG]: Testing worker: ${worker}`);
        const isAlive = await pingWorker(worker);
        
        if (isAlive) {
            if (DEBUG) console.log(`[DEBUG]: Worker ${worker} is responding`);
            return worker;
        }
    }
    
    if (DEBUG) console.error('[DEBUG]: All workers failed to respond!');
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
                if (DEBUG) console.log('[DEBUG]: Cached worker is down, finding new one...');
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

        // Display an error to the user
        const popup = document.getElementById("popup");             
        const mainContent = document.getElementById("main-content"); 
        if (!popup) return;
        const header = popup.querySelector("h1");                   
        if (header) header.textContent = "Warning";                 
        const paragraph = popup.querySelector("p");                 
        if (paragraph) paragraph.innerText = "No working api endpoints available\nThe app is unable to retrieve data.";   
        const btn = popup.querySelector("a");                       
        if (btn) btn.textContent = "Okay!";
        popup.style.display = "block";                              
        mainContent.classList.add("blur");                          
                                                                
        const agreeBtn = popup.querySelector("#popup-agree");       
        if (agreeBtn) {                                             
            agreeBtn.addEventListener("click", () => {              
                popup.style.display = "none";                       
                mainContent.classList.remove("blur");               
            });                                                     
        }
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
        const proxyUrl = currentWorker + '/?url=' + url;
        const response = await fetch(proxyUrl, options);
        
        // If we get a 429 or 5xx error, the worker might be exhausted
        if (response.status === 429 || response.status >= 500) {
            console.warn('Current worker returned error, trying another...');
            currentWorker = await getWorkingWorker(true); // Force refresh
            
            if (currentWorker) {
                // Retry with new worker
                const retryUrl = currentWorker + '/?url=' + url;
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
            if (DEBUG) console.log('[DEBUG]: Retrying with new worker...');
            const retryUrl = currentWorker + '/?url=' + url;
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