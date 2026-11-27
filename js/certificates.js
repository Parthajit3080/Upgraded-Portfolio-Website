import { escapeHtml, safeAssetFilename, safeExternalUrl } from "./safe-content.js";

/** @typedef {"Award" | "Internship" | "Certification" | "Competition"} CertificateCategory */
/**
 * @typedef {Object} CertificateItem
 * @property {string} id
 * @property {string} title
 * @property {string} issuer
 * @property {string} year
 * @property {string} image
 * @property {CertificateCategory} category
 * @property {boolean} featured
 * @property {string} accentColor
 * @property {string[]} skills
 * @property {string} summary
 * @property {string=} verifyUrl
 * @property {string=} fileName
 */

export const certificateSeeds = [
    {
        id: "isi-top3", title: "Special Mention · ISI Kolkata", issuer: "Tenth Summer School on Computer Vision", year: "2025",
        image: "assets/certificates/thumbnails/isi-top3.png", fileName: "ECSU Special Mention.pdf", category: "Award", featured: true,
        accentColor: "#1E40AF", skills: ["Computer Vision", "GANs"],
        summary: "Received a Special Mention for a team project comparing generative adversarial network architectures during the Tenth Summer School on Computer Vision."
    },
    {
        id: "isi-participation", title: "Tenth Summer School on Computer Vision", issuer: "Electronics and Communication Sciences Unit · ISI Kolkata", year: "2025",
        image: "assets/certificates/thumbnails/isi-participation.png", fileName: "ECSU Participation.pdf", category: "Internship", featured: false,
        accentColor: "#536B58", skills: ["Computer Vision", "Deep Learning"],
        summary: "Completed the Tenth Summer School on Computer Vision, including its lectures and team project work."
    },
    {
        id: "ideas-internship", title: "Data Science Internship", issuer: "IDEAS · ISI Kolkata", year: "2024",
        image: "assets/certificates/thumbnails/ideas-internship.png", fileName: "IDEAS Internship Certificate.pdf", category: "Internship", featured: false,
        accentColor: "#A6402B", skills: ["Data Science", "Python", "Research"],
        summary: "Completed a three-month data science internship, investigating public perceptions of the growth of AI and machine learning applications."
    },
    {
        id: "nptel-ml", title: "Introduction to Machine Learning", issuer: "NPTEL · Elite", year: "2025",
        image: "assets/certificates/thumbnails/nptel-ml.png", fileName: "NPTEL.pdf", category: "Certification", featured: false,
        accentColor: "#881337", skills: ["Machine Learning", "Model Evaluation"],
        summary: "Completed NPTEL’s Introduction to Machine Learning course with an Elite certification and a final score of 69%."
    },
    {
        id: "ramanujan-rank3", title: "Ramanujan Math Talent Search · Rank 3", issuer: "JMMC · Ramanujan Memorial", year: "2018",
        image: "assets/certificates/thumbnails/ramanujan-rank3.png", fileName: "Ramanujan.pdf", category: "Competition", featured: true,
        accentColor: "#B45309", skills: ["Mathematics", "Problem Solving"],
        summary: "Placed third in the 11th All India Math Talent Search Examination in 2018 and received Grade A."
    }
];

const categories = new Set(["Award", "Internship", "Certification", "Competition"]);
const seedById = new Map(certificateSeeds.map(item => [item.id, item]));
const cardItems = new Map(certificateSeeds.map(item => [item.id, item]));
const categoryClass = value => String(value || "Certification").toLowerCase();
let suppressCertificateClickUntil = 0;

function findSeed(record) {
    const data = record.data || {};
    const haystack = `${record.id || ""} ${data.title || ""} ${data.issuer || ""} ${data.fileName || ""}`.toLowerCase();
    return certificateSeeds.find(item => haystack.includes(item.id) ||
        (item.id === "isi-top3" && /special mention|top.?3/i.test(haystack)) ||
        (item.id === "isi-participation" && /participation|tenth summer school/i.test(haystack)) ||
        (item.id === "ideas-internship" && /ideas|internship/i.test(haystack)) ||
        (item.id === "nptel-ml" && /nptel|introduction to machine learning/i.test(haystack)) ||
        (item.id === "ramanujan-rank3" && /ramanujan|talent search/i.test(haystack))) || null;
}

function normalizedImage(value, fallback) {
    const external = safeExternalUrl(value);
    if (external) return external;
    const path = String(value || "").replace(/\\/g, "/");
    if (/^assets\/certificates\/thumbnails\/[\w(). -]+\.(?:png|jpe?g|webp)$/i.test(path) && !path.includes("..")) return path;
    const filename = safeAssetFilename(value);
    if (filename && /\.(?:png|jpe?g|webp)$/i.test(filename)) return `assets/certificates/${filename}`;
    return fallback;
}

