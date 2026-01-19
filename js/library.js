/* js/library.js */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// YOUR CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyCm__tUZQ306quXAW6vbN7PsGGtYuttLik",
  authDomain: "bccl-ems-1826f.firebaseapp.com",
  projectId: "bccl-ems-1826f",
  storageBucket: "bccl-ems-1826f.firebasestorage.app",
  messagingSenderId: "863769805844",
  appId: "1:863769805844:web:cb2fb02b61c9d0c46e9301"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// State
const userRole = sessionStorage.getItem("userRole");
const userName = sessionStorage.getItem("userName");
const userID = sessionStorage.getItem("userID");

// --- INITIAL DATA TO SEED ---
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

/* --- INIT --- */
window.onload = function() {
    // 1. Check Auth
    if (!sessionStorage.getItem("isLoggedIn")) {
        const msg = document.getElementById('welcomeMsg');
        if(msg) msg.innerHTML = `<span style="color:#ffcccb">You are not logged in. <a href="login.html" style="color:white; text-decoration:underline;">Login here</a> to access library features.</span>`;
    } else {
        const msg = document.getElementById('welcomeMsg');
        if(msg) msg.innerText = `Welcome, ${userName} (${userRole})`;
        // Show Seed Button only for Admins/Teachers to setup DB
        if (userRole === 'admin' || userRole === 'teacher') {
            const btn = document.getElementById('seedBtn');
            if(btn) btn.style.display = 'inline-block';
        }
    }

    // 2. Start Listeners
    fetchBooks();
    fetchLibraryNotices();
};

/* --- 1. SEED DATABASE (One Time Use) --- */
window.seedDatabase = async function() {
    if (!confirm("⚠️ This will upload 22 books to the database. Do this only ONCE. Proceed?")) return;
    
    const batch = writeBatch(db);
    initialBooks.forEach(book => {
        const docRef = doc(collection(db, "library_books")); // Auto-ID
        batch.set(docRef, {
            ...book,
            status: "available",
            issuedTo: null,
            issuedDate: null,
            timestamp: serverTimestamp()
        });
    });

    try {
        await batch.commit();
        alert("✅ Database populated successfully!");
        document.getElementById('seedBtn').style.display = 'none'; // Hide after success
    } catch (e) {
        alert("Error: " + e.message);
    }
};

/* --- 2. FETCH BOOKS --- */
function fetchBooks() {
    const q = query(collection(db, "library_books"), orderBy("cat", "asc"));
    
    onSnapshot(q, (snapshot) => {
        const tbody = document.getElementById('bookTableBody');
        if(!tbody) return;

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center p-4">No books found in database. <br> (Teachers: Click 'Initialize Database' button above)</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        
        snapshot.forEach(docSnap => {
            const b = docSnap.data();
            const id = docSnap.id;
            
            let statusBadge = `<span class="badge-available">Available</span>`;
            let actionBtn = "";

            if (b.status === "issued") {
                statusBadge = `<span class="badge-issued" title="Issued to ${b.issuedToName}">Issued</span>`;
                
                // Return Logic: Only Teachers can return
                if (userRole === 'teacher' || userRole === 'admin') {
                    actionBtn = `<button class="btn btn-return" onclick="returnBook('${id}', '${b.title}', '${b.issuedToName}')">Return</button>`;
                } else {
                    actionBtn = `<span style="color:#aaa; font-size:0.8rem;">Checked Out</span>`;
                }

            } else {
                // Issue Logic: Logged in users can issue
                if (userRole) {
                    actionBtn = `<button class="btn btn-issue" onclick="issueBook('${id}', '${b.title}')">Issue</button>`;
                } else {
                    actionBtn = `<span style="color:#aaa; font-size:0.8rem;">Login to Issue</span>`;
                }
            }

            const row = `
                <tr>
                    <td><span style="font-weight:600; color:#555;">${b.cat}</span></td>
                    <td style="font-weight:600;">${b.title}</td>
                    <td>${b.author}</td>
                    <td>${statusBadge}</td>
                    <td class="text-end">${actionBtn}</td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    });
}

/* --- 3. FETCH NOTICES --- */
function fetchLibraryNotices() {
    const q = query(collection(db, "uploads"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('noticeContainer');
        if(!container) return;
        container.innerHTML = "";
        
        let count = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            // Filter manually for library notices
            if (data.category === 'library_notice') {
                count++;
                const time = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString() : 'Just now';
                container.innerHTML += `
                    <div class="lib-notice">
                        <h5>${data.title}</h5>
                        <small><i class="fa-regular fa-clock"></i> ${time}</small>
                        <p style="margin:5px 0 0 0; font-size:0.9rem; color:#555;">${data.desc}</p>
                    </div>
                `;
            }
        });

        if(count === 0) container.innerHTML = "<p style='text-align:center; color:#888;'>No recent activity.</p>";
    });
}

/* --- 4. ISSUE BOOK (Student Action) --- */
window.issueBook = async function(bookId, bookTitle) {
    if (!confirm(`Confirm issue for "${bookTitle}"?`)) return;

    try {
        const bookRef = doc(db, "library_books", bookId);
        
        await updateDoc(bookRef, {
            status: "issued",
            issuedTo: userID,
            issuedToName: userName,
            issuedDate: serverTimestamp()
        });

        alert("✅ Book Issued Successfully!");
    } catch (e) {
        alert("Error: " + e.message);
    }
};

/* --- 5. RETURN BOOK (Teacher Action) --- */
window.returnBook = async function(bookId, bookTitle, studentName) {
    if (!confirm(`Mark "${bookTitle}" as returned by ${studentName}?`)) return;

    try {
        const bookRef = doc(db, "library_books", bookId);
        
        // 1. Update Book Status
        await updateDoc(bookRef, {
            status: "available",
            issuedTo: null,
            issuedToName: null,
            issuedDate: null
        });

        // 2. Add Log to Notices
        await addDoc(collection(db, "uploads"), {
            title: "📖 Book Returned",
            category: "library_notice",
            desc: `"${bookTitle}" was returned by ${studentName}.`,
            author: "System",
            timestamp: serverTimestamp()
        });

        alert("✅ Book Returned & Logged!");
    } catch (e) {
        alert("Error: " + e.message);
    }
};

/* --- 6. UI HELPERS --- */
window.openNotesModal = function() {
    // Check if Bootstrap is loaded
    if(typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(document.getElementById('notesModal'));
        modal.show();
    } else {
        alert("Bootstrap JS not loaded.");
    }
};

window.filterBooks = function() {
    const term = document.getElementById('bookSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#bookTableBody tr');
    
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
};