import { type VideoMetadata } from "./Player";

export type SectionId = 1 | 2 | 3 | 4;
export type PlayerIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type PositionsMap = Record<SectionId, number>;

class State {
    multiSection: boolean = false; // Whether to use multiple sections
    randomized: boolean = true;
    percentChance = 25; // 25% chance to modify position
    endIndex = 3194; // Maximum position index
    positions: PositionsMap = {
        1: this.randomized ? this.randomInRange(1, this.endIndex * 0.25) : 1,
        2: this.randomized ? this.randomInRange(this.endIndex * 0.25, this.endIndex * 0.5) : 500,
        3: this.randomized ? this.randomInRange(this.endIndex * 0.5, this.endIndex * 0.75) : 1000,
        4: this.randomized ? this.randomInRange(this.endIndex * 0.75, this.endIndex) : 1500
    };
    activeTags: Record<SectionId, string[]> = {
        1: [""],
        2: [""],
        3: [""],
        4: [""]
    };
    apiUrl: string = "http://localhost:3000";
    constructor() {
    }

    async modifyPosition(section: SectionId): Promise<void> {
        if (!(section in this.positions)) {
            throw new Error(`Invalid section: ${section}`);
        }
        // 
        const taggedVideos: VideoMetadata[] = (await this.fetchVideosByTags(section)) ?? [];

        // Tagged mode
        if (taggedVideos.length > 0) {
            const currentId = this.positions[section];
            const videoIds = taggedVideos.map(v => v.id);

            // Random within tagged
            if (this.randomized) {
                const roll = Math.random() * 100;
                if (roll < this.percentChance) {
                    // pick random from taggedVideos
                    const randomVideo = taggedVideos[Math.floor(Math.random() * taggedVideos.length)];
                    this.positions[section] = randomVideo.id;
                    return;
                }
            }
            let currentIndex = videoIds.indexOf(currentId);

            if (currentIndex === -1) {
                // Video is last in tagged list or not found, reset to first tagged video
                this.positions[section] = videoIds[0];
                return;
            }

            this.positions[section] = videoIds[currentIndex + 1];
            return
        }

        // Untagged mode
        if (this.randomized) {
            const roll = Math.random() * 100;
            if (roll < this.percentChance) {
                const newIndex = Math.floor(Math.random() * this.endIndex) + 1;
                this.positions[section] = newIndex;
                return;
            }
        }

        const nextValue = this.positions[section] + 1 > this.endIndex ? 1 : this.positions[section] + 1;

        // Default increment
        this.positions[section] = nextValue;
    }

    async fetchVideosByTags(section: SectionId): Promise<VideoMetadata[] | null> {
        const tags = this.activeTags[section];
        if (!tags || tags.length === 0) return null;

        try {
            const response = await fetch(`${this.apiUrl}/videos/by-tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags }),
            });

            if (!response.ok) throw new Error(`Server error (${response.status})`);

            const videos = await response.json();
            return videos;
        } catch (err) {
            console.error(`Failed to fetch videos for section ${section} with tags ${tags}`, err);
            return null;
        }
    }

    private randomInRange(min: number, max: number) {
        const minInt = Math.floor(min);
        const maxInt = Math.floor(max);
        return Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
    }
}

export default State;