/** @param {{id:string,data:Record<string,any>}} record */
export function normalizeCertificate(record) {
    const data = record.data || {};
    const seed = findSeed(record) || seedById.get(record.id) || {};
    const rawCategory = String(data.category || seed.category || "Certification");
    const skills = Array.isArray(data.skills) ? data.skills : seed.skills;
    const fileName = safeAssetFilename(data.fileName || data.document || seed.fileName || "");
    const id = seed.id || String(record.id || data.id || "certificate").replace(/[^A-Za-z0-9_-]/g, "-").slice(0, 80);
    let issuer = String(seed.issuer || data.issuer || "").trim();
    let year = String(seed.year || data.year || "").trim();
    if (!seed.id && !year) {
        const match = issuer.match(/(?:\s*[·,–-]\s*|\s+)((?:19|20)\d{2})$/);
        if (match) { year = match[1]; issuer = issuer.slice(0, match.index).trim(); }
    }
    const item = {
        ...seed,
        id,
        title: String(seed.title || data.title || "Certificate"),
        issuer,
        year,
        image: normalizedImage(data.image || data.thumbnail || seed.image, seed.image || ""),
        category: seed.id ? seed.category : (categories.has(rawCategory) ? rawCategory : "Certification"),
        featured: typeof data.featured === "boolean" ? data.featured : Boolean(seed.featured),
        accentColor: /^#[0-9a-f]{6}$/i.test(String(data.accentColor || "")) ? data.accentColor : (seed.accentColor || "#A6402B"),
        skills: [...new Set((Array.isArray(skills) ? skills : []).map(value => String(value).trim()).filter(Boolean))].slice(0, 4),
        summary: String(data.summary || data.description || seed.summary || "Credential awarded for completed academic or professional work."),
        fileName,
        verifyUrl: safeExternalUrl(data.verifyUrl || data.verificationUrl || seed.verifyUrl || "")
    };
    cardItems.set(id, item);
    return item;
}

export function renderCertificateCard(item) {
    const accent = /^#[0-9a-f]{6}$/i.test(item.accentColor) ? item.accentColor : "#A6402B";
    const image = item.image || "";
    const fileName = safeAssetFilename(item.fileName || "");
    const skills = item.skills.slice(0, 2).map(skill => `<span>${escapeHtml(skill)}</span>`).join("");
    return `<article class="certificate-item${item.featured ? " is-featured" : ""}" data-category="${escapeHtml(categoryClass(item.category))}" style="--certificate-accent:${accent}">
        <button class="certificate-card-trigger" type="button" data-certificate-id="${escapeHtml(item.id)}" aria-label="View ${escapeHtml(item.title)} credential">
            <span class="certificate-art"><img class="certificate-thumbnail" src="${escapeHtml(image)}" alt="" loading="lazy">${item.featured ? `<span class="certificate-ribbon">Featured</span>` : ""}</span>
            <span class="certificate-copy"><span class="certificate-category"><i aria-hidden="true"></i>${escapeHtml(item.category)}</span><span class="certificate-title">${escapeHtml(item.title)}</span><span class="certificate-meta">${escapeHtml(item.issuer)}${item.year ? ` · ${escapeHtml(item.year)}` : ""}</span>${skills ? `<span class="certificate-skills">${skills}</span>` : ""}</span>
        </button>
        <span class="certificate-file-path" hidden>${escapeHtml(fileName)}</span>
    </article>`;
}

