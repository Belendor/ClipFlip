import HTML from "./HTML";
import { type VideoMetadata } from "./Player";

export type SectionId = 1 | 2 | 3 | 4;
export type PlayerIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type PositionsMap = Record<SectionId, number>;
class State {
    randomized: boolean = true;
    endIndex = 3873; // Maximum position index
    positions: PositionsMap = {
        1: this.randomInRange(1, this.endIndex * 0.25),
        2: this.randomInRange(this.endIndex * 0.25, this.endIndex * 0.5),
        3: this.randomInRange(this.endIndex * 0.5, this.endIndex * 0.75),
        4: this.randomInRange(this.endIndex * 0.75, this.endIndex)
    };
    activeTags: Record<SectionId, string[]> = {
        1: ["panties"],
        2: ["panties"],
        3: ["panties"],
        4: ["panties"]
    };

    percentChance = 25; // 25% chance to modify position
    multiSection: boolean = false; // Whether to use multiple sections

    constructor() {
        console.log("State initialized with positions:", this.positions);
        
    }

    private randomInRange(min: number, max: number) {
        const minInt = Math.floor(min);
        const maxInt = Math.floor(max);
        return Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
    }

    async modifyPosition(section: SectionId): Promise<void> {
        console.log(`Modifying position for section ${section}`);
        
        if (!(section in this.positions)) {
            throw new Error(`Invalid section: ${section}`);
        }

        const taggedVideos: VideoMetadata[] = (await this.fetchVideosByTags(section)) ?? [];
        console.log(`Tagged videos for section ${section}:`, taggedVideos);

        // Tagged mode
        if (taggedVideos.length > 0) {
            const currentId = this.positions[section];
            console.log(`Current ID for section ${section}:`, currentId);

            const videoIds = taggedVideos.map(v => v.id);;

            // Random within tagged
            if (this.randomized) {
                const roll = Math.random() * 100;
                if (roll < this.percentChance) {
                    const randomVideo = taggedVideos[Math.floor(Math.random() * taggedVideos.length)];
                    console.log(`Randomly selected video for section ${section}:`, randomVideo);
                    this.positions[section] = randomVideo.id;
                    return;
                }
            }
            let currentIndex = videoIds.indexOf(currentId);
            console.log(`Current index in tagged list for section ${section}:`, currentIndex);
            
            if (currentIndex === -1) {
                // current not in tagged list, start from first
                this.positions[section] = videoIds[0];
                return;
            }
            console.log("nextIndex", currentIndex + 1);
            
            const nextIndex = currentIndex + 1
            if (nextIndex >= videoIds.length) {
                this.positions[section] = videoIds[0];
                return;
            }
            console.log(videoIds[nextIndex], 'next video ID for section', section);

            this.positions[section] = videoIds[nextIndex]; 
            console.log(`Next position for section ${section}:`, this.positions[section]);
            return
        }

        // Untagged mode
        if (this.randomized) {
            const roll = Math.random() * 100;
            if (roll < this.percentChance) {
                const newValue = Math.floor(Math.random() * this.endIndex) + 1;
                this.positions[section] = newValue;
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
            const response = await fetch('https://www.clipflip.online/api/videos/by-tags', {
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
}

export default State;

