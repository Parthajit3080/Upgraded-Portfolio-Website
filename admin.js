import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    getDoc,
    updateDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyC3VAj6pHUPZOrOVoWti64EZgVt0wDEqYE",
    authDomain: "parthajit-portfolio.firebaseapp.com",
    projectId: "parthajit-portfolio",
    storageBucket: "parthajit-portfolio.firebasestorage.app",
    messagingSenderId: "368597265378",
    appId: "1:368597265378:web:8b1352aac8da9dd2ada7bb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* =========================
   🔹 EDITING STATE
========================= */
let editingProjectId = null;
let editingCertificateId = null;
let editingAchievementId = null;
let editingResearchId = null;


document.addEventListener("DOMContentLoaded", () => {

    const loginSection = document.getElementById("loginSection");
    const adminPanel = document.getElementById("adminPanel");

    // 🔐 LOGIN
    document.getElementById("loginBtn").addEventListener("click", async () => {
        const email = document.getElementById("adminEmail").value.trim();
        const password = document.getElementById("adminPassword").value.trim();

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error(error);
            alert("Login Failed");
        }
    });

    // 🔓 LOGOUT
    document.getElementById("logoutBtn").addEventListener("click", async () => {
        await signOut(auth);
    });

    // 👀 AUTH STATE
    onAuthStateChanged(auth, (user) => {
    const loginTitle = document.getElementById("adminLoginTitle");

    if (user) {
        loginSection.style.display = "none";
        adminPanel.style.display = "block";
        if (loginTitle) loginTitle.style.display = "none";

        loadMessages();
        loadProjects();
        loadCertificates();
        loadSkills();
        loadAchievements();
        loadResearch();
        loadGalleryEvents();
    } else {
        loginSection.style.display = "block";
        adminPanel.style.display = "none";
        if (loginTitle) loginTitle.style.display = "block";
    }
});


    function setupEmojiPicker(pickerId, inputId) {
        const picker = document.getElementById(pickerId);
        const input = document.getElementById(inputId);

        if (!picker || !input) return; // safety

        picker.querySelectorAll("span").forEach(span => {
            span.addEventListener("click", () => {

                // remove previous selection
                picker.querySelectorAll("span").forEach(s => s.classList.remove("active"));

                // set new
                span.classList.add("active");
                input.value = span.dataset.icon;
            });
        });
    }

    // initialize
    setupEmojiPicker("achievementIconPicker", "achievementIcon");
    setupEmojiPicker("researchIconPicker", "researchIcon");


});

    // ➕ ADD PROJECT
document.getElementById("addProjectBtn").addEventListener("click", async () => {

    const title = document.getElementById("projectTitle").value.trim();
    const shortDesc = document.getElementById("shortDesc").value.trim();
    const description = document.getElementById("projectFullDesc").value.trim();
    const techStack = document.getElementById("projectTechStack").value.trim();
    const dataset = document.getElementById("projectDataset").value.trim();
    const github = document.getElementById("projectGithub").value.trim();
    const paper = document.getElementById("projectPaper").value.trim();
    const screenshotsInput = document.getElementById("projectScreenshots").value.trim();
    const fileName = document.getElementById("projectFileName").value.trim();

    if (!title || !description) {
        alert("Title and Description are required");
        return;
    }

    const screenshots = screenshotsInput
        ? screenshotsInput.split(",").map(s => s.trim())
        : [];

    try {

        // 🔁 UPDATE MODE
        if (editingProjectId) {

            await updateDoc(doc(db, "projects", editingProjectId), {
                title,
                shortDesc,
                description,
                techStack: techStack || null,
                dataset: dataset || null,
                github: github || null,
                paper: paper || null,
                screenshots,
                fileName: fileName || null,
                updatedAt: new Date()
            });

            editingProjectId = null;
            document.getElementById("addProjectBtn").textContent = "Add Project";
            loadProjects();
            alert("Project Updated");
            return;
        }

        // ➕ ADD MODE (THIS WAS MISSING)
        await addDoc(collection(db, "projects"), {
            title,
            shortDesc,
            description,
            techStack: techStack || null,
            dataset: dataset || null,
            github: github || null,
            paper: paper || null,
            screenshots,
            fileName: fileName || null,
            createdAt: new Date()
        });

        alert("Project Added Successfully");

        // Clear form
        document.getElementById("projectTitle").value = "";
        document.getElementById("shortDesc").value = "";
        document.getElementById("projectFullDesc").value = "";
        document.getElementById("projectTechStack").value = "";
        document.getElementById("projectDataset").value = "";
        document.getElementById("projectGithub").value = "";
        document.getElementById("projectPaper").value = "";
        document.getElementById("projectScreenshots").value = "";
        document.getElementById("projectFileName").value = "";

        loadProjects();

    } catch (error) {
        console.error(error);
        alert("Error adding project");
    }

});
// ➕ ADD CERTIFICATE
document.getElementById("addCertBtn").addEventListener("click", async () => {

    const title = document.getElementById("certTitle").value.trim();
    const issuer = document.getElementById("certIssuer").value.trim();
    const fileName = document.getElementById("certFileName").value.trim();

    if (!title || !issuer || !fileName) {
        alert("Fill all fields");
        return;
    }

    // 🔁 UPDATE MODE
    if (editingCertificateId) {

        await updateDoc(doc(db, "certificates", editingCertificateId), {
            title,
            issuer,
            fileName,
            updatedAt: new Date()
        });

        editingCertificateId = null;
        document.getElementById("addCertBtn").textContent = "Add Certificate";

        loadCertificates();
        alert("Certificate Updated");
        return;
    }

    // ➕ ADD MODE
    await addDoc(collection(db, "certificates"), {
        title,
        issuer,
        fileName,
        createdAt: new Date()
    });

    alert("Certificate Added");

    document.getElementById("certTitle").value = "";
    document.getElementById("certIssuer").value = "";
    document.getElementById("certFileName").value = "";

    loadCertificates();
});

    // ➕ ADD SKILL (NEW STRUCTURE)
    document.getElementById("addSkillBtn").addEventListener("click", async () => {
        const name = document.getElementById("skillName").value.trim();
        const icon = document.getElementById("skillIcon").value.trim();

        if (!name) {
            alert("Enter skill name");
            return;
        }

        await addDoc(collection(db, "skills"), {
            name,
            icon,
            createdAt: new Date()
        });

        alert("Skill Added");
        document.getElementById("skillName").value = "";
        document.getElementById("skillIcon").value = "";
        loadSkills();
    });


