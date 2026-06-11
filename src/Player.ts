import State, { type SectionId, PlayerIndex } from "./State";
import HTML from "./HTML";
import { config } from "./config";
import VideoApi from "./VideoApi";
import type { Tag, Video, VideoWithRelations, UpdateVideoPayload } from "./types";
import User from "./User";

type SectionSwapState = Record<SectionId, boolean>;

class Players {
    private readonly folder = config.videoSourcePath;
    private readonly folder1 = "https://clip-flip.com/video1/";
    private readonly thumbnailFolder = config.thumbnailSourcePath;
    private readonly metadataCache = new Map<number, Promise<VideoWithRelations | null>>();
    private readonly pendingSwap: SectionSwapState = {
        1: false,
        2: false,
        3: false,
        4: false,
    };

    private loadRevision = 0;
    private muted = true;
    private searchAbortController: AbortController | null = null;
    private readonly editIcon = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M12 20h9" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>`;
    private readonly doneIcon = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9l6 6 6-6" />
        </svg>
        `;
    private readonly addTagIcon = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke-linecap="round"></path>
        </svg>`;
    private uploadFormWrapper: HTMLDivElement | null = null;
    private uploadToolbarButton: HTMLButtonElement | null = null;
    private uploadTagSelect: HTMLSelectElement | null = null;

    constructor(
        private readonly state: State,
        private readonly html: HTML,
        private readonly api: VideoApi,
        private readonly user: User,
    ) {
        this.state.onEmptyPlays = () => this.showNoVideosBox();
        this.user.init();
    }

    async init() {
        this.createMetadataFormContainers();
        this.attachEventListeners();
        await Promise.all([this.state.tagsPromise, this.state.taggedVideosPromise]);
        await this.loadVideos();
    }

    async loadVideos(): Promise<void> {
        const revision = ++this.loadRevision;
        console.log("Loading videos, revision:", revision);
        this.state.clearEmptyState();
        this.html.hideNoVideosBox();
        this.resetPlaybackSurface();

        for (const section of this.getVisibleSections()) {
            const loaded = await this.loadSection(section, revision);
            if (!loaded || revision !== this.loadRevision) {
                return;
            }
        }
    }

    private getVisibleSections(): SectionId[] {
        return this.state.multiSection ? this.state.sectionIds : [1];
    }

    private getSectionPlayerIndexes(section: SectionId): [PlayerIndex, PlayerIndex] {
        const front = ((section - 1) * 2) as PlayerIndex;
        const back = (front + 1) as PlayerIndex;
        return [front, back];
    }

    private resetPlaybackSurface() {
        for (const section of this.state.sectionIds) {
            const [frontIndex, backIndex] = this.getSectionPlayerIndexes(section);
            this.state.active[frontIndex] = true;
            this.state.active[backIndex] = false;
            this.state.playing[frontIndex] = false;
            this.state.playing[backIndex] = false;
            this.pendingSwap[section] = false;

            this.resetPlayer(this.html.videoPlayers[frontIndex]);
            this.resetPlayer(this.html.videoPlayers[backIndex]);
            this.setSectionVisualState(section, frontIndex);
        }

        this.updatePlayPauseIcon(false);
    }

    private resetPlayer(player: HTMLVideoElement) {
        player.pause();
        player.removeAttribute("src");
        player.load();
        player.poster = "";
        player.setAttribute("data-video-id", "0");
    }

    private async loadSection(section: SectionId, revision: number): Promise<boolean> {
        const [frontIndex, backIndex] = this.getSectionPlayerIndexes(section);
        const frontPlayer = this.html.videoPlayers[frontIndex];
        const backPlayer = this.html.videoPlayers[backIndex];

        const currentVideoId = await this.state.takeNextVideoId(section);
        console.log(`Section ${section} - Queued video ID:`, currentVideoId);
        if (currentVideoId === 0) {
            this.state.markEmpty();
            return false;
        }

        this.configurePlayer(frontPlayer, currentVideoId, "auto");
        if (revision !== this.loadRevision) {
            return false;
        }

        await this.waitForVideoReady(frontPlayer);
        if (revision !== this.loadRevision) {
            return false;
        }

        await this.playPlayer(frontPlayer, frontIndex);
        if (revision !== this.loadRevision) {
            return false;
        }

        const currentMetadata = await this.getVideoMetadata(currentVideoId, true);
        if (revision !== this.loadRevision) {
            return false;
        }
        if (this.state.adminMode && currentMetadata?.reactions?.length) {
            console.log(currentMetadata?.reactions);

            if (currentMetadata?.reactions?.length > 0) {
                console.log(currentMetadata?.reactions);

                this.loadSection(section, revision);
                return false;
            }
        }
        await this.populateMetadataForm(section, currentMetadata);

        const nextVideoId = await this.state.takeNextVideoId(section);
        if (nextVideoId !== 0) {
            await this.queuePlayer(backPlayer, nextVideoId);
        } else {
            this.resetPlayer(backPlayer);
        }

        this.setSectionActivePlayer(section, frontIndex);
        return true;
    }

    private configurePlayer(player: HTMLVideoElement, videoId: number, preload: "metadata" | "auto") {
        // player.poster = this.buildPosterUrl(videoId);
        player.preload = preload;
        player.muted = this.muted;
        player.playsInline = true;
        player.src = this.buildVideoUrl(videoId);
        player.setAttribute("data-video-id", String(videoId));
        player.load();
    }

    private async queuePlayer(player: HTMLVideoElement, videoId: number): Promise<void> {
        this.configurePlayer(player, videoId, "auto");
        await this.primePlayer(player);
    }

    private buildVideoUrl(videoId: number): string {
        const folderMap = [
            { max: 11255, folder: this.folder },
            { max: Infinity, folder: this.folder1 }
        ];
        const match = folderMap.find(rule => videoId <= rule.max);

        if (!match) {
            throw new Error(`No folder mapping found for videoId: ${videoId}`);
        }

        return `${match.folder}${videoId}.mp4`;
    }

    private buildPosterUrl(videoId: number): string {
        return `${this.folder}thumbnails/${videoId}.jpg`;
    }

    private getPlayerVideoId(player: HTMLVideoElement): number {
        return Number(player.getAttribute("data-video-id") || "0");
    }

    private async playPlayer(player: HTMLVideoElement, index: PlayerIndex) {
        try {
            await player.play();
            this.state.playing[index] = true;
            this.updatePlayPauseIcon(true);
        } catch (error) {
            this.state.playing[index] = false;
            console.error("Failed to play video", error);
        }
    }

    private async waitForPlaybackStart(player: HTMLVideoElement): Promise<boolean> {
        if (!this.getPlayerVideoId(player)) {
            return false;
        }

        if (!player.paused && player.currentTime > 0) {
            return true;
        }

        return new Promise<boolean>((resolve) => {
            const timeout = window.setTimeout(() => cleanup(false), 1500);

            const cleanup = (result: boolean) => {
                window.clearTimeout(timeout);
                player.removeEventListener("playing", handlePlaying);
                player.removeEventListener("timeupdate", handleTimeUpdate);
                player.removeEventListener("error", handleError);
                resolve(result);
            };

            const handlePlaying = () => cleanup(true);
            const handleTimeUpdate = () => {
                if (!player.paused && player.currentTime > 0) {
                    cleanup(true);
                }
            };
            const handleError = () => cleanup(false);

            player.addEventListener("playing", handlePlaying, { once: true });
            player.addEventListener("timeupdate", handleTimeUpdate);
            player.addEventListener("error", handleError, { once: true });
        });
    }

    private updatePlayPauseIcon(isPlaying: boolean) {
        this.html.iconPlay.classList.toggle("hidden", isPlaying);
        this.html.iconPause.classList.toggle("hidden", !isPlaying);
    }

    private setSectionActivePlayer(section: SectionId, activeIndex: PlayerIndex) {
        const [frontIndex, backIndex] = this.getSectionPlayerIndexes(section);
        const inactiveIndex = activeIndex === frontIndex ? backIndex : frontIndex;

        this.state.active[activeIndex] = true;
        this.state.active[inactiveIndex] = false;
        this.state.playing[inactiveIndex] = false;
        this.setSectionVisualState(section, activeIndex);
    }

    private setSectionVisualState(section: SectionId, activeIndex: PlayerIndex) {
        if (section !== 1) {
            return;
        }

        const [frontIndex, backIndex] = this.getSectionPlayerIndexes(section);
        const frontSlot = this.html.videoPlayers[frontIndex].parentElement;
        const backSlot = this.html.videoPlayers[backIndex].parentElement;

        if (!frontSlot || !backSlot) {
            return;
        }

        const frontIsActive = activeIndex === frontIndex;
        frontSlot.classList.toggle("onscreen", frontIsActive);
        frontSlot.classList.toggle("offscreen-right", !frontIsActive);
        backSlot.classList.toggle("onscreen", !frontIsActive);
        backSlot.classList.toggle("offscreen-right", frontIsActive);
    }

    private attachEventListeners() {
        this.html.playPauseBtn.addEventListener("click", async () => {
            const activeIndexes = Object.keys(this.state.active)
                .map(Number)
                .filter((index) => this.state.active[index as PlayerIndex]) as PlayerIndex[];

            if (activeIndexes.length === 0) {
                return;
            }

            const anyPlaying = activeIndexes.some((index) => this.state.playing[index]);
            await Promise.all(activeIndexes.map((index) => this.togglePlayPause(index, true)));
            this.updatePlayPauseIcon(!anyPlaying);
        });

        this.html.fullscreenButton.addEventListener("click", () => {
            void this.toggleFullscreen();
        });

        document.addEventListener("fullscreenchange", () => {
            this.html.fullscreenButton.classList.toggle("is-fullscreen", !!document.fullscreenElement);
        });

        this.html.muteToggle.addEventListener("click", () => {
            this.html.muteToggle.classList.toggle("is-muted");
            this.muted = !this.muted;
            this.html.videoPlayers.forEach((player) => {
                player.muted = this.muted;
                player.volume = 0.1;
            });
        });
        this.html.reloadToggle.addEventListener("click", () => {
            window.location.replace("/");
        });

        this.html.hideFormsBtn.addEventListener("click", () => {
            this.html.setMetadataVisibility(!this.html.metadataVisible);
        });

        this.uploadToolbarButton = document.getElementById("uploadVideoBtn") as HTMLButtonElement | null;
        this.uploadToolbarButton?.addEventListener("click", async () => {
            const shouldOpen = this.uploadFormWrapper?.classList.contains("hidden") ?? false;
            if (shouldOpen) {
                await this.populateUploadTagSelect();
            }
            this.setUploadFormVisibility(shouldOpen);
        });

        this.html.appRoot.addEventListener("dblclick", (event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("button, input, select, textarea, .tag-card")) {
                return;
            }
            void this.toggleFullscreen();
        });

