import { escapeHtml, safeAssetFilename, safeExternalUrl } from "./js/safe-content.js";
import { setupThemeToggle } from "./js/theme.js";
import { setupReveal } from "./js/reveal.js";

const $ = (selector, root = document) => root.querySelector(selector);
const byOrder = (left, right) =>
    (left.data.order ?? Number.MAX_SAFE_INTEGER) - (right.data.order ?? Number.MAX_SAFE_INTEGER);
const allowedCategories = new Set(["Applied AI", "Computer Vision", "Systems"]);
let firebaseModules;

function getFirebaseModules() {
    if (!firebaseModules) {
        firebaseModules = Promise.all([
            import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"),
            import("./js/firebase.js")
        ]).then(([firestore, { db }]) => ({ ...firestore, db }))
            .catch(error => {
                firebaseModules = undefined;
                throw error;
            });
    }
    return firebaseModules;
}

function projectCategory(data) {
    if (allowedCategories.has(data.category)) return data.category;
    const text = `${data.title || ""} ${data.shortDesc || ""} ${data.description || ""}`.toLowerCase();
    if (/computer vision|visual|image (?:recognition|classification|segmentation)|agrivision/.test(text)) return "Computer Vision";
    if (/terminal|operating systems?|weather|shell|command.line|systems programming/.test(text)) return "Systems";
    return "Applied AI";
}

function projectLiveLink(value, title) {
    const url = safeExternalUrl(value);
    if (!url) return "";
    return `<a class="project-live-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="Visit ${escapeHtml(title)} live website in a new tab">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18M5 7.5h14M5 16.5h14"></path></svg>
        <span>Live site</span><span class="project-live-arrow" aria-hidden="true">↗</span>
    </a>`;
}

function setState(container, message, kind = "empty") {
    container.innerHTML = `<p class="content-state" role="status" data-state="${kind}">${escapeHtml(message)}</p>`;
}

