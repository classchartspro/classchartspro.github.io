const sideNav = document.querySelector('.sideNav');
const bottomNav = document.querySelector('.bottomNav');
const mainContent = document.getElementById('main-content');

// Toggle nav
toggleBtn.addEventListener('click', () => {
    const collapsed = sideNav.classList.toggle('collapsed');
    mainContent.classList.toggle('collapsed', collapsed);

    if (collapsed) {
        bottomNav.style.display = 'flex';
    } else {
        bottomNav.style.display = 'none';
    }
});
