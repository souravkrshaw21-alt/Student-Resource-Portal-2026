/* js/dashboard.js - SUPABASE VERSION (FINAL FIXED) */

// 1. IMPORT SUPABASE
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// 2. CONFIG
const supabaseUrl = 'https://sbwgualposhuimvdrcst.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNid2d1YWxwb3NodWltdmRyY3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTA0MzQsImV4cCI6MjA4Mzk4NjQzNH0.jtF7NyRe96RrFDan0TFemjPMz5uAfpDaSOJWcBiywpo'
const supabase = createClient(supabaseUrl, supabaseKey)

// STATE
const userRole = sessionStorage.getItem("userRole");
const userName = sessionStorage.getItem("userName");
const userID = sessionStorage.getItem("userID");
let allUploads = [];

/* --- INIT --- */
window.onload = function() {
    if (!sessionStorage.getItem("isLoggedIn")) {
        window.location.href = "../../login.html";
        return;
    }

    // Load Profile Info
    const pName = document.getElementById('profileName');
    const pID = document.getElementById('profileID');
    if(pName) pName.innerText = userName;
    if(pID) pID.innerText = (userRole === 'student' ? "Reg No: " : "ID: ") + userID;

    // Start Fetching Data
    fetchData();
    setupSearchLogic();
    setupCategoryListener();

    // --- ANNOUNCEMENT RESTRICTION (VISUAL) ---
    const upSelect = document.getElementById('upCategory');
    if (upSelect) {
        // 1. Check if option exists. If Admin, ensure it is there.
        let opt = upSelect.querySelector('option[value="announcement"]');
        if (!opt && userRole === 'admin') {
            opt = document.createElement('option');
            opt.value = 'announcement';
            opt.innerText = '📢 Public Announcement (Website)';
            upSelect.appendChild(opt);
        }
        // 2. If NOT Admin, remove it.
        if (opt && userRole !== 'admin') {
            opt.remove();
        }
    }
};

/* --- FETCH DATA --- */
async function fetchData() {
    const { data, error } = await supabase
        .from('uploads')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    allUploads = data;

    // Clear old data
    ['note','ebook','pyq','notice'].forEach(c => {
        const el = document.getElementById(`mini_${c}s`);
        if(el) el.innerHTML = '';
    });

    // Display Data
    allUploads.forEach((item) => {
        const miniContainer = document.getElementById(`mini_${item.category}s`);
        if (miniContainer && miniContainer.children.length < 5) {
            const div = document.createElement('div');
            div.className = 'list_item';
            // Handle potentially missing dates for display
            const rawDate = item.created_at ? new Date(item.created_at) : new Date();
            const dateStr = rawDate.toLocaleDateString();
            
            div.innerHTML = `<h4>${item.title}</h4>
                             <span>By ${item.author} • ${dateStr}</span>`;
            miniContainer.appendChild(div);
        }
    });
}

/* --- UPLOAD LOGIC --- */
window.openUploadModal = function() {
    document.getElementById('uploadModal').classList.add('active');
};

document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = "Uploading...";
    btn.disabled = true;

    const title = document.getElementById('upTitle').value;
    const category = document.getElementById('upCategory').value;
    const desc = document.getElementById('upDesc').value;
    const file = document.getElementById('upFile').files[0];

    // --- SECURITY CHECK ---
    if (category === 'announcement' && userRole !== 'admin') {
        alert("⛔ Access Denied: Only System Admins can post public announcements.");
        btn.innerText = "Upload";
        btn.disabled = false;
        return;
    }

    try {
        let publicURL = "";

        // 1. Upload File
        if (file) {
            const fileName = `${Date.now()}_${file.name}`;
            const { data, error } = await supabase.storage
                .from('files') 
                .upload(fileName, file);

            if (error) throw error;

            const urlData = supabase.storage.from('files').getPublicUrl(fileName);
            publicURL = urlData.data.publicUrl;
        } 
        else if ((category === 'note' || category === 'ebook') && !file) {
            throw new Error("File is required for Notes/E-books");
        }

        // 2. Insert Data (WITH FORCED DATE)
        const { error: dbError } = await supabase
            .from('uploads')
            .insert([
                { 
                    title: title, 
                    category: category, 
                    desc: desc, 
                    file_url: publicURL, 
                    author: userName,
                    created_at: new Date().toISOString() // <--- FIX FOR 1970 DATE ERROR
                }
            ]);

        if (dbError) throw dbError;

        alert("Upload Successful!");
        window.closeModal();
        e.target.reset();
        fetchData(); 

    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
    }
    btn.innerText = "Upload";
    btn.disabled = false;
});

/* --- DELETE LOGIC --- */
window.deleteItem = async function(id, fileUrl) {
    if (userRole !== 'admin' && userRole !== 'teacher') {
        alert("Unauthorized action!");
        return;
    }
    if(!confirm("Delete this item?")) return;
    
    try {
        const { error } = await supabase
            .from('uploads')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        alert("Deleted successfully.");
        fetchData();
        window.closeModal(); 
    } catch (error) {
        alert("Error: " + error.message);
    }
};

/* --- HELPER FUNCTIONS --- */
window.openModal = function(category) {
    const modal = document.getElementById('viewModal');
    document.getElementById('modalTitle').innerText = category.toUpperCase() + " - List";
    const tableBody = document.getElementById('modalTableBody');
    modal.classList.add('active');
    tableBody.innerHTML = "";

    const filtered = allUploads.filter(item => item.category === category);
    filtered.forEach(item => {
        const row = document.createElement('tr');
        let actionHTML = "";
        
        if(item.file_url) actionHTML += `<a href="${item.file_url}" target="_blank" class="action_btn_dl">Download</a>`;
        else actionHTML += `<span style="color:#888; font-size:0.8rem;">Text Only</span>`;

        if (userRole === 'admin' || (userRole === 'teacher' && item.author === userName)) {
            actionHTML += `<button class="delete_btn" onclick="deleteItem(${item.id}, '${item.file_url}')"><i class="fa-solid fa-trash"></i></button>`;
        }

        // Fix date display here too
        const rawDate = item.created_at ? new Date(item.created_at) : new Date();
        const dateStr = rawDate.toLocaleDateString();

        row.innerHTML = `
            <td><strong>${item.title}</strong><br><small>${item.desc || ""}</small></td>
            <td>${item.author}</td>
            <td>${dateStr}</td>
            <td>${actionHTML}</td>
        `;
        tableBody.appendChild(row);
    });
};

window.closeModal = function() {
    document.querySelectorAll('.modal_overlay').forEach(el => el.classList.remove('active'));
};

function setupSearchLogic() {
    const searchInput = document.getElementById('universalSearch');
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            const term = e.target.value.toLowerCase();
            document.querySelectorAll('.list_item').forEach(item => {
                const text = item.innerText.toLowerCase();
                item.style.display = text.includes(term) ? "block" : "none";
            });
        });
    }
}

function setupCategoryListener() {
    const catSelect = document.getElementById('upCategory');
    if(catSelect) {
        catSelect.addEventListener('change', function() {
            const fileInput = document.getElementById('upFile');
            const val = this.value;
            if(val === 'note' || val === 'ebook') {
                fileInput.required = true;
                fileInput.previousElementSibling.innerText = "File *Required";
            } else {
                fileInput.required = false;
                fileInput.previousElementSibling.innerText = "File (Optional)";
            }
        });
    }
}

window.handleLogout = function() {
    sessionStorage.clear();
    window.location.href = "../../index.html";
};