import { config } from "./config";
import type { Tag, Video } from '../server/node_modules/@prisma/client/index.js';
export type SectionId = 1 | 2 | 3 | 4;
export type PlayerIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type PositionsMap = Record<SectionId, number>;

class State {
    PLAYED_KEY = "playedVideoIds";

    multiSection: boolean = false; // Whether to use multiple sections
    randomized: boolean = true;
    percentChance = config.defaultPercentChance; // 25% chance to modify position
    endIndex = config.defaultEndIndex; // Maximum position index
    positions: PositionsMap = {
        1: this.randomized ? this.randomInRange(1, this.endIndex * 0.25) : 1,
        2: this.randomized ? this.randomInRange(this.endIndex * 0.25, this.endIndex * 0.5) : 500,
        3: this.randomized ? this.randomInRange(this.endIndex * 0.5, this.endIndex * 0.75) : 1000,
        4: this.randomized ? this.randomInRange(this.endIndex * 0.75, this.endIndex) : 1500
    };
    activeTags: Map<SectionId, Tag["title"][]> = new Map();
    playing: Record<PlayerIndex, boolean> = {
        0: false,
        1: false,
        2: false,
        3: false,
        4: false,
        5: false,
        6: false,
        7: false,
    };
    apiUrl: string = config.apiUrl;
    taggedVideos: Video[] | null = null;
    taggedVideosPromise: Promise<void> | undefined;
    advancedMode: boolean = false;
    active = {
        0: true,
        1: false,
        2: true,
        3: false,
        4: true,
        5: false,
        6: true,
        7: false
    } as Record<PlayerIndex, boolean>;
    allTags: Tag[] = [];
    tagsPromise: Promise<void> | undefined;
    played: Set<number> = new Set();
    onEmptyPlays?: () => void;
    emptyPlays: boolean = false;
    constructor() {
        this.tagsPromise = this.fetchAllTags();
        this.taggedVideosPromise = this.queryTags();
    }
    markEmpty() {
        if (this.emptyPlays) return;
        this.emptyPlays = true;
        this.onEmptyPlays?.();
    }
    getPlayedVideos(): Set<number> {
        const raw = localStorage.getItem(this.PLAYED_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    }
    markVideoAsPlayed(id: number) {
        this.played.add(id);
        localStorage.setItem(this.PLAYED_KEY, JSON.stringify([...this.played]));
    }
    clearPlayedVideos() {
        localStorage.removeItem(this.PLAYED_KEY);
    }
    resetVideoProgress() {
        console.log("Resetting video cache & progress");

        // clear ALL local storage
        localStorage.clear();

        // optional: if you only want to clear specific keys
        // localStorage.removeItem("watchedVideos");
        // localStorage.removeItem("videoState");

    }
    async queryTags(): Promise<void> {
        const params = new URLSearchParams(window.location.search);
        const queryTagsRaw = params.get("tags");
        if (queryTagsRaw) {
            console.log("URL tags found:", queryTagsRaw);

            // 1. Split by comma, trim whitespace, and remove any empty strings
            const tagsArray = queryTagsRaw
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            // Direct loop over our known SectionIds
            const ids: SectionId[] = [1, 2, 3, 4];

            ids.forEach((id) => {
                // Create a unique clone for each specific section
                this.activeTags.set(id, [...new Set(tagsArray)]);
            });
            await this.fetchVideosByTags(1);
        } else {
            // Direct loop over our known SectionIds
            const ids: SectionId[] = [1, 2, 3, 4];

            ids.forEach((id) => {
                // Create a unique clone for each specific section
                this.activeTags.set(id, []);
            });
        }
    }
    handleNoMoreTaggedVideos() {
        console.log("No more videos for selected tags");

        // disable tag buttons
        // document.querySelectorAll(".tag-button").forEach(btn => {
        //     btn.setAttribute("disabled", "true");
        //     btn.classList.add("disabled");
        // });

        // show info box
        console.log("tRIGERING  mark empty");

        this.markEmpty();
    }

    async modifyPosition(section: SectionId, random: boolean = false): Promise<void> {
        if (!(section in this.positions)) {
            throw new Error(`Invalid section: ${section}`);
        }

        this.played = this.getPlayedVideos();
        if (this.taggedVideos != null) {
            if (this.taggedVideos.length === 0) {
                // this.handleNoMoreTaggedVideos
                this.positions[section] = 0;
                console.log("No tagged videos left for section", section);
                return
            }
            const availableTagged = this.taggedVideos.filter(v => !this.played.has(v.id));

            if (this.taggedVideos.length > 0) {
                if (availableTagged.length === 0) {
                    this.positions[section] = 0;
                    console.log("No available tagged videos left for section", section);
                    return
                }
                const videoIds = availableTagged.map(v => v.id);
                const currentId = this.positions[section];

                if (this.randomized) {
                    const roll = Math.random() * 100;
                    if (roll < this.percentChance || random) {
                        const randomVideo =
                            availableTagged[Math.floor(Math.random() * availableTagged.length)];

                        this.positions[section] = randomVideo.id;
                        // this.markVideoAsPlayed(randomVideo.id);
                        return;
                    }
                }

                const currentIndex = videoIds.indexOf(currentId);
                this.positions[section] = videoIds[currentIndex + 1] ?? videoIds[0];
                // this.markVideoAsPlayed(this.positions[section]);
                return;
            }
        }

        // Untagged mode
        if (this.randomized) {
            const roll = Math.random() * 100;
            if (roll < this.percentChance) {
                const newIndex = Math.floor(Math.random() * this.endIndex) + 1;
                this.positions[section] = newIndex;
                this.markVideoAsPlayed(this.positions[section]);
                console.log("Quing next Random Untagged Video:", this.positions[section]);
                return;
            }
        }

        const nextValue = this.positions[section] + 1 > this.endIndex ? 1 : this.positions[section] + 1;

        // Default increment
        this.positions[section] = nextValue;
        this.markVideoAsPlayed(this.positions[section]);
        console.log("Quing next Untagged Video:", this.positions[section]);

        return
    }

    async fetchVideosByTags(section: SectionId): Promise<void> {
        const tags = this.activeTags.get(section);
        console.log("fetching videos for section", section, "with tags:", tags);

        this.played = this.getPlayedVideos();
        if (!tags || tags.length === 0) {
            this.taggedVideos = null
            return
        }
        console.log("Fetching videos for tag:", tags);

        try {
            const response = await fetch(`${this.apiUrl}/videos/by-tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: tags, limit: this.endIndex, matchType: 'all' }),
            });

            if (!response.ok) throw new Error(`Server error (${response.status})`);

            const videos = await response.json();
            console.log("Retrieved number of videos:", videos.length);

            this.taggedVideos = videos;
        } catch (err) {
            console.error(`Failed to fetch videos for section ${section} with tag ${tags}`, err);
            return;
        }
    }

    async fetchAllTags() {
        try {
            const response = await fetch(`${this.apiUrl}/tags`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const tags = await response.json();
            const sorted = tags.map((t: any) => ({ ...t }))
                .sort((a: any, b: any) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

            this.allTags = sorted;
        } catch (error) {
            console.error('Failed to fetch tags:', error);
        }
    }
    private randomInRange(min: number, max: number) {
        const minInt = Math.floor(min);
        const maxInt = Math.floor(max);
        return Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
    }
}

export default State;

