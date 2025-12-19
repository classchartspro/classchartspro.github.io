function handleLoginRes(response, code, dob) {
    if (response.success === 1) {
        const sessionToken = response.meta.session_id;
        const pupilId = response.meta.session_id;

        document.cookie = `session=${sessionToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        document.cookie = `session=${sessionToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;

        localStorage.setItem('code', code);
        localStorage.setItem('dob', dob);

        window.location.href = '/dash';
    } else {
        console.error('Login failed', response);
    }
}




function login(event) {
    event.preventDefault();

    const code = document.getElementById('code').value.trim();
    const dobd = document.getElementById('dobd').value.trim().padStart(2, '0');
    const dobm = document.getElementById('dobm').value.trim().padStart(2, '0');
    const doby = document.getElementById('doby').value.trim();

    const dob = `${doby}-${dobm}-${dobd}`; // yyyy-mm-dd

    // Create URL-encoded payload
    const payload = new URLSearchParams({
        code,
        dob,
        "recaptcha-token": "no-token-available"
    });

    fetch("https://api.classchartspro.qzz.io/login", {
    // fetch("http://127.0.0.1:8787/login", {
        method: "POST",
        body: payload, 
        headers: {
            "Content-Type": "application/x-www-form-urlencoded" 
        }
    })
    .then(res => res.json())
    .then(data => {
        console.log("Login response:", data);
        handleLoginRes(data, code, dob)
    })
    .catch(err => console.error("Login request failed:", err));
}



// Check code only when it reaches 10 characters
function checkCode() {
    const codeInput = document.getElementById('code');
    const dobContainer = document.getElementById('dobContainer');
    const code = codeInput.value.trim();

    if (code.length <= 7) {
        dobContainer.style.display = "none"; // hide DOB if code is not 10 chars
        return;
    }
    
    fetch(`https://api.classchartspro.qzz.io/?url=https://www.classcharts.com/student/checkpupilcode/${code}`)
    // fetch(`http://127.0.0.1:8787/?url=https://www.classcharts.com/student/checkpupilcode/${code}`)
        .then(response => response.json())
        .then(data => {
            if (data.success === 1 && data.data.has_dob) {
                dobContainer.style.display = "flex"; // show DOB inputs
            } else {
                dobContainer.style.display = "none";
            }
        })
        .catch(error => {
            console.error("Error fetching code:", error)
        });
}

const codeInput = document.getElementById('code');
codeInput.addEventListener('input', checkCode);

// Optional: allow immediate check on Enter
codeInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        checkCode();
    }
});

// DOB input auto-tab logic
const dobDay = document.getElementById('dobd');
const dobMonth = document.getElementById('dobm');
const dobYear = document.getElementById('doby');

function setupDOBInput(input, nextInput, maxLength) {
    input.addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, ''); // only numbers
        if (this.value.length >= maxLength) {
            if (nextInput) nextInput.focus();
            else this.blur();
        }
    });
}

setupDOBInput(dobDay, dobMonth, 2);
setupDOBInput(dobMonth, dobYear, 2);
setupDOBInput(dobYear, null, 4);

document.getElementById('loginForm').addEventListener('submit', login);

function getCookie(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
}
