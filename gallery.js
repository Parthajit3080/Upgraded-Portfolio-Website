import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "./js/firebase.js";
import { escapeHtml, safeGalleryPath, safeDocumentId } from "./js/safe-content.js";
import { setupThemeToggle } from "./js/theme.js";
import { setupReveal } from "./js/reveal.js";

const wrapper = document.getElementById("galleryWrapper");
const modal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const modalClose = modal?.querySelector(".close-btn");
let currentEvents = [];
setupThemeToggle(document.getElementById("galleryThemeToggle"));

function yearFor(event) {
    return /^\d{4}/.test(String(event.date || "")) ? String(event.date).slice(0, 4) : "Unsorted";
}

function renderFolders(events) {
    const years = new Map();
    events.forEach(event => {
        const year = yearFor(event);
        if (!years.has(year)) years.set(year, []);
        years.get(year).push(event);
    });

    wrapper.innerHTML = [...years.keys()]
        .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }))
        .map(year => `
            <section class="gallery-year-section" aria-labelledby="year-${escapeHtml(year)}">
                <h2 class="gallery-year-heading" id="year-${escapeHtml(year)}">${escapeHtml(year)}</h2>
                <div class="event-folder-grid">
                    ${years.get(year).map(event => {
                        const cover = safeGalleryPath(event.coverImage || event.images[0]);
                        return `<button class="event-folder" type="button" data-event-id="${escapeHtml(event.id)}" aria-label="Open ${escapeHtml(event.title)} gallery">
                            ${cover ? `<img class="folder-cover" src="${escapeHtml(cover)}" alt="" loading="lazy">` : `<span class="folder-placeholder">No preview image</span>`}
                            <span class="folder-overlay"><span class="folder-title">${escapeHtml(event.title || "Untitled event")}</span><span class="folder-count">${event.images.length} ${event.images.length === 1 ? "photo" : "photos"}</span></span>
                        </button>`;
                    }).join("")}
                </div>
            </section>`)
        .join("");
    setupReveal(wrapper);
}

function showEvent(event, events) {
    const images = event.images.map(safeGalleryPath).filter(Boolean);
    wrapper.innerHTML = `
        <button class="back-to-years" type="button">← All years</button>
        <article class="gallery-event">
            <h2>${escapeHtml(event.title || "Untitled event")}</h2>
            ${event.date ? `<p class="date">${escapeHtml(event.date)}</p>` : ""}
            ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ""}
            <div class="gallery-divider"></div>
            <h3 class="photos-title">Photographs <span class="gallery-count">${images.length}</span></h3>
            ${images.length
                ? `<div class="gallery-images">${images.map((path, index) => `<button class="gallery-photo" type="button" data-image-path="${escapeHtml(path)}" aria-label="View photo ${index + 1} from ${escapeHtml(event.title)}"><img src="${escapeHtml(path)}" alt="${escapeHtml(event.title)} — photo ${index + 1}" loading="lazy"></button>`).join("")}</div>`
                : `<p class="gallery-empty">No photographs are available for this event.</p>`}
        </article>`;

    wrapper.querySelector(".back-to-years").addEventListener("click", () => renderFolders(events));
    setupReveal(wrapper);
}

wrapper.addEventListener("click", event => {
    const folder = event.target.closest(".event-folder");
    if (folder) {
        const selected = currentEvents.find(item => item.id === folder.dataset.eventId);
        if (selected) showEvent(selected, currentEvents);
        return;
    }

    const photo = event.target.closest(".gallery-photo");
    if (photo) {
        const path = safeGalleryPath(photo.dataset.imagePath);
        if (!path || !modal || !modalImage) return;
        modalImage.src = path;
        modal.setAttribute("aria-hidden", "false");
        modalClose?.focus();
    }
});

function closeModal() {
    if (!modal || !modalImage) return;
    modal.setAttribute("aria-hidden", "true");
    modalImage.removeAttribute("src");
}

modalClose?.addEventListener("click", closeModal);
modal?.addEventListener("click", event => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape") closeModal(); });

async function loadGallery() {
    try {
        const snapshot = await getDocs(collection(db, "gallery"));
        currentEvents = snapshot.docs
            .map(item => ({ id: safeDocumentId(item.id), ...item.data() }))
            .filter(item => item.id)
            .map(item => ({ ...item, images: Array.isArray(item.images) ? item.images : [] }))
            .sort((left, right) => (left.order ?? 999) - (right.order ?? 999));

        if (!currentEvents.length) {
            wrapper.innerHTML = '<p class="gallery-empty">No events have been added yet.</p>';
            return;
        }
        renderFolders(currentEvents);
    } catch (error) {
        console.error("Unable to load the gallery.", error);
        wrapper.innerHTML = '<p class="gallery-error" role="alert">The gallery is temporarily unavailable. Please try again later.</p>';
    }
}

loadGallery();
