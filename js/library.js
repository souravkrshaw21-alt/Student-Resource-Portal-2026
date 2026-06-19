/* js/library.js - FINAL VERSION (WITH DATE FIXES) */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// CONFIG
const supabaseUrl = 'https://sbwgualposhuimvdrcst.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNid2d1YWxwb3NodWltdmRyY3N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTA0MzQsImV4cCI6MjA4Mzk4NjQzNH0.jtF7NyRe96R[...]
const supabase = createClient(supabaseUrl, supabaseKey)

// STATE
const userRole = sessionStorage.getItem("userRole");
const userName = sessionStorage.getItem("userName");
const userID = sessionStorage.getItem("userID");

window.onload = function() {
    if (!sessionStorage.getItem("isLoggedIn")) {
        const msg = document.getElementById('welcomeMsg');
        if(msg) msg.innerHTML = `<span style="color:#ffcccb">You are not logged in. Login to access library features.</span>`;
    } else {
        const msg = document.getElementById('welcomeMsg');
        if(msg) msg.innerText = `Welcome, ${userName} (${userRole})`;
        
        // SHOW ADMIN CONTROLS FOR TEACHERS
        if (userRole === 'admin' || userRole === 'teacher') {
            document.getElementById('adminControls').style.display = 'block';
            document.getElementById('log-tab').style.display = 'block'; 
        }
    }
    fetchBooks();
    fetchLibraryNotices();
};