async function renderCollection(name, selector, renderItem, emptyMessage, shouldInclude = () => true) {
    const container = $(selector);
    if (!container) return [];

    try {
        const { collection, getDocs, db } = await getFirebaseModules();
        const snapshot = await getDocs(collection(db, name));
        const records = snapshot.docs
            .map(snapshotDoc => ({ id: snapshotDoc.id, data: snapshotDoc.data() }))
            .sort(byOrder)
            .filter(shouldInclude);

        const hasFallback = container.querySelector(".project-item, .certificate-item, .skill-pill, .achievement-card, .research-card");
        if (!records.length) {
            if (!hasFallback) setState(container, emptyMessage);
            return records;
        }

        container.innerHTML = records.map(renderItem).join("");
        setupReveal(container);
        const filterGroup = document.querySelector(`.filter-tabs[data-filter-group="${name}"]`);
        filterGroup?.applyFilter?.(filterGroup.dataset.activeFilter || "all");
        return records;
    } catch (error) {
        console.info(`Using bundled ${name} content because Firestore is unavailable.`, error);
        if (!container.querySelector(".project-item, .certificate-item, .skill-pill, .achievement-card, .research-card")) {
            setState(container, "This content is temporarily unavailable. Please try again later.", "error");
        }
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

function certificatePreview(value, title) {
    const filename = safeAssetFilename(value);
    if (!filename) return `<div class="certificate-art"><div class="certificate-document-fallback">Certificate preview unavailable</div></div>`;
    const path = escapeHtml(`assets/certificates/${filename}`);
    const extension = filename.split(".").pop().toLowerCase();
    let visual = `<div class="certificate-document-fallback">${escapeHtml(title || "Certificate")}</div>`;
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) {
        visual = `<img class="certificate-document" src="${path}" alt="" loading="lazy">`;
    } else if (extension === "pdf") {
        visual = `<iframe class="certificate-document" src="${path}#toolbar=0&amp;navpanes=0&amp;scrollbar=0&amp;view=FitH" title="${escapeHtml(title || "Certificate")}" loading="lazy" tabindex="-1" aria-hidden="true"></iframe>`;
    }
    return `<div class="certificate-art">${visual}<button class="certificate-open" type="button" data-preview-path="${path}" aria-label="Preview ${escapeHtml(title || "certificate")}"><span>Preview certificate ↗</span></button></div>`;
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
    const videos = Array.from(document.querySelectorAll("#projectsContainer .project-video"))
        .filter(video => !video.dataset.videoPreviewReady);
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

    videos.forEach(video => {
        video.dataset.videoPreviewReady = "true";
        video.addEventListener("error", () => fallbackVideo(video), { once: true });
    });
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
    await renderCollection("projects", "#projectsContainer", ({ id, data }) => `
        <article class="project-item" data-category="${escapeHtml(projectCategory(data))}">
            ${projectLiveLink(data.liveWebsite || data.website, data.title || "project")}
            ${projectPreview(data.fileName, data.title || "project", data.screenshots)}
            <p class="section-kicker">${escapeHtml(projectCategory(data))}</p>
            <h3>${escapeHtml(data.title || "Untitled project")}</h3>
            <p>${escapeHtml(data.shortDesc || "")}</p>
            <a class="details-btn" href="project.html?id=${encodeURIComponent(id)}">Read project notes <span aria-hidden="true">↗</span></a>
        </article>
    `, "Project details will appear here when available.");

    setupProjectVideoPreviews();
    setupProjectCarousel();
}

function setupProjectCarousel() {
    const track = $("#projectsContainer");
    const carousel = $("#projectsCarousel");
    const previous = $("#projectPrev");
    const next = $("#projectNext");
    const toggle = $("#toggleViewBtn");
    if (!track) return;
    const canBrowse = track.querySelectorAll(":scope > .project-item").length > 1;
    if (toggle) toggle.hidden = !canBrowse;
    if (previous) previous.hidden = !canBrowse;
    if (next) next.hidden = !canBrowse;
    if (!canBrowse) return;

    const updateArrows = () => {
        const expanded = track.classList.contains("is-expanded");
        if (previous) previous.disabled = expanded || track.scrollLeft <= 1;
        if (next) next.disabled = expanded || track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
    };
    track.updateProjectArrows = updateArrows;
    if (track.dataset.carouselReady) {
        requestAnimationFrame(updateArrows);
        return;
    }
    track.dataset.carouselReady = "true";
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
    await renderCollection("certificates", "#certificatesContainer", ({ data }) => `
        <article class="certificate-item">
            ${certificatePreview(data.fileName, data.title || "Certificate")}
            <h3>${escapeHtml(data.title || "Certificate")}</h3>
            <p>${escapeHtml(data.issuer || "")}</p>
        </article>
    `, "No certificates have been added yet.");

    setupCertificateControls();
}

function setupCertificateControls() {
    const container = $("#certificatesContainer");
    const toggle = $("#certToggleBtn");
    if (toggle && container) {
        if (!container.dataset.controlsReady) {
            container.dataset.controlsReady = "true";
            toggle.onclick = () => {
                const grid = container.classList.toggle("cert-grid");
                toggle.textContent = grid ? "View as a row" : "View as a grid";
            };
            const behavior = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
            $("#certPrev")?.addEventListener("click", () => container.scrollBy({ left: -300, behavior: behavior() }));
            $("#certNext")?.addEventListener("click", () => container.scrollBy({ left: 300, behavior: behavior() }));
        }
        toggle.hidden = container.querySelectorAll(":scope > .certificate-item").length <= 1;
    }
}

async function loadSkills() {
    const container = $("#skillsContainer");
    if (!container) return;

    try {
        const { collection, getDocs, db } = await getFirebaseModules();
        const snapshot = await getDocs(collection(db, "skills"));
        const records = snapshot.docs
            .map(snapshotDoc => ({ id: snapshotDoc.id, data: snapshotDoc.data() }))
            .sort(byOrder);
        if (!records.length) return;

        const groups = ["Programming", "AI & Machine Learning", "Databases & Cloud"];
        const categoryFor = data => {
            if (data.category === "Computer Science Foundations") return "Databases & Cloud";
            if (groups.includes(data.category)) return data.category;
            const value = String(data.name || "").toLowerCase();
            if (/python|javascript|typescript|java|c\+\+|programming/.test(value)) return "Programming";
            if (/machine learning|computer vision|pytorch|deep learning|generative|\bai\b|\bgan\b|recommendation/.test(value)) return "AI & Machine Learning";
            if (/database|\bdbms\b|sql|postgres|mysql|cloud|aws|azure|gcp/.test(value)) return "Databases & Cloud";
            return "Databases & Cloud";
        };
        container.innerHTML = groups.map(group => {
            const items = records.filter(({ data }) => categoryFor(data) === group);
            if (!items.length) return "";
            return `<section class="skill-group"><h3>${escapeHtml(group)}</h3><div class="skill-group-items">${items.map(({ data }) => `
                <div class="skill-pill"><span aria-hidden="true">${escapeHtml(data.icon || "•")}</span><span>${escapeHtml(data.name || "")}</span></div>
            `).join("")}</div></section>`;
        }).join("");
        setupReveal(container);
    } catch (error) {
        console.info("Using bundled skills content because Firestore is unavailable.", error);
        if (!container.querySelector(".skill-pill")) {
            setState(container, "This content is temporarily unavailable. Please try again later.", "error");
        }
    }
}

async function loadAchievements() {
    const records = await renderCollection("achievements", "#achievementsContainer", ({ data }) => `
        <article class="achievement-card">
            <div class="ach-icon" aria-hidden="true">${escapeHtml(data.icon || "•")}</div>
            <h3>${escapeHtml(data.title || "")}</h3>
            ${data.subtitle ? `<p class="ach-main">${escapeHtml(data.subtitle)}</p>` : ""}
            ${data.description ? `<p class="ach-sub">${escapeHtml(data.description)}</p>` : ""}
        </article>
    `, "No achievements have been added yet.", ({ data }) =>
        !/math talent|nptel|data science internship/i.test(`${data.title || ""} ${data.subtitle || ""}`)
    );

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
    let closeTimer = 0;
    if (!modal || !body || !close) return;

    const closeModal = () => {
        if (modal.getAttribute("aria-hidden") !== "false") return;
        modal.classList.add("is-closing");
        window.clearTimeout(closeTimer);
        closeTimer = window.setTimeout(() => {
            modal.setAttribute("aria-hidden", "true");
            modal.classList.remove("is-closing");
            body.replaceChildren();
            previousFocus?.focus();
        }, 190);
    };

    document.addEventListener("click", event => {
        const trigger = event.target.closest("[data-preview-path]");
        if (!trigger) return;
        const filename = safeAssetFilename(trigger.dataset.previewPath);
        if (!filename) return;
        window.clearTimeout(closeTimer);
        modal.classList.remove("is-closing");

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
            const { addDoc, collection, db } = await getFirebaseModules();
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
    if (!observed.length) return;

    const header = document.querySelector("header");
    let frame = 0;
    const update = () => {
        frame = 0;
        const activationLine = (header?.getBoundingClientRect().height || 0) + 30;
        let current = observed[0];
        observed.forEach(item => {
            if (item.section.getBoundingClientRect().top <= activationLine) current = item;
        });
        if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
            current = observed[observed.length - 1];
        }
        observed.forEach(({ link, section }) => {
            const active = section === current.section;
            link.classList.toggle("nav-active", active);
            if (active) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        });
    };
    const scheduleUpdate = () => {
        if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(scheduleUpdate, { rootMargin: "-15% 0px -70% 0px" });
        observed.forEach(({ section }) => observer.observe(section));
    }
    scheduleUpdate();
}

function setupMilestoneTimeline() {
    const timeline = $("#milestonesContainer");
    if (!timeline) return;
    const milestones = Array.from(timeline.querySelectorAll(".milestone")).map(entry => ({
            entry,
            trigger: entry.querySelector(".milestone-trigger"),
            details: entry.querySelector(".milestone-details"),
            group: entry.dataset.linkGroup || ""
        }));
    if (!milestones.length) return;

    let activeMilestone = null;
    let suppressFocusActivation = false;
    const isTouchLayout = () => window.matchMedia("(max-width: 760px), (hover: none)").matches;
    const setActive = selected => {
        activeMilestone = selected;
        timeline.classList.toggle("has-active", Boolean(selected));
        timeline.querySelectorAll(".timeline-lane").forEach(lane => {
            lane.classList.toggle("has-active", Boolean(selected && lane.contains(selected.entry)));
        });
        milestones.forEach(milestone => {
            const active = milestone === selected;
            const linked = Boolean(selected?.group && milestone.group === selected.group && !active);
            milestone.entry.classList.toggle("is-active", active);
            milestone.entry.classList.toggle("is-linked", linked);
            milestone.trigger?.setAttribute("aria-expanded", String(active));
            milestone.details?.setAttribute("aria-hidden", String(!active));
        });
    };

    milestones.forEach(milestone => {
        if (!milestone.trigger) return;
        milestone.trigger.id ||= `${milestone.entry.dataset.milestone}-trigger`;
        milestone.details?.setAttribute("role", "region");
        milestone.details?.setAttribute("aria-labelledby", milestone.trigger.id);
        milestone.entry.addEventListener("pointerenter", event => {
            if (event.pointerType === "mouse" && !isTouchLayout()) setActive(milestone);
        });
        milestone.entry.addEventListener("pointerleave", event => {
            if (event.pointerType === "mouse" && !isTouchLayout() && !milestone.entry.contains(document.activeElement)) {
                if (activeMilestone === milestone) setActive(null);
            }
        });
        milestone.entry.addEventListener("focusin", () => {
            if (!suppressFocusActivation) setActive(milestone);
        });
        milestone.entry.addEventListener("focusout", event => {
            if (!milestone.entry.contains(event.relatedTarget) && activeMilestone === milestone) setActive(null);
        });
        milestone.trigger.addEventListener("click", () => {
            if (isTouchLayout()) setActive(milestone);
        });
    });

    document.addEventListener("click", event => {
        if (isTouchLayout() && !event.target.closest(".milestone") && activeMilestone) setActive(null);
    });
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape" || !activeMilestone) return;
        const trigger = activeMilestone.trigger;
        setActive(null);
        suppressFocusActivation = true;
        trigger?.focus();
        window.setTimeout(() => { suppressFocusActivation = false; }, 0);
    });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion && "IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
            });
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
        milestones.forEach(({ entry }) => revealObserver.observe(entry));
    } else {
        milestones.forEach(({ entry }) => entry.classList.add("is-visible"));
    }

    const pathSvg = timeline.querySelector(".milestone-path");
    const basePath = pathSvg?.querySelector(".milestone-path-base");
    const progressPath = pathSvg?.querySelector(".milestone-path-progress");
    let frame = 0;
    const updateTimelinePath = () => {
        frame = 0;
        if (!pathSvg || !basePath || !progressPath) return;
        const bounds = timeline.getBoundingClientRect();
        const width = timeline.clientWidth;
        const height = timeline.scrollHeight;
        if (!width || !height) return;

        pathSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        pathSvg.style.height = `${height}px`;
        const nodes = Array.from(timeline.querySelectorAll(".milestone-node, .timeline-year-node")).map(node => {
            const rect = node?.getBoundingClientRect();
            return rect ? {
                x: rect.left + rect.width / 2 - bounds.left,
                y: rect.top + rect.height / 2 - bounds.top
            } : null;
        }).filter(Boolean);

        if (!nodes.length) return;
        const compactPath = window.matchMedia("(max-width: 760px)").matches;
        let path = `M ${nodes[0].x} ${nodes[0].y}`;
        for (let index = 1; index < nodes.length; index += 1) {
            if (compactPath) {
                path += ` L ${nodes[index].x} ${nodes[index].y}`;
                continue;
            }
            const before = nodes[Math.max(0, index - 2)];
            const start = nodes[index - 1];
            const end = nodes[index];
            const after = nodes[Math.min(nodes.length - 1, index + 1)];
            const control1 = {
                x: start.x + (end.x - before.x) / 6,
                y: start.y + (end.y - before.y) / 6
            };
            const control2 = {
                x: end.x - (after.x - start.x) / 6,
                y: end.y - (after.y - start.y) / 6
            };
            path += ` C ${control1.x} ${control1.y} ${control2.x} ${control2.y} ${end.x} ${end.y}`;
        }
        basePath.setAttribute("d", path);
        progressPath.setAttribute("d", path);
        const length = basePath.getTotalLength();
        progressPath.style.strokeDasharray = String(length);
        const distance = Math.min(bounds.height, Math.max(0, window.innerHeight * 0.72 - bounds.top));
        const progress = bounds.height ? distance / bounds.height : 0;
        progressPath.style.strokeDashoffset = String(length * (1 - progress));
    };
    const schedulePathUpdate = () => {
        if (!frame) frame = window.requestAnimationFrame(updateTimelinePath);
    };
    timeline.addEventListener("transitionend", event => {
        if (event.target.matches(".milestone") && event.propertyName === "transform") schedulePathUpdate();
    });
    window.addEventListener("scroll", schedulePathUpdate, { passive: true });
    window.addEventListener("resize", schedulePathUpdate, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(schedulePathUpdate).observe(timeline);
    schedulePathUpdate();
}

