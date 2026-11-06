let observer;

export function setupReveal(root = document) {
    if (!window.IntersectionObserver || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.body.classList.add("reveal-ready");
    observer ??= new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    }, { rootMargin: "0px 0px -7% 0px", threshold: 0.08 });

    const targets = root.querySelectorAll(
        ".section-heading, .edu-row, .project-item, .certificate-item, .skill-pill, .achievement-card, .research-card, .contact-info, .contact-form-wrapper, .gallery-year-section, .event-folder, .gallery-event, .gallery-photo"
    );
    targets.forEach((target, index) => {
        if (target.dataset.revealReady) return;
        target.dataset.revealReady = "true";
        target.classList.add("reveal-item");
        target.style.setProperty("--reveal-delay", `${Math.min(index % 5, 4) * 45}ms`);
        observer.observe(target);
    });
}
