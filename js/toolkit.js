import { escapeHtml, safeExternalUrl } from "./safe-content.js";

const devicon = name => `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${name}/${name}-original.svg`;
const simpleIcon = (name, color) => `https://cdn.simpleicons.org/${name}/${color}`;

export const TOOL_BRANDS = new Map([
    ["c++", { iconUrl: devicon("cplusplus"), brandColor: "#00599C", context: "Builds efficient systems, algorithms, and performance-focused code." }],
    ["python", { iconUrl: devicon("python"), brandColor: "#3776AB", context: "Used for data analysis, machine learning, and rapid prototyping." }],
    ["vs code", { iconUrl: devicon("vscode"), brandColor: "#007ACC", context: "Primary editor for application, research, and systems development." }],
    ["google colab", { iconUrl: simpleIcon("googlecolab", "F9AB00"), brandColor: "#F9AB00", context: "Runs notebook experiments and GPU-assisted model training." }],
    ["c", { iconUrl: devicon("c"), brandColor: "#A8B9CC", context: "Used to study low-level programming and operating-system concepts." }],
    ["windows", { iconUrl: devicon("windows11"), brandColor: "#0078D4", context: "Main desktop environment for development and research workflows." }],
    ["java", { iconUrl: devicon("java"), brandColor: "#E76F00", context: "Supports object-oriented programming and application development." }],
    ["linux", { iconUrl: devicon("linux"), brandColor: "#FCC624", context: "Used for shell workflows, systems work, and software development." }],
    ["opencv", { iconUrl: devicon("opencv"), brandColor: "#5C3EE8", context: "Computer-vision pipelines and image-processing experiments." }],
    ["numpy", { iconUrl: devicon("numpy"), brandColor: "#4D77CF", context: "Numerical computing and array operations for ML experiments." }],
    ["pandas", { iconUrl: devicon("pandas"), brandColor: "#150458", context: "Data cleaning, exploration, and feature preparation." }],
    ["transformers", { iconUrl: simpleIcon("huggingface", "FFD21E"), brandColor: "#D5A800", context: "Transformer models for language and recommendation-system research." }],
    ["pytorch", { iconUrl: devicon("pytorch"), brandColor: "#EE4C2C", context: "Builds and trains deep-learning and computer-vision models." }],
    ["kaggle", { iconUrl: devicon("kaggle"), brandColor: "#20BEFF", context: "Explores datasets, notebooks, and machine-learning benchmarks." }],
    ["matplotlib", { iconUrl: devicon("matplotlib"), brandColor: "#11557C", context: "Visualizes experiments, model behavior, and data distributions." }],
    ["github", { iconUrl: devicon("github"), brandColor: "#171515", context: "Version control, collaboration, and publishing project code." }],
    ["html", { iconUrl: devicon("html5"), brandColor: "#E34F26", context: "Structures accessible pages and interfaces for web projects." }],
    ["vercel", { iconUrl: simpleIcon("vercel", "000000"), brandColor: "#242424", context: "Deploys portfolio and web-app projects to the public web." }],
    ["css", { iconUrl: devicon("css3"), brandColor: "#1572B6", context: "Styles responsive interfaces and interaction details." }],
    ["mysql", { iconUrl: devicon("mysql"), brandColor: "#4479A1", context: "Stores and queries structured data for application projects." }],
    ["sql", { iconUrl: devicon("azuresqldatabase"), brandColor: "#0078D4", context: "Queries and manages relational data across project workflows." }],
    ["full-stack development", { brandColor: "#B4432A", context: "Connects polished front ends, application logic, and data services." }],
    ["firebase", { iconUrl: devicon("firebase"), brandColor: "#FFCA28", context: "Provides authentication, hosting, and Firestore data for web apps." }],
    ["machine learning", { brandColor: "#526F8B", context: "Applies statistical learning methods to prediction and ranking tasks." }],
    ["computer vision", { iconUrl: devicon("opencv"), brandColor: "#5C3EE8", context: "Extracts useful signals from images and visual data." }],
    ["generative models", { iconUrl: simpleIcon("huggingface", "FFD21E"), brandColor: "#D5A800", context: "Studies generative learning, image synthesis, and model evaluation." }],
    ["data structures & algorithms", { brandColor: "#536B58", context: "Supports efficient problem solving and algorithm design." }],
    ["operating systems", { iconUrl: devicon("linux"), brandColor: "#FCC624", context: "Explores processes, memory, concurrency, and system interfaces." }],
    ["computer networks", { brandColor: "#54788C", context: "Builds understanding of protocols and networked applications." }],
    ["dbms", { iconUrl: devicon("mysql"), brandColor: "#4479A1", context: "Designs, models, and queries reliable database systems." }]
]);

