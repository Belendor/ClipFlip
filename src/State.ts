import { config } from "./config";
import type { Tag, Video } from '../server/node_modules/@prisma/client/index.js';
export type SectionId = 1 | 2 | 3 | 4;
export type PlayerIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type PositionsMap = Record<SectionId, number>;

class State {
    multiSection: boolean = false; // Whether to use multiple sections
    randomized: boolean = false;
    percentChance = 25; // 25% chance to modify position
    endIndex = config.defaultEndIndex; // Maximum position index
    position: string | number = 1;
    positions: PositionsMap = {
        1: this.randomized ? this.randomInRange(1, this.endIndex * 0.75) : 1,
        2: this.randomized ? this.randomInRange(this.endIndex * 0.75, this.endIndex * 0.5) : 500,
        3: this.randomized ? this.randomInRange(this.endIndex * 0.75, this.endIndex * 0.75) : 1000,
        4: this.randomized ? this.randomInRange(this.endIndex * 0.75, this.endIndex) : 1500
    };
    activeTags: Map<SectionId, Tag["title"][]> = new Map();
    STORAGE_KEY = "playedVideoIds";
    playing: Record<SectionId, boolean> = {
        1: false,
        2: false,
        3: false,
        4: false
    };
    apiUrl: string = config.apiUrl;
    advancedMode: boolean = false;
    active: Record<PlayerIndex, boolean> | undefined;
    allTags: Tag[] = [];
    tagsPromise: Promise<void> | undefined;
    taggedVideoCache: Video[] | null = null;
    constructor() {
        this.active = this.initializeActive(8);
        this.tagsPromise = this.fetchAllTags();
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

            console.log("State: Assigned tags to SectionIds 1-4", this.activeTags);
        } else {
            // Direct loop over our known SectionIds
            const ids: SectionId[] = [1, 2, 3, 4];

            ids.forEach((id) => {
                // Create a unique clone for each specific section
                this.activeTags.set(id, []);
            });
        }
    }

     modifyPosition(section: SectionId, random = false): void {
        if (!(section in this.positions)) {
            throw new Error(`Invalid section: ${section}`);
        }
        console.log("Checking if we have tagged cache", this.taggedVideoCache);
        
        /* ---------- TAGGED MODE ---------- */
        if (this.taggedVideoCache && this.taggedVideoCache.length > 0) {
            const ids = this.taggedVideoCache.map(v => String(v.id));

            if (this.randomized) {
                const roll = Math.random() * 100;
                if (roll < this.percentChance || random) {
                    const unplayed = ids.filter(
                        id => !this.hasBeenPlayed(id)
                    );

                    if (unplayed.length === 0) return;
                    const nextUnplayed = this.getNextUnplayedFromList(unplayed, String(this.positions[section]));
                    if (!nextUnplayed) {
                        console.warn(`No unplayed video found for section ${section}`); return;
                    }
                    this.positions[section] = Number(nextUnplayed);
                    return;
                }
            }

            const next = this.getNextUnplayedId(ids, String(this.position));
            if (!next) return;

            this.positions[section] = Number(next);
            return;
        }

        /* ---------- UNTAGGED MODE ---------- */

        const allIds = Array.from(
            { length: this.endIndex },
            (_, i) => String(i + 1)
        );

        if (this.randomized) {
            const roll = Math.random() * 100;
            if (roll < this.percentChance) {
                const unplayed = allIds.filter(
                    id => !this.hasBeenPlayed(id)
                );

                if (unplayed.length === 0) return;

                this.positions[section] = Number(unplayed[Math.floor(Math.random() * unplayed.length)]);
                return;
            }
        }

        const next = this.getNextUnplayedId(
            allIds,
            String(this.positions[section])
        );

        if (!next) {
            console.warn(`No unplayed video found in untagged mode for section ${section}`); return;
        }

        this.positions[section] = Number(next);
    }

    async fetchVideosByTags(): Promise<Video[] | null> {
        const tags = this.activeTags.get(1);
        console.log(tags, "Tags active");
        

        if (!tags) return null;

        try {
            const response = await fetch(`${this.apiUrl}/videos/by-tags`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tags,
                    limit: this.endIndex
                })
            });

            if (!response.ok) {
                throw new Error(`Server error (${response.status})`);
            }

            this.taggedVideoCache = await response.json();
            console.log("Fetched tagged videos:", this.taggedVideoCache);
            return this.taggedVideoCache;
        } catch (err) {
            console.error("Failed to fetch tagged videos", err);
            return null;
        }
    }


    async getTaggedVideos(): Promise<Video[]> {
        if (this.taggedVideoCache) {
            return this.taggedVideoCache;
        }

        const videos = (await this.fetchVideosByTags()) ?? [];
        this.taggedVideoCache = videos;

        return videos;
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
    private initializeActive(playerCount: number): Record<number, boolean> {
        const act: Record<number, boolean> = {};
        for (let i = 0; i < playerCount; i++) {
            act[i] = (i % 2 === 0);
        }

        return act;
    }
    getPlayedIds(): string[] {
        try {
            const item = localStorage.getItem(this.STORAGE_KEY);
            return item ? JSON.parse(item) : [];
        } catch {
            return [];
        }
    }


    markAsPlayed(videoId: string) {
        if (!videoId) return;

        const played = this.getPlayedIds();
        if (!played.includes(videoId)) {
            played.push(videoId);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(played));
        }
    }

    hasBeenPlayed(videoId: string): boolean {
        return this.getPlayedIds().includes(videoId);
    }
    getNextUnplayedId(
        ids: string[],
        currentId?: string
    ): string | null {
        if (ids.length === 0) return null;

        const startIndex = currentId
            ? ids.indexOf(currentId)
            : -1;

        for (let i = 1; i <= ids.length; i++) {
            const idx = (startIndex + i) % ids.length;
            const id = ids[idx];

            if (!this.hasBeenPlayed(id)) {
                return id;
            }
        }

        return null;
    }
    pickFirstUnplayed(videoIds: string[]): string | null {
        return videoIds.find(id => !this.hasBeenPlayed(id)) ?? null;
    }
    getNextUnplayedFromList(
        ids: string[],
        currentId?: string
    ): string | null {
        if (ids.length === 0) return null;

        const startIndex = currentId
            ? ids.indexOf(currentId)
            : -1;

        for (let i = 1; i <= ids.length; i++) {
            const idx = (startIndex + i) % ids.length;
            const id = ids[idx];

            if (!this.hasBeenPlayed(id)) {
                return id;
            }
        }

        return null;
    }

}

export default State;

