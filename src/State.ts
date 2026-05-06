import { config } from "./config";
import VideoApi from "./VideoApi";
import type { Tag, Video } from "./types";

export type SectionId = 1 | 2 | 3 | 4;
export type PlayerIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

type PositionsMap = Record<SectionId, number>;

class State {
    readonly PLAYED_KEY = "playedVideoIds";
    readonly sectionIds: SectionId[] = [1, 2, 3, 4];

    multiSection = false;
    randomized = true;
    percentChance = config.defaultPercentChance;
    endIndex = config.defaultEndIndex;
    positions: PositionsMap = this.createInitialPositions();
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
    apiUrl = config.apiUrl;
    taggedVideos: Video[] | null = null;
    taggedVideosPromise: Promise<void> | undefined;
    advancedMode = false;
    active = {
        0: true,
        1: false,
        2: true,
        3: false,
        4: true,
        5: false,
        6: true,
        7: false,
    } as Record<PlayerIndex, boolean>;
    allTags: Tag[] = [];
    tags: Tag[] = [];
    tagsPromise: Promise<void> | undefined;
    played: Set<number> = new Set();
    onEmptyPlays?: () => void;
    emptyPlays = false;

    constructor(private readonly api: VideoApi) {
        this.resetActiveTags();
        this.tagsPromise = this.fetchAllTags();
        this.taggedVideosPromise = this.queryTags();
    }

    private createInitialPositions(): PositionsMap {
        return {
            1: this.randomized ? this.randomInRange(1, this.endIndex * 0.25) : 1,
            2: this.randomized ? this.randomInRange(this.endIndex * 0.25, this.endIndex * 0.5) : 500,
            3: this.randomized ? this.randomInRange(this.endIndex * 0.5, this.endIndex * 0.75) : 1000,
            4: this.randomized ? this.randomInRange(this.endIndex * 0.75, this.endIndex) : 1500,
        };
    }

    resetActiveTags(tags: string[] = []) {
        const uniqueTags = [...new Set(tags)];
        this.sectionIds.forEach((sectionId) => {
            this.activeTags.set(sectionId, [...uniqueTags]);
        });
    }

    markEmpty() {
        if (this.emptyPlays) return;
        this.emptyPlays = true;
        this.onEmptyPlays?.();
    }

    clearEmptyState() {
        this.emptyPlays = false;
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
        this.played.clear();
        localStorage.removeItem(this.PLAYED_KEY);
    }

    resetVideoProgress() {
        console.log("Resetting video cache & progress");
        this.played.clear();
        this.clearEmptyState();
        localStorage.clear();
        this.positions = this.createInitialPositions();
    }

    async queryTags(): Promise<void> {
        const params = new URLSearchParams(window.location.search);
        const queryTagsRaw = params.get("tags");

        if (!queryTagsRaw) {
            this.resetActiveTags();
            this.taggedVideos = null;
            return;
        }

        const tagsArray = queryTagsRaw
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);

        console.log("URL tags found:", queryTagsRaw);
        this.resetActiveTags(tagsArray);
        await this.fetchVideosByTags(1);
    }

    async takeNextVideoId(section: SectionId, random: boolean = false): Promise<number> {
        const currentVideoId = this.positions[section];
        await this.modifyPosition(section, random);
        return currentVideoId;
    }

    async modifyPosition(section: SectionId, random: boolean = false): Promise<void> {
        if (!(section in this.positions)) {
            throw new Error(`Invalid section: ${section}`);
        }

        this.played = this.getPlayedVideos();

        if (this.taggedVideos != null) {
            if (this.taggedVideos.length === 0) {
                this.positions[section] = 0;
                console.log("No tagged videos left for section", section);
                return;
            }

            const availableTagged = this.taggedVideos.filter((video) => !this.played.has(video.id));
            if (availableTagged.length === 0) {
                this.positions[section] = 0;
                console.log("No available tagged videos left for section", section);
                return;
            }

            const videoIds = availableTagged.map((video) => video.id);
            const currentIndex = videoIds.indexOf(this.positions[section]);

            if (this.randomized) {
                const roll = Math.random() * 100;
                if (roll < this.percentChance || random) {
                    const randomVideo = availableTagged[Math.floor(Math.random() * availableTagged.length)];
                    this.positions[section] = randomVideo.id;
                    console.log("Position changed for random", this.positions[section]);
                    return;
                }
            }

            this.positions[section] = videoIds[currentIndex + 1] ?? videoIds[0];
            return;
        }

        if (this.randomized) {
            const roll = Math.random() * 100;
            if (roll < this.percentChance) {
                this.positions[section] = Math.floor(Math.random() * this.endIndex) + 1;
                console.log("Queuing next random untagged video:", this.positions[section]);
                return;
            }
        }

        this.positions[section] = this.positions[section] + 1 > this.endIndex ? 1 : this.positions[section] + 1;
        console.log("Queuing next untagged video:", this.positions[section]);
    }

    async fetchVideosByTags(section: SectionId): Promise<void> {
        const tags = this.activeTags.get(section);
        console.log("Fetching videos for section", section, "with tags:", tags);

        this.played = this.getPlayedVideos();
        this.clearEmptyState();

        if (!tags || tags.length === 0) {
            this.taggedVideos = null;
            this.positions = this.createInitialPositions();
            return;
        }

        try {
            const videos = await this.api.fetchVideosByTags(tags, this.endIndex);
            console.log("Retrieved number of videos:", videos.length);
            this.taggedVideos = videos;
            const randomVideo = videos[Math.floor(Math.random() * videos.length)];
            this.positions = {
                1: randomVideo.id,
                2: randomVideo.id + 1,
                3: randomVideo.id + 2,
                4: randomVideo.id + 3,
            };
        } catch (error) {
            console.error(`Failed to fetch videos for section ${section} with tags`, tags, error);
            this.taggedVideos = [];
            this.positions = {
                1: 0,
                2: 0,
                3: 0,
                4: 0,
            };
        }
    }
    async fetchAllTags() {
        try {
            const tags = await this.api.fetchTags();
            this.tags = tags;
            this.allTags = [...tags].sort((a, b) =>
                a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
            );
        } catch (error) {
            console.error("Failed to fetch tags:", error);
            this.tags = [];
            this.allTags = [];
        }
    }

    private randomInRange(min: number, max: number) {
        const minInt = Math.floor(min);
        const maxInt = Math.floor(max);
        return Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
    }
}

export default State;
