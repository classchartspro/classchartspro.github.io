/*
    Handlelogin.js
    This file handles logouts like how the api after 24 hours of no pings invalidates you
    
    This will use stored creds in localStorage to log back in in the background
    uh this is very stupid. but it works? good enough
*/


function getCookie(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
}

/*
    This is a double whammy, it fixes users that are actually offline AND if the api goes down for any reason
*/
async function checkOnline() { // it obviously cannot work offline, check
    try {
        const response = await fetch("https://api.classchartspro.qzz.io/ping", { cache: "no-store" }); // ping it

        if (!response.ok) { // check if it returns a 200
            showOfflinePopup();
            return false;
        }

        const data = await response.json();
        if (data.pong !== true) { // checks if the response also contains pong: "true"
            showOfflinePopup();
            return false;
        }

        return true;

    } catch (error) {
        showOfflinePopup();
        return false;
    }

    function showOfflinePopup() { // this is Ctrl+C, Ctrl+V of the disclaimer popup, with a nice name lol
        const popup = document.getElementById("popup");             
        const mainContent = document.getElementById("main-content");
        if (!popup) return;                                         
                                                                
        const header = popup.querySelector("h1");                   
        if (header) header.textContent = "Warning";                 
        const paragraph = popup.querySelector("p");                 
        if (paragraph) paragraph.textContent = "You are offline";   
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

}

(async function () {
    let session = getCookie('session'); // first get the session token, this is stored in the cookies

    if (!session) { // if no session token exists, we may have been logged out
        console.log("%cSESSION MANAGER%c No session token, skipping ping", 
            "background: #0004ffff; border-radius: 20px; color: white; padding: 2px 4px;", 
            "color: white;"
        );
    } else { // else we are logged in, test the session
        console.log("%cSESSION MANAGER%c Ping with existing session", 
            "background: #0004ffff; border-radius: 20px; color: white; padding: 2px 4px;", 
            "color: white;"
        );
        
        if (await checkOnline()) {
            console.log("%cSESSION MANAGER%c Online, able to ping", 
                "background: #0004ffff; border-radius: 20px; color: white; padding: 2px 4px;", 
                "color: white;"
            );
        } else {
            console.warn("%cSESSION MANAGER%c Offline, Cannot ping", 
                "background: #0004ffff; border-radius: 20px; color: white; padding: 2px 4px;", 
                "color: white;"
            );
        }

        try {
            let response = await fetch(
                `https://api.classchartspro.qzz.io/?url=https://www.classcharts.com/apiv2student/ping`, // ping the api again to check if we are logged in
                { headers: { Authorization: "Basic " + session } }
            );

            let data = await response.json(); // make it json bc why not

            if (data.success === 1) { // if success is 1, we are in boys
                console.log("%cSESSION MANAGER%c Already logged in, nothing to do", 
                    "background: #0004ffff; border-radius: 20px; color: white; padding: 2px 4px;", 
                    "color: white;"
                );
                return;
            } else {
                console.log("%cSESSION MANAGER%c Didn't get 1 status, may have been logged out.", 
                    "background: #0004ffff; border-radius: 20px; color: white; padding: 2px 4px;", 
                    "color: white;"
                );
            }
        } catch (error) { // oh no
            console.error(`%cSESSION MANAGER%cError pinging session%c ${error}`,
                "background: #0004ffff; color: white; border-radius: 20px 0px 0px 20px; padding: 2px 4px;",
                "background: #ff0000ff; color: white; border-radius: 0 20px 20px 0; padding: 2px 4px;",
                "color: white;"
            );
        }
    }

    // continue only if (you dare) not logged in
    let code = localStorage.getItem("code");
    let dob = localStorage.getItem("dob");

    if (!code || !dob) { // this checks if we have both the code and the dob stored in the browser's localStorage
        console.log(
            "%cSESSION MANAGER%cCRITICAL ERROR%c Either dob or code is not stored\nRedirecting to login",
            "background: #0004ffff; color: white; border-radius: 20px 0px 0px 20px; padding: 2px 4px;",
            "background: #ff0000ff; color: white; border-radius: 0 20px 20px 0; padding: 2px 4px;",
            "color: white;"
        );
        window.location.href = `/dash/logout.html` // log out
    }

    try { // we are ready to try with cached login creds
        let response = await fetch(
            `https://api.classchartspro.qzz.io/?url=https://www.classcharts.com/student/checkpupilcode/${code}` // check the code
        );
        let data = await response.json();

        if (data.success === 1 && data.data.has_dob) {
            console.log("%cSESSION MANAGER%c Stored pupil code cookie is valid!", 
                "background: #0004ffff; border-radius: 20px; color: white; padding: 2px 4px;", 
                "color: white;"
            );
            login(code, dob)
        } else {
            // ah, thats somehow wrong. logout
            window.location.href = `/dash/logout.html`
        }
    } catch (error) {
        console.error(`%cSESSION MANAGER%cError fetching session%c ${error}`,
            "background: #0004ffff; color: white; border-radius: 20px 0px 0px 20px; padding: 2px 4px;",
            "background: #ff0000ff; color: white; border-radius: 0 20px 20px 0; padding: 2px 4px;",
            "color: white;"
        );
    }
})();

// this is copied from /cdn/js/login.js but is 
// modified to be a backend version
function login(code, dob) {
    const payload = new URLSearchParams({
        code,
        dob,
        "recaptcha-token": "no-token-available"
    });

    fetch("https://api.classchartspro.qzz.io/login", { // login again
        method: "POST",
        body: payload,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    }) 
        .then(res => res.json()) // cast to json
        .then(data => {
            handleLoginRes(data, code, dob); // handle frontend login
        })
        .catch(err => { // aw dude
            console.error(`%cSESSION MANAGER%cError fetching session%c ${err}`,
                "background: #0004ffff; color: white; border-radius: 20px 0px 0px 20px; padding: 2px 4px;",
                "background: #ff0000ff; color: white; border-radius: 0 20px 20px 0; padding: 2px 4px;",
                "color: white;"
            );
        });
}

function handleLoginRes(response, code, dob) {
    if (response.success === 1) {
        const sessionToken = response.meta.session_id;

        document.cookie = `session=${sessionToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

        localStorage.setItem('code', code);
        localStorage.setItem('dob', dob);

        window.location.href = '/dash';
    } else {
         console.error(`%cSESSION MANAGER%cLogin Failed%c ${response}`,
            "background: #0004ffff; color: white; border-radius: 20px 0px 0px 20px; padding: 2px 4px;",
            "background: #ff0000ff; color: white; border-radius: 0 20px 20px 0; padding: 2px 4px;",
            "color: white;"
        );
    }
}