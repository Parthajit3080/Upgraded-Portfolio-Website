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
 * @property {string=} verifyLabel
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
        summary: "Completed NPTEL’s Introduction to Machine Learning course with an Elite certification and a final score of 69%.",
        verifyUrl: "https://nptel.ac.in/courses", verifyLabel: "NPTEL certificate portal"
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
        verifyUrl: safeExternalUrl(data.verifyUrl || data.verificationUrl || seed.verifyUrl || ""),
        verifyLabel: String(data.verifyLabel || seed.verifyLabel || "Verify with issuer")
    };
    cardItems.set(id, item);
    return item;
}

export function renderCertificateCard(item) {
    const accent = /^#[0-9a-f]{6}$/i.test(item.accentColor) ? item.accentColor : "#A6402B";
    const title = escapeHtml(item.title);
    const id = escapeHtml(item.id);
    const category = escapeHtml(item.category);
    const image = escapeHtml(item.image || "");
    const year = escapeHtml(item.year || "");
    const issuer = escapeHtml(item.issuer || "");
    const ribbon = item.featured ? '<span class="certificate-card-ribbon">Featured</span>' : "";
    return '<article class="certificate-item' + (item.featured ? " is-featured" : "") + '" data-category="' + escapeHtml(categoryClass(item.category)) + '" style="--certificate-accent:' + accent + '" role="listitem">' +
        '<button class="certificate-card-trigger" type="button" data-certificate-id="' + id + '" aria-haspopup="dialog" aria-label="View ' + title + ' certificate">' +
            '<span class="certificate-card-topline"><span class="certificate-card-category">' + category + '</span><span class="certificate-card-year">' + year + '</span></span>' +
            '<span class="certificate-card-art"><img class="certificate-thumbnail" src="' + image + '" alt="" loading="lazy" decoding="async"><span class="certificate-card-number"></span><span class="certificate-card-reflection" aria-hidden="true"></span>' + ribbon + '</span>' +
            '<span class="certificate-card-copy"><span class="certificate-card-title">' + title + '</span><span class="certificate-card-meta">' + issuer + '</span></span>' +
        '</button></article>';
}