function setupScrollProgress() {
    const bar = $("#pageProgress");
    const fill = $("#pageProgressFill");
    if (!bar || !fill) return;

    let frame = 0;
    const update = () => {
        frame = 0;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
        const percent = Math.round(progress * 100);
        fill.style.transform = `scaleX(${progress})`;
        bar.setAttribute("aria-valuenow", String(percent));
        bar.setAttribute("aria-valuetext", `${percent}% of page read`);
    };
    const scheduleUpdate = () => {
        if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(scheduleUpdate).observe(document.documentElement);
    scheduleUpdate();
}

function setupFilters() {
    document.querySelectorAll(".filter-tabs[data-filter-group]").forEach(group => {
        const containerId = group.dataset.filterGroup === "projects" ? "projectsContainer" : "certificatesContainer";
        const container = document.getElementById(containerId);
        if (!container) return;

        let status = group.nextElementSibling?.classList.contains("filter-status") ? group.nextElementSibling : null;
        if (!status) {
            status = document.createElement("p");
            status.className = "filter-status";
            status.setAttribute("role", "status");
            status.hidden = true;
            group.after(status);
        }

        const apply = category => {
            const cards = Array.from(container.children).filter(card => card.matches(".project-item, .certificate-item"));
            let shown = 0;
            cards.forEach(card => {
                const visible = category === "all" || card.dataset.category?.toLowerCase() === category;
                card.hidden = !visible;
                shown += Number(visible);
            });
            status.textContent = shown ? "" : `No ${group.dataset.filterGroup} are tagged ${category} yet.`;
            status.hidden = shown > 0;
            container.updateProjectArrows?.();
            group.querySelectorAll("[data-filter]").forEach(button => {
                button.setAttribute("aria-pressed", String(button.dataset.filter.toLowerCase() === category));
            });
        };

        if (!group.dataset.filterReady) {
            group.dataset.filterReady = "true";
            group.addEventListener("click", event => {
                const button = event.target.closest("[data-filter]");
                if (!button) return;
                group.dataset.activeFilter = button.dataset.filter.toLowerCase();
                apply(group.dataset.activeFilter);
            });
        }
        group.applyFilter = apply;
        group.dataset.activeFilter ||= "all";
        apply(group.dataset.activeFilter);
    });
}

function setupHeroTyping() {
    const target = $("#heroTypedText");
    if (!target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lines = [
        "Building practical machine learning systems",
        "Turning research into working software",
        "Exploring ideas through intelligent systems"
    ];
    let line = 0;
    let position = target.textContent.length;
    let deleting = false;

    const write = () => {
        const current = lines[line];
        target.textContent = current.slice(0, position);
        let delay = deleting ? 18 : 31;
        if (!deleting && position === current.length) {
            deleting = true;
            delay = 1050;
        } else if (deleting && position === 0) {
            deleting = false;
            line = (line + 1) % lines.length;
            delay = 250;
        }
        position += deleting ? -1 : 1;
        window.setTimeout(write, delay);
    };

    window.setTimeout(write, 500);
}

function setupHeroNetwork() {
    const canvas = $("#heroNetwork");
    const hero = $("#about");
    const context = canvas?.getContext("2d");
    if (!canvas || !hero || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: -1000, y: -1000 };
    const nodes = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;

    const draw = time => {
        frame = 0;
        context.clearRect(0, 0, width, height);
        const accent = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#a6402b";
        const maxDistance = Math.min(150, Math.max(90, width * 0.12));
        nodes.forEach((node, index) => {
            if (!reducedMotion && time) {
                node.x += Math.cos(node.phase + time * 0.00013) * node.drift;
                node.y += Math.sin(node.phase + time * 0.0001) * node.drift;
                if (node.x < 0) node.x += width;
                if (node.x > width) node.x -= width;
                if (node.y < 0) node.y += height;
                if (node.y > height) node.y -= height;
            }
            const dx = pointer.x - node.x;
            const dy = pointer.y - node.y;
            const pointerDistance = Math.hypot(dx, dy);
            const x = pointerDistance < 125 ? node.x - dx * ((125 - pointerDistance) / 125) * 0.12 : node.x;
            const y = pointerDistance < 125 ? node.y - dy * ((125 - pointerDistance) / 125) * 0.12 : node.y;
            for (let next = index + 1; next < nodes.length; next++) {
                const other = nodes[next];
                const distance = Math.hypot(x - other.x, y - other.y);
                if (distance >= maxDistance) continue;
                context.beginPath();
                context.moveTo(x, y);
                context.lineTo(other.x, other.y);
                context.strokeStyle = accent;
                context.globalAlpha = (1 - distance / maxDistance) * 0.16;
                context.lineWidth = 0.7;
                context.stroke();
            }
            context.beginPath();
            context.arc(x, y, pointerDistance < 125 ? 2.1 : 1.35, 0, Math.PI * 2);
            context.fillStyle = accent;
            context.globalAlpha = pointerDistance < 125 ? 0.48 : 0.3;
            context.fill();
        });
        context.globalAlpha = 1;
        if (!reducedMotion && visible) frame = requestAnimationFrame(draw);
    };

    const resize = () => {
        const bounds = hero.getBoundingClientRect();
        const scale = Math.min(window.devicePixelRatio || 1, 1.5);
        width = Math.max(1, bounds.width);
        height = Math.max(1, bounds.height);
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        context.setTransform(scale, 0, 0, scale, 0, 0);
        nodes.length = 0;
        const count = Math.max(24, Math.round(width / 15));
        for (let index = 0; index < count; index++) {
            nodes.push({ x: Math.random() * width, y: Math.random() * height, phase: Math.random() * Math.PI * 2, drift: 0.12 + Math.random() * 0.22 });
        }
        if (!frame) draw();
    };

    hero.addEventListener("pointermove", event => {
        const bounds = hero.getBoundingClientRect();
        pointer.x = event.clientX - bounds.left;
        pointer.y = event.clientY - bounds.top;
        if (!frame && !reducedMotion && visible) frame = requestAnimationFrame(draw);
    }, { passive: true });
    hero.addEventListener("pointerleave", () => { pointer.x = -1000; pointer.y = -1000; }, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    resize();
    if ("IntersectionObserver" in window) {
        new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting;
            if (visible && !frame && !reducedMotion) frame = requestAnimationFrame(draw);
            if (!visible && frame) cancelAnimationFrame(frame);
        }, { rootMargin: "120px" }).observe(hero);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    setupThemeToggle($("#themeToggle"));
    setupFileModal();
    setupContactForm();
    setupActiveNavigation();
    setupMilestoneTimeline();
    setupScrollProgress();
    setupFilters();
    setupProjectCarousel();
    setupCertificateControls();
    setupHeroNetwork();
    setupHeroTyping();
    setupReveal();
    setupProjectVideoPreviews();
    const year = $("#currentYear");
    if (year) year.textContent = String(new Date().getFullYear());

    const loaders = [loadProjects, loadCertificates, loadSkills, loadResearch];
    await Promise.allSettled(loaders.map(load => load()));
});
