import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./js/firebase.js";
import { escapeHtml, safeExternalUrl, safeAssetFilename, safeDocumentId } from "./js/safe-content.js";
import { setupThemeToggle } from "./js/theme.js";
import { setupReveal } from "./js/reveal.js";

const container = document.getElementById("projectDetails");
setupThemeToggle(document.getElementById("projectThemeToggle"));
const resultImageExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const resultVideoTypes = { mp4: "video/mp4", webm: "video/webm", ogg: "video/ogg", ogv: "video/ogg" };

function renderResultMedia(filename, title, index) {
    const extension = filename.split(".").pop().toLowerCase();
    const source = escapeHtml(`assets/projects/${encodeURIComponent(filename)}`);
    if (resultVideoTypes[extension]) {
        return `<div class="result-media-slot result-media-video-slot">
            <video class="result-media-video" muted loop playsinline controls preload="none" aria-label="Result ${index + 1} video for ${escapeHtml(title)}">
                <source src="${source}" type="${resultVideoTypes[extension]}">
            </video>
        </div>`;
    }

    return `<div class="result-media-slot">
        <img class="result-media-image" src="${source}" alt="Result ${index + 1} for ${escapeHtml(title)}" loading="lazy">
    </div>`;
}

function setupResultVideoPreviews(root) {
    const videos = Array.from(root.querySelectorAll(".result-media-video"));
    if (!videos.length) return;

    const visibleVideos = new Set();
    let observer = null;
    const playVideo = video => {
        if (document.hidden || !video.paused) return;
        video.playbackRate = 1.5;
        const playback = video.play();
        playback?.catch(() => { video.controls = true; });
    };

    videos.forEach(video => {
        video.addEventListener("loadedmetadata", () => { video.playbackRate = 1.5; }, { once: true });
        video.addEventListener("error", () => {
            visibleVideos.delete(video);
            observer?.unobserve(video);
            const message = document.createElement("span");
            message.className = "result-media-error";
            message.textContent = "Video preview unavailable";
            video.closest(".result-media-slot")?.replaceChildren(message);
        }, { once: true });
    });

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
            if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
                visibleVideos.add(video);
                playVideo(video);
            } else {
                visibleVideos.delete(video);
                video.pause();
            }
        });
    }, { threshold: [0, 0.35] });

    videos.forEach(video => observer.observe(video));
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) videos.forEach(video => video.pause());
        else visibleVideos.forEach(playVideo);
    });
}

function renderDescription(description) {
    const paragraphs = [];
    const output = [];
    let items = [];
    let listType = "";

    const flushParagraph = () => {
        if (paragraphs.length) output.push(`<p>${paragraphs.map(escapeHtml).join("<br>")}</p>`);
        paragraphs.length = 0;
    };
    const flushList = () => {
        if (!items.length) return;
        const tag = listType === "ordered" ? "ol" : "ul";
        output.push(`<${tag}>${items.map(text => `<li>${escapeHtml(text)}</li>`).join("")}</${tag}>`);
        items = [];
        listType = "";
    };

    String(description || "").replace(/\r\n/g, "\n").split("\n").forEach(line => {
        const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
        const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
        if (bullet || ordered) {
            const nextType = ordered ? "ordered" : "unordered";
            if (listType && listType !== nextType) flushList();
            flushParagraph();
            listType = nextType;
            items.push((bullet || ordered)[1]);
        } else if (!line.trim()) {
            flushParagraph();
            flushList();
        } else {
            flushList();
            paragraphs.push(line.trim());
        }
    });
    flushParagraph();
    flushList();
    return output.join("");
}

async function loadProject() {
    const id = safeDocumentId(new URLSearchParams(location.search).get("id"));
    if (!id) {
        container.innerHTML = '<section class="project-section"><h2>Project not selected</h2><p>Choose a project from the portfolio to read its notes.</p></section>';
        return;
    }

    try {
        const snapshot = await getDoc(doc(db, "projects", id));
        if (!snapshot.exists()) {
            container.innerHTML = '<section class="project-section"><h2>Project not found</h2><p>This project may have moved or been removed.</p></section>';
            return;
        }

        const data = snapshot.data();
        const title = String(data.title || "Project notes");
        document.title = `${title} — Parthajit Das`;
        const rawResults = Array.isArray(data.screenshots)
            ? data.screenshots
            : typeof data.screenshots === "string" ? data.screenshots.split(",") : [];
        const screenshots = rawResults.slice(0, 2).map(value => {
            const filename = safeAssetFilename(value);
            if (!filename) return "";
            const extension = filename.split(".").pop().toLowerCase();
            return resultImageExtensions.has(extension) || resultVideoTypes[extension] ? filename : "";
        });
        const resultMedia = screenshots.filter(Boolean);
        const hasResults = resultMedia.length > 0;
        const github = safeExternalUrl(data.github);
        const paper = safeExternalUrl(data.paper);

        container.innerHTML = `
            <p class="section-kicker">Project notes</p>
            <h1>${escapeHtml(title)}</h1>
            ${data.description ? `<section class="project-section"><h2>Overview</h2><div class="project-description">${renderDescription(data.description)}</div></section>` : ""}
            ${(data.techStack || data.dataset) ? `<div class="meta-grid">
                ${data.techStack ? `<section class="project-section"><h2>Tools & methods</h2><p>${escapeHtml(data.techStack)}</p></section>` : ""}
                ${data.dataset ? `<section class="project-section"><h2>Data</h2><p>${escapeHtml(data.dataset)}</p></section>` : ""}
            </div>` : ""}
            ${(github || paper) ? `<div class="button-row">
                ${github ? `<a href="${escapeHtml(github)}" rel="noopener noreferrer" target="_blank" class="btn">Source code ↗</a>` : ""}
                ${paper ? `<a href="${escapeHtml(paper)}" rel="noopener noreferrer" target="_blank" class="text-link">Research paper ↗</a>` : ""}
            </div>` : ""}
            ${hasResults ? `<section class="project-section"><h2>Results</h2><div class="result-gallery">${resultMedia.map((filename, index) => renderResultMedia(filename, title, index)).join("")}</div></section>` : ""}`;
        setupResultVideoPreviews(container);
        setupReveal(container);
    } catch (error) {
        console.error("Unable to load project details.", error);
        container.innerHTML = '<section class="project-section"><h2>Project details are unavailable</h2><p>Please return to the portfolio and try again later.</p></section>';
    }
}

loadProject();
