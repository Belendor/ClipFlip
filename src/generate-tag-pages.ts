import fs from "node:fs";
import path from "node:path";

type TagVideo = {
    index: number;
    title: string;
    slug: string;
    models: string[];
    tags: string[];
    clipCount: number;
    clipIds: number[];
};

type SeoTagData = {
    tag: string;
    title: string;
    description: string;
    heading: string;
    intro: string;
    canonicalUrl: string;
    videoCount: number;
    clipCount: number;
    videoBaseUrl: string;
    thumbnailBaseUrl: string;
    videos: TagVideo[];
};

type TagPageConfig = {
    slug: string;
    title: string;
    description: string;
    heading: string;
    intro: string;
    related: string[];
};

type TagPage = TagPageConfig & SeoTagData;

const ROOT_DIR = path.resolve(process.cwd());
const API_BASE_URL = "http://localhost:3000";

const tagPageConfigs: TagPageConfig[] = [
    {
        slug: "anal",
        title: "Anal Porn Clips - Free Anal Videos | ClipFlip",
        description:
            "Browse free anal porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Anal Porn Clips",
        intro:
            "Browse anal porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: ["amateur", "hardcore", "pov", "milf"],
    },
    {
        slug: "amateur",
        title: "Amateur Porn Clips - Free Amateur Videos | ClipFlip",
        description:
            "Browse free amateur porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Amateur Porn Clips",
        intro:
            "Browse amateur porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: ["blowjob", "hardcore", "cowgirl", "doggystyle"],
    },
    {
        slug: "blowjob",
        title: "Blowjob Porn Clips - Free Blowjob Videos | ClipFlip",
        description:
            "Browse free blowjob porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Blowjob Porn Clips",
        intro:
            "Browse blowjob porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: ["deepthroat", "hardcore", "cock", "bbc"],
    },
    {
        slug: "panties",
        title: "Panties Porn Clips - Free Panties Videos | ClipFlip",
        description:
            "Browse free panties porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Panties Porn Clips",
        intro:
            "Browse panties porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: [],
    },
    {
        slug: "ass",
        title: "Ass Porn Clips - Free Ass Videos | ClipFlip",
        description:
            "Browse free ass porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Ass Porn Clips",
        intro:
            "Browse ass porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: [],
    },
    {
        slug: "cfnm",
        title: "Cfnm Porn Clips - Free Cfnm Videos | ClipFlip",
        description:
            "Browse free cfnm porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Cfnm Porn Clips",
        intro:
            "Browse cfnm porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: [],
    },
    {
        slug: "cum",
        title: "Cum Porn Clips - Free Cum Videos | ClipFlip",
        description:
            "Browse free cum porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Cum Porn Clips",
        intro:
            "Browse cum porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: [],
    },
    {
        slug: "cowgirl",
        title: "Cowgirl Porn Clips - Free Cowgirl Videos | ClipFlip",
        description:
            "Browse free cowgirl porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Cowgirl Porn Clips",
        intro:
            "Browse cowgirl porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: [],
    },
    {
        slug: "gangbang",
        title: "Gangbang Porn Clips - Free Gangbang Videos | ClipFlip",
        description:
            "Browse free gangbang porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Gangbang Porn Clips",
        intro:
            "Browse gangbang porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: [],
    },
    {
        slug: "doggy",
        title: "Doggy Porn Clips - Free Doggy Videos | ClipFlip",
        description:
            "Browse free doggy porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Doggy Porn Clips",
        intro:
            "Browse doggy porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: [],
    },
    {
        slug: "deepthroat",
        title: "Deepthroat Porn Clips - Free Deepthroat Videos | ClipFlip",
        description:
            "Browse free deepthroat porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Deepthroat Porn Clips",
        intro:
            "Browse deepthroat porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: [],
    },
    {
        slug: "handjob",
        title: "Handjob Porn Clips - Free Handjob Videos | ClipFlip",
        description:
            "Browse free handjob porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Handjob Porn Clips",
        intro:
            "Browse handjob porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: [],
    },
    {
        slug: "choking",
        title: "Choking Porn Clips - Free Choking Videos | ClipFlip",
        description:
            "Browse free choking porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Choking Porn Clips",
        intro:
            "Browse choking porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: [],
    },
    {
        slug: "feet",
        title: "Feet Porn Clips - Free Feet Videos | ClipFlip",
        description:
            "Browse free feet porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Feet Porn Clips",
        intro:
            "Browse feet porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: [],
    },
    {
        slug: "big boobs",
        title: "Big Boobs Porn Clips - Free Big Boobs Videos | ClipFlip",
        description:
            "Browse free big boobs porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Big Boobs Porn Clips",
        intro:
            "Browse big boobs porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: [],
    },
    {
        slug: "shemale",
        title: "Shemale Porn Clips - Free Shemale Videos | ClipFlip",
        description:
            "Browse free shemale porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Shemale Porn Clips",
        intro:
            "Browse shemale porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: [],
    },
    {
        slug: "pregnant",
        title: "Pregnant Porn Clips - Free Pregnant Videos | ClipFlip",
        description:
            "Browse free pregnant porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.",
        heading: "Pregnant Porn Clips",
        intro:
            "Browse shemale porn clips grouped by video title. Hover previews to see available clips, then open the endless player.",
        related: [],
    },
];

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function titleFromSlug(slug: string): string {
    return slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function renderRelatedLinks(related: string[]): string {
    return related
        .map((slug) => {
            const label = titleFromSlug(slug);
            return `<a href="/${slug}/">${escapeHtml(label)}</a>`;
        })
        .join("\n                    ");
}

function getThumbnailUrl(tag: TagPage, clipId: number): string {
    return `${tag.thumbnailBaseUrl}${clipId}.jpg`;
}

function getVideoUrl(tag: TagPage, clipId: number): string {
    return `${tag.videoBaseUrl}?id=${clipId}`;
}

function renderPreviewCards(tag: TagPage): string {
    if (tag.videos.length === 0) {
        return `
            <div class="tag-empty-state">
                No videos found for this tag yet.
            </div>`;
    }

    return tag.videos
        .map((video) => {
            const previewClipIds = video.clipIds.slice(0, 7);

            const img1 = previewClipIds[0]
                ? getThumbnailUrl(tag, previewClipIds[0])
                : "/thumbnail.jpg";

            const img2 = previewClipIds[1]
                ? getThumbnailUrl(tag, previewClipIds[1])
                : img1;

            const img3 = previewClipIds[2]
                ? getThumbnailUrl(tag, previewClipIds[2])
                : img2;
            const img4 = previewClipIds[3]
                ? getThumbnailUrl(tag, previewClipIds[3])
                : img3;
            const img5 = previewClipIds[4]
                ? getThumbnailUrl(tag, previewClipIds[4])
                : img4; 
            const img6 = previewClipIds[5]
                ? getThumbnailUrl(tag, previewClipIds[5])
                : img5; 
            const img7 = previewClipIds[6]
                ? getThumbnailUrl(tag, previewClipIds[6])
                : img6;

            const firstClipId = video.clipIds[video.clipIds.length - 1];
            const href = firstClipId
                ? getVideoUrl(tag, firstClipId)
                : `/?tag=${encodeURIComponent(tag.slug)}`;

            return `
            <a href="${href}" class="tag-video-card" aria-label="${escapeHtml(video.title)}">
                <div class="tag-preview"
                    title="${escapeHtml(video.title)}"
                    style="--img-1: url('${img1}'); --img-2: url('${img2}'); --img-3: url('${img3}'); --img-4: url('${img4}'); --img-5: url('${img5}'); --img-6: url('${img6}'); --img-7: url('${img7}');">
                </div>
            </a>`;
        })
        .join("\n");
}

async function fetchSeoTagData(slug: string): Promise<SeoTagData> {
    const response = await fetch(`${API_BASE_URL}/seo-tags/${slug}`);

    if (!response.ok) {
        throw new Error(
            `Failed to fetch SEO tag data for "${slug}". Status: ${response.status}`
        );
    }

    return response.json() as Promise<SeoTagData>;
}

function renderTagPage(tag: TagPage): string {
    const canonicalUrl = tag.canonicalUrl || `https://clip-flip.com/${tag.slug}/`;

    return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">

    <title>${escapeHtml(tag.title)}</title>

    <meta name="description" content="${escapeHtml(tag.description)}">

    <link rel="canonical" href="${canonicalUrl}">

    <meta name="robots" content="index,follow">
    <meta name="rating" content="adult">

    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeHtml(tag.heading)} - ClipFlip">
    <meta property="og:description" content="${escapeHtml(tag.description)}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:image" content="https://clip-flip.com/thumbnail.jpg">

    <link rel="stylesheet" href="/dist/output.css">
</head>

<body class="tag-page" data-initial-tag="${escapeHtml(tag.slug)}">
    <header class="tag-page-header">
        <a href="/" class="back-home-link" aria-label="Go back to ClipFlip main page">
            <span class="back-arrow">←</span>
            <span>Back to main page</span>
        </a>

        <div class="tag-page-brand">
            <span>ClipFlip</span>
        </div>
    </header>

    <main class="tag-page-main">
        <section class="tag-hero">
            <p class="tag-eyebrow">Adult tag page · ${tag.videoCount} videos · ${tag.clipCount} clips</p>

            <h1>${escapeHtml(tag.heading)}</h1>

            <p>${escapeHtml(tag.intro)}</p>

            <nav class="tag-related-pages" aria-label="Related adult tag pages">
                <span>Related pages</span>
                <div>
                    ${renderRelatedLinks(tag.related)}
                </div>
            </nav>
        </section>

        <section class="tag-video-grid" aria-label="${escapeHtml(tag.heading)} video previews">
${renderPreviewCards(tag)}
        </section>
    </main>
</body>

</html>
`;
}

async function generateTagPages(): Promise<void> {
    for (const config of tagPageConfigs) {
        const seoData = await fetchSeoTagData(config.slug);

        const tag: TagPage = {
            ...config,
            ...seoData,

            // config wins for SEO text, DB wins for videos/counts/URLs
            title: config.title,
            description: config.description,
            heading: config.heading,
            intro: config.intro,
        };

        const dir = path.join(ROOT_DIR, tag.slug);
        const filePath = path.join(dir, "index.html");

        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, renderTagPage(tag), "utf8");

        console.log(`Generated /${tag.slug}/index.html`);
    }
}

generateTagPages().catch((error) => {
    console.error(error);
    process.exit(1);
});