function VersionInfo() {
    fetch('/Ver.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network Error');
            }
            return response.text();
        })
        .then(version => {
            document.getElementById('versioninfo').textContent = 'Version: ' + version.trim();
        })
        .catch(error => {
            console.error('There was an error with the fetch operation', error);
            document.getElementById('versioninfo').textContent = 'Error loading version info';
        })
}

window.addEventListener("DOMContentLoaded", VersionInfo);