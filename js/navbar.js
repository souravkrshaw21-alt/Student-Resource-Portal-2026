/* js/navbar.js */

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

function toggleSubMenu(subId) {
    document.getElementById(subId).classList.toggle('show');
}

// Global Settings Function (Works on ALL pages)
function openSettings() {
    const isLoggedIn = sessionStorage.getItem("isLoggedIn");
    const modal = document.createElement('div');
    modal.style.cssText = "position:fixed; bottom:0; left:0; width:100%; background:white; padding:30px; border-radius:20px 20px 0 0; box-shadow:0 -5px 20px rgba(0,0,0,0.3); z-index:5000; animation: fadeInUp 0.3s forwards;";
    
    let content = `<h3>Settings</h3><hr style='margin:10px 0; border:0; border-top:1px solid #eee;'>`;
    content += `<div style='padding:10px 0; display:flex; justify-content:space-between;'><span>App Version</span><span style='color:#aaa;'>v1.0.0</span></div>`;
    content += `<div style='padding:10px 0; display:flex; justify-content:space-between;'><span>Dark Mode</span><span style='color:#aaa;'>Coming Soon</span></div>`;
    
    if(isLoggedIn) {
        // Calculate correct path back to home based on current location
        const path = window.location.pathname;
        let homeLink = "index.html";
        if(path.includes("/pages/dashboard/") || path.includes("/pages/about/")) {
            homeLink = "../../index.html";
        } else if (path.includes("/pages/")) {
            homeLink = "../index.html";
        }

        content += `<button onclick="sessionStorage.clear(); window.location.href='${homeLink}';" style='width:100%; padding:15px; background:#ffebee; color:#d32f2f; border:none; border-radius:10px; margin-top:15px; font-weight:bold;'><i class="fa-solid fa-power-off"></i> Logout</button>`;
    }
    
    content += `<button onclick="this.parentElement.remove()" style='margin-top:10px; width:100%; padding:10px; border:none; background:#f5f5f5; border-radius:10px;'>Close</button>`;
    modal.innerHTML = content;
    document.body.appendChild(modal);
}

// Run on Load
document.addEventListener("DOMContentLoaded", () => {
    // 1. Highlight Active Link
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('.menu_list a');
    links.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(currentPath.split('/').pop())) {
            link.classList.add('active');
            const parent = link.closest('.sub_menu');
            if(parent) parent.classList.add('show');
        }
    });

    // 2. Auth Check (Change Login -> Dashboard)
    const isLoggedIn = sessionStorage.getItem("isLoggedIn");
    const userRole = sessionStorage.getItem("userRole");
    const navBtn = document.querySelector('.nav_login_btn');

    if (navBtn && isLoggedIn === "true") {
        navBtn.innerHTML = `Dashboard <i class="fa-solid fa-gauge"></i>`;
        navBtn.style.background = "#e0e7ff";
        navBtn.style.color = "#3730a3";
        navBtn.href = "#";
        navBtn.onclick = (e) => {
            e.preventDefault();
            // Intelligent Path Calculation
            if (currentPath.includes("/pages/dashboard/")) {
                return; // Already here
            } else if (currentPath.includes("/pages/")) {
                window.location.href = `dashboard/${userRole}.html`; // From Announcements/About
            } else {
                window.location.href = `pages/dashboard/${userRole}.html`; // From Home
            }
        };
    }
});

// Export globally
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.toggleSubMenu = toggleSubMenu;
window.openSettings = openSettings;
