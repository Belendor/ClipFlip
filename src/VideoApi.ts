import type { Tag, Video, VideoWithRelations, UpdateVideoPayload } from "./types";

export default class VideoApi {
    constructor(private readonly apiUrl: string) {}

    private async request<T>(path: string, init?: RequestInit): Promise<T> {
        const response = await fetch(`${this.apiUrl}${path}`, init);
        if (!response.ok) {
            throw new Error(`Request failed (${response.status}) for ${path}`);
        }

        return response.json() as Promise<T>;
    }

    async fetchTags(search?: string): Promise<Tag[]> {
        const query = search ? `?search=${encodeURIComponent(search)}` : "";
        return this.request<Tag[]>(`/tags${query}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
    }

    async fetchVideosByTags(tags: string[], limit: number): Promise<Video[]> {
        return this.request<Video[]>("/videos/by-tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags, limit, matchType: "all" }),
        });
    }

    async fetchVideoMetadata(videoId: number): Promise<VideoWithRelations> {
        return this.request<VideoWithRelations>(`/videos/${videoId}`);
    }

    async fetchVideos(search?: string): Promise<Video[]> {
        const query = search ? `?search=${encodeURIComponent(search)}` : "";
        return this.request<Video[]>(`/videos${query}`);
    }

    async updateVideo(payload: UpdateVideoPayload): Promise<void> {
        await this.request("/videos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    }

    async removeTag(videoId: number, tagTitle: string): Promise<void> {
        await this.request("/videos/remove-tag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tagTitle, videoId }),
        });
    }

    async uploadVideo(formData: FormData): Promise<void> {
        const response = await fetch(`${this.apiUrl}/upload-video`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed (${response.status})`);
        }
    }
}