// ➕ ADD ACHIEVEMENT
document.getElementById("addAchievementBtn").addEventListener("click", async () => {

    const icon = document.getElementById("achievementIcon").value.trim();
    const title = document.getElementById("achievementTitle").value.trim();
    const subtitle = document.getElementById("achievementSubtitle").value.trim();
    const description = document.getElementById("achievementDesc").value.trim();
    const year = document.getElementById("achievementYear").value.trim();

    if (!title) {
        alert("Enter title");
        return;
    }

    try {

        // 🔁 UPDATE MODE
        if (editingAchievementId) {

            await updateDoc(doc(db, "achievements", editingAchievementId), {
                icon: icon || null,
                title,
                subtitle: subtitle || null,
                description: description || null,
                year: year || null,
                updatedAt: new Date()
            });

            editingAchievementId = null;
            document.getElementById("addAchievementBtn").textContent = "Add Achievement";
            loadAchievements();
            alert("Achievement Updated");
            return;
        }

        // ➕ ADD MODE
        await addDoc(collection(db, "achievements"), {
            icon: icon || null,
            title,
            subtitle: subtitle || null,
            description: description || null,
            year: year || null,
            createdAt: new Date()
        });

        alert("Achievement Added");

        // 🧹 Clear fields
        document.getElementById("achievementIcon").value = "";
        document.getElementById("achievementTitle").value = "";
        document.getElementById("achievementSubtitle").value = "";
        document.getElementById("achievementDesc").value = "";
        document.getElementById("achievementYear").value = "";

        loadAchievements();

    } catch (error) {
        console.error(error);
        alert("Error adding achievement");
    }
});