export function setupCertificateControls() {
    const track = document.getElementById("certificatesContainer");
    if (!track) return;
    const toggle = document.getElementById("certificateGalleryToggle");
    const countLabel = document.getElementById("certificateGalleryCount");
    const previousArrow = document.getElementById("certificateGalleryPrevious");
    const nextArrow = document.getElementById("certificateGalleryNext");
    const filterGroup = document.querySelector('.filter-tabs[data-filter-group="certificates"]');
    const cards = () => [...track.querySelectorAll(":scope > .certificate-item")];
    const categoryVisibleCards = () => cards().filter(card => !card.hidden);
    const displayCards = () => categoryVisibleCards();
    const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (track.certificateGalleryController) {
        track.certificateGalleryController.refresh();
        return;
    }

    let expanded = false;
    let revealObserver = null;
    let activeCardId = null;

    const observeCards = () => {
        const all = cards();
        all.forEach((card, index) => {
            card.style.setProperty("--gallery-order", String(index));
            const number = card.querySelector(".certificate-card-number");
            if (number) number.textContent = String(index + 1).padStart(2, "0");
            if (card.dataset.galleryReveal) return;
            card.dataset.galleryReveal = "true";
            if (reducedMotion() || !("IntersectionObserver" in window)) {
                card.classList.add("is-gallery-visible");
                return;
            }
            revealObserver ||= new IntersectionObserver(entries => entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-gallery-visible");
                revealObserver.unobserve(entry.target);
            }), { threshold: .08, rootMargin: "0px 0px -5% 0px" });
            revealObserver.observe(card);
        });
    };

    const updateArrowState = () => {
        const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
        const canScroll = !expanded && maxScroll > 2;
        if (previousArrow) previousArrow.disabled = !canScroll || track.scrollLeft <= 1;
        if (nextArrow) nextArrow.disabled = !canScroll || track.scrollLeft >= maxScroll - 1;
    };

    const syncActiveCardToScroll = () => {
        if (expanded) return;
        const visible = categoryVisibleCards();
        if (!visible.length) return;
        const trackLeft = track.getBoundingClientRect().left;
        const active = visible.reduce((closest, card) => {
            return Math.abs(card.getBoundingClientRect().left - trackLeft) < Math.abs(closest.getBoundingClientRect().left - trackLeft) ? card : closest;
        }, visible[0]);
        activeCardId = active.querySelector("[data-certificate-id]")?.dataset.certificateId || null;
        cards().forEach(card => card.classList.toggle("is-gallery-current", card === active));
    };

    const handleTrackScroll = () => {
        updateArrowState();
        syncActiveCardToScroll();
    };

    const updateGalleryState = () => {
        const all = cards();
        const eligible = categoryVisibleCards();
        track.dataset.visibleCount = String(eligible.length);
        eligible.forEach(card => {
            card.removeAttribute("data-gallery-limited");
            card.setAttribute("aria-hidden", "false");
            card.removeAttribute("inert");
        });
        all.filter(card => card.hidden).forEach(card => {
            card.setAttribute("aria-hidden", "true");
            card.setAttribute("inert", "");
        });
        const cardWidth = eligible[0]?.getBoundingClientRect().width || 0;
        const gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
        const visibleCapacity = cardWidth ? Math.max(1, Math.floor((track.clientWidth + gap) / (cardWidth + gap))) : 4;
        const shown = Math.min(eligible.length, expanded ? eligible.length : visibleCapacity);
        const displayed = displayCards();
        if (!displayed.some(card => card.querySelector("[data-certificate-id]")?.dataset.certificateId === activeCardId)) {
            activeCardId = displayed[0]?.querySelector("[data-certificate-id]")?.dataset.certificateId || null;
        }
        all.forEach(card => {
            const id = card.querySelector("[data-certificate-id]")?.dataset.certificateId;
            card.classList.toggle("is-gallery-current", Boolean(id && id === activeCardId));
        });
        if (toggle) {
            toggle.hidden = eligible.length <= 4;
            toggle.textContent = expanded ? "Show Less" : "See All (" + eligible.length + ")";
            toggle.setAttribute("aria-expanded", String(expanded));
        }
        if (countLabel) countLabel.textContent = "Showing " + shown + " of " + eligible.length + (eligible.length === 1 ? " credential" : " credentials");
        track.dataset.expanded = String(expanded);
        track.closest(".certificate-gallery-stage")?.classList.toggle("is-expanded", expanded);
        updateArrowState();
    };

    const setExpanded = next => {
        if (expanded === next) {
            updateGalleryState();
            return;
        }
        expanded = next;
        if (!next) track.scrollTo({ left: 0, behavior: reducedMotion() ? "auto" : "smooth" });
        updateGalleryState();
        observeCards();
    };

    const navigate = (direction, { focusTarget = false } = {}) => {
        const eligible = categoryVisibleCards();
        if (eligible.length < 2) return;
        let index = eligible.findIndex(card => card.querySelector("[data-certificate-id]")?.dataset.certificateId === activeCardId);
        if (index < 0) index = direction > 0 ? 0 : eligible.length - 1;
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= eligible.length) return;
        index = nextIndex;
        const target = eligible[index];
        activeCardId = target.querySelector("[data-certificate-id]")?.dataset.certificateId || null;
        updateGalleryState();
        if (expanded) {
            if (focusTarget) {
                target.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "nearest" });
                target.querySelector(".certificate-card-trigger")?.focus({ preventScroll: true });
            }
            return;
        }
        const cardWidth = eligible[0].getBoundingClientRect().width;
        const gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
        track.scrollBy({ left: direction * (cardWidth + gap), behavior: reducedMotion() ? "auto" : "smooth" });
        if (focusTarget) target.querySelector(".certificate-card-trigger")?.focus({ preventScroll: true });
    };

    const refresh = () => {
        observeCards();
        updateGalleryState();
    };

    track.applyCertificateGalleryFilter = () => {
        if (expanded) setExpanded(false);
        else {
            activeCardId = null;
            track.scrollTo({ left: 0, behavior: reducedMotion() ? "auto" : "smooth" });
            updateGalleryState();
        }
    };
    track.certificateGalleryController = { refresh, setExpanded };
    track.addEventListener("pointermove", event => {
        if (event.pointerType && event.pointerType !== "mouse") return;
        const card = event.target.closest?.(".certificate-item");
        if (!card || card.hidden) return;
        const button = card.querySelector(".certificate-card-trigger");
        if (!button) return;
        const bounds = card.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
        const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
        card.style.setProperty("--card-tilt-x", ((.5 - y) * 4.3).toFixed(2) + "deg");
        card.style.setProperty("--card-tilt-y", ((x - .5) * 5.2).toFixed(2) + "deg");
        button.style.setProperty("--card-glare-x", (x * 100).toFixed(1) + "%");
        button.style.setProperty("--card-glare-y", (y * 100).toFixed(1) + "%");
    }, { passive: true });
    track.addEventListener("pointerout", event => {
        const card = event.target.closest?.(".certificate-item");
        if (!card || card.contains(event.relatedTarget)) return;
        card.style.setProperty("--card-tilt-x", "0deg");
        card.style.setProperty("--card-tilt-y", "0deg");
    }, { passive: true });
    track.addEventListener("pointerleave", () => {
        cards().forEach(card => {
            card.style.setProperty("--card-tilt-x", "0deg");
            card.style.setProperty("--card-tilt-y", "0deg");
        });
    });
    track.addEventListener("scroll", handleTrackScroll, { passive: true });
    window.addEventListener("resize", updateGalleryState, { passive: true });
    track.addEventListener("keydown", event => {
        if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        const current = event.target.closest?.(".certificate-card-trigger");
        if (!current) return;
        if (!displayCards().some(card => card.contains(current))) return;
        event.preventDefault();
        navigate(event.key === "ArrowRight" ? 1 : -1, { focusTarget: true });
    });
    track.addEventListener("click", event => {
        const card = event.target.closest?.(".certificate-item");
        if (!card) return;
        activeCardId = card.querySelector("[data-certificate-id]")?.dataset.certificateId || null;
        updateGalleryState();
    });
    previousArrow?.addEventListener("click", () => navigate(-1));
    nextArrow?.addEventListener("click", () => navigate(1));
    toggle?.addEventListener("click", () => setExpanded(!expanded));
    filterGroup?.addEventListener("click", event => {
        if (!event.target.closest("[data-filter]")) return;
        window.requestAnimationFrame(() => {
            if (expanded) setExpanded(false);
            else {
                activeCardId = null;
                track.scrollTo({ left: 0, behavior: reducedMotion() ? "auto" : "smooth" });
                updateGalleryState();
            }
        });
    });
    if ("MutationObserver" in window) {
        new MutationObserver(() => {
            observeCards();
            updateGalleryState();
        }).observe(track, { childList: true, attributes: true, attributeFilter: ["hidden"] });
    }

    track.classList.add("is-ready");
    refresh();
}

