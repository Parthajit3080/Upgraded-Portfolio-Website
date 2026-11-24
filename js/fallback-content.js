export const FALLBACK_PROJECTS = [
    {
        id: "agrivision",
        data: {
            title: "AgrIVision",
            category: "Computer Vision",
            shortDesc: "A computer vision project exploring visual analysis for agriculture.",
            description: "AgrIVision explores how computer vision can support agricultural analysis. The local project archive includes a video demonstration and image previews.",
            techStack: "Computer vision · Applied machine learning",
            fileName: "AgriVision.mp4",
            screenshots: ["AgriVision.mp4", "AgrIVision Preview.jpg"]
        }
    },
    {
        id: "gan",
        data: {
            title: "GAN Architecture Comparison",
            category: "Applied AI",
            shortDesc: "A comparative analysis of GAN architectures for image synthesis.",
            description: "A comparative analysis of generative adversarial network architectures for image synthesis, recognized with a special mention at the Tenth Summer School on Computer Vision, Image Processing, Machine Learning and Vision Language Models in 2025.",
            techStack: "Generative models · Deep learning",
            fileName: "GAN.png",
            screenshots: ["GAN preview.png"]
        }
    },
    {
        id: "movie-recommendation",
        data: {
            title: "Movie Recommendation System",
            category: "Applied AI",
            shortDesc: "A recommendation systems project focused on movie discovery.",
            description: "A movie recommendation project exploring how machine learning can help people discover films. The local archive includes interface and result previews.",
            techStack: "Machine learning · Recommendation systems",
            fileName: "movie.png",
            screenshots: ["movie preview.png"]
        }
    },
    {
        id: "terminal",
        data: {
            title: "Terminal",
            category: "Systems",
            shortDesc: "A command-line project exploring core systems concepts.",
            description: "A systems-oriented command-line project. The local archive includes a video demonstration and a screenshot.",
            techStack: "Systems programming",
            fileName: "Terminal.mp4",
            screenshots: ["Terminal.mp4", "Terminal.jpg"]
        }
    },
    {
        id: "weather-orion",
        data: {
            title: "Weather Orion",
            category: "Systems",
            shortDesc: "A weather-focused application with a data-driven interface.",
            description: "A weather-focused application project. The local archive includes a video demonstration and interface previews.",
            techStack: "Web application · Weather data",
            fileName: "Weather Orion.mp4",
            screenshots: ["Weather Orion.mp4", "Weather Orion preview.png"]
        }
    }
];

export const FALLBACK_PROJECT_BY_ID = Object.fromEntries(
    FALLBACK_PROJECTS.map(project => [project.id, project.data])
);