// ➕ ADD RESEARCH
document.getElementById("addResearchBtn").addEventListener("click", async () => {

    const icon = (document.getElementById("researchIcon").value || "").trim();
    const title = document.getElementById("researchTitle").value.trim();
    const subtitle = document.getElementById("researchSubtitle").value.trim();
    const description = document.getElementById("researchDesc").value.trim();
    const paper = document.getElementById("researchPaper").value.trim();
    const github = document.getElementById("researchGithub").value.trim();

    if (!title) {
        alert("Enter title");
        return;
    }

    try {

        const researchData = {
            icon: icon || "🔬",   // ✅ fallback icon (important)
            title,
            subtitle: subtitle || "",
            description: description || "",
            paper: paper || "",
            github: github || "",
            updatedAt: new Date()
        };

        // 🔁 UPDATE MODE
        if (editingResearchId) {

            await updateDoc(doc(db, "research", editingResearchId), researchData);

            editingResearchId = null;
            document.getElementById("addResearchBtn").textContent = "Add Research";

            loadResearch();
            alert("Research Updated");
            return;
        }

        // ➕ ADD MODE
        await addDoc(collection(db, "research"), {
            ...researchData,
            createdAt: new Date()
        });

        alert("Research Added");

        // 🧹 Clear fields
        document.getElementById("researchIcon").value = "";
        document.getElementById("researchTitle").value = "";
        document.getElementById("researchSubtitle").value = "";
        document.getElementById("researchDesc").value = "";
        document.getElementById("researchPaper").value = "";
        document.getElementById("researchGithub").value = "";

        // 🧹 REMOVE ACTIVE EMOJI SELECTION (IMPORTANT)
        document.querySelectorAll("#researchIconPicker span")
            .forEach(s => s.classList.remove("active"));

        loadResearch();

    } catch (error) {
        console.error("Research Error:", error);
        alert("Error adding/updating research");
    }
});





// 📩 LOAD MESSAGES
async function loadMessages() {
    const container = document.getElementById("messagesContainer");
    if (!container) return;

    container.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "messages"));

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        container.innerHTML += `
            <div class="message-card">
                <button class="message-delete" onclick="deleteMessage('${id}')">
                    Delete
                </button>

                <div class="message-name">
                    ${data.name || "No Name"}
                </div>

                <div class="message-email">
                    ${data.email || "No Email"}
                </div>

                <div class="message-text">
                    ${data.message || ""}
                </div>
            </div>
        `;
    });
}

// 📦 LOAD PROJECTS (Admin View)
async function loadProjects() {
    const querySnapshot = await getDocs(collection(db, "projects"));
    const container = document.getElementById("adminProjectsContainer");
    if (!container) return;

    container.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        container.innerHTML += `
            <div class="project-admin-card">
                <div class="project-admin-content">
                    <div class="project-admin-title">
                        ${data.title}
                    </div>
                    <div class="project-admin-file">
                        ${data.fileName || "No file attached"}
                    </div>
                </div>

                <div class="project-admin-actions">
                    <button class="edit-btn" onclick="editProject('${id}')">Edit</button>
                    <button class="delete-btn" onclick="deleteProject('${id}')">Delete</button>
                </div>
            </div>
        `;
    });
}


// 📜 LOAD CERTIFICATES (Admin View - Compact Grid)
async function loadCertificates() {
    const querySnapshot = await getDocs(collection(db, "certificates"));
    const container = document.getElementById("adminCertificatesContainer");
    if (!container) return;

    container.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        container.innerHTML += `
            <div class="certificate-admin-card">
                <div class="certificate-admin-content">
                    <div class="certificate-admin-title">
                        ${data.title}
                    </div>
                    <div class="certificate-admin-issuer">
                        ${data.issuer || "No issuer"}
                    </div>
                </div>

                <div class="certificate-admin-actions">
                    <button class="edit-btn" onclick="editCertificate('${id}')">Edit</button>
                    <button class="delete-btn" onclick="deleteCertificate('${id}')">Delete</button>
                </div>
            </div>
        `;
    });
}


// 📚 LOAD SKILLS (NEW STRUCTURE)
async function loadSkills() {
    const container = document.getElementById("adminSkillsContainer");
    if (!container) return;

    container.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "skills"));

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        container.innerHTML += `
            <div class="skill-admin-card">
                <span>${data.icon || "⚡"}</span>
                <span>${data.name}</span>
                <button onclick="deleteSkill('${id}')">×</button>
            </div>
        `;
    });
}

// 🏆 LOAD ACHIEVEMENTS
async function loadAchievements() {
    const container = document.getElementById("adminAchievementsContainer");
    if (!container) return;

    container.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "achievements"));

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

       container.innerHTML += `
<div class="message-card">

    <button class="message-delete" onclick="deleteAchievement('${id}')">
        Delete
    </button>

    <div class="message-name">
        ${data.icon || "🏆"} ${data.title}
    </div>

    <div class="message-email">
        ${data.subtitle || ""} ${data.year ? " • " + data.year : ""}
    </div>

    <div class="message-text">
        ${data.description || ""}
    </div>

    <button class="edit-btn" style="margin-top:10px;" 
        onclick="editAchievement('${id}')">
        Edit
    </button>

</div>
`;
    });
}