const toolkitStates = new WeakMap();
const fullStackIcon = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m8.6 7.2-4.1 4.8 4.1 4.8M15.4 7.2l4.1 4.8-4.1 4.8M13.5 4.8l-3 14.4"/><path d="M3 3.8h18v16.4H3z"/></svg>`;

function cleanColor(value, fallback) {
    return /^#[\da-f]{6}$/i.test(String(value || "")) ? String(value) : fallback;
}

function normalizedName(value) {
    return String(value || "").trim().toLocaleLowerCase();
}

function initials(name) {
    const words = String(name || "Tool").trim().split(/\s+/).filter(Boolean);
    return escapeHtml(words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0].slice(0, 2)).toUpperCase();
}

export function normalizeTool(record, categoryName = "") {
    const data = record.data || record;
    const name = String(data.name || "").trim();
    const brand = TOOL_BRANDS.get(normalizedName(name)) || {};
    const customIcon = safeExternalUrl(data.iconUrl || data.icon || "");
    const iconUrl = customIcon.startsWith("https:") ? customIcon : brand.iconUrl || "";
    const context = String(data.context || brand.context || `Used in ${categoryName || "project"} work and technical learning.`).trim();
    return {
        id: String(record.id || data.id || normalizedName(name).replace(/[^a-z0-9]+/g, "-")),
        name,
        categoryName,
        iconUrl,
        brandColor: cleanColor(data.brandColor, brand.brandColor || "#B4432A"),
        context
    };
}

function iconMarkup(tool) {
    if (!tool.iconUrl && normalizedName(tool.name) === "full-stack development") return fullStackIcon;
    if (!tool.iconUrl) return `<span class="skill-icon-monogram" aria-hidden="true">${initials(tool.name)}</span>`;
    return `<img class="skill-brand-icon" src="${escapeHtml(tool.iconUrl)}" alt="" loading="lazy" decoding="async" data-skill-icon>`;
}

export function renderSkillGroups(groups) {
    return groups.map((group, groupIndex) => {
        const tools = (group.items || []).map(item => normalizeTool(item, group.name));
        return `<section class="skill-group" data-skill-group="${escapeHtml(group.id)}" data-skill-category="${escapeHtml(group.name)}" style="--group-order:${groupIndex}">
            <header class="skill-group-header"><span class="skill-group-index">${String(groupIndex + 1).padStart(2, "0")}</span><h3>${escapeHtml(group.name)}</h3><span class="skill-group-count">${tools.length} ${tools.length === 1 ? "tool" : "tools"}</span></header>
            <div class="skill-group-items">${tools.length ? tools.map((tool, toolIndex) => `<button class="skill-pill" type="button" data-skill-id="${escapeHtml(tool.id)}" data-skill-name="${escapeHtml(tool.name)}" data-skill-context="${escapeHtml(tool.context)}" style="--brand-color:${tool.brandColor};--pill-order:${toolIndex}" aria-pressed="false" aria-label="${escapeHtml(tool.name)}. ${escapeHtml(tool.context)}"><span class="skill-icon-wrap">${iconMarkup(tool)}</span><span class="skill-pill-name">${escapeHtml(tool.name)}</span></button>`).join("") : `<p class="skill-group-empty">No tools added yet.</p>`}</div>
        </section>`;
    }).join("");
}

