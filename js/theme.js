export function setupThemeToggle(button) {
    if (!button) return;

    let initialTheme = "light";
    try { initialTheme = localStorage.getItem("portfolio-theme") || "light"; } catch { /* Storage may be disabled. */ }

    const apply = theme => {
        const dark = theme === "dark";
        document.body.classList.toggle("dark-mode", dark);
        document.body.classList.toggle("light-mode", !dark);
        button.textContent = dark ? "☼" : "☾";
        button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    };

    apply(initialTheme);
    button.addEventListener("click", () => {
        const theme = document.body.classList.contains("dark-mode") ? "light" : "dark";
        apply(theme);
        try { localStorage.setItem("portfolio-theme", theme); } catch { /* Theme still applies for this visit. */ }
    });
}