export function setupCertificateControls() {
    const track = document.getElementById("certificatesContainer");
    const toggle = document.getElementById("certToggleBtn");
    if (!track) return;
    const setToggleText = () => {
        const expanded = track.classList.contains("cert-grid");
        const count = track.querySelectorAll(":scope > .certificate-item").length;
        if (toggle) {
            toggle.textContent = expanded ? "Show Carousel" : `See All (${count})`;
            toggle.setAttribute("aria-expanded", String(expanded));
            toggle.hidden = count < 2;
        }
        track.closest(".cert-carousel-wrapper")?.classList.toggle("is-grid", expanded);
    };
    if (track.dataset.certificateControlsReady) { setToggleText(); return; }
    track.dataset.certificateControlsReady = "true";
    const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrollBehavior = () => reducedMotion() ? "auto" : "smooth";
    toggle?.addEventListener("click", () => {
        track.classList.toggle("cert-grid");
        setToggleText();
    });
    document.getElementById("certPrev")?.addEventListener("click", () => {
        const card = track.querySelector(":scope > .certificate-item:not([hidden])");
        track.scrollBy({ left: -Math.max(250, (card?.getBoundingClientRect().width || 280) + 16), behavior: scrollBehavior() });
    });
    document.getElementById("certNext")?.addEventListener("click", () => {
        const card = track.querySelector(":scope > .certificate-item:not([hidden])");
        track.scrollBy({ left: Math.max(250, (card?.getBoundingClientRect().width || 280) + 16), behavior: scrollBehavior() });
    });
    let drag = null;
    track.addEventListener("pointerdown", event => {
        if (track.classList.contains("cert-grid") || event.target.closest("button")) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        drag = { x: event.clientX, scroll: track.scrollLeft, id: event.pointerId, moved: false };
        track.classList.add("is-dragging");
        track.setPointerCapture?.(event.pointerId);
    });
    track.addEventListener("pointermove", event => {
        if (!drag || drag.id !== event.pointerId) return;
        const delta = event.clientX - drag.x;
        if (Math.abs(delta) > 4) {
            drag.moved = true;
            track.scrollLeft = drag.scroll - delta;
            event.preventDefault();
        }
    }, { passive: false });
    const endDrag = event => {
        if (!drag || drag.id !== event.pointerId) return;
        if (drag.moved) suppressCertificateClickUntil = performance.now() + 260;
        drag = null;
        track.classList.remove("is-dragging");
    };
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("lostpointercapture", endDrag);
    let centerFrame = 0;
    track.addEventListener("scroll", () => {
        if (track.classList.contains("cert-grid")) return;
        if (centerFrame) return;
        centerFrame = requestAnimationFrame(() => {
            centerFrame = 0;
            if (track.classList.contains("cert-grid")) return;
            const center = track.getBoundingClientRect().left + track.clientWidth / 2;
            let closest = null;
            let distance = Infinity;
            track.querySelectorAll(":scope > .certificate-item:not([hidden])").forEach(card => {
                const bounds = card.getBoundingClientRect();
                const delta = Math.abs(bounds.left + bounds.width / 2 - center);
                if (delta < distance) { distance = delta; closest = card; }
            });
            track.querySelectorAll(".certificate-item.is-centered").forEach(card => card.classList.remove("is-centered"));
            closest?.classList.add("is-centered");
        });
    }, { passive: true });
    track.dispatchEvent(new Event("scroll"));

    if (!reducedMotion() && "IntersectionObserver" in window) {
        const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-certificate-visible");
            reveal.unobserve(entry.target);
        }), { root: track, threshold: .35 });
        const observeCards = () => track.querySelectorAll(":scope > .certificate-item:not([data-certificate-reveal])").forEach((card, index) => {
            card.dataset.certificateReveal = "true";
            card.style.setProperty("--certificate-order", String(index));
            reveal.observe(card);
        });
        observeCards();
        new MutationObserver(observeCards).observe(track, { childList: true });
    } else {
        track.querySelectorAll(".certificate-item").forEach(card => card.classList.add("is-certificate-visible"));
    }
    if (window.matchMedia("(pointer: fine)").matches && !reducedMotion()) {
        track.addEventListener("pointermove", event => {
            const card = event.target.closest(".certificate-item");
            if (!card || !track.contains(card)) return;
            const bounds = card.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / Math.max(1, bounds.width);
            const y = (event.clientY - bounds.top) / Math.max(1, bounds.height);
            card.style.setProperty("--certificate-tilt-x", `${((.5 - y) * 8).toFixed(2)}deg`);
            card.style.setProperty("--certificate-tilt-y", `${((x - .5) * 8).toFixed(2)}deg`);
            card.style.setProperty("--certificate-pointer-x", `${(x * 100).toFixed(1)}%`);
            card.style.setProperty("--certificate-pointer-y", `${(y * 100).toFixed(1)}%`);
        }, { passive: true });
        track.addEventListener("pointerout", event => {
            const card = event.target.closest(".certificate-item");
            if (!card || card.contains(event.relatedTarget)) return;
            ["--certificate-tilt-x", "--certificate-tilt-y"].forEach(name => card.style.removeProperty(name));
        }, { passive: true });
    }
    setToggleText();
}