function iconFallback(image) {
    if (!image?.isConnected) return;
    const pill = image.closest(".skill-pill");
    if (!pill) return;
    const fallback = document.createElement("span");
    fallback.className = "skill-icon-monogram";
    fallback.setAttribute("aria-hidden", "true");
    fallback.textContent = String(pill.dataset.skillName || "Tool").trim().slice(0, 2).toUpperCase();
    image.replaceWith(fallback);
}

function bindIconFallbacks(container) {
    container.querySelectorAll("img[data-skill-icon]").forEach(image => {
        if (image.dataset.fallbackBound) return;
        image.dataset.fallbackBound = "true";
        image.addEventListener("error", () => iconFallback(image), { once: true });
        if (image.complete && image.naturalWidth === 0) iconFallback(image);
    });
}

function createFilterPills(filters, groups) {
    if (!filters) return;
    const total = groups.reduce((sum, group) => sum + group.count, 0);
    filters.innerHTML = `<button class="skill-filter is-active" type="button" data-skill-filter="all" aria-pressed="true">All <span>(${total})</span></button>${groups.map(group => `<button class="skill-filter" type="button" data-skill-filter="${escapeHtml(group.id)}" aria-pressed="false">${escapeHtml(group.name)}</button>`).join("")}`;
}

function setupReveal(section, state) {
    const targets = [...section.querySelectorAll(".skill-group, .skill-pill")];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    state.revealObserver?.disconnect();
    state.revealObserver = null;
    if (reducedMotion || !("IntersectionObserver" in window)) {
        targets.forEach(target => target.classList.add("is-tool-visible"));
        section.classList.remove("toolkit-motion-ready");
        return;
    }
    section.classList.add("toolkit-motion-ready");
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const target = entry.target;
        target.classList.add("is-tool-visible");
        target.addEventListener("animationend", () => { target.dataset.revealDone = "true"; }, { once: true });
        observer.unobserve(entry.target);
    }), { rootMargin: "0px 0px -6% 0px", threshold: 0.1 });
    state.revealObserver = observer;
    targets.forEach(target => {
        const groupIndex = Number(target.closest(".skill-group")?.style.getPropertyValue("--group-order") || 0);
        const pillIndex = Number(target.style.getPropertyValue("--pill-order") || 0);
        const delay = target.matches(".skill-group") ? groupIndex * 85 : groupIndex * 85 + Math.min(pillIndex, 7) * 32;
        target.style.setProperty("--tool-reveal-delay", `${delay}ms`);
        observer.observe(target);
    });
}