export function setupCertificateModal() {
    const modal = document.getElementById("certificateModal");
    const documentStage = document.getElementById("certificateModalDocument");
    if (!modal || !documentStage || modal.dataset.ready) return;
    modal.dataset.ready = "true";
    const closeButton = modal.querySelector("[data-certificate-close]");
    const zoomLabel = modal.querySelector("[data-certificate-zoom-label]");
    const track = document.getElementById("certificatesContainer");
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
        const viewLink = document.getElementById("certificateViewLink");
        const downloadLink = document.getElementById("certificateDownloadLink");
        const fileName = safeAssetFilename(item.fileName || "");
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
        else verify.removeAttribute("href");
        const verifyLabel = verify.querySelector("[data-verify-label]");
        if (verifyLabel) verifyLabel.textContent = item.verifyLabel || "Verify with issuer";

        const originalUrl = fileName ? `assets/certificates/${encodeURIComponent(fileName)}` : item.image;
        const downloadName = fileName || item.image.split("/").pop() || `${item.id}-certificate`;
        viewLink.href = originalUrl;
        viewLink.hidden = !originalUrl;
        downloadLink.href = originalUrl;
        downloadLink.download = downloadName;
        downloadLink.hidden = !originalUrl;
        const downloadLabel = downloadLink.querySelector("[data-download-label]");
        if (downloadLabel) downloadLabel.textContent = /\.pdf$/i.test(fileName) ? "Download PDF" : "Download scan";

        documentStage.replaceChildren();
        const extension = fileName.split(".").pop().toLowerCase();
        if (fileName && extension === "pdf") {
            const frame = document.createElement("iframe");
            frame.src = `assets/certificates/${encodeURIComponent(fileName)}#toolbar=0&navpanes=0&view=Fit`;
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

    track?.addEventListener("click", event => {
        const trigger = event.target.closest?.(".certificate-card-trigger");
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
            const cards = [...document.querySelectorAll('#certificatesContainer .certificate-item:not([hidden]) .certificate-card-trigger')];
            const current = cards.indexOf(previousFocus);
            const activeIndex = current >= 0 ? current : 0;
            const nextIndex = cards.length ? (activeIndex + (event.key === "ArrowRight" ? 1 : -1) + cards.length) % cards.length : -1;
            if (nextIndex >= 0 && cards[nextIndex]) {
                event.preventDefault();
                const next = cards[nextIndex];
                const nextItem = cardItems.get(next.dataset.certificateId);
                if (nextItem) {
                    open(next, nextItem);
                    closeButton?.focus();
                }
            }
        }
    });
}