// 🔬 LOAD RESEARCH
async function loadResearch() {
    const container = document.getElementById("adminResearchContainer");
    if (!container) return;

    container.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "research"));

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        container.innerHTML += `
<div class="message-card">

    <button class="message-delete" onclick="deleteResearch('${id}')">
        Delete
    </button>

    <div class="message-name">
        ${data.icon || "🔬"} ${data.title}
    </div>

    <div class="message-email">
        ${data.subtitle || ""}
    </div>

    <div class="message-text">
        ${data.description || ""}
    </div>

    <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
        ${
            data.paper 
            ? `<a href="${data.paper}" target="_blank" class="btn-small">Paper</a>` 
            : ""
        }

        ${
            data.github 
            ? `<a href="${data.github}" target="_blank" class="btn-small">GitHub</a>` 
            : ""
        }
    </div>

    <button class="edit-btn" style="margin-top:10px;" 
        onclick="editResearch('${id}')">
        Edit
    </button>

</div>
`;
    });
}






// ❌ DELETE FUNCTIONS
window.deleteProject = async function(id) {
    await deleteDoc(doc(db, "projects", id));
    alert("Project Deleted");
    loadProjects();
};

window.deleteCertificate = async function(id) {
    await deleteDoc(doc(db, "certificates", id));
    alert("Certificate Deleted");
    loadCertificates();
};

window.deleteSkill = async function(id) {
    await deleteDoc(doc(db, "skills", id));
    alert("Skill Deleted");
    loadSkills();
};

window.deleteAchievement = async function(id) {
    await deleteDoc(doc(db, "achievements", id));
    loadAchievements();
};

window.deleteResearch = async function(id) {
    await deleteDoc(doc(db, "research", id));
    loadResearch();
};



// ❌ EDIT FUNCTIONS

window.editProject = async function(id) {

    const docSnap = await getDoc(doc(db, "projects", id));
    if (!docSnap.exists()) return;

    const data = docSnap.data();

    document.getElementById("projectTitle").value = data.title || "";
    document.getElementById("shortDesc").value = data.shortDesc || "";
    document.getElementById("projectFullDesc").value = data.description || "";
    document.getElementById("projectTechStack").value = data.techStack || "";
    document.getElementById("projectDataset").value = data.dataset || "";
    document.getElementById("projectGithub").value = data.github || "";
    document.getElementById("projectPaper").value = data.paper || "";
    document.getElementById("projectScreenshots").value =
        data.screenshots ? data.screenshots.join(", ") : "";
    document.getElementById("projectFileName").value = data.fileName || "";

    editingProjectId = id;

    document.getElementById("addProjectBtn").textContent = "Update Project";
};


window.editCertificate = async function(id) {

    const docSnap = await getDoc(doc(db, "certificates", id));
    if (!docSnap.exists()) return;

    const data = docSnap.data();

    document.getElementById("certTitle").value = data.title || "";
    document.getElementById("certIssuer").value = data.issuer || "";
    document.getElementById("certFileName").value = data.fileName || "";

    editingCertificateId = id;

    document.getElementById("addCertBtn").textContent = "Update Certificate";
};

window.editAchievement = async function(id) {
    const docSnap = await getDoc(doc(db, "achievements", id));
    const data = docSnap.data();

    document.getElementById("achievementIcon").value = data.icon || "";
document.getElementById("achievementTitle").value = data.title || "";
document.getElementById("achievementSubtitle").value = data.subtitle || "";
document.getElementById("achievementDesc").value = data.description || "";
document.getElementById("achievementYear").value = data.year || "";

    editingAchievementId = id;
    document.getElementById("addAchievementBtn").textContent = "Update Achievement";
};

window.editResearch = async function(id) {
    const docSnap = await getDoc(doc(db, "research", id));
    const data = docSnap.data();

   const icon = document.getElementById("researchIcon").value.trim();
const title = document.getElementById("researchTitle").value.trim();
const subtitle = document.getElementById("researchSubtitle").value.trim();
const description = document.getElementById("researchDesc").value.trim();
const paper = document.getElementById("researchPaper").value.trim();
const github = document.getElementById("researchGithub").value.trim();

    editingResearchId = id;
    document.getElementById("addResearchBtn").textContent = "Update Research";
};







window.deleteMessage = async function(id) {
    await deleteDoc(doc(db, "messages", id));
    loadMessages();
};

/* =========================
   GALLERY SECTION
========================= */

const galleryForm = document.getElementById("galleryForm");
const galleryList = document.getElementById("galleryList");

let editingGalleryId = null;

/* =========================
   LOAD GALLERY
========================= */

