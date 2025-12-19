// Current theme state
let currentThemeKey = "basic-dark";
let currentTheme = {}; // overrides

// DOM Elements (only on pages that allow updates)
const themeUpdateDiv = document.getElementById("themeUpdate");
let themeSelect, themeTextbox, applyButton, pasteButton;

if (themeUpdateDiv) {
    themeSelect = themeUpdateDiv.querySelector("#themeSelect");
    themeTextbox = themeUpdateDiv.querySelector("#themeTextbox");
    applyButton = themeUpdateDiv.querySelector("#applyTheme");
    pasteButton = themeUpdateDiv.querySelector("#pasteTheme");
}

// Helper: Load CSS dynamically
function loadThemeCSS(themeName) {
    const existing = document.getElementById("themeCSS");
    if (existing) existing.remove();

    const link = document.createElement("link");
    link.id = "themeCSS";
    link.rel = "stylesheet";
    link.href = `/cdn/css/${themeName}.css`;
    document.head.appendChild(link);
}

// Apply overrides as CSS variables
function applyOverrides(overrides) {
    for (const [key, value] of Object.entries(overrides)) {
        document.documentElement.style.setProperty(`--${key}`, value);
    }
}

// Load last saved theme from localStorage
const savedTheme = localStorage.getItem("userTheme");
if (savedTheme) {
    try {
        const parsed = JSON.parse(savedTheme);
        if (parsed.base) {
            currentThemeKey = parsed.base;
            loadThemeCSS(currentThemeKey);
        }
        currentTheme = parsed.overrides || {};
        applyOverrides(currentTheme);
    } catch (e) {
        console.error("Failed to load saved theme", e);
        loadThemeCSS(currentThemeKey);
    }
} else {
    loadThemeCSS(currentThemeKey);
}

// Only run update logic if #themeUpdate exists
if (themeUpdateDiv) {

    // Populate base theme dropdown
    const baseThemes = ["basic-dark", "basic-light", "solarized"]; // add all your base themes
    for (const name of baseThemes) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        themeSelect.appendChild(opt);
    }

    // Populate textbox with current overrides
    themeTextbox.value = JSON.stringify(currentTheme, null, 2);
    themeSelect.value = currentThemeKey;

    // On base theme selection
    themeSelect.addEventListener("change", () => {
        currentThemeKey = themeSelect.value;
        loadThemeCSS(currentThemeKey);
        currentTheme = {};
        themeTextbox.value = "{}";
        localStorage.setItem("userTheme", JSON.stringify({ base: currentThemeKey, overrides: {} }));
    });

    // Apply edited JSON from textbox
    applyButton.addEventListener("click", () => {
        try {
            const overrides = JSON.parse(themeTextbox.value);
            currentTheme = overrides;
            applyOverrides(currentTheme);
            localStorage.setItem("userTheme", JSON.stringify({ base: currentThemeKey, overrides: currentTheme }));
        } catch (e) {
            alert("Invalid JSON");
            console.error(e);
        }
    });

    // Paste custom theme JSON
    pasteButton.addEventListener("click", () => {
        const pasted = prompt("Paste your theme JSON here:");
        if (!pasted) return;
        try {
            const parsed = JSON.parse(pasted);
            currentTheme = parsed;
            applyOverrides(currentTheme);
            themeTextbox.value = JSON.stringify(currentTheme, null, 2);
            localStorage.setItem("userTheme", JSON.stringify({ base: currentThemeKey, overrides: currentTheme }));
            themeSelect.value = currentThemeKey;
        } catch (e) {
            alert("Invalid JSON");
            console.error(e);
        }
    });
}
