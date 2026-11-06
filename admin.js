import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    getDoc,
    updateDoc,
    writeBatch,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth, db } from "./js/firebase.js";
import { escapeHtml, safeExternalUrl, safeAssetFilename, safeGalleryPath, safeDocumentId } from "./js/safe-content.js";

const projectPreviewExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm", "ogg", "ogv", "pdf"]);
const projectResultExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm", "ogg", "ogv"]);

/* =========================
   🔹 EDITING STATE
========================= */
let editingProjectId = null;
let editingCertificateId = null;
let editingAchievementId = null;
let editingResearchId = null;

function sortByDisplayOrder(documents) {
    return [...documents].filter(item => safeDocumentId(item.id)).sort((a, b) => {
        const orderA = a.data().order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.data().order ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB || a.id.localeCompare(b.id);
    });
}

async function nextDisplayOrder(collectionName) {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.size;
}

window.moveContentItem = async function(collectionName, id, direction) {
    const allowedCollections = ["projects", "certificates", "achievements", "research"];
    id = safeDocumentId(id);
    if (!id || !allowedCollections.includes(collectionName) || ![-1, 1].includes(direction)) return;
    const snapshot = await getDocs(collection(db, collectionName));
    const documents = sortByDisplayOrder(snapshot.docs);
    const currentIndex = documents.findIndex(item => item.id === id);
    const destinationIndex = currentIndex + direction;

    if (currentIndex < 0 || destinationIndex < 0 || destinationIndex >= documents.length) return;

    [documents[currentIndex], documents[destinationIndex]] =
        [documents[destinationIndex], documents[currentIndex]];

    const batch = writeBatch(db);
    documents.forEach((item, index) => {
        batch.update(item.ref, { order: index });
    });
    await batch.commit();

    const loaders = {
        projects: loadProjects,
        certificates: loadCertificates,
        achievements: loadAchievements,
        research: loadResearch
    };
    loaders[collectionName]?.();
};

function reorderButtons(collectionName, id) {
    id = safeDocumentId(id);
    if (!id) return "";
    return `
        <button class="order-btn" title="Move up" onclick="moveContentItem('${collectionName}', '${id}', -1)">↑</button>
        <button class="order-btn" title="Move down" onclick="moveContentItem('${collectionName}', '${id}', 1)">↓</button>
    `;
}


document.addEventListener("DOMContentLoaded", () => {

    const loginSection = document.getElementById("loginSection");
    const adminPanel = document.getElementById("adminPanel");

    function showAdminSection(sectionName) {
        document.querySelectorAll("[data-admin-section]").forEach(section => {
            section.classList.toggle("is-active", section.dataset.adminSection === sectionName);
        });
        document.querySelectorAll("[data-admin-target]").forEach(button => {
            button.classList.toggle("is-active", button.dataset.adminTarget === sectionName);
        });
    }

    document.querySelectorAll("[data-admin-target]").forEach(button => {
        button.addEventListener("click", () => showAdminSection(button.dataset.adminTarget));
    });

    showAdminSection("projects");

    // 🔐 LOGIN
    loginSection.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!loginSection.reportValidity()) return;
        const email = document.getElementById("adminEmail").value.trim();
        const password = document.getElementById("adminPassword").value.trim();
        const status = document.getElementById("adminStatus");
        const submitButton = document.getElementById("loginBtn");
        status.textContent = "Signing in…";
        submitButton.disabled = true;

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Administrator sign-in failed.", error);
            status.textContent = "Sign-in failed. Check your credentials and try again.";
        } finally {
            submitButton.disabled = false;
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
    const githubInput = document.getElementById("projectGithub").value.trim();
    const paperInput = document.getElementById("projectPaper").value.trim();
    const github = githubInput ? safeExternalUrl(githubInput) : "";
    const paper = paperInput ? safeExternalUrl(paperInput) : "";
    const resultInputs = [
        document.getElementById("projectResult1").value.trim(),
        document.getElementById("projectResult2").value.trim()
    ];
    const screenshots = resultInputs.map(input => input ? safeAssetFilename(input) : "");
    const fileInput = document.getElementById("projectFileName").value.trim();
    const fileName = fileInput ? safeAssetFilename(fileInput) : "";

    if (!title || !description) {
        alert("Title and Description are required");
        return;
    }
    if ((githubInput && !github) || (paperInput && !paper)) {
        alert("Use HTTP(S) links for project URLs.");
        return;
    }
    if (fileInput && (!fileName || !projectPreviewExtensions.has(fileName.split(".").pop().toLowerCase()))) {
        alert("Preview must be an image, PDF, or MP4, WebM, or OGG file from the project assets folder.");
        return;
    }

    const invalidResult = screenshots.some((filename, index) => {
        if (!resultInputs[index]) return false;
        const extension = filename.split(".").pop().toLowerCase();
        return !filename || !projectResultExtensions.has(extension);
    });
    if (invalidResult) {
        alert("Each result must be an image or MP4, WebM, or OGG video filename from the project assets folder.");
        return;
    }

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
            order: await nextDisplayOrder("projects"),
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
        document.getElementById("projectResult1").value = "";
        document.getElementById("projectResult2").value = "";
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
    const fileInput = document.getElementById("certFileName").value.trim();
    const fileName = safeAssetFilename(fileInput);

    if (!title || !issuer || !fileName) {
        alert("Enter a title, issuer, and a valid certificate file name.");
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
        order: await nextDisplayOrder("certificates"),
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
            order: await nextDisplayOrder("achievements"),
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
    const paperInput = document.getElementById("researchPaper").value.trim();
    const githubInput = document.getElementById("researchGithub").value.trim();
    const paper = paperInput ? safeExternalUrl(paperInput) : "";
    const github = githubInput ? safeExternalUrl(githubInput) : "";

    if (!title) {
        alert("Enter title");
        return;
    }
    if ((paperInput && !paper) || (githubInput && !github)) {
        alert("Research links must use HTTP or HTTPS.");
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
            order: await nextDisplayOrder("research"),
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

    const toDate = value => {
        if (value?.toDate) return value.toDate();
        if (value instanceof Date) return value;
        if (Number.isFinite(value?.seconds)) return new Date(value.seconds * 1000);
        return null;
    };
    const messages = querySnapshot.docs
        .map(docSnap => ({ id: docSnap.id, data: docSnap.data() }))
        .sort((left, right) => (toDate(right.data.createdAt)?.getTime() || 0) - (toDate(left.data.createdAt)?.getTime() || 0));

    messages.forEach(({ id, data }) => {
        const sentAt = toDate(data.createdAt);
        const hasSentAt = sentAt && !Number.isNaN(sentAt.getTime());
        const sentLabel = hasSentAt
            ? `Sent ${sentAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
            : "Date unavailable";

        container.innerHTML += `
            <div class="message-card">
                <button class="message-delete" onclick="deleteMessage('${id}')">
                    Delete
                </button>

                <div class="message-name">
                    ${escapeHtml(data.name || "No Name")}
                </div>

                <div class="message-email">
                    ${escapeHtml(data.email || "No Email")}
                </div>

                <time class="message-date"${hasSentAt ? ` datetime="${escapeHtml(sentAt.toISOString())}"` : ""}>${escapeHtml(sentLabel)}</time>

                <div class="message-text">
                    ${escapeHtml(data.message || "")}
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

    sortByDisplayOrder(querySnapshot.docs).forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        container.innerHTML += `
            <div class="project-admin-card">
                <div class="project-admin-content">
                    <div class="project-admin-title">
                        ${escapeHtml(data.title)}
                    </div>
                    <div class="project-admin-file">
                        ${escapeHtml(data.fileName || "No file attached")}
                    </div>
                </div>

                <div class="project-admin-actions">
                    ${reorderButtons("projects", id)}
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

    sortByDisplayOrder(querySnapshot.docs).forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        container.innerHTML += `
            <div class="certificate-admin-card">
                <div class="certificate-admin-content">
                    <div class="certificate-admin-title">
                        ${escapeHtml(data.title)}
                    </div>
                    <div class="certificate-admin-issuer">
                        ${escapeHtml(data.issuer || "No issuer")}
                    </div>
                </div>

                <div class="certificate-admin-actions">
                    ${reorderButtons("certificates", id)}
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

    sortByDisplayOrder(querySnapshot.docs).forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        container.innerHTML += `
            <div class="skill-admin-card">
                <span>${escapeHtml(data.icon || "⚡")}</span>
                <span>${escapeHtml(data.name)}</span>
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

    sortByDisplayOrder(querySnapshot.docs).forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

       container.innerHTML += `
<article class="achievement-admin-card">
    <div class="achievement-admin-copy">
        <div class="message-name">${escapeHtml(data.icon || "🏆")} ${escapeHtml(data.title || "Untitled achievement")}</div>
        <div class="message-email">${escapeHtml(data.subtitle || "")}${data.year ? ` · ${escapeHtml(data.year)}` : ""}</div>
        ${data.description ? `<p class="achievement-admin-description">${escapeHtml(data.description)}</p>` : ""}
    </div>
    <div class="achievement-admin-actions">
        <button class="edit-btn" onclick="editAchievement('${id}')">Edit</button>
        <span class="reorder-actions">${reorderButtons("achievements", id)}</span>
        <button class="message-delete" onclick="deleteAchievement('${id}')">Delete</button>
    </div>
</article>
`;
    });
}


// 🔬 LOAD RESEARCH
async function loadResearch() {
    const container = document.getElementById("adminResearchContainer");
    if (!container) return;

    container.innerHTML = "";

    const querySnapshot = await getDocs(collection(db, "research"));

    sortByDisplayOrder(querySnapshot.docs).forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        container.innerHTML += `
<div class="message-card">

    <button class="message-delete" onclick="deleteResearch('${id}')">
        Delete
    </button>

    <div class="message-name">
        ${escapeHtml(data.icon || "🔬")} ${escapeHtml(data.title)}
    </div>

    <div class="message-email">
        ${escapeHtml(data.subtitle)}
    </div>

    <div class="message-text">
        ${escapeHtml(data.description)}
    </div>

    <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
        ${
            data.paper 
            ? `<a href="${escapeHtml(safeExternalUrl(data.paper))}" target="_blank" rel="noopener noreferrer" class="btn-small">Paper</a>` 
            : ""
        }

        ${
            data.github 
            ? `<a href="${escapeHtml(safeExternalUrl(data.github))}" target="_blank" rel="noopener noreferrer" class="btn-small">GitHub</a>` 
            : ""
        }
    </div>

    <button class="edit-btn" style="margin-top:10px;" 
        onclick="editResearch('${id}')">
        Edit
    </button>
    <span class="reorder-actions">${reorderButtons("research", id)}</span>

</div>
`;
    });
}






// ❌ DELETE FUNCTIONS
window.deleteProject = async function(id) {
    id = safeDocumentId(id);
    if (!id) return;
    await deleteDoc(doc(db, "projects", id));
    alert("Project Deleted");
    loadProjects();
};

window.deleteCertificate = async function(id) {
    id = safeDocumentId(id);
    if (!id) return;
    await deleteDoc(doc(db, "certificates", id));
    alert("Certificate Deleted");
    loadCertificates();
};

window.deleteSkill = async function(id) {
    id = safeDocumentId(id);
    if (!id) return;
    await deleteDoc(doc(db, "skills", id));
    alert("Skill Deleted");
    loadSkills();
};

window.deleteAchievement = async function(id) {
    id = safeDocumentId(id);
    if (!id) return;
    await deleteDoc(doc(db, "achievements", id));
    loadAchievements();
};

window.deleteResearch = async function(id) {
    id = safeDocumentId(id);
    if (!id) return;
    await deleteDoc(doc(db, "research", id));
    loadResearch();
};



// ❌ EDIT FUNCTIONS

window.editProject = async function(id) {
    id = safeDocumentId(id);
    if (!id) return;

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
    const existingResults = Array.isArray(data.screenshots)
        ? data.screenshots
        : typeof data.screenshots === "string" ? data.screenshots.split(",") : [];
    document.getElementById("projectResult1").value = existingResults[0] || "";
    document.getElementById("projectResult2").value = existingResults[1] || "";
    document.getElementById("projectFileName").value = data.fileName || "";

    editingProjectId = id;

    document.getElementById("addProjectBtn").textContent = "Update Project";
};


window.editCertificate = async function(id) {
    id = safeDocumentId(id);
    if (!id) return;

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
    id = safeDocumentId(id);
    if (!id) return;
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
    id = safeDocumentId(id);
    if (!id) return;
    const docSnap = await getDoc(doc(db, "research", id));
    const data = docSnap.data();

    document.getElementById("researchIcon").value = data.icon || "";
    document.getElementById("researchTitle").value = data.title || "";
    document.getElementById("researchSubtitle").value = data.subtitle || "";
    document.getElementById("researchDesc").value = data.description || "";
    document.getElementById("researchPaper").value = data.paper || "";
    document.getElementById("researchGithub").value = data.github || "";

    editingResearchId = id;
    document.getElementById("addResearchBtn").textContent = "Update Research";
};







window.deleteMessage = async function(id) {
    id = safeDocumentId(id);
    if (!id) return;
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

        const id = safeDocumentId(docSnap.id);
        if (!id) return;
        const div = document.createElement("div");

        div.className = "gallery-admin-card";

        div.innerHTML = `

    <div class="gallery-admin-header">
        <div>
            <h3>${escapeHtml(data.title || "Untitled event")}</h3>
            <div class="gallery-meta">📅 ${escapeHtml(data.date || "No date")} · Order ${Number(data.order) || 999}</div>
        </div>
        <div class="gallery-admin-actions">
            <button class="gallery-edit-btn" onclick="editGallery('${id}')">Edit</button>
            <button class="gallery-delete-btn" onclick="deleteGallery('${id}')">Delete</button>
        </div>
    </div>

    ${data.description ? `<p class="gallery-desc">${escapeHtml(String(data.description))}</p>` : ""}
    <div class="gallery-image-count">📷 ${(data.images || []).length} images</div>

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

        const coverImage =
            document.getElementById("galleryCoverImage").value.trim();

        const description =
            document.getElementById("galleryDescription").value.trim();

        const images =
            document.getElementById("galleryImages")
            .value
            .split(",")
            .map(img => img.trim())
            .filter(img => img !== "");
        const safeImages = images.map(safeGalleryPath).filter(Boolean);
        const coverInput = coverImage;
        const safeCover = coverInput ? safeGalleryPath(coverInput) : "";

        if (!title || !date || safeImages.length !== images.length || (coverInput && !safeCover)) {
            alert("Enter an event title and date, and use image paths inside assets/gallery/.");
            return;
        }

        const galleryData = {
            title,
            date,
            description,
            images: safeImages,
            coverImage: safeCover || safeImages[0] || "",
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
    id = safeDocumentId(id);
    if (!id) return;

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
    id = safeDocumentId(id);
    if (!id) return;

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

    document.getElementById("galleryCoverImage").value =
        data.coverImage || (data.images || [])[0] || "";

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
