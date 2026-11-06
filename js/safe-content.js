export function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

export function safeExternalUrl(value) {
    try {
        const url = new URL(String(value));
        return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

export function safeAssetFilename(value) {
    const parts = String(value ?? "").replace(/\\/g, "/").split("/");
    const filename = parts.at(-1) ?? "";
    return /^[\p{L}\p{N}][\p{L}\p{N} ._()-]{0,127}$/u.test(filename) ? filename : "";
}

export function safeGalleryPath(value) {
    const path = String(value ?? "").replace(/\\/g, "/");
    if (!path.startsWith("assets/gallery/") || path.split("/").some(part => part === ".." || part === ".")) return "";
    if (/[<>"'`]/.test(path) || path.includes("://")) return "";
    return path;
}

export function safeDocumentId(value) {
    const id = String(value ?? "");
    return /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : "";
}
