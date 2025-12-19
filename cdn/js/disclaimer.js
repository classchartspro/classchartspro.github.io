function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}


function showDisclaimer() {
    const disclaimer = document.getElementById("disclaimer");
    const mainContent = document.getElementById("main-content");

    disclaimer.style.display = "flex";
    document.body.classList.add("blur");
    mainContent.classList.add("blur");

    document.body.style.overflow = `hidden`;
}

function hideDisclaimer() {
    const disclaimer = document.getElementById("disclaimer");
    const mainContent = document.getElementById("main-content");

    disclaimer.style.display = "none";
    document.body.classList.remove("blur");
    mainContent.classList.remove("blur");

    document.cookie = "ShownDisclaimer=true; path=/; max-age=31536000; SameSite=Lax";
    document.body.style.overflow = `auto`;
}

document.addEventListener("DOMContentLoaded", function () {
    shownDisclaimer = getCookie("ShownDisclaimer")
    if (shownDisclaimer === "true") {
        // Already accepted
    } else {
        showDisclaimer();
    }

    document.getElementById("disclaimer-agree").addEventListener("click", hideDisclaimer);
});
