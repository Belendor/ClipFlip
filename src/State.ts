import { config } from "./config";
import type { Tag, Video } from '../server/node_modules/@prisma/client/index.js';
export type SectionId = 1 | 2 | 3 | 4;
export type PlayerIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type PositionsMap = Record<SectionId, number>;

class State {
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
    taggedVideos: Video[] = [];
    advancedMode: boolean = false;
    active: Record<PlayerIndex, boolean> | undefined;
    allTags: Tag[] = [];
    tagsPromise: Promise<void> | undefined;
    constructor() {
        this.active = this.initializeActive(8);
        console.log("State: Initialized active players", this.active);
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

    async modifyPosition(section: SectionId, random: boolean = false): Promise<void> {
        if (!(section in this.positions)) {
            throw new Error(`Invalid section: ${section}`);
        }



        // Tagged mode
        if (this.taggedVideos.length > 0) {
            const currentId = this.positions[section];
            const videoIds = this.taggedVideos.map(v => v.id);
            console.log("Tagged video selection");

            // Random within tagged
            if (this.randomized) {
                console.log("randomizing");

                const roll = Math.random() * 100;
                if (roll < this.percentChance || random) {
                    // pick random from taggedVideos
                    const randomVideo = this.taggedVideos[Math.floor(Math.random() * this.taggedVideos.length)];
                    this.positions[section] = randomVideo.id;
                    console.log("Quing next Random Tagged Video:", this.positions[section]);

                    return;
                }
            }
            let currentIndex = videoIds.indexOf(currentId);

            this.positions[section] = videoIds[currentIndex + 1] ?? videoIds[0];
            console.log("Quing next Tagged Video:", this.positions[section]);

            return;
        }

        // Untagged mode
        if (this.randomized) {
            const roll = Math.random() * 100;
            if (roll < this.percentChance) {
                const newIndex = Math.floor(Math.random() * this.endIndex) + 1;
                this.positions[section] = newIndex;
                console.log("Quing next Random Untagged Video:", this.positions[section]);
                return;
            }
        }

        const nextValue = this.positions[section] + 1 > this.endIndex ? 1 : this.positions[section] + 1;

        // Default increment
        this.positions[section] = nextValue;
        console.log("Quing next Untagged Video:", this.positions[section]);

        return
    }

    async fetchVideosByTags(section: SectionId): Promise<void> {
        const tags = this.activeTags.get(section);
        console.log("fetching videos for section", section, "with tags:", tags);


        if (!tags || tags.length === 0) return;
        console.log("Fetching videos for tag:", tags); 
        
        try {
            const response = await fetch(`${this.apiUrl}/videos/by-tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: tags, limit: this.endIndex, matchType: 'all' }),
            });

            if (!response.ok) throw new Error(`Server error (${response.status})`);

            const videos = await response.json();
            console.log("Retrieved number of videos:" , videos.length);
            
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
    private initializeActive(playerCount: number): Record<number, boolean> {
        const act: Record<number, boolean> = {};
        for (let i = 0; i < playerCount; i++) {
            act[i] = (i % 2 === 0);
        }

        return act;
    }
}

export default State;

