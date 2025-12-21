function setupDOBInput(input, nextInput, maxLength, prevInput = null) {
    input.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '');
        if (this.value.length >= maxLength) {
            if (nextInput) nextInput.focus();
            else this.blur();
        }
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && this.value.length === 0 && prevInput) {
            prevInput.focus();
        }
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
        console.error('Login failed', response);
    }
}

function login(event) {
    event.preventDefault();

    showLoading("Logging in");

    const code = document.getElementById('code').value.trim();
    const dobd = document.getElementById('dobd').value.trim().padStart(2, '0');
    const dobm = document.getElementById('dobm').value.trim().padStart(2, '0');
    const doby = document.getElementById('doby').value.trim();

    const dob = `${doby}-${dobm}-${dobd}`;

    const payload = new URLSearchParams({
        code,
        dob,
        "recaptcha-token": "no-token-available"
    });

    fetch("https://api.classchartspro.qzz.io/login", {
        method: "POST",
        body: payload,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data.success !== 1) {
                hideLoading();
                document.getElementById('statusText').textContent = "Incorrect credentials. Try again.";
                document.getElementById('loginStatus').style.display = "block";
            }
            handleLoginRes(data, code, dob);
        })
        .catch(err => {
            console.error(err);
            hideLoading();
            document.getElementById('statusText').textContent = "Network error. Try again.";
            document.getElementById('loginStatus').style.display = "block";
        });
}


function checkCode() {
    const codeInput = document.getElementById('code');
    const dobContainer = document.getElementById('dobContainer');
    const dobDay = document.getElementById('dobd');
    const code = codeInput.value.trim();

    if (code.length <= 7) {
        dobContainer.style.display = "none";
        return;
    }

    fetch(`https://api.classchartspro.qzz.io/?url=https://www.classcharts.com/student/checkpupilcode/${code}`)
        .then(response => response.json())
        .then(data => {
            if (data.success === 1 && data.data.has_dob) {
                dobContainer.style.display = "flex";

                requestAnimationFrame(() => {
                    dobDay.focus();
                });
            } else {
                dobContainer.style.display = "none";
            }
        })
        .catch(error => {
            console.error("Error fetching code:", error);
        });
}

const codeInput = document.getElementById('code');
codeInput.addEventListener('input', checkCode);

codeInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        checkCode();
    }
});

const dobDay = document.getElementById('dobd');
const dobMonth = document.getElementById('dobm');
const dobYear = document.getElementById('doby');

setupDOBInput(dobDay, dobMonth, 2, codeInput);
setupDOBInput(dobMonth, dobYear, 2, dobDay);
setupDOBInput(dobYear, null, 4, dobMonth);

document.getElementById('loginForm').addEventListener('submit', login);

function getCookie(name) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop().split(";").shift();
}

function showLoading(message = "") {
    document.getElementById('submitbtn').style.display = "none";

    const statusBox = document.getElementById('loginStatus');
    const statusText = document.getElementById('statusText');

    statusText.textContent = message;
    statusBox.style.display = "block";
}

function hideLoading() {
    document.getElementById('submitbtn').style.display = "block";
    document.getElementById('loginStatus').style.display = "none";
}

function hideGif() {
    document.getElementById('loadingGif').style.display = "none";
}

function showGif() {
    document.getElementById('loadingGif').style.display = "flex";
}

(function () {
    let session = getCookie("session")
    if (session) {
        window.location.href = '/dash'
    }
})();