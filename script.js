import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./js/firebase.js";
import { escapeHtml, safeAssetFilename, safeExternalUrl } from "./js/safe-content.js";
import { setupThemeToggle } from "./js/theme.js";
import { setupReveal } from "./js/reveal.js";

const $ = (selector, root = document) => root.querySelector(selector);
const byOrder = (left, right) =>
    (left.data.order ?? Number.MAX_SAFE_INTEGER) - (right.data.order ?? Number.MAX_SAFE_INTEGER);

function setState(container, message, kind = "empty") {
    container.innerHTML = `<p class="content-state" role="status" data-state="${kind}">${escapeHtml(message)}</p>`;
}

async function renderCollection(name, selector, renderItem, emptyMessage) {
    const container = $(selector);
    if (!container) return [];

    try {
        const snapshot = await getDocs(collection(db, name));
        const records = snapshot.docs
            .map(snapshotDoc => ({ id: snapshotDoc.id, data: snapshotDoc.data() }))
            .sort(byOrder);

        if (!records.length) {
            setState(container, emptyMessage);
            return records;
        }

        container.innerHTML = records.map(renderItem).join("");
        setupReveal(container);
        return records;
    } catch (error) {
        console.error(`Unable to load ${name}.`, error);
        setState(container, "This content is temporarily unavailable. Please try again later.", "error");
        return null;
    }
}

function assetPreview(folder, value, title) {
    const filename = safeAssetFilename(value);
    if (!filename) return "";
    const path = `${folder}/${filename}`;
    const escapedPath = escapeHtml(path);
    const extension = filename.split(".").pop().toLowerCase();
    const image = ["jpg", "jpeg", "png", "webp", "gif"].includes(extension);
    const content = image
        ? `<img src="${escapedPath}" alt="Preview of ${escapeHtml(title)}" loading="lazy">`
        : `<span class="preview-file">Preview ${escapeHtml(filename)} ↗</span>`;

    return `<button class="project-preview file-preview" type="button" data-preview-path="${escapedPath}" aria-label="Preview ${escapeHtml(title)}">${content}</button>`;
}

function projectPreview(value, title, screenshots = []) {
    const filename = safeAssetFilename(value);
    if (!filename) return "";

    const extension = filename.split(".").pop().toLowerCase();
    const videoTypes = { mp4: "video/mp4", webm: "video/webm", ogg: "video/ogg", ogv: "video/ogg" };
    const mimeType = videoTypes[extension];
    if (!mimeType) return assetPreview("assets/projects", filename, title);

    const fallbackImage = (Array.isArray(screenshots) ? screenshots : [])
        .map(safeAssetFilename)
        .find(imageName => ["jpg", "jpeg", "png", "webp", "gif"].includes(imageName.split(".").pop().toLowerCase()));
    const videoPath = escapeHtml(`assets/projects/${filename}`);
    const posterPath = fallbackImage ? escapeHtml(`assets/projects/${fallbackImage}`) : "";
    return `
        <div class="project-preview project-preview-video">
            <video class="project-preview-media project-video" muted loop playsinline preload="none"${posterPath ? ` poster="${posterPath}"` : ""} data-fallback-src="${posterPath}" data-preview-title="${escapeHtml(title)}" aria-label="Video preview of ${escapeHtml(title)}">
                <source src="${videoPath}" type="${mimeType}">
            </video>
            <span class="preview-video-badge" aria-hidden="true">VIDEO</span>
        </div>`;
}

function setupProjectVideoPreviews() {
    const videos = Array.from(document.querySelectorAll("#projectsContainer .project-video"));
    if (!videos.length) return;
    const visibleVideos = new Set();
    let observer = null;

    const fallbackVideo = video => {
        const frame = video.closest(".project-preview");
        if (!frame) return;
        visibleVideos.delete(video);
        observer?.unobserve(video);
        const fallbackPath = video.dataset.fallbackSrc;
        if (fallbackPath) {
            const image = document.createElement("img");
            image.src = fallbackPath;
            image.alt = `${video.dataset.previewTitle || "Project"} preview image`;
            image.loading = "lazy";
            image.addEventListener("error", () => {
                const message = document.createElement("span");
                message.className = "preview-file";
                message.textContent = "Project preview unavailable";
                frame.replaceChildren(message);
            }, { once: true });
            frame.replaceChildren(image);
            frame.classList.remove("project-preview-video");
            return;
        }

        const message = document.createElement("span");
        message.className = "preview-file";
        message.textContent = "Video preview unavailable";
        frame.replaceChildren(message);
        frame.classList.remove("project-preview-video");
    };

    videos.forEach(video => video.addEventListener("error", () => fallbackVideo(video), { once: true }));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        videos.forEach(video => { video.controls = true; });
        return;
    }

    const playVideo = video => {
        if (document.hidden || !video.paused) return;
        video.playbackRate = 1.5;
        const playback = video.play();
        playback?.catch(() => { video.controls = true; });
    };

    if (!("IntersectionObserver" in window)) {
        videos.forEach(video => {
            const bounds = video.getBoundingClientRect();
            if (bounds.bottom > 0 && bounds.top < window.innerHeight) playVideo(video);
        });
        return;
    }

    observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
                visibleVideos.add(video);
                playVideo(video);
            } else {
                visibleVideos.delete(video);
                video.pause();
            }
        });
    }, { threshold: [0, 0.55] });

    videos.forEach(video => observer.observe(video));
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) videos.forEach(video => video.pause());
        else visibleVideos.forEach(playVideo);
    });
}

async function loadProjects() {
    const records = await renderCollection("projects", "#projectsContainer", ({ id, data }) => `
        <article class="project-item">
            ${projectPreview(data.fileName, data.title || "project", data.screenshots)}
            <p class="section-kicker">Selected work</p>
            <h3>${escapeHtml(data.title || "Untitled project")}</h3>
            <p>${escapeHtml(data.shortDesc || "")}</p>
            <a class="details-btn" href="project.html?id=${encodeURIComponent(id)}">Read project notes <span aria-hidden="true">↗</span></a>
        </article>
    `, "Project details will appear here when available.");

    const track = $("#projectsContainer");
    const carousel = $("#projectsCarousel");
    const previous = $("#projectPrev");
    const next = $("#projectNext");
    const toggle = $("#toggleViewBtn");
    const canBrowse = Boolean(records && records.length > 1);
    setupProjectVideoPreviews();
    if (toggle) toggle.hidden = !canBrowse;
    if (previous) previous.hidden = !canBrowse;
    if (next) next.hidden = !canBrowse;
    if (!track || !canBrowse) return;

    const updateArrows = () => {
        const expanded = track.classList.contains("is-expanded");
        if (previous) previous.disabled = expanded || track.scrollLeft <= 1;
        if (next) next.disabled = expanded || track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    };
    const scrollBehavior = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    previous?.addEventListener("click", () => track.scrollBy({ left: -track.clientWidth, behavior: scrollBehavior() }));
    next?.addEventListener("click", () => track.scrollBy({ left: track.clientWidth, behavior: scrollBehavior() }));
    track.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    updateArrows();

    toggle.textContent = "See all projects";
    toggle.setAttribute("aria-expanded", "false");
    toggle.onclick = () => {
        const expanded = track.classList.toggle("is-expanded");
        carousel?.classList.toggle("is-expanded", expanded);
        toggle.textContent = expanded ? "View carousel" : "See all projects";
        toggle.setAttribute("aria-expanded", String(expanded));
        if (!expanded) track.scrollTo({ left: 0, behavior: scrollBehavior() });
        requestAnimationFrame(updateArrows);
    };
}

async function loadCertificates() {
    const records = await renderCollection("certificates", "#certificatesContainer", ({ data }) => `
        <article class="certificate-item">
            <h3>${escapeHtml(data.title || "Certificate")}</h3>
            <p>${escapeHtml(data.issuer || "")}</p>
            ${assetPreview("assets/certificates", data.fileName, data.title || "certificate")}
        </article>
    `, "No certificates have been added yet.");

    const container = $("#certificatesContainer");
    const toggle = $("#certToggleBtn");
    if (toggle && container) {
        toggle.onclick = () => {
            const grid = container.classList.toggle("cert-grid");
            toggle.textContent = grid ? "View as a row" : "View as a grid";
        };
        toggle.hidden = !records?.length;
    }
    $("#certPrev")?.addEventListener("click", () => container?.scrollBy({ left: -300, behavior: "smooth" }));
    $("#certNext")?.addEventListener("click", () => container?.scrollBy({ left: 300, behavior: "smooth" }));
}

async function loadSkills() {
    await renderCollection("skills", "#skillsContainer", ({ data }) => `
        <div class="skill-pill"><span aria-hidden="true">${escapeHtml(data.icon || "•")}</span><span>${escapeHtml(data.name || "")}</span></div>
    `, "No skills have been added yet.");
}

async function loadAchievements() {
    const records = await renderCollection("achievements", "#achievementsContainer", ({ data }) => `
        <article class="achievement-card">
            <div class="ach-icon" aria-hidden="true">${escapeHtml(data.icon || "•")}</div>
            <h3>${escapeHtml(data.title || "")}</h3>
            ${data.subtitle ? `<p class="ach-main">${escapeHtml(data.subtitle)}</p>` : ""}
            ${data.description ? `<p class="ach-sub">${escapeHtml(data.description)}</p>` : ""}
        </article>
    `, "No achievements have been added yet.");

    const toggle = $("#achievementsToggleBtn");
    if (toggle && records?.length) {
        const cards = Array.from(document.querySelectorAll("#achievementsContainer .achievement-card"));
        let expanded = false;
        toggle.hidden = cards.length <= 6;
        cards.forEach((card, index) => { card.hidden = index >= 6; });
        toggle.textContent = "See all achievements";
        toggle.onclick = () => {
            expanded = !expanded;
            cards.forEach((card, index) => { card.hidden = !expanded && index >= 6; });
            toggle.textContent = expanded ? "Show fewer achievements" : "See all achievements";
        };
    } else if (toggle) toggle.hidden = true;
}

async function loadResearch() {
    await renderCollection("research", "#researchContainer", ({ data }) => {
        const paper = safeExternalUrl(data.paper);
        const github = safeExternalUrl(data.github);
        return `
            <article class="research-card">
                <div class="research-icon" aria-hidden="true">${escapeHtml(data.icon || "•")}</div>
                <h3>${escapeHtml(data.title || "")}</h3>
                ${data.subtitle ? `<p class="research-main">${escapeHtml(data.subtitle)}</p>` : ""}
                ${data.description ? `<p class="research-sub">${escapeHtml(data.description)}</p>` : ""}
                <div class="research-links">
                    ${paper ? `<a class="btn-small" href="${escapeHtml(paper)}" target="_blank" rel="noopener noreferrer">Read paper ↗</a>` : ""}
                    ${github ? `<a class="btn-small" href="${escapeHtml(github)}" target="_blank" rel="noopener noreferrer">Source ↗</a>` : ""}
                </div>
            </article>`;
    }, "Research notes will appear here when available.");
}

function setupFileModal() {
    const modal = $("#fileModal");
    const body = $("#modalBody");
    const close = $("#closeModal");
    let previousFocus = null;
    if (!modal || !body || !close) return;

    const closeModal = () => {
        modal.setAttribute("aria-hidden", "true");
        modal.style.display = "none";
        body.replaceChildren();
        previousFocus?.focus();
    };

    document.addEventListener("click", event => {
        const trigger = event.target.closest("[data-preview-path]");
        if (!trigger) return;
        const filename = safeAssetFilename(trigger.dataset.previewPath);
        if (!filename) return;

        previousFocus = trigger;
        const path = trigger.dataset.previewPath.startsWith("assets/certificates/")
            ? `assets/certificates/${filename}`
            : `assets/projects/${filename}`;
        const extension = filename.split(".").pop().toLowerCase();
        if (extension === "pdf") {
            const frame = document.createElement("iframe");
            frame.src = path;
            frame.title = `Preview of ${filename}`;
            body.append(frame);
        } else {
            const image = document.createElement("img");
            image.src = path;
            image.alt = `Preview of ${filename}`;
            body.append(image);
        }
        modal.style.display = "flex";
        modal.setAttribute("aria-hidden", "false");
        close.focus();
    });
    close.addEventListener("click", closeModal);
    modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && modal.getAttribute("aria-hidden") === "false") closeModal(); });
}

function setupContactForm() {
    const form = $("#contactForm");
    const status = $("#contactStatus");
    const button = form?.querySelector("[type=submit]");
    if (!form || !status || !button) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const values = new FormData(form);
        const name = String(values.get("name") || "").trim();
        const email = String(values.get("email") || "").trim();
        const message = String(values.get("message") || "").trim();
        if (!name || !email || !message) return;

        status.textContent = "Sending your note…";
        status.dataset.state = "pending";
        button.disabled = true;
        try {
            await addDoc(collection(db, "messages"), { name, email, message, createdAt: new Date() });
            status.textContent = "Your message was sent. Thank you for reaching out.";
            status.dataset.state = "success";
            form.reset();
        } catch (error) {
            console.error("Unable to send contact message.", error);
            status.textContent = "The message could not be sent. Please email me directly instead.";
            status.dataset.state = "error";
        } finally {
            button.disabled = false;
        }
    });
}

function setupActiveNavigation() {
    const links = Array.from(document.querySelectorAll('header nav a[href^="#"]'));
    const observed = links
        .map(link => ({ link, section: document.getElementById(link.hash.slice(1)) }))
        .filter(item => item.section);
    if (!observed.length || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(entries => {
        const current = entries.filter(entry => entry.isIntersecting)
            .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (!current) return;
        observed.forEach(({ link, section }) => {
            const active = section === current.target;
            link.classList.toggle("nav-active", active);
            if (active) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        });
    }, { rootMargin: "-20% 0px -65% 0px", threshold: [0, .2, .5] });

    observed.forEach(({ section }) => observer.observe(section));
}

document.addEventListener("DOMContentLoaded", async () => {
    setupThemeToggle($("#themeToggle"));
    setupFileModal();
    setupContactForm();
    setupActiveNavigation();
    setupReveal();
    const year = $("#currentYear");
    if (year) year.textContent = String(new Date().getFullYear());

    const loaders = [loadProjects, loadCertificates, loadSkills, loadAchievements, loadResearch];
    await Promise.allSettled(loaders.map(load => load()));
});
