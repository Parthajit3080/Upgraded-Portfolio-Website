export const FALLBACK_PROJECTS = [
    {
        id: "agrivision",
        data: {
            title: "AgrIVision",
            year: "2026",
            category: "Computer Vision",
            shortDesc: "A computer vision project exploring visual analysis for agriculture.",
            description: "AgrIVision explores how computer vision can support agricultural analysis. The local project archive includes a video demonstration and image previews.",
            techStack: "Next.js, React, FastAPI, ONNX Runtime, PostgreSQL, SQLite, Monte Carlo, ARIMA",
            fileName: "AgriVision.mp4",
            screenshots: ["AgriVision.mp4", "AgrIVision Preview.jpg"]
        }
    },
    {
        id: "gan",
        data: {
            title: "Comparative Analysis of GAN Architectures",
            year: "2024",
            category: "Applied AI",
            shortDesc: "A comparative analysis of GAN architectures for image synthesis.",
            description: "A comparative analysis of generative adversarial network architectures for image synthesis, recognized with a special mention at the Tenth Summer School on Computer Vision, Image Processing, Machine Learning and Vision Language Models in 2025.",
            techStack: "PyTorch, Matplotlib, GANs, WGAN",
            fileName: "GAN.png",
            screenshots: ["GAN preview.png"]
        }
    },
    {
        id: "movie-recommendation",
        data: {
            title: "Hybrid Movie Recommendation System",
            year: "2026",
            category: "Applied AI",
            shortDesc: "A recommendation systems project focused on movie discovery.",
            description: "A movie recommendation project exploring how machine learning can help people discover films. The local archive includes interface and result previews.",
            techStack: "Matplotlib, Scikit-learn, Kaggle, PyTorch, DistilBERT, SVD, LightGBM",
            fileName: "movie.png",
            screenshots: ["movie preview.png"]
        }
    },
    {
        id: "terminal",
        data: {
            title: "Terminator",
            year: "2026",
            category: "Systems",
            shortDesc: "A command-line project exploring core systems concepts.",
            description: "A systems-oriented command-line project. The local archive includes a video demonstration and a screenshot.",
            techStack: "C, Xlib (X11), POSIX API, Pthreads, Linux, GCC",
            fileName: "Terminal.mp4",
            screenshots: ["Terminal.mp4", "Terminal.jpg"]
        }
    },
    {
        id: "weather-orion",
        data: {
            title: "Weather Orion",
            year: "2025",
            category: "Systems",
            shortDesc: "A weather-focused application with a data-driven interface.",
            description: "A weather-focused application project. The local archive includes a video demonstration and interface previews.",
            techStack: "HTML, CSS, JavaScript, REST APIs, WeatherAPI",
            fileName: "Weather Orion.mp4",
            screenshots: ["Weather Orion.mp4", "Weather Orion preview.png"]
        }
    },
    {
        id: "personal-portfolio",
        data: {
            title: "Upgraded Portfolio Website",
            year: "2025",
            category: "Systems",
            shortDesc: "A responsive portfolio presenting research, projects, milestones, and skills.",
            description: "A personal portfolio built to present research, engineering projects, academic milestones, and technical skills through an interactive editorial interface.",
            techStack: "HTML, CSS, JavaScript, Firebase Cloud",
            fileName: "myportfolio.png",
            screenshots: ["myportfolio.png"]
        }
    }
];

export const FALLBACK_PROJECT_BY_ID = Object.fromEntries(
    FALLBACK_PROJECTS.map(project => [project.id, project.data])
);

const projectPresentation = [
    { id: "agrivision", title: "AgrIVision", match: /agrivision/, year: "2026", techStack: FALLBACK_PROJECT_BY_ID.agrivision.techStack, enforceTechStack: true, legacy: ["Computer vision · Applied machine learning"] },
    { id: "gan", title: "Comparative Analysis of GAN Architectures", match: /gan|generative adversarial/, year: "2024", techStack: FALLBACK_PROJECT_BY_ID.gan.techStack, enforceTechStack: true, legacy: ["Generative models · Deep learning"] },
    { id: "movie-recommendation", title: "Hybrid Movie Recommendation System", match: /recommendation|movie recommender/, year: "2026", techStack: FALLBACK_PROJECT_BY_ID["movie-recommendation"].techStack, enforceTechStack: true, legacy: ["Machine learning · Recommendation systems"] },
    { id: "terminal", title: "Terminator", match: /terminator|terminal/, year: "2026", techStack: FALLBACK_PROJECT_BY_ID.terminal.techStack, enforceTechStack: true, legacy: ["Systems programming"] },
    { id: "weather-orion", match: /weather orion/, year: "2025", techStack: FALLBACK_PROJECT_BY_ID["weather-orion"].techStack, enforceTechStack: false, legacy: ["Web application · Weather data"] },
    { id: "personal-portfolio", title: "Upgraded Portfolio Website", match: /portfolio/, year: "2025", techStack: FALLBACK_PROJECT_BY_ID["personal-portfolio"].techStack, enforceTechStack: true, legacy: [] }
];

export function getProjectPresentation(data = {}, id = "") {
    const normalizedId = String(id || "").toLowerCase();
    const title = String(data.title || "").toLowerCase();
    return projectPresentation.find(item => item.id === normalizedId || item.match.test(title)) || null;
}

export function withProjectPresentation(data = {}, id = "") {
    const presentation = getProjectPresentation(data, id);
    if (!presentation) return data;
    const rawStack = String(data.techStack || "").trim();
    const useKnownStack = !rawStack || presentation.legacy.includes(rawStack);
    let techStack = data.techStackManual === true
        ? rawStack
        : presentation.enforceTechStack || useKnownStack ? presentation.techStack : rawStack;
    if (presentation.id === "agrivision" && data.techStackManual !== true) {
        const technologies = techStack.split(",").map(value => value.trim()).filter(Boolean);
        ["Monte Carlo", "ARIMA"].forEach(requiredTechnology => {
            if (!technologies.some(value => value.toLowerCase() === requiredTechnology.toLowerCase())) technologies.push(requiredTechnology);
        });
        techStack = technologies.join(", ");
    }
    return {
        ...data,
        title: data.titleManual === true ? data.title : presentation.title || data.title,
        year: data.year || presentation.year,
        techStack
    };
}