export function setupToolkitInteractions(container = document.getElementById("skillsContainer"), groupsInput = null) {
    if (!container) return;
    const filters = document.getElementById("skillFilters");
    const inspector = document.getElementById("skillInspector");
    const state = toolkitStates.get(container) || { filter: "all", selectedId: "", bound: false };
    toolkitStates.set(container, state);

    const groups = groupsInput || [...container.querySelectorAll(":scope > .skill-group")].map((element, index) => ({
        id: element.dataset.skillGroup || `skill-group-${index}`,
        name: element.dataset.skillCategory || element.querySelector("h3")?.textContent?.trim() || "Tools",
        count: element.querySelectorAll(".skill-pill").length
    }));
    createFilterPills(filters, groups);
    const groupsById = new Map(groups.map(group => [String(group.id), group]));

    const updateInspector = tool => {
        if (!inspector) return;
        const name = inspector.querySelector("[data-tool-name]");
        const context = inspector.querySelector("[data-tool-context]");
        const kicker = inspector.querySelector("[data-tool-kicker]");
        const active = tool || null;
        if (name) name.textContent = active?.dataset.skillName || "Explore the toolkit";
        if (context) context.textContent = active?.dataset.skillContext || "Focus a tool to see where it fits; select one to keep its note here.";
        if (kicker) kicker.textContent = state.selectedId && active?.dataset.skillId === state.selectedId ? "Selected tool" : active ? "Tool in focus" : "Toolkit note";
        if (active) inspector.style.setProperty("--brand-color", active.style.getPropertyValue("--brand-color") || "#B4432A");
        else inspector.style.removeProperty("--brand-color");
    };
    const applyFilter = (filter, animate = true) => {
        state.filter = filter;
        const activeButton = filters?.querySelector(`[data-skill-filter="${CSS.escape(filter)}"]`);
        filters?.querySelectorAll("[data-skill-filter]").forEach(button => {
            const active = button === activeButton;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        });
        container.querySelectorAll(":scope > .skill-group").forEach(group => {
            const show = filter === "all" || group.dataset.skillGroup === filter;
            const animateGroup = animate && show && group.classList.contains("is-tool-visible");
            group.hidden = !show;
            group.classList.toggle("is-filter-entering", animateGroup);
            if (animateGroup) window.setTimeout(() => group.classList.remove("is-filter-entering"), 280);
        });
    };

    if (!state.bound) {
        state.bound = true;
        filters?.addEventListener("click", event => {
            const button = event.target.closest("[data-skill-filter]");
            if (!button || !filters.contains(button)) return;
            applyFilter(button.dataset.skillFilter);
        });
        container.addEventListener("click", event => {
            const button = event.target.closest(".skill-pill");
            if (!button || !container.contains(button)) return;
            const nextId = state.selectedId === button.dataset.skillId ? "" : button.dataset.skillId;
            state.selectedId = nextId;
            container.querySelectorAll(".skill-pill").forEach(pill => {
                const selected = pill.dataset.skillId === nextId;
                pill.classList.toggle("is-selected", selected);
                pill.setAttribute("aria-pressed", String(selected));
            });
            updateInspector(nextId ? button : null);
        });
        container.addEventListener("pointerover", event => {
            const button = event.target.closest(".skill-pill");
            if (!button || !container.contains(button) || button.contains(event.relatedTarget)) return;
            if (!state.selectedId) updateInspector(button);
        });
        container.addEventListener("pointerout", event => {
            const button = event.target.closest(".skill-pill");
            if (!button || button.contains(event.relatedTarget)) return;
            if (!state.selectedId) updateInspector(null);
        });
        container.addEventListener("focusin", event => {
            const button = event.target.closest(".skill-pill");
            if (button && !state.selectedId) updateInspector(button);
        });
        container.addEventListener("focusout", event => {
            if (!container.contains(event.relatedTarget) && !state.selectedId) updateInspector(null);
        });
        container.addEventListener("pointermove", event => {
            const group = event.target.closest(".skill-group");
            if (!group) return;
            const bounds = group.getBoundingClientRect();
            group.style.setProperty("--mouse-x", `${event.clientX - bounds.left}px`);
            group.style.setProperty("--mouse-y", `${event.clientY - bounds.top}px`);
        }, { passive: true });
        container.addEventListener("pointerleave", () => {
            container.querySelectorAll(".skill-group").forEach(group => {
                group.style.removeProperty("--mouse-x");
                group.style.removeProperty("--mouse-y");
            });
            if (!state.selectedId) updateInspector(null);
        }, { passive: true });
    }

    const activeFilter = groupsById.has(state.filter) || state.filter === "all" ? state.filter : "all";
    applyFilter(activeFilter, false);
    bindIconFallbacks(container);
    const section = container.closest(".skills-section") || container;
    setupReveal(section, state);
    updateInspector(state.selectedId ? container.querySelector(`[data-skill-id="${CSS.escape(state.selectedId)}"]`) : null);
}