        this.attachSearchListeners();
        this.attachPlayerListeners();
    }

    private async toggleFullscreen() {
        if (!document.fullscreenElement) {
            try {
                await document.documentElement.requestFullscreen();
            } catch (error) {
                console.error(`Error: ${(error as Error).message}`);
            }
            return;
        }

        await document.exitFullscreen();
    }

    private setUploadFormVisibility(visible: boolean) {
        if (!this.uploadFormWrapper) {
            return;
        }

        this.uploadFormWrapper.classList.toggle("hidden", !visible);
        this.uploadToolbarButton?.classList.toggle("is-active", visible);
    }

    private async populateUploadTagSelect() {
        if (!this.uploadTagSelect) {
            return;
        }

        await this.state.tagsPromise;
        this.uploadTagSelect.innerHTML = "";

        this.state.allTags.forEach((tag) => {
            if (tag.id == null) {
                return;
            }

            const option = document.createElement("option");
            option.value = String(tag.id);
            option.textContent = tag.title;
            this.uploadTagSelect?.appendChild(option);
        });
    }

    private attachSearchListeners() {
        const searchInput = document.getElementById("search-input") as HTMLInputElement | null;
        const advancedPanel = document.getElementById("advancedPanel") as HTMLElement | null;

        if (!searchInput || !advancedPanel) {
            return;
        }

        searchInput.addEventListener("focus", () => {
            advancedPanel.classList.remove("hidden");
            this.renderTagResults(this.state.tags, advancedPanel, searchInput);
        });

        searchInput.addEventListener("focusout", () => {
            window.setTimeout(() => {
                advancedPanel.classList.add("hidden");
            }, 200);
        });

        searchInput.addEventListener("input", async (event) => {
            const value = (event.target as HTMLInputElement).value.trim();
            if (!value) {
                advancedPanel.innerHTML = "";
                return;
            }

            this.searchAbortController?.abort();
            this.searchAbortController = new AbortController();

            try {
                const tags = await this.api.fetchTags(value);
                this.renderTagResults(tags, advancedPanel, searchInput);
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
                    console.error("Failed to search tags", error);
                }
            }
        });
    }

    private attachPlayerListeners() {
        this.html.videoPlayers.forEach((player, index) => {
            player.addEventListener("ended", () => {
                this.handlePlayerEnded(index as PlayerIndex);
            });

            player.addEventListener("click", () => {
                this.togglePlayPause(index as PlayerIndex);
            });

            player.addEventListener("dblclick", () => {
                void this.toggleFullscreen();
            });
        });
    }

    private renderTagResults(tags: Tag[], advancedPanel: HTMLElement, searchInput: HTMLInputElement) {
        advancedPanel.innerHTML = "";

        tags.forEach((tag) => {
            const card = document.createElement("div");
            card.className = "tag-card";
            if (this.state.activeTags.get(1)?.includes(tag.title)) {
                card.classList.add("active-tag");
            }

            const defaultImg = `${this.thumbnailFolder}thumbnail.jpg`;
            const imgPath = `${this.thumbnailFolder}${encodeURIComponent(tag.title)}.jpg`;
            const img = new Image();
            img.onload = () => {
                card.style.backgroundImage = `url(${imgPath})`;
            };
            img.onerror = () => {
                card.style.backgroundImage = `url(${defaultImg})`;
            };
            img.src = imgPath;

            const title = document.createElement("div");
            title.className = "tag-card-title";
            title.textContent = tag.title + (tag.videoCount ? ` (${tag.videoCount})` : "");
            card.appendChild(title);

            card.addEventListener("click", async () => {
                await this.toggleTag(tag.title, true);
                searchInput.value = "";
            });

            advancedPanel.appendChild(card);
        });
    }

    private async getVideoMetadata(videoId: number, refresh: boolean = false): Promise<VideoWithRelations | null> {
        if (!this.metadataCache.has(videoId) || refresh) {
            this.metadataCache.set(
                videoId,
                this.api.fetchVideoMetadata(videoId).catch((error) => {
                    console.error(`Error fetching metadata for videoId ${videoId}:`, error);
                    return null;
                }),
            );
        }

        return this.metadataCache.get(videoId) ?? null;
    }

    private async waitForVideoReady(video: HTMLVideoElement): Promise<boolean> {
        if (!this.getPlayerVideoId(video)) {
            return false;
        }

        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            return true;
        }

        return new Promise<boolean>((resolve) => {
            const timeout = window.setTimeout(() => {
                cleanup(false);
            }, 8000);

            const cleanup = (result: boolean) => {
                window.clearTimeout(timeout);
                video.removeEventListener("canplay", handleReady);
                video.removeEventListener("loadeddata", handleLoadedData);
                video.removeEventListener("error", handleError);
                resolve(result);
            };

            const handleReady = () => cleanup(true);
            const handleLoadedData = async () => {
                if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                    cleanup(true);
                }
            };
            const handleError = () => cleanup(false);

            video.addEventListener("canplay", handleReady, { once: true });
            video.addEventListener("loadeddata", handleLoadedData, { once: true });
            video.addEventListener("error", handleError, { once: true });
        });
    }

    private async primePlayer(video: HTMLVideoElement): Promise<void> {
        const ready = await this.waitForVideoReady(video);
        if (!ready) {
            return;
        }

        try {
            await video.play();
            video.pause();
            video.currentTime = 0;
        } catch (error) {
            console.warn("Failed to prime queued video", error);
        }
    }

    private async handlePlayerEnded(playerIndex: PlayerIndex) {
        const section = (Math.floor(playerIndex / 2) + 1) as SectionId;
        if (this.pendingSwap[section]) {
            return;
        }

        this.pendingSwap[section] = true;

        try {
            const [frontIndex, backIndex] = this.getSectionPlayerIndexes(section);
            const currentIndex = playerIndex;
            const nextIndex = currentIndex === frontIndex ? backIndex : frontIndex;
            const currentPlayer = this.html.videoPlayers[currentIndex];
            const nextPlayer = this.html.videoPlayers[nextIndex];
            const finishedVideoId = this.getPlayerVideoId(currentPlayer);

            if (finishedVideoId) {
                this.state.markVideoAsPlayed(finishedVideoId);
            }

            const nextVideoId = this.getPlayerVideoId(nextPlayer);
            if (!nextVideoId) {
                this.state.markEmpty();
                return;
            }

            const ready = await this.waitForVideoReady(nextPlayer);
            if (!ready) {
                console.warn("Queued player was not fully ready before swap, attempting playback anyway", nextVideoId);
            }

            nextPlayer.currentTime = 0;
            await this.playPlayer(nextPlayer, nextIndex);
            await this.waitForPlaybackStart(nextPlayer);
            this.setSectionActivePlayer(section, nextIndex);
            currentPlayer.pause();

            const nextMetadata = await this.getVideoMetadata(nextVideoId);
            await this.populateMetadataForm(section, nextMetadata);

            const queuedVideoId = await this.state.takeNextVideoId(section);
            if (queuedVideoId === 0) {
                window.setTimeout(() => this.resetPlayer(currentPlayer), 220);
            } else {
                window.setTimeout(() => {
                    void this.queuePlayer(currentPlayer, queuedVideoId);
                }, 220);
            }
        } catch (error) {
            console.error("Error during player swap:", error);
        } finally {
            this.pendingSwap[section] = false;
        }
    }

    private async togglePlayPause(index: PlayerIndex, multi = false): Promise<void> {
        const player = this.html.videoPlayers[index];

        if (this.state.active[index] && this.state.playing[index]) {
            player.pause();
            this.state.playing[index] = false;
            if (!multi) {
                this.updatePlayPauseIcon(false);
            }
            return;
        }

        await this.playPlayer(player, index);
    }

    private async populateMetadataForm(section: SectionId, video: VideoWithRelations | null): Promise<void> {
        if (!video) {
            return;
        }

        const safeTags = Array.isArray(video.tags) ? video.tags : [];
        const safeModels = Array.isArray(video.models) ? video.models : [];

        const form = document.getElementById(`metaForm${section}`) as HTMLDivElement | null;
        if (!form) {
            return;
        }
        const metadataHeader = document.getElementById(`metadata-header-${section}`);

        const oldFavoriteBtn = metadataHeader?.querySelector<HTMLButtonElement>(".favorite-btn");

        if (!oldFavoriteBtn) {
            throw new Error("Favorite button not found in metadata header");
        }

        const favoriteBtn = oldFavoriteBtn.cloneNode(true) as HTMLButtonElement;
        oldFavoriteBtn.replaceWith(favoriteBtn);
        if (!favoriteBtn) {
            throw new Error("Favorite button not found in metadata header");
        }
        const heart = favoriteBtn.querySelector(".favorite-heart") as HTMLSpanElement;
        const count = favoriteBtn.querySelector(".favorite-count") as HTMLSpanElement;

        const currentCount = video.reactions?.length ?? 0;
        const userLiked = video.reactions?.some(
            (r) => r.userId === this.user.currentUser?.id
        ) ?? false;
        // favoriteBtn.classList.toggle("active", userLiked);
        // console.log(isActive);

        if (!userLiked) {
            heart.textContent = "♡";
            count.textContent = String(currentCount);
            favoriteBtn.classList.remove("active");
        } else {
            heart.textContent = "♥";
            count.textContent = String(currentCount);
            favoriteBtn.classList.add("active");
        }

        favoriteBtn.addEventListener("click", async () => {
            console.log("Clicked favorite button");
            if (!this.user.currentUser) {
                (
                    document.querySelector("#google-login div[role='button']") as HTMLElement
                )?.click();
                return;
            }

            try {
                const data = await this.api.react(Number(video.id), "like");
                console.log(data);


                let isActive = favoriteBtn.classList.contains("active");

                if (isActive) {
                    heart.textContent = "♡";
                    count.textContent = String(data.likes);
                    favoriteBtn.classList.remove("active");
                } else {
                    heart.textContent = "♥";
                    count.textContent = String(data.likes);

                    favoriteBtn.classList.add("active");

                }
            } catch (error) {
                console.error("Favorite failed", error);
            }
        });

        form.querySelectorAll<HTMLInputElement>("input").forEach((input) => {
            switch (input.placeholder) {
                case "id":
                    input.value = String(video.id);
                    break;
                case "Title":
                    input.value = video.title ?? "";
                    break;
                case "Models":
                    input.value = safeModels.map((model) => model.name ?? "").filter(Boolean).join(", ");
                    break;
                case "Studio":
                    input.value = video.studio ?? "";
                    break;
            }
        });

        const tagsWrapper = this.html.videoTagsContainers[section - 1];
        if (!tagsWrapper) {
            return;
        }

        await this.html.renderTags(
            tagsWrapper,
            safeTags,
            section,
            video.id,
            this.toggleTag.bind(this),
            this.removeTag.bind(this),
        );
    }

    private async tryPreserveCurrentVideoOnTagChange(section: SectionId): Promise<boolean> {
        if (this.state.taggedVideos == null) {
            return false;
        }

        const activeTags = this.state.activeTags.get(section) ?? [];
        if (activeTags.length === 0) {
            return false;
        }

        const activeIndex = this.getActiveIndexForSection(section);
        const currentPlayer = this.html.videoPlayers[activeIndex];
        const currentVideoId = this.getPlayerVideoId(currentPlayer);
        if (!currentVideoId) {
            return false;
        }

        const currentMetadata = await this.getVideoMetadata(currentVideoId);
        if (!currentMetadata) {
            return false;
        }

        const currentTagTitles = new Set((currentMetadata.tags ?? []).map((tag) => tag.title));
        const matchesAllActiveTags = activeTags.every((tag) => currentTagTitles.has(tag));
        if (!matchesAllActiveTags) {
            return false;
        }

        const [frontIndex, backIndex] = this.getSectionPlayerIndexes(section);
        const inactiveIndex = activeIndex === frontIndex ? backIndex : frontIndex;
        const inactivePlayer = this.html.videoPlayers[inactiveIndex];
        const played = this.state.getPlayedVideos();

        const queuedCandidates = this.state.taggedVideos
            .map((video) => video.id)
            .filter((id) => id !== currentVideoId && !played.has(id));

        if (queuedCandidates.length > 0) {
            await this.queuePlayer(inactivePlayer, queuedCandidates[0]);
        } else {
            this.resetPlayer(inactivePlayer);
        }

        this.state.positions[section] = queuedCandidates[1] ?? 0;
        this.setSectionActivePlayer(section, activeIndex);
        await this.populateMetadataForm(section, currentMetadata);
        return true;
    }

    private async removeTag(tag: Tag, videoId?: number) {
        if (!videoId) {
            return;
        }

        try {
            await this.api.removeTag(videoId, tag.title);
            const metadata = this.metadataCache.get(videoId);
            if (metadata) {
                this.metadataCache.delete(videoId);
            }
        } catch (error) {
            console.error("Failed to delete tag", error);
        }
    }

    showNoVideosBox() {
        this.state.advancedMode = false;
        this.html.videoPlayers.forEach((player) => {
            this.resetPlayer(player);
        });

        const box = document.getElementById("no-videos-box") as HTMLDivElement | null;
        const tagsBox = document.getElementById("active-tags") as HTMLDivElement | null;
        const resetWrapper = document.getElementById("reset-section") as HTMLDivElement | null;
        const resetInfo = resetWrapper?.querySelector(".reset-info") as HTMLParagraphElement | null;
        const resetBtn = resetWrapper?.querySelector("#reset-btn") as HTMLButtonElement | null;

        if (!box || !tagsBox || !resetInfo || !resetBtn) {
            return;
        }

        tagsBox.innerHTML = "";
        const uniqueTags = [...new Set(this.state.activeTags.get(1) ?? [])].map((title) => ({ title }));
        void this.html.renderTags(tagsBox, uniqueTags, 1, undefined, async (tag) => {
            box.setAttribute("hidden", "");
            await this.toggleTag(tag, true);
        });

        resetInfo.textContent =
            "You have watched all available videos. Reset your progress to clear cached data and watch everything again.";

        resetBtn.onclick = () => {
            resetBtn.disabled = true;
            resetBtn.textContent = "Resetting...";
            box.setAttribute("hidden", "");
            this.state.resetVideoProgress();
            this.metadataCache.clear();
            void this.loadVideos();
        };

        box.classList.remove("items-center");
        box.classList.add("flex", "flex-col");
        box.removeAttribute("hidden");
    }

    async toggleTag(tag: string, reset = true): Promise<void> {
        document.querySelectorAll<HTMLButtonElement>(".tag-button").forEach((button) => {
            button.classList.remove("active-tag");
        });

        this.state.activeTags.forEach((currentTags, sectionId) => {
            const index = currentTags.indexOf(tag);
            if (index >= 0) {
                currentTags.splice(index, 1);
            } else {
                currentTags.push(tag);
            }

            document
                .querySelectorAll<HTMLButtonElement>(`.${tag}-id-${sectionId}`)
                .forEach((button) => button.classList.add("active-tag"));
        });

        if (!reset) {
            return;
        }

        this.state.clearEmptyState();
        this.html.hideNoVideosBox();
        this.metadataCache.clear();
        await this.state.fetchVideosByTags(1);
        if (await this.tryPreserveCurrentVideoOnTagChange(1)) {
            return;
        }

        await this.loadVideos();
    }

    async fetchVideos(query?: string): Promise<Video[]> {
        return this.api.fetchVideos(query);
    }

    private createMetadataFormContainers(): void {
        let count = 0;
        this.state.sectionIds.forEach((section) => {
            if (!this.state.multiSection && section !== 1) {
                return;
            }
            const sectionElement = document.getElementById(`section-${section}`);
            if (!sectionElement) {
                return;
            }

            this.createMetadataForm(section);
            count++;
        });
        console.log(`Metadata form containers created: ${count}`);
    }

    private createMetadataForm(section: SectionId): void {
        const form = this.html.videoForms[section - 1];
        if (!form) {
            throw new Error("Metadata form not found");
        }

        const makeInput = (placeholder: string, key: keyof VideoWithRelations) => {
            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = placeholder;
            input.className = "input-fields";
            input.addEventListener("input", async (event) => {
                event.preventDefault();
                await this.updateMeta(section, key, input.value);
            });
            return input;
        };

        const titleInput = makeInput("Title", "title");
        const modelInput = makeInput("Models", "models");
        const studioInput = makeInput("Studio", "studio");
        const idInput = makeInput("id", "id");

        const metadataHeader = this.html.createDiv(`metadata-header-${section}`, "metadata-header");
        const metadataTitleGroup = this.html.createDiv(`metadata-title-group-${section}`, "metadata-title-group");
        const videoTagsLabel = document.createElement("div");
        videoTagsLabel.textContent = "Video tags";
        videoTagsLabel.className = "tag-section-label";
        const metadataHint = document.createElement("div");
        metadataHint.textContent = "Tap tags to filter instantly";
        metadataHint.className = "metadata-subtitle";
        metadataTitleGroup.append(videoTagsLabel, metadataHint);

        const editToggleBtn = document.createElement("button");
        editToggleBtn.type = "button";
        editToggleBtn.className = "edit-toggle metadata-edit-btn";
        editToggleBtn.innerHTML = `${this.editIcon}<span>Edit</span>`;
        editToggleBtn.title = "Edit metadata";
        const favoriteBtn = document.createElement("button");
        favoriteBtn.type = "button";
        favoriteBtn.className = "reaction-btn favorite-btn";
        favoriteBtn.innerHTML = `
            <span class="favorite-heart">♡</span>
            <span class="favorite-count">0</span>
        `;
        favoriteBtn.title = "Favorite";

        const closeMetadataBtn = document.createElement("button");
        closeMetadataBtn.type = "button";
        closeMetadataBtn.className = "metadata-close-btn";
        closeMetadataBtn.innerHTML = "&times;";
        closeMetadataBtn.title = "Hide metadata";

        const showMetadataBtn = document.createElement("button");
        showMetadataBtn.type = "button";
        showMetadataBtn.className = "metadata-show-btn hidden";
        showMetadataBtn.textContent = "i";
        showMetadataBtn.title = "Show metadata";

        form.parentElement?.appendChild(showMetadataBtn);


        closeMetadataBtn.addEventListener("click", () => {
            this.state.advancedMode = false;

            editorPanel.classList.add("hidden");
            titleInput.classList.add("hidden");
            modelInput.classList.add("hidden");
            studioInput.classList.add("hidden");
            idInput.classList.add("hidden");

            this.setUploadFormVisibility(false);

            document.querySelectorAll<HTMLElement>(".tag-delete").forEach((button) => {
                button.classList.add("hidden");
            });

            editToggleBtn.innerHTML = `${this.editIcon}<span>Edit</span>`;
            editToggleBtn.title = "Edit metadata";

            this.html.setMetadataVisibility(false);
        });
        showMetadataBtn.addEventListener("click", () => {
            form.classList.remove("metadata-hidden");
            showMetadataBtn.classList.add("hidden");
        });

        metadataHeader.append(metadataTitleGroup, editToggleBtn, favoriteBtn, closeMetadataBtn);

        const videoTagsContainer = this.html.createDiv(`video-tags-${section}`, "metadata-tags-panel");
        const videoTagsWrapper = this.html.createDiv(`video-tags-wrapper-${section}`, "tag-container metadata-tag-list");
        videoTagsContainer.append(metadataHeader, videoTagsWrapper);
        this.html.videoTagsContainers.push(videoTagsWrapper);

        const editorPanel = this.html.createDiv(`metadata-editor-${section}`, "metadata-editor hidden");
        const editorActions = this.html.createDiv(`metadata-actions-${section}`, "metadata-actions");
        const tagButtonWrapper = this.html.createDiv(`tag-button-wrapper-${section}`, "relative inline-block");
        const addTagBtn = document.createElement("button");
        addTagBtn.type = "button";
        addTagBtn.innerHTML = `${this.addTagIcon}<span>Add tag</span>`;
        addTagBtn.className = "plus-button metadata-action-btn";
        addTagBtn.title = "Add tag";

        const tagListDropdown = document.createElement("div");
        tagListDropdown.className = "tag-list hidden";
        const populateTagDropdown = async () => {
            await this.state.tagsPromise;
            tagListDropdown.innerHTML = "";

            this.state.allTags.forEach((tag) => {
                const tagItem = document.createElement("div");
                tagItem.textContent = tag.title;
                tagItem.className = "px-3 py-2 hover:bg-gray-200 cursor-pointer";
                tagItem.addEventListener("click", async () => {
                    if (!tag.title) {
                        return;
                    }
                    const updated = await this.updateMeta(section, "tag", tag.title, tag.id);
                    await this.populateMetadataForm(section, updated);
                    tagListDropdown.classList.add("hidden");
                });
                tagListDropdown.appendChild(tagItem);
            });
        };

        addTagBtn.addEventListener("click", async () => {
            if (tagListDropdown.classList.contains("hidden")) {
                await populateTagDropdown();
            }
            tagListDropdown.classList.toggle("hidden");
        });

        const uploadFormWrapper = document.createElement("div");
        uploadFormWrapper.className = "upload-form hidden";
        uploadFormWrapper.style.minWidth = "14rem";
        if (section === 1) {
            this.uploadFormWrapper = uploadFormWrapper;
            this.html.appRoot.appendChild(uploadFormWrapper);
        }

        const closeUploadBtn = document.createElement("button");
        closeUploadBtn.type = "button";
        closeUploadBtn.className = "upload-close-btn";
        closeUploadBtn.setAttribute("aria-label", "Close upload window");
        closeUploadBtn.innerHTML = "&times;";
        closeUploadBtn.addEventListener("click", () => {
            this.setUploadFormVisibility(false);
        });

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.multiple = true;
        fileInput.className = "block w-full mb-2";

        const uploadTitleInput = document.createElement("input");
        uploadTitleInput.type = "text";
        uploadTitleInput.placeholder = "Title";
        uploadTitleInput.className = "block w-full mb-2 border border-gray-400 px-2 py-1 rounded";

        const uploadTagSelect = document.createElement("select");
        uploadTagSelect.className = "block w-full mb-2 border border-gray-400 px-2 py-1 rounded";
        if (section === 1) {
            this.uploadTagSelect = uploadTagSelect;
        }

        const submitUploadBtn = document.createElement("button");
        submitUploadBtn.type = "button";
        submitUploadBtn.textContent = "Upload";
        submitUploadBtn.className = "upload-submit-btn";
        submitUploadBtn.addEventListener("click", async () => {
            if (!fileInput.files?.length) {
                alert("Please select a file.");
                return;
            }

            const formData = new FormData();
            Array.from(fileInput.files).forEach((file) => formData.append("files", file));
            formData.append("title", uploadTitleInput.value);
            formData.append("tagId", uploadTagSelect.value);

            try {
                await this.api.uploadVideo(formData);
                alert("Upload successful");
                this.setUploadFormVisibility(false);
            } catch (error) {
                console.error("Upload failed", error);
                alert("Upload failed");
            }
        });

        uploadFormWrapper.append(closeUploadBtn, fileInput, uploadTitleInput, uploadTagSelect, submitUploadBtn);
        tagButtonWrapper.append(addTagBtn, tagListDropdown);
        editorActions.append(tagButtonWrapper);

        [titleInput, modelInput, studioInput, idInput].forEach((input) => input.classList.add("hidden"));
        const fieldsWrapper = this.html.createDiv(`metadata-fields-${section}`, "metadata-fields");
        fieldsWrapper.append(titleInput, modelInput, studioInput, idInput);
        editorPanel.append(editorActions, fieldsWrapper);

        const toggleEditMode = () => {
            const nextAdvancedMode = !this.state.advancedMode;
            this.state.advancedMode = nextAdvancedMode;

            editorPanel.classList.toggle("hidden", !nextAdvancedMode);
            titleInput.classList.toggle("hidden", !nextAdvancedMode);
            modelInput.classList.toggle("hidden", !nextAdvancedMode);
            studioInput.classList.toggle("hidden", !nextAdvancedMode);
            idInput.classList.toggle("hidden", !nextAdvancedMode);
            this.setUploadFormVisibility(false);

            document.querySelectorAll<HTMLElement>(".tag-delete").forEach((button) => {
                button.classList.toggle("hidden", !nextAdvancedMode);
            });

            editToggleBtn.innerHTML = nextAdvancedMode
                ? `${this.doneIcon}<span>Minimize</span>`
                : `${this.editIcon}<span>Edit</span>`;
            editToggleBtn.title = nextAdvancedMode ? "Return to view mode" : "Edit metadata";
        };

        editToggleBtn.addEventListener("click", toggleEditMode);
        form.append(videoTagsContainer, editorPanel);
    }

    private getActiveIndexForSection(section: number): PlayerIndex {
        const [frontIndex, backIndex] = this.getSectionPlayerIndexes(section as SectionId);
        return this.state.active[frontIndex] ? frontIndex : backIndex;
    }

    private async updateMeta(
        section: SectionId,
        key: string,
        value: string | string[],
        tagId?: number,
    ): Promise<VideoWithRelations | null> {
        const activeIndex = this.getActiveIndexForSection(section);
        const video = this.html.videoPlayers[activeIndex];
        const videoId = video.getAttribute("data-video-id");

        if (!videoId) {
            console.error(`Extracted video ID is empty for video at index ${activeIndex}`);
            return null;
        }

        const payload: UpdateVideoPayload = { id: videoId };
        if (key === "title") {
            payload.title = value;
        } else if (key === "models") {
            payload.models = value;
        } else if (key === "studio") {
            payload.studio = value;
        } else if (key === "tag") {
            payload.tag = { id: tagId, title: value };
        }

        try {
            await this.api.updateVideo(payload);
            this.metadataCache.delete(Number(videoId));
            return this.getVideoMetadata(Number(videoId));
        } catch (error) {
            console.error(`Failed to update metadata for video ${activeIndex}:`, error);
            return null;
        }
    }
}

export default Players;