/* --- 1. FETCH BOOKS --- */
async function fetchBooks() {
    const { data, error } = await supabase
        .from('library_books')
        .select('*')
        .order('cat', { ascending: true });

    const tbody = document.getElementById('bookTableBody');
    if(!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center p-4">No books found.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    
    data.forEach(b => {
        let statusBadge = "";
        let actionBtn = "";

        // DELETE BUTTON (Teacher Only)
        let deleteBtn = "";
        if (userRole === 'admin' || userRole === 'teacher') {
            deleteBtn = `<button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteBook(${b.id})" title="Remove Book"><i class="fa-solid fa-trash"></i></button>`;
        }

        // STATUS LOGIC
        if (b.status === "available" || !b.status) {
            statusBadge = `<span class="badge-available">Available</span>`;
            if (userRole === 'student') {
                actionBtn = `<button class="btn btn-issue" onclick="requestBook(${b.id}, '${b.title}')">Request</button>`;
            } else {
                actionBtn = `<small class="text-muted">-</small>`;
            }
        } 
        else if (b.status === "pending") {
            statusBadge = `<span class="badge bg-warning text-dark">Pending</span>`;
            if (userID === b.issued_to) {
                 actionBtn = `<button class="btn btn-sm btn-secondary" onclick="cancelRequest(${b.id})">Cancel</button>`;
            }
            else if (userRole === 'teacher' || userRole === 'admin') {
                actionBtn = `<button class="btn btn-sm btn-success" onclick="approveBook(${b.id}, '${b.title}', '${b.issued_to_name}')">Approve</button>`;
                statusBadge += `<div style="font-size:0.7rem;">Req: ${b.issued_to_name}</div>`;
            } else {
                actionBtn = `<small class="text-muted">Reserved</small>`;
            }
        }
        else if (b.status === "issued") {
            statusBadge = `<span class="badge-issued">Issued</span>`;
            if (userRole === 'teacher' || userRole === 'admin') {
                actionBtn = `<button class="btn btn-return" onclick="returnBook(${b.id}, '${b.title}', '${b.issued_to_name}')">Return</button>`;
                
                // Fix Date Display for Issue Date
                const rawD = b.issued_date ? new Date(b.issued_date) : new Date(); 
                const d = rawD.toLocaleDateString();
                
                statusBadge += `<div style="font-size:0.7rem; color:#d32f2f;">To: ${b.issued_to_name}<br>${d}</div>`;
            } else {
                actionBtn = `<small class="text-muted">Checked Out</small>`;
            }
        }

        const row = `
            <tr>
                <td><span style="font-weight:600; color:#555;">${b.cat}</span></td>
                <td style="font-weight:600;">${b.title}</td>
                <td>${b.author}</td>
                <td>${statusBadge}</td>
                <td class="text-end">${actionBtn} ${deleteBtn}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

/* --- 2. FETCH NOTICES & LOGS (Dual Tabs) --- */
async function fetchLibraryNotices() {
    const { data } = await supabase
        .from('uploads')
        .select('*')
        .in('category', ['library_notice', 'library_log'])
        .order('created_at', { ascending: false });

    const noticesDiv = document.getElementById('notices');
    const logsDiv = document.getElementById('logs');
    
    noticesDiv.innerHTML = "";
    logsDiv.innerHTML = "";

    data.forEach(item => {
        // --- DATE FIX: Handle Null Dates ---
        const rawDate = item.created_at ? new Date(item.created_at) : new Date();
        const time = rawDate.toLocaleDateString();
        
        // TAB 1: PUBLIC NOTICES
        if (item.category === 'library_notice') {
            noticesDiv.innerHTML += `
                <div class="lib-notice">
                    <strong>${item.title}</strong>
                    <p style="margin:0; color:#555;">${item.desc}</p>
                    <small style="color:#999;">${time}</small>
                </div>`;
        }
        // TAB 2: PRIVATE LOGS (Teacher Only)
        else if (item.category === 'library_log' && (userRole === 'teacher' || userRole === 'admin')) {
            logsDiv.innerHTML += `
                <div class="lib-log">
                    <i class="fa-solid fa-clock-rotate-left"></i> ${item.desc}
                    <div style="text-align:right; font-size:0.7rem; color:#888;">${time}</div>
                </div>`;
        }
    });

    if(noticesDiv.innerHTML === "") noticesDiv.innerHTML = "<small>No updates.</small>";
    if(logsDiv.innerHTML === "") logsDiv.innerHTML = "<small>No history.</small>";
}

/* --- 3. ADD / DELETE BOOKS --- */
document.getElementById('addBookForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('newBookTitle').value;
    const author = document.getElementById('newBookAuthor').value;
    const cat = document.getElementById('newBookCat').value;

    const { error } = await supabase.from('library_books').insert([{ title, author, cat, status:'available' }]);
    
    if(error) alert(error.message);
    else {
        alert("Book Added!");
        const modal = bootstrap.Modal.getInstance(document.getElementById('addBookModal'));
        modal.hide();
        e.target.reset();
        fetchBooks();
    }
});

document.getElementById('addNoticeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const txt = document.getElementById('newNoticeText').value;

    // --- DATE FIX: Force Date Save on Upload ---
    const { error } = await supabase.from('uploads').insert([{
        title: "Library Update",
        category: "library_notice",
        desc: txt,
        author: userName,
        created_at: new Date().toISOString() // FIX
    }]);

    if(error) alert(error.message);
    else {
        alert("Notice Posted!");
        const modal = bootstrap.Modal.getInstance(document.getElementById('noticeModal'));
        modal.hide();
        e.target.reset();
        fetchLibraryNotices();
    }
});

window.deleteBook = async function(id) {
    if(!confirm("Permanently delete this book from library?")) return;
    await supabase.from('library_books').delete().eq('id', id);
    fetchBooks();
};

/* --- 4. ISSUE / RETURN LOGIC --- */
window.requestBook = async function(id, title) {
    if (!confirm(`Request "${title}"?`)) return;
    await supabase.from('library_books').update({ status: 'pending', issued_to: userID, issued_to_name: userName }).eq('id', id);
    alert("Request Sent!");
    fetchBooks();
};

window.cancelRequest = async function(id) {
    if (!confirm("Cancel Request?")) return;
    await supabase.from('library_books').update({ status: 'available', issued_to: null, issued_to_name: null }).eq('id', id);
    fetchBooks();
};

window.approveBook = async function(id, title, name) {
    if (!confirm(`Approve for ${name}?`)) return;
    await supabase.from('library_books').update({ status: 'issued', issued_date: new Date().toISOString() }).eq('id', id);
    fetchBooks();
};

window.returnBook = async function(id, title, name) {
    if (!confirm(`Return "${title}"?`)) return;
    
    // 1. Reset Book
    await supabase.from('library_books').update({ status: 'available', issued_to: null, issued_to_name: null, issued_date: null }).eq('id', id);
    
    // 2. Add PRIVATE Log (WITH DATE FIX)
    await supabase.from('uploads').insert([{
        title: "Return Log",
        category: "library_log", 
        desc: `"${title}" returned by ${name}.`,
        author: "System",
        created_at: new Date().toISOString() // FIX
    }]);

    alert("Returned & Logged!");
    fetchBooks();
    fetchLibraryNotices();
};

/* --- UI HELPERS --- */
window.filterBooks = function() {
    const term = document.getElementById('bookSearch').value.toLowerCase();
    document.querySelectorAll('#bookTableBody tr').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
    });
};
window.openNotesModal = function() {
    new bootstrap.Modal(document.getElementById('notesModal')).show();
};
/* --- SEED DATABASE FUNCTION (Paste at the bottom of library.js) --- */

const initialBooks = [
    { cat: "Common", title: "Higher Engineering Mathematics", author: "B.S. Grewal" },
    { cat: "CSE", title: "Let Us C", author: "Yashavant Kanetkar" },
    { cat: "CSE", title: "Introduction to Algorithms (CLRS)", author: "Cormen, Leiserson, Rivest" },
    { cat: "CSE", title: "Fundamentals of Data Structures", author: "Ellis Horowitz & Sartaj Sahni" },
    { cat: "CSE", title: "Operating System Concepts", author: "Abraham Silberschatz & Galvin" },
    { cat: "CSE", title: "Database System Concepts", author: "Henry F. Korth & S. Sudarshan" },
    { cat: "CSE", title: "Data Communications and Networking", author: "Behrouz A. Forouzan" },
    { cat: "CSE", title: "Digital Logic & Computer Design", author: "M. Morris Mano" },
    { cat: "CSE", title: "Computer System Architecture", author: "M. Morris Mano" },
    { cat: "CSE", title: "Introduction to Automata Theory", author: "Hopcroft & Ullman" },
    { cat: "CSE", title: "Software Engineering", author: "Roger S. Pressman" },
    { cat: "CSE", title: "Discrete Mathematics & Applications", author: "Kenneth H. Rosen" },
    { cat: "EE", title: "Engineering Circuit Analysis", author: "Hayt, Kemmerly & Durbin" },
    { cat: "EE", title: "Electrical Machinery", author: "P.S. Bimbhra" },
    { cat: "EE", title: "Modern Power System Analysis", author: "D.P. Kothari & I.J. Nagrath" },
    { cat: "EE", title: "Control Systems Engineering", author: "I.J. Nagrath & M. Gopal" },
    { cat: "EE", title: "Electronic Devices and Circuit Theory", author: "Robert L. Boylestad" },
    { cat: "EE", title: "Signals and Systems", author: "Alan V. Oppenheim" },
    { cat: "EE", title: "Power Electronics", author: "P.S. Bimbhra" },
    { cat: "EE", title: "Engineering Electromagnetics", author: "William H. Hayt" },
    { cat: "EE", title: "Modern Digital Electronics", author: "R.P. Jain" },
    { cat: "EE", title: "Electrical Measurements", author: "A.K. Sawhney" }
];

window.seedDatabase = async function() {
    if (!confirm("⚠️ This will upload 22 books to the database. Proceed?")) return;
    
    // We loop through the list and add them one by one
    let count = 0;
    for (const book of initialBooks) {
        const { error } = await supabase.from('library_books').insert([{
            ...book,
            status: 'available'
        }]);
        if (!error) count++;
    }

    alert(`✅ Success! Added ${count} books to the library.`);
    // Refresh the table to show them
    fetchBooks();
    
    // Optional: Hide the button after use so you don't click it again
    document.getElementById('seedBtn').style.display = 'none';
};
