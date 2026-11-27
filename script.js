import { escapeHtml, safeAssetFilename, safeExternalUrl } from "./js/safe-content.js";
import { setupThemeToggle } from "./js/theme.js";
import { setupReveal } from "./js/reveal.js";
import { normalizeCertificate, renderCertificateCard, setupCertificateControls, setupCertificateModal } from "./js/certificates.js";
import { renderSkillGroups, setupToolkitInteractions } from "./js/toolkit.js";
import { withProjectPresentation } from "./js/fallback-content.js";

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
        ${(() => {
            const project = withProjectPresentation(data, id);
            const category = projectCategory(project);
            const technologies = String(project.techStack || "").split(",").map(value => value.trim()).filter(Boolean);
            const year = String(project.year || project.date || "");
            return `<article class="project-item" data-category="${escapeHtml(category)}" data-year="${escapeHtml(project.year || project.date || "")}">
            ${projectLiveLink(project.liveWebsite || project.website, project.title || "project")}
            ${projectPreview(project.fileName, project.title || "project", project.screenshots)}
            <div class="project-card-meta"><p class="section-kicker">${escapeHtml(category)}</p>${year ? `<span class="project-year-tag">${escapeHtml(year)}</span>` : ""}</div>
            <h3>${escapeHtml(project.title || "Untitled project")}</h3>
            <p>${escapeHtml(project.shortDesc || "")}</p>
            ${technologies.length ? `<ul class="project-tech-tags" aria-label="Technologies used">${technologies.map(technology => `<li>${escapeHtml(technology)}</li>`).join("")}</ul>` : ""}
            <a class="details-btn" href="project.html?id=${encodeURIComponent(id)}">Explore project <span aria-hidden="true">↗</span></a>
            </article>`;
        })()}
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
    const titleOutput = $("#projectGalleryTitle");
    const categoryOutput = $("#projectGalleryCategory");
    const yearOutput = $("#projectGalleryYear");
    const positionOutput = $("#projectGalleryPosition");
    const caption = $("#projectGalleryCaption");
    if (!track) return;

    const preferredRank = title => {
        const name = String(title || "").trim().toLowerCase();
        if (name.includes("agrivision")) return 0;
        if (name.includes("weather orion")) return 1;
        if (name.includes("terminator") || name === "terminal") return 4;
        return 2;
    };
    Array.from(track.querySelectorAll(":scope > .project-item"))
        .map((card, index) => ({ card, index, rank: preferredRank(card.querySelector("h3")?.textContent) }))
        .sort((left, right) => left.rank - right.rank || left.index - right.index)
        .forEach(({ card }) => track.append(card));

    const allCards = () => Array.from(track.querySelectorAll(":scope > .project-item"));
    const visibleCards = () => allCards().filter(card => !card.hidden);
    const wrapIndex = (value, length) => length ? ((value % length) + length) % length : 0;
    const circularOffset = (index, position, length) => {
        if (length <= 1) return 0;
        const half = length / 2;
        return ((index - position + half) % length + length) % length - half;
    };
    const carouselGeometry = (width, compact) => {
        const angleStep = (compact ? 29 : 25) * Math.PI / 180;
        const radiusX = Math.min(width * .62, compact ? 240 : 620);
        return { angleStep, radiusX, dragStep: Math.max(64, radiusX * 2 * Math.sin(angleStep / 2)) };
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state = track.projectGalleryState || { index: 0, position: 0, activeCard: null, dragging: false, rotating: false, hoverVelocity: 0, hoverTargetVelocity: 0, hoverFrame: 0, hoverLastTime: 0, suppressClickUntil: 0 };
    track.projectGalleryState = state;
    const canBrowse = allCards().length > 1;
    if (toggle) toggle.hidden = !canBrowse;
    if (previous) previous.hidden = !canBrowse;
    if (next) next.hidden = !canBrowse;

    let galleryFrame = 0;
    const updateGallery = (updateCaption = true) => {
        galleryFrame = 0;
        const cards = allCards();
        if (track.classList.contains("is-expanded")) {
            cards.forEach(card => {
                card.classList.remove("is-gallery-active", "is-gallery-left", "is-gallery-right", "is-gallery-hidden");
                card.removeAttribute("aria-hidden");
                card.inert = false;
                ["--gallery-x", "--gallery-y", "--gallery-z", "--gallery-yaw", "--gallery-hover-yaw", "--gallery-scale", "--gallery-opacity", "--gallery-order", "--gallery-brightness"].forEach(property => card.style.removeProperty(property));
            });
            if (carousel) carousel.classList.add("is-expanded");
            caption?.classList.add("is-expanded");
            if (previous) previous.disabled = true;
            if (next) next.disabled = true;
            return;
        }

        const visible = visibleCards();
        if (!visible.length) {
            cards.forEach(card => {
                card.classList.remove("is-gallery-active", "is-gallery-left", "is-gallery-right", "is-gallery-hidden");
                card.removeAttribute("aria-hidden");
                card.inert = false;
            });
            if (previous) previous.disabled = true;
            if (next) next.disabled = true;
            return;
        }

        const previousActiveIndex = state.activeCard ? visible.indexOf(state.activeCard) : -1;
        if (!state.dragging && !state.rotating) {
            if (previousActiveIndex >= 0) state.index = previousActiveIndex;
            else state.index = wrapIndex(state.index, visible.length);
            state.position = state.index;
            state.activeCard = visible[state.index];
        } else {
            state.position = wrapIndex(state.position, visible.length);
            state.index = wrapIndex(Math.round(state.position), visible.length);
            state.activeCard = visible[state.index];
        }

        const stageWidth = Math.max(1, track.clientWidth);
        const compact = window.matchMedia("(max-width: 680px)").matches;
        const { angleStep, radiusX } = carouselGeometry(stageWidth, compact);
        const activeForCaption = visible[wrapIndex(Math.round(state.position), visible.length)];
        const orbitCards = visible.map((card, index) => ({ card, index, offset: circularOffset(index, state.position, visible.length) }))
            .sort((left, right) => Math.abs(left.offset) - Math.abs(right.offset) || left.index - right.index)
            .slice(0, Math.min(5, visible.length));
        const orbitIndices = new Set(orbitCards.map(item => item.index));

        cards.forEach(card => {
            const index = visible.indexOf(card);
            if (index < 0) {
                card.classList.remove("is-gallery-active", "is-gallery-left", "is-gallery-right", "is-gallery-hidden");
                card.removeAttribute("aria-hidden");
                card.inert = false;
                return;
            }

            const offset = circularOffset(index, state.position, visible.length);
            const distance = Math.abs(offset);
            const direction = Math.sign(offset);
            const angle = offset * angleStep;
            const radiusY = compact ? 122 : 158;
            const radiusZ = compact ? 260 : 420;
            const x = Math.sin(angle) * radiusX;
            const y = (1 - Math.cos(angle)) * radiusY - (compact ? 18 : 24);
            const z = (Math.cos(angle) - 1) * radiusZ;
            const yaw = distance < .015 ? 0 : -direction * Math.min(compact ? 34 : 38, Math.abs(angle) * .72 * 180 / Math.PI);
            const scale = Math.max(compact ? .62 : .52, 1 - distance * (compact ? .14 : .13));
            const opacity = Math.max(0, 1 - Math.max(0, distance - 1) * (compact ? .2 : .16));
            const hidden = !orbitIndices.has(index);

            card.classList.toggle("is-gallery-active", distance < .5);
            card.classList.toggle("is-gallery-left", offset < -.5);
            card.classList.toggle("is-gallery-right", offset > .5);
            card.classList.toggle("is-gallery-hidden", hidden);
            card.style.setProperty("--gallery-x", `${x.toFixed(1)}px`);
            card.style.setProperty("--gallery-y", `${y.toFixed(1)}px`);
            card.style.setProperty("--gallery-z", `${z.toFixed(1)}px`);
            card.style.setProperty("--gallery-yaw", `${yaw.toFixed(2)}deg`);
            card.style.setProperty("--gallery-hover-yaw", `${(yaw * .72).toFixed(2)}deg`);
            card.style.setProperty("--gallery-scale", scale.toFixed(3));
            card.style.setProperty("--gallery-opacity", opacity.toFixed(3));
            card.style.setProperty("--gallery-order", String(Math.round(100 - distance * 20)));
            card.style.setProperty("--gallery-brightness", (1 - Math.min(.2, distance * .065)).toFixed(3));
            card.setAttribute("aria-hidden", String(hidden));
            card.inert = hidden;
        });

        if (previous) previous.disabled = visible.length <= 1;
        if (next) next.disabled = visible.length <= 1;
        if (carousel) carousel.classList.remove("is-expanded");
        caption?.classList.remove("is-expanded");

        if (updateCaption && !state.dragging && activeForCaption) {
            if (titleOutput) titleOutput.textContent = activeForCaption.querySelector("h3")?.textContent.trim() || "Project";
            if (categoryOutput) categoryOutput.textContent = activeForCaption.dataset.category || activeForCaption.querySelector(".section-kicker")?.textContent.trim() || "Selected work";
            const rawYear = String(activeForCaption.dataset.year || "");
            const matchedYear = rawYear.match(/\b(?:19|20)\d{2}\b/);
            if (yearOutput) {
                yearOutput.textContent = matchedYear?.[0] || "—";
                yearOutput.closest(".project-gallery-year")?.classList.toggle("is-unlisted", !matchedYear);
            }
            if (positionOutput) positionOutput.textContent = `${String(state.index + 1).padStart(2, "0")} / ${String(visible.length).padStart(2, "0")}`;
        }
    };
    const scheduleGallery = (updateCaption = true) => {
        if (!galleryFrame) galleryFrame = requestAnimationFrame(() => updateGallery(updateCaption));
    };
    const stopHoverRotation = () => {
        if (state.hoverFrame) cancelAnimationFrame(state.hoverFrame);
        state.hoverFrame = 0;
        state.hoverLastTime = 0;
        state.hoverVelocity = 0;
        state.hoverTargetVelocity = 0;
        state.rotating = false;
        track.classList.remove("is-hover-rotating");
        const visible = visibleCards();
        state.index = wrapIndex(state.index, visible.length);
        state.position = state.index;
        state.activeCard = visible[state.index] || null;
        scheduleGallery();
    };
    const animateHoverRotation = timestamp => {
        state.hoverFrame = 0;
        if (reduceMotion || state.dragging || track.classList.contains("is-expanded") || visibleCards().length <= 1) {
            stopHoverRotation();
            return;
        }

        const visible = visibleCards();
        const deltaTime = state.hoverLastTime ? Math.min(.05, (timestamp - state.hoverLastTime) / 1000) : 0;
        state.hoverLastTime = timestamp;
        const smoothing = 1 - Math.exp(-deltaTime / .2);
        state.hoverVelocity += (state.hoverTargetVelocity - state.hoverVelocity) * smoothing;

        if (Math.abs(state.hoverTargetVelocity) < .005 && Math.abs(state.hoverVelocity) < .012) {
            state.hoverVelocity = 0;
            state.hoverTargetVelocity = 0;
            state.rotating = false;
            track.classList.remove("is-hover-rotating");
            state.position = state.index;
            state.activeCard = visible[state.index] || null;
            updateGallery();
            return;
        }

        state.rotating = true;
        track.classList.add("is-hover-rotating");
        state.position = wrapIndex(state.position + state.hoverVelocity * deltaTime, visible.length);
        state.index = wrapIndex(Math.round(state.position), visible.length);
        state.activeCard = visible[state.index] || null;
        if (galleryFrame) cancelAnimationFrame(galleryFrame);
        updateGallery();
        state.hoverFrame = requestAnimationFrame(animateHoverRotation);
    };
    const updateHoverVelocity = event => {
        if (reduceMotion || track.classList.contains("is-expanded") || visibleCards().length <= 1) return;
        const bounds = track.getBoundingClientRect();
        const normalizedX = ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1;
        const deadZone = .22;
        const intensity = Math.max(0, (Math.abs(normalizedX) - deadZone) / (1 - deadZone));
        state.hoverTargetVelocity = -Math.sign(normalizedX) * Math.pow(intensity, 1.65) * 1.05;
        if (!state.hoverFrame && (Math.abs(state.hoverTargetVelocity) > .005 || Math.abs(state.hoverVelocity) > .005)) {
            state.hoverFrame = requestAnimationFrame(animateHoverRotation);
        }
    };
    const selectIndex = index => {
        const visible = visibleCards();
        if (!visible.length) return;
        if (state.hoverFrame) cancelAnimationFrame(state.hoverFrame);
        state.hoverFrame = 0;
        state.hoverLastTime = 0;
        state.hoverVelocity = 0;
        state.hoverTargetVelocity = 0;
        state.rotating = false;
        track.classList.remove("is-hover-rotating");
        state.index = wrapIndex(index, visible.length);
        state.position = state.index;
        state.activeCard = visible[state.index];
        scheduleGallery();
    };

    track.updateProjectArrows = () => {
        const visible = visibleCards();
        const activeIndex = state.activeCard ? visible.indexOf(state.activeCard) : -1;
        if (activeIndex >= 0) state.index = activeIndex;
        else state.index = 0;
        state.position = state.index;
        state.activeCard = visible[state.index] || null;
        scheduleGallery();
    };

    if (!track.dataset.carouselReady) {
        track.dataset.carouselReady = "true";
        const stepBy = amount => selectIndex(state.index + amount);

        previous?.addEventListener("click", () => stepBy(-1));
        next?.addEventListener("click", () => stepBy(1));
        track.addEventListener("click", event => {
            if (performance.now() < state.suppressClickUntil) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            if (event.target.closest("a")) return;
            const card = event.target.closest(".project-item");
            if (!card || card.hidden) return;
            const index = visibleCards().indexOf(card);
            if (index >= 0) selectIndex(index);
        });
        track.addEventListener("keydown", event => {
            if (track.classList.contains("is-expanded")) return;
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                stepBy(-1);
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                stepBy(1);
            } else if (event.key === "Home") {
                event.preventDefault();
                selectIndex(0);
            } else if (event.key === "End") {
                event.preventDefault();
                selectIndex(visibleCards().length - 1);
            }
        });

        track.addEventListener("pointerdown", event => {
            const action = event.target.closest("a, button");
            const previewAction = action?.matches(".project-preview.file-preview");
            if (track.classList.contains("is-expanded") || (event.pointerType === "mouse" && event.button !== 0) || (action && !previewAction)) return;
            if (event.pointerType === "mouse" && state.hoverFrame) stopHoverRotation();
            state.dragging = false;
            state.drag = { id: event.pointerId, startX: event.clientX, startPosition: state.index, moved: false, card: event.target.closest(".project-item") };
            track.setPointerCapture?.(event.pointerId);
        });
        track.addEventListener("pointermove", event => {
            if (state.drag && state.drag.id === event.pointerId) {
                const delta = event.clientX - state.drag.startX;
                if (Math.abs(delta) > 5) {
                    state.drag.moved = true;
                    state.dragging = true;
                    track.classList.add("is-dragging");
                    const stageWidth = Math.max(1, track.clientWidth);
                    const compact = window.matchMedia("(max-width: 680px)").matches;
                    const { dragStep } = carouselGeometry(stageWidth, compact);
                    const step = dragStep;
                    state.position = wrapIndex(state.drag.startPosition - delta / step, visibleCards().length);
                    if (galleryFrame) cancelAnimationFrame(galleryFrame);
                    galleryFrame = requestAnimationFrame(() => updateGallery(false));
                    event.preventDefault();
                }
                return;
            }

            if (event.pointerType !== "mouse") return;
            updateHoverVelocity(event);
            const card = event.target.closest?.(".project-item");
            if (!card || !track.contains(card) || track.classList.contains("is-dragging")) return;
            const bounds = card.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / Math.max(1, bounds.width) - .5;
            const y = (event.clientY - bounds.top) / Math.max(1, bounds.height) - .5;
            card.style.setProperty("--project-tilt-x", `${(-y * 2.4).toFixed(2)}deg`);
            card.style.setProperty("--project-tilt-y", `${(x * 3.2).toFixed(2)}deg`);
        }, { passive: false });
        const finishDrag = event => {
            if (!state.drag || state.drag.id !== event.pointerId) return;
            if (state.drag.moved) {
                state.index = wrapIndex(Math.round(state.position), visibleCards().length);
                state.activeCard = visibleCards()[state.index] || null;
                state.position = state.index;
                state.suppressClickUntil = performance.now() + 240;
            } else if (state.drag.card && visibleCards().includes(state.drag.card)) {
                selectIndex(visibleCards().indexOf(state.drag.card));
            }
            state.drag = null;
            state.dragging = false;
            track.classList.remove("is-dragging");
            scheduleGallery();
        };
        track.addEventListener("pointerup", finishDrag);
        track.addEventListener("pointercancel", finishDrag);
        track.addEventListener("lostpointercapture", finishDrag);
        track.addEventListener("pointerleave", event => {
            if (event.pointerType === "mouse") stopHoverRotation();
        });
        track.addEventListener("pointerout", event => {
            const card = event.target.closest?.(".project-item");
            if (!card || !track.contains(card) || card.contains(event.relatedTarget)) return;
            card.style.removeProperty("--project-tilt-x");
            card.style.removeProperty("--project-tilt-y");
        }, { passive: true });
        window.addEventListener("resize", track.updateProjectArrows);

        if (toggle) {
            toggle.textContent = "See all projects";
            toggle.setAttribute("aria-expanded", "false");
            toggle.onclick = () => {
                const expanded = track.classList.toggle("is-expanded");
                if (carousel) carousel.classList.toggle("is-expanded", expanded);
                toggle.textContent = expanded ? "View carousel" : "See all projects";
                toggle.setAttribute("aria-expanded", String(expanded));
                scheduleGallery();
            };
        }
    }

    const activeCard = visibleCards().find(card => card.classList.contains("is-gallery-active")) || state.activeCard;
    if (activeCard && visibleCards().includes(activeCard)) state.activeCard = activeCard;
    else if (!state.activeCard || !visibleCards().includes(state.activeCard)) state.activeCard = visibleCards()[Math.max(0, Math.min(state.index, visibleCards().length - 1))] || null;
    if (state.activeCard) state.index = visibleCards().indexOf(state.activeCard);
    state.position = state.index;
    updateGallery();
}