export function setupCertificateModal() {
    const modal = document.getElementById("certificateModal");
    const documentStage = document.getElementById("certificateModalDocument");
    if (!modal || !documentStage || modal.dataset.ready) return;
    modal.dataset.ready = "true";
    const closeButton = modal.querySelector("[data-certificate-close]");
    const zoomLabel = modal.querySelector("[data-certificate-zoom-label]");
    let previousFocus = null;
    let zoom = 1;
    let closeTimer = 0;

    const close = () => {
        if (modal.getAttribute("aria-hidden") !== "false") return;
        modal.classList.add("is-closing");
        window.clearTimeout(closeTimer);
        closeTimer = window.setTimeout(() => {
            modal.setAttribute("aria-hidden", "true");
            modal.classList.remove("is-closing");
            document.body.classList.remove("certificate-modal-open");
            documentStage.replaceChildren();
            previousFocus?.focus();
        }, 180);
    };
    const applyZoom = value => {
        zoom = Math.max(1, Math.min(2.5, value));
        const media = documentStage.querySelector("img, iframe");
        if (media) media.style.transform = `scale(${zoom})`;
        if (zoomLabel) zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    };
    const open = (trigger, item) => {
        previousFocus = trigger;
        const title = document.getElementById("certificateModalTitle");
        const metadata = document.getElementById("certificateModalMeta");
        const category = document.getElementById("certificateModalCategory");
        const summary = document.getElementById("certificateModalSummary");
        const skills = document.getElementById("certificateModalSkills");
        const verify = document.getElementById("certificateVerifyLink");
        const issuerLine = `${item.issuer}${item.year ? ` · ${item.year}` : ""}`;
        title.textContent = item.title;
        metadata.textContent = issuerLine;
        category.textContent = item.category;
        category.style.setProperty("--certificate-accent", item.accentColor);
        summary.textContent = item.summary;
        skills.replaceChildren(...item.skills.map(skill => {
            const pill = document.createElement("span");
            pill.textContent = skill;
            return pill;
        }));
        verify.hidden = !item.verifyUrl;
        if (item.verifyUrl) verify.href = item.verifyUrl;

        documentStage.replaceChildren();
        const fileName = safeAssetFilename(item.fileName || "");
        const extension = fileName.split(".").pop().toLowerCase();
        if (fileName && extension === "pdf") {
            const frame = document.createElement("iframe");
            frame.src = `assets/certificates/${encodeURIComponent(fileName)}#toolbar=0&navpanes=0&view=FitH`;
            frame.title = `${item.title} certificate scan`;
            frame.className = "certificate-modal-pdf";
            documentStage.append(frame);
        } else {
            const image = document.createElement("img");
            image.src = item.image;
            image.alt = `${item.title} certificate scan`;
            image.className = "certificate-modal-image";
            image.draggable = false;
            documentStage.append(image);
        }
        applyZoom(1);
        modal.classList.remove("is-closing");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("certificate-modal-open");
        closeButton?.focus();
    };

    document.getElementById("certificatesContainer")?.addEventListener("click", event => {
        if (performance.now() < suppressCertificateClickUntil) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        const trigger = event.target.closest("[data-certificate-id]");
        if (!trigger) return;
        const item = cardItems.get(trigger.dataset.certificateId);
        if (item) open(trigger, item);
    });
    closeButton?.addEventListener("click", close);
    modal.addEventListener("click", event => { if (event.target === modal) close(); });
    modal.querySelector("[data-certificate-zoom-in]")?.addEventListener("click", () => applyZoom(zoom + .25));
    modal.querySelector("[data-certificate-zoom-out]")?.addEventListener("click", () => applyZoom(zoom - .25));
    modal.querySelector("[data-certificate-zoom-reset]")?.addEventListener("click", () => applyZoom(1));
    documentStage.addEventListener("wheel", event => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        applyZoom(zoom + (event.deltaY < 0 ? .1 : -.1));
    }, { passive: false });
    document.addEventListener("keydown", event => {
        if (modal.getAttribute("aria-hidden") !== "false") return;
        if (event.key === "Escape") {
            close();
        } else if (event.key === "Tab") {
            const focusable = [...modal.querySelectorAll("button:not([disabled]), a[href]:not([hidden])")].filter(element => element.offsetParent !== null);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            const cards = [...document.querySelectorAll("#certificatesContainer .certificate-card-trigger")];
            const current = cards.indexOf(previousFocus);
            const nextIndex = current + (event.key === "ArrowRight" ? 1 : -1);
            if (cards[nextIndex]) {
                event.preventDefault();
                const next = cards[nextIndex];
                const nextItem = cardItems.get(next.dataset.certificateId);
                if (nextItem) { open(next, nextItem); closeButton?.focus(); }
            }
        }
    });
}