async function loadGalleryEvents() {

    if (!galleryList) return;

    galleryList.innerHTML = "";

    const q = query(
        collection(db, "gallery"),
        orderBy("order", "asc")
    );

    const snapshot =
        await getDocs(q);

    snapshot.forEach((docSnap) => {

        const data = docSnap.data();

        const div = document.createElement("div");

        div.className = "gallery-admin-card";

        div.innerHTML = `

    <h3>${data.title}</h3>

    <div class="gallery-meta">
        📅 ${data.date} &nbsp; | &nbsp; 🔢 ${data.order || 999}
    </div>

    <p class="gallery-desc">
        ${
            data.description.length > 120
            ? data.description.substring(0,120) + "..."
            : data.description
        }
    </p>

    <div class="gallery-image-count">
        📷 ${(data.images || []).length} Images
    </div>

    <div class="gallery-admin-actions">

        <button
            class="gallery-edit-btn"
            onclick="editGallery('${docSnap.id}')">
            Edit
        </button>

        <button
            class="gallery-delete-btn"
            onclick="deleteGallery('${docSnap.id}')">
            Delete
        </button>

    </div>

`;

        galleryList.appendChild(div);
    });
}

/* =========================
   ADD / UPDATE GALLERY
========================= */

if (galleryForm) {

    galleryForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const title =
            document.getElementById("galleryTitle").value.trim();

        const date =
            document.getElementById("galleryDate").value.trim();
        
        const order =
            parseInt(
                document.getElementById("galleryOrder").value
            ) || 999;

        const description =
            document.getElementById("galleryDescription").value.trim();

        const images =
            document.getElementById("galleryImages")
            .value
            .split(",")
            .map(img => img.trim())
            .filter(img => img !== "");

        const galleryData = {
            title,
            date,
            description,
            images,
            order,
            updatedAt: new Date()
        };

        try {
            
            console.log(
                "Submit Clicked. editingGalleryId =",
                editingGalleryId
            );
            // 🔁 UPDATE MODE
            if (editingGalleryId) {

                await updateDoc(
                    doc(db, "gallery", editingGalleryId),
                    galleryData
                );

                editingGalleryId = null;

                document.getElementById("addGalleryBtn")
                    .textContent = "Add Gallery Event";

                alert("Gallery Event Updated");

            } else {

                // ➕ ADD MODE
                await addDoc(
                    collection(db, "gallery"),
                    {
                        ...galleryData,
                        createdAt: new Date()
                    }
                );

                alert("Gallery Event Added");
            }

            galleryForm.reset();

            loadGalleryEvents();

        } catch (error) {

            console.error(error);
            alert("Error saving gallery event");
        }
    });
}

/* =========================
   DELETE GALLERY
========================= */

window.deleteGallery = async function(id) {

    const confirmDelete =
        confirm("Delete this gallery event?");

    if (!confirmDelete) return;

    await deleteDoc(doc(db, "gallery", id));

    loadGalleryEvents();
};

/* =========================
   EDIT GALLERY
========================= */

window.editGallery = async function(id) {

    const docSnap =
        await getDoc(doc(db, "gallery", id));

    if (!docSnap.exists()) return;

    const data = docSnap.data();

    document.getElementById("galleryTitle").value =
        data.title || "";

    document.getElementById("galleryDate").value =
        data.date || "";
    
    document.getElementById("galleryOrder").value =
        data.order || "";

    document.getElementById("galleryDescription").value =
        data.description || "";

    document.getElementById("galleryImages").value =
        (data.images || []).join(", ");

    editingGalleryId = id;

    console.log("Editing Gallery:", id);
    console.log("editingGalleryId =", editingGalleryId);

    document.getElementById("addGalleryBtn")
        .textContent = "Update Gallery Event";
};



/* =========================
   DELETE ALL GALLERY EVENTS
========================= */

const deleteAllGalleryBtn =
document.getElementById("deleteAllGalleryBtn");

if(deleteAllGalleryBtn){

    deleteAllGalleryBtn.addEventListener(
        "click",
        async ()=>{

            const confirmDelete = confirm(
                "Delete ALL gallery events permanently?"
            );

            if(!confirmDelete) return;

            try{

                const snapshot =
                    await getDocs(
                        collection(db,"gallery")
                    );

                for(const docSnap of snapshot.docs){

                    await deleteDoc(
                        doc(
                            db,
                            "gallery",
                            docSnap.id
                        )
                    );
                }

                alert("All gallery events deleted.");

                loadGalleryEvents();

            }catch(error){

                console.error(error);

                alert(
                    "Error deleting gallery events."
                );
            }
        }
    );
}

/* =========================
   INITIAL LOAD
========================= */