async function loadCertificates() {
    const container = $("#certificatesContainer");
    if (!container) return;
    try {
        const { collection, getDocs, db } = await getFirebaseModules();
        const snapshot = await getDocs(collection(db, "certificates"));
        const records = snapshot.docs
            .map(snapshotDoc => ({ id: snapshotDoc.id, data: snapshotDoc.data() }))
            .sort(byOrder);
        if (records.length) {
            container.innerHTML = records.map(normalizeCertificate).map(renderCertificateCard).join("");
            setupReveal(container);
            container.querySelectorAll(":scope > .certificate-item").forEach((card, index) => card.style.setProperty("--reveal-delay", `${index * 75}ms`));
            const filters = document.querySelector('.filter-tabs[data-filter-group="certificates"]');
            filters?.applyFilter?.(filters.dataset.activeFilter || "all");
        }
    } catch (error) {
        console.info("Using bundled certificate content because Firestore is unavailable.", error);
    }
    setupCertificateControls();
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

        let categoryRecords = [];
        try {
            const categorySnapshot = await getDocs(collection(db, "skillCategories"));
            categoryRecords = categorySnapshot.docs.map(item => ({ id: item.id, ...item.data() }))
                .filter(item => String(item.name || "").trim());
        } catch (error) {
            console.info("Skill type records are unavailable; using skill assignments.", error);
        }
        if (!records.length) {
            setupToolkitInteractions(container);
            return;
        }

        const normalizeCategory = value => {
            const name = String(value || "").trim();
            return name === "Computer Science Foundations" ? "Databases & Cloud" : name;
        };
        const categoryById = new Map(categoryRecords.map(category => [category.id, category]));
        const categoryByName = new Map(categoryRecords.map(category => [normalizeCategory(category.name).toLocaleLowerCase(), category]));
        const groups = categoryRecords.length
            ? categoryRecords.map(category => ({ ...category, name: normalizeCategory(category.name) }))
            : ["Programming", "AI & Machine Learning", "Databases & Cloud"].map((name, order) => ({ id: `default-${order}`, name, order }));
        const ensureGroup = name => {
            const normalized = normalizeCategory(name || "Uncategorized");
            let group = groups.find(item => item.name.toLocaleLowerCase() === normalized.toLocaleLowerCase());
            if (!group) {
                group = { id: `legacy-${groups.length}`, name: normalized, order: groups.length };
                groups.push(group);
            }
            return group;
        };
        const categoryFor = data => {
            if (categoryById.has(data.categoryId)) return categoryById.get(data.categoryId);
            const name = normalizeCategory(data.category || "Uncategorized");
            return categoryByName.get(name.toLocaleLowerCase()) || ensureGroup(name);
        };
        const itemsByGroup = new Map(groups.map(group => [group.id, []]));
        records.forEach(record => {
            const group = categoryFor(record.data);
            if (!itemsByGroup.has(group.id)) itemsByGroup.set(group.id, []);
            itemsByGroup.get(group.id).push(record);
        });
        groups.sort((left, right) =>
            (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) || left.name.localeCompare(right.name)
        );
        const renderedGroups = groups.map((group, index) => ({
            ...group,
            id: String(group.id || `skill-group-${index}`),
            items: itemsByGroup.get(group.id) || []
        }));
        container.innerHTML = renderSkillGroups(renderedGroups);
        setupToolkitInteractions(container, renderedGroups.map(group => ({
            id: group.id,
            name: group.name,
            count: group.items.length
        })));
    } catch (error) {
        console.info("Using bundled skills content because Firestore is unavailable.", error);
        if (!container.querySelector(".skill-pill")) {
            setState(container, "This content is temporarily unavailable. Please try again later.", "error");
        }
        setupToolkitInteractions(container);
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
    const paperPlane = pathSvg?.querySelector(".milestone-paper-plane");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
        const nodes = Array.from(timeline.querySelectorAll(".milestone-node, .timeline-year-node")).map(element => {
            const rect = element?.getBoundingClientRect();
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

        if (paperPlane && length > 0) {
            const scrollProgress = prefersReducedMotion ? 0 : Math.min(1, Math.max(0, progress));
            const travelled = scrollProgress * length;
            const point = basePath.getPointAtLength(travelled);
            const tangentWindow = compactPath ? 20 : 12;
            const tangentStart = basePath.getPointAtLength(Math.max(0, travelled - tangentWindow));
            const tangentEnd = basePath.getPointAtLength(Math.min(length, travelled + tangentWindow));
            const tangentX = tangentEnd.x - tangentStart.x;
            const tangentY = tangentEnd.y - tangentStart.y;
            const liftProgress = prefersReducedMotion ? 0 : Math.min(1, Math.max(0, (progress - 0.985) / 0.015));
            const lift = liftProgress * liftProgress * (3 - 2 * liftProgress);
            const angle = Math.atan2(tangentY, tangentX) * 180 / Math.PI - lift * 10;
            paperPlane.setAttribute("transform", `translate(${point.x.toFixed(2)} ${(point.y - lift * 9).toFixed(2)}) rotate(${angle.toFixed(2)}) scale(1.4 1.05)`);
            paperPlane.setAttribute("visibility", "visible");
        }
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

function setupHeroAtmosphere() {
    const hero = $("#about");
    if (!hero) return;

    const laptop = $("#heroLaptop");
    const laptopShadow = $("#heroLaptopShadow");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const introStarted = performance.now();
    let heroPageTop = hero.getBoundingClientRect().top + window.scrollY;
    let frame = 0;

    const update = time => {
        frame = 0;
        const fadeDistance = Math.max(560, Math.min(hero.offsetHeight, window.innerHeight * 1.15));
        const scrolledPastHero = Math.max(0, window.scrollY - heroPageTop);
        const scrollFade = Math.max(0, 1 - scrolledPastHero / fadeDistance);
        const arrival = reducedMotion ? 1 : Math.min(1, (time - introStarted) / 760);
        hero.style.setProperty("--hero-wash-opacity", (0.78 * arrival * scrollFade).toFixed(3));
        const laptopArrival = reducedMotion ? 1 : Math.min(1, Math.max(0, (time - introStarted - 120) / 650));
        const laptopOpacity = laptopArrival * scrollFade;
        laptop?.style.setProperty("--laptop-opacity", laptopOpacity.toFixed(3));
        if (laptop) laptop.classList.toggle("is-active", laptopOpacity > 0.015);
        if (laptopShadow) laptopShadow.style.opacity = ((0.12 + 0.37 * laptopArrival) * scrollFade).toFixed(3);

        if (arrival >= 1) hero.classList.add("wash-settled");
        else frame = window.requestAnimationFrame(update);
    };
    const scheduleUpdate = () => {
        if (!frame) frame = window.requestAnimationFrame(update);
    };

    hero.classList.add("wash-ready");
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", () => {
        heroPageTop = hero.getBoundingClientRect().top + window.scrollY;
        scheduleUpdate();
    }, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(scheduleUpdate).observe(hero);
    scheduleUpdate();
}

function setupEducationTimeline() {
    const path = $("#educationPath");
    if (!path) return;

    const compass = path.querySelector(".edu-compass");
    const rows = Array.from(path.querySelectorAll(".edu-row"));
    const nodes = rows.map(row => row.querySelector(".edu-node")).filter(Boolean);
    if (rows.length < 2 || nodes.length < 2) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compassAngles = [-32, 0, 32];
    let activeRowIndex = -1;
    let frame = 0;
    const clamp = value => Math.min(1, Math.max(0, value));

    const positionCompass = index => {
        if (!compass || index < 0 || !nodes[index]) return;
        const pathRect = path.getBoundingClientRect();
        const nodeRect = nodes[index].getBoundingClientRect();
        const activeY = `${(nodeRect.top + nodeRect.height / 2 - pathRect.top).toFixed(1)}px`;
        if (path.style.getPropertyValue("--edu-active-y") !== activeY) {
            path.style.setProperty("--edu-active-y", activeY);
        }
    };

    const setActiveRow = index => {
        if (index < 0 || index >= rows.length) return;
        const changed = index !== activeRowIndex;
        activeRowIndex = index;
        rows.forEach((row, rowIndex) => {
            const active = rowIndex === index;
            row.classList.toggle("is-current", active);
            if (active) nodes[rowIndex].setAttribute("aria-current", "step");
            else nodes[rowIndex].removeAttribute("aria-current");
        });
        positionCompass(index);
        if (changed) compass?.style.setProperty("--edu-compass-angle", `${compassAngles[index] ?? 0}deg`);
    };

    const update = () => {
        frame = 0;
        const pathRect = path.getBoundingClientRect();
        const firstRect = nodes[0].getBoundingClientRect();
        const lastRect = nodes[nodes.length - 1].getBoundingClientRect();
        const firstY = firstRect.top + firstRect.height / 2;
        const lastY = lastRect.top + lastRect.height / 2;
        const lineLength = Math.max(1, lastY - firstY);

        path.style.setProperty("--edu-line-left", `${firstRect.left + firstRect.width / 2 - pathRect.left}px`);
        path.style.setProperty("--edu-line-top", `${firstY - pathRect.top}px`);
        path.style.setProperty("--edu-line-height", `${lineLength}px`);

        const progress = reducedMotion ? 1 : clamp((window.innerHeight * 0.72 - firstY) / lineLength);
        path.style.setProperty("--edu-progress", progress.toFixed(3));
        if (activeRowIndex >= 0) positionCompass(activeRowIndex);
        if (!("IntersectionObserver" in window)) {
            const viewportCenter = window.innerHeight / 2;
            let nearestIndex = 0;
            let nearestDistance = Infinity;
            rows.forEach((row, index) => {
                const rect = row.getBoundingClientRect();
                const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = index;
                }
            });
            if (nearestIndex !== activeRowIndex) setActiveRow(nearestIndex);
        }
    };

    const scheduleUpdate = () => {
        if (!frame) frame = window.requestAnimationFrame(update);
    };

    if (reducedMotion || !("IntersectionObserver" in window)) {
        rows.forEach(row => row.classList.add("is-visible"));
    }
    setActiveRow(0);
    nodes.forEach((node, index) => {
        node.addEventListener("click", () => {
            setActiveRow(index);
            rows[index].scrollIntoView({
                behavior: reducedMotion ? "auto" : "smooth",
                block: "center"
            });
        });
    });
    if ("IntersectionObserver" in window) {
        const visibleRows = new Map();
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) visibleRows.set(entry.target, entry.intersectionRatio);
                else visibleRows.delete(entry.target);
            });

            const viewportCenter = window.innerHeight / 2;
            let bestIndex = -1;
            let bestScore = -1;
            visibleRows.forEach((ratio, row) => {
                const index = rows.indexOf(row);
                if (index < 0) return;
                const rect = row.getBoundingClientRect();
                const centerDistance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
                const centerScore = 1 - Math.min(1, centerDistance / Math.max(1, window.innerHeight));
                const score = ratio * .7 + centerScore * .3;
                if (score > bestScore) {
                    bestScore = score;
                    bestIndex = index;
                }
            });
            if (bestIndex >= 0) setActiveRow(bestIndex);
        }, { threshold: [0, .1, .25, .5, .75, 1] });
        rows.forEach(row => observer.observe(row));
    }
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    if ("ResizeObserver" in window) {
        const resizeObserver = new ResizeObserver(scheduleUpdate);
        resizeObserver.observe(path);
        rows.forEach(row => resizeObserver.observe(row));
    }
    update();
}
function setupHeroLaptop() {
    const hero = $("#about");
    const laptop = $("#heroLaptop");
    const model = $("#laptopModel");
    const keyboard = $("#laptopKeyboard");
    if (!hero || !laptop || !model) return;

    if (keyboard) {
        keyboard.innerHTML = [13, 13, 13, 11].map(count => `
            <div class="laptop-key-row">${Array.from({ length: count }, () => "<span></span>").join("")}</div>
        `).join("");
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) laptop.classList.add("laptop-static", "is-active", "is-visible");
    else if ("IntersectionObserver" in window) {
        new IntersectionObserver(entries => {
            laptop.classList.toggle("is-visible", entries[0].isIntersecting);
        }, { rootMargin: "120px" }).observe(laptop);
    } else laptop.classList.add("is-visible");

    const canTilt = !reducedMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!canTilt) return;

    hero.addEventListener("pointermove", event => {
        const bounds = hero.getBoundingClientRect();
        const horizontal = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
        const vertical = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
        model.style.setProperty("--laptop-tilt-x", `${((0.5 - vertical) * 7).toFixed(2)}deg`);
        model.style.setProperty("--laptop-tilt-y", `${((0.5 - horizontal) * 7).toFixed(2)}deg`);
    }, { passive: true });
    hero.addEventListener("pointerleave", () => {
        model.style.setProperty("--laptop-tilt-x", "0deg");
        model.style.setProperty("--laptop-tilt-y", "0deg");
    }, { passive: true });
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
    if (!target) return;
    const line = "Building practical machine learning systems";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        target.textContent = line;
        return;
    }

    let position = 0;

    const write = () => {
        target.textContent = line.slice(0, position);
        position += 1;
        if (position <= line.length) window.setTimeout(write, 19);
    };

    target.textContent = "";
    window.setTimeout(write, 160);
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
        const accent = getComputedStyle(document.body).getPropertyValue("--hero-signal").trim() || "#28777c";
        const maxDistance = Math.min(166, Math.max(108, width * 0.13));
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
                context.globalAlpha = (1 - distance / maxDistance) * 0.2;
                context.lineWidth = 0.82;
                context.stroke();
            }
            context.beginPath();
            context.arc(x, y, pointerDistance < 125 ? 2.3 : 1.5, 0, Math.PI * 2);
            context.fillStyle = accent;
            context.globalAlpha = pointerDistance < 125 ? 0.66 : 0.42;
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
        const count = Math.max(24, Math.round(width / 20));
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
    setupCertificateModal();
    setupContactForm();
    setupActiveNavigation();
    setupMilestoneTimeline();
    setupScrollProgress();
    setupHeroAtmosphere();
    setupHeroLaptop();
    setupFilters();
    setupProjectCarousel();
    setupCertificateControls();
    setupHeroNetwork();
    setupHeroTyping();
    setupReveal();
    setupEducationTimeline();
    setupProjectVideoPreviews();
    setupToolkitInteractions($("#skillsContainer"));
    const year = $("#currentYear");
    if (year) year.textContent = String(new Date().getFullYear());

    const loaders = [loadProjects, loadCertificates, loadSkills, loadResearch];
    await Promise.allSettled(loaders.map(load => load()));
});
