import State, { type SectionId, PlayerIndex } from "./State";
import HTML from "./HTML";
import { config } from "./config";

export type VideoMetadata = {
    id: number;
    title: string | null;
    seriesNr: number | null;
    seriesTotal: number | null;
    studio: string | null;
    models: Array<string> | null;
    tags: any[] | null;
};

class Players {
    state: State;
    html: HTML;
    active: Record<number, boolean> | undefined;
    folder = config.videoSourcePath;
    muted: boolean = true;
    playerCount: number = 8;
    selectedTags: Map<number, string> = new Map();
    cachedVideos: VideoMetadata[] = [];

    constructor(state: State, html: HTML) {
        this.state = state;
        this.html = html;

        // this.addFormsToPlayers();

    }
    async init() {
        this.active = this.initializeActive(this.playerCount);
        this.html.allTags = await this.fetchAllTags();
        const videoContainer = this.createVideoContainer()
        const rootApp = document.getElementById('app-root');
        rootApp?.appendChild(videoContainer)

        this.attachEventListeners();
        this.initializeMuteButton();

        await this.loadVideos();
        // this.updateLayout();
        // this.addFormsToPlayers();
    }
    async loadVideos(active = false, reload = false): Promise<void> {
        for (let i = 0; i < this.html.videoPlayers.length; i++) {
            if (!this.state.multiSection && i > 1) {
                continue;
            }

            if (reload && !this.html.videoPlayers[i].src) {

            } else if (active && this.active && this.active[i] && this.html.videoPlayers[i].src) {
                continue;
            }

            const section = Math.ceil((i + 1) / 2) as SectionId;

            // get current position for that section

            const pos = this.state.positions[section];
            const playerIndex = i as PlayerIndex;

            this.html.videoPlayers[playerIndex].src = this.folder + pos + '.mp4';
            this.html.videoPlayers[playerIndex].preload = 'auto';
            await this.state.modifyPosition(section);
            const res = await this.getVideoMetadata(pos);
            this.populateMetadataForm(playerIndex, res);
        }
    }
    async renderSearchResults(videos: any[]) {
        const container = document.getElementById('video-container');
        if (!container) return;

        if (videos.length === 0) {
            await this.init();
            return;
        }

        container.innerHTML = `
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
      ${videos
                .map((v) => {
                    const thumbPath = `./videos/thumbnails/${v.id}.jpg`;
                    return `
            <div class="bg-gray-800 rounded-lg p-2 shadow hover:scale-105 transition-transform">
              <img src="${thumbPath}" alt="${v.title}" class="rounded-md mb-2 w-full">
              <h3 class="text-sm font-semibold truncate">${v.title}</h3>
              <p class="text-xs text-gray-400">${v.models?.map((m: any) => m.name).join(', ') || ''}</p>
            </div>
          `;
                })
                .join('')}
    </div>`;
    }

    private updateLayout(): void {
        const isMulti = this.state.multiSection;

        // Always update players 0 and 1
        [0, 1].forEach(index => {
            const player = this.html.videoPlayers[index];
            const wrapper = player.parentElement as HTMLDivElement;
            wrapper.classList.toggle('half-size', isMulti);
        });

        this.html.videoPlayers.forEach((player, index) => {
            if (index < 2) return;

            const wrapper = player.parentElement as HTMLDivElement | null;
            if (!wrapper) return;

            // show even-indexed players in multi mode, hide odd ones
            const shouldBeVisible = isMulti ? index % 2 === 0 : index < 2;
            wrapper.classList.toggle('hidden', !shouldBeVisible);
        });
    }
    private initializeMuteButton(): void {
        const muteIcon = document.getElementById('muteIcon');

        // set initial state: all players muted + muted icon
        this.html.videoPlayers.forEach(player => {
            player.muted = this.muted;
        });

        if (muteIcon) {
            muteIcon.innerHTML = `
      <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 9a3 3 0 010 6" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M17.5 7.5a6 6 0 010 9" />
      </svg>`;
        }

        // add click listener
        this.html.muteToggle?.addEventListener('click', () => {
            this.muted = !this.muted;

            this.html.videoPlayers.forEach(player => {
                player.muted = this.muted;
            });


        });
    }
    private attachEventListeners() {
        this.html.playPauseBtn.addEventListener('click', () => {
            this.html.playPauseBtn.classList.toggle('is-playing');


            this.html.videoPlayers.forEach((player, index) => {
                this.togglePlayPause(index as PlayerIndex);

            });

        });
        this.html.fullscreenButton.addEventListener('click', () => {
            // Target document.documentElement for the "Whole Document"
            const docElm = document.documentElement;

            if (!document.fullscreenElement) {
                docElm.requestFullscreen().catch(err => {
                    console.error(`Error: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });

        // Update the icon toggle
        document.addEventListener('fullscreenchange', () => {
            this.html.fullscreenButton.classList.toggle('is-fullscreen', !!document.fullscreenElement);
        });
        this.html.resizeButton.addEventListener('click', () => {
            this.html.resizeButton.classList.toggle('is-multi');
            this.state.multiSection = !this.state.multiSection;
            this.updateLayout();
            this.loadVideos(true, true);
        });
        this.html.muteToggle.addEventListener('click', () => {
            this.html.muteToggle.classList.toggle('is-muted');
        });
        this.html.hideFormsBtn.addEventListener('click', () => {
            const forms = document.querySelectorAll('.metadata-form')
            forms.forEach(el => (el as HTMLElement).classList.toggle('hidden'))
        })
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        const advancedPanel = document.getElementById('advancedPanel');
        if (!searchInput || !advancedPanel) return;
        searchInput.addEventListener('focus', () => {
            advancedPanel?.classList.remove("hidden");
        });

        searchInput.addEventListener('focusout', () => {
            setTimeout(() => {
                advancedPanel?.classList.add("hidden");
            }, 500); // 500ms delay
        });
        let tagAbortController: any;

        searchInput.addEventListener('input', async (e) => {
            const value = (e.target as HTMLInputElement).value.trim();

            if (!value) {
                advancedPanel.innerHTML = '';
                return;
            }

            // cancel previous request if user types fast
            tagAbortController?.abort();
            tagAbortController = new AbortController();

            try {
                const url = `${this.state.apiUrl}/tags?search=${encodeURIComponent(value)}`;
                const res = await fetch(url, {
                    signal: tagAbortController.signal
                });

                const tags = await res.json();
                this.renderTagResults(tags, advancedPanel, searchInput);
            } catch (err) {
                throw err;
            }
        });

        this.html.videoPlayers.forEach((player, index) => {
            player.addEventListener('ended', () => {
                this.handlePlayerEnded(index as PlayerIndex);
            });
            player.addEventListener('click', () => this.togglePlayPause(index as PlayerIndex));
        });
    }
    private renderTagResults(tags: any[], advancedPanel: HTMLElement, searchInput: HTMLInputElement) {
        advancedPanel.innerHTML = '';

        tags.forEach(tag => {
            const tagItem = document.createElement('div');
            tagItem.textContent = tag.title;
            tagItem.className =
                'px-3 py-2 hover:bg-gray-200 cursor-pointer rounded';

            tagItem.addEventListener('click', async () => {
                console.log("Clicked tag:", tag.title);

                // always update section 1 on click
                const section: SectionId = 1;
                const tags = this.state.activeTags[section] || [];

                // toggle tag in the section
                if (!tags.includes(tag.title)) {
                    tags.push(tag.title);
                } else {
                    this.state.activeTags[section] = tags.filter(t => t !== tag.title);
                }

                this.state.activeTags[section] = tags;

                // reload videos
                await this.loadVideos(true, true);

                // optionally hide the panel and clear input
                // advancedPanel.classList.add('hidden');
                searchInput.value = '';
            });

            advancedPanel.appendChild(tagItem);
        });
    }

    private initializeActive(playerCount: number): Record<number, boolean> {
        const act: Record<number, boolean> = {};
        for (let i = 0; i < playerCount; i++) {
            act[i] = (i % 2 === 0);
        }

        return act;
    }
    async getVideoMetadata(videoId: number): Promise<VideoMetadata | null> {
        try {
            const response = await fetch(`${this.state.apiUrl}/videos/${videoId}`);
            if (!response.ok) throw new Error(`Failed to fetch metadata for videoId ${videoId}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching metadata for videoId ${videoId}:`, error);
            return null;
        }
    }
    async handlePlayerEnded(playerIndex: PlayerIndex) {
        try {
            const section = Math.ceil((playerIndex + 1) / 2) as SectionId;

            // flip 0↔1, 2↔3, 4↔5, 6↔7
            const nextPlayerIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;

            const primary = this.html.videoPlayers[playerIndex];
            const secondary = this.html.videoPlayers[nextPlayerIndex];

            if (!primary || !secondary) {
                console.error(`Invalid player index: ${playerIndex}`);
                return;
            }

            await secondary.play();

            this.state.modifyPosition(section);


            // hide/show wrappers instead of videos
            const currentWrapper = primary.parentElement as HTMLElement;
            const nextWrapper = secondary.parentElement as HTMLElement;
            nextWrapper.classList.remove("hidden");
            currentWrapper.classList.add("hidden");

            // ensure active map exists, then toggle active states correctly (no +1 offset)
            if (!this.active) {
                this.active = this.initializeActive(this.playerCount);
            }
            this.active[nextPlayerIndex] = true;
            this.active[playerIndex] = false;

            const pos = this.state.positions[section];
            const filename = `${this.folder}${pos}.mp4`;
            primary.src = filename;
            primary.preload = "auto";

            const res = await this.getVideoMetadata(pos);
            this.populateMetadataForm(playerIndex as PlayerIndex, res);
            // primary.load();
        } catch (err) {
            console.error(`Error in section , player ${playerIndex}:`, err);
        }
    }

    private async togglePlayPause(index: PlayerIndex): Promise<void> {
        const player = this.html.videoPlayers[index];
        const section = Math.floor(index / 2 + 1) as SectionId;

        if (this.active && this.active[index] && !this.state.playing[section]) {
            await player.play();
            console.log("starting to play video index", index);


            const pair = index % 2 === 0 ? index + 1 : index - 1;
            if (this.html.videoForms[pair] && this.state.advancedMode) {
                this.html.videoForms[pair].classList.add('hidden');
            }
            this.state.playing[section] = true;
        } else {
            await player.pause();
            console.log("pausing video index", index);
            this.state.playing[section] = false;
        }

        // this.html.toolbar.classList.toggle('hidden');
    }

    populateMetadataForm(index: PlayerIndex, data: VideoMetadata | null): void {
        if (!this.isMetadataValid(data) || !data) {
            console.warn(`Invalid or empty metadata for Player ${index}`);
            return;
        }

        const form = document.getElementById(`metaForm${index + 1}`);
        if (!form) return;

        const inputs = form.querySelectorAll('input');

        inputs.forEach((input) => {
            switch (input.placeholder) {
                case 'Title':
                    input.value = data.title || '';
                    break;
                case 'Models':
                    input.value = Array.isArray(data.models) ? data.models.join(', ') : (data.models || '');
                    break;
                case 'Studio':
                    input.value = data.studio || '';
                    break;
            }
        });
        if (!data.tags || data.tags.length === 0) {
            return;
        }

        const tagsWrapper = this.html.tagsWrappers[index as PlayerIndex];

        if (!tagsWrapper) return;
        // render toggleable tags directly here
        this.html.renderTags(
            tagsWrapper,
            data.tags.map(t => t.title),
            index,
            this.toggleTag.bind(this)
        )
    }

    async toggleTag(btn: HTMLElement) {
        const tag = btn.textContent?.trim();
        if (!tag) return;

        const tagClass = `${tag}-id`;
        const sectionEl = btn.closest('[id^="player"]');
        if (!sectionEl) throw new Error(`Section element not found for tag "${tag}"`);

        // toggle active-tag class for all matching elements in the same section
        const isActive = btn.classList.toggle('active-tag');
        sectionEl.querySelectorAll<HTMLElement>(`.${tagClass}`).forEach(el => {
            if (el !== btn) el.classList.toggle('active-tag', isActive);
        });

        // extract player number (e.g. player3 → 3)
        const playerId = sectionEl.id.match(/\d+/);
        if (!playerId) return;

        const playerNumber = parseInt(playerId[0], 10) as PlayerIndex;
        const section = Math.floor(playerNumber / 2 + 1) as SectionId;
        const tags = this.state.activeTags[section];

        // sync tag state
        if (isActive) {
            if (!tags.includes(tag)) tags.push(tag);
        } else {
            this.state.activeTags[section] = tags.filter(t => t !== tag);
        }

        await this.loadVideos(true);
    }

    async fetchAllTags() {
        try {
            const response = await fetch(`${this.state.apiUrl}/tags`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const tags = await response.json();
            const sorted = tags.map((t: any) => ({ ...t }))
                .sort((a: any, b: any) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

            return sorted; // array of tag objects
        } catch (error) {
            console.error('Failed to fetch tags:', error);
            return [];
        }
    }
    isMetadataValid(data: VideoMetadata | null): boolean {
        if (!data) return false;

        const hasTitle = !!data.title?.trim();
        const hasModels = Array.isArray(data.models) && data.models.length > 0;
        const hasStudio = !!data.studio?.trim();
        const hasTags = Array.isArray(data.tags) && data.tags.length > 0;

        return hasTitle || hasModels || hasStudio || hasTags;
    }
    async fetchVideos(query?: string) {
        // if query empty and cache exists, use it
        if (!query && this.cachedVideos.length) return this.cachedVideos;

        const url = query ? `${this.state.apiUrl}/videos?search=${encodeURIComponent(query)}` : `${this.state.apiUrl}/videos`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch videos');
        const data = await res.json();

        if (!query) this.cachedVideos = data; // cache all videos
        return data;
    }
    createMetadataForm(index: PlayerIndex): void {
        // 💡 UPDATED: Added positioning classes 'absolute top-0 left-0 z-20 relative'.
        // 'absolute top-0 left-0' places it in the top-left of the parent.
        // 'relative' is crucial for the internal dropdowns (tagListDropdown, uploadFormWrapper) to position correctly relative to the form.
        this.html.videoForms[index] = this.html.createDiv(
            `metaForm${index}`,
            'metadata-form hidden p-2'
        );

        const shouldHide = this.state.playing[Math.floor(index / 2 + 1) as SectionId];
        if (shouldHide) {
            this.html.videoForms[index].classList.add('hidden');
        }

        const makeInput = (placeholder: string, key: keyof VideoMetadata) => {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = placeholder;
            input.className = 'input-fields';

            input.addEventListener('input', async (event) => {
                event.preventDefault();
                await this.updateMeta(index, key, input.value);
            });

            return input;
        };
        const titleInput = makeInput('Title', 'title');
        const modelInput = makeInput('Models', 'models'); // or 'model' if that is your key
        const studioInput = makeInput('Studio', 'studio');

        const tagsWrapper = this.html.createDiv(`tags${index}`, 'tag-container');

        // in your constructor or before usage
        this.html.tagsWrappers.push(tagsWrapper);

        // 1. Create a container for the button and the dropdown
        const tagButtonWrapper = this.html.createDiv('tag-button-wrapper', 'relative inline-block'); // Make this wrapper relative

        // + Button to show available tags
        const addTagBtn = document.createElement('button');
        addTagBtn.type = 'button';
        addTagBtn.textContent = '+';
        addTagBtn.className = 'plus-button px-2 py-1 m-1 text-sm rounded border border-transparent text-gray-300 transition hover:bg-white/10 hover:border-gray-400';

        // 2. Adjust dropdown classes to position relative to the new wrapper
        const tagListDropdown = document.createElement('div');
        tagListDropdown.className = 'tag-list hidden';

        this.html.allTags.forEach((tag) => {
            const tagItem = document.createElement('div');
            tagItem.textContent = tag.title
            tagItem.className = 'px-3 py-2 hover:bg-gray-200 cursor-pointer';
            tagItem.addEventListener('click', async () => {
                const video = await this.updateMeta(index, 'tag', tag.title, tag.id);
                tagListDropdown.classList.add('hidden'); // hide dropdown
                this.populateMetadataForm((index) as PlayerIndex, video);
            });
            tagListDropdown.appendChild(tagItem);
        });

        // Toggle tag dropdown visibility
        addTagBtn.addEventListener('click', () => {
            tagListDropdown.classList.toggle('hidden');
        });

        // UPLOAD button + form
        const uploadBtn = document.createElement('button');
        uploadBtn.type = 'button';
        uploadBtn.innerHTML = '📤'; // could be replaced with an icon <svg> if you want
        uploadBtn.className = 'upload-button px-2 py-1 m-1 text-sm rounded border border-transparent text-gray-300 transition hover:bg-white/10 hover:border-gray-400';

        const uploadFormWrapper = document.createElement('div');
        // The dropdowns are already set to absolute, which now uses the form (relative) as its context.
        uploadFormWrapper.className = 'upload-form hidden mt-2 bg-white text-black border border-gray-300 rounded shadow-md p-2 absolute';
        uploadFormWrapper.style.minWidth = '14rem';

        // form fields inside upload form
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.className = 'block w-full mb-2';

        const uploadTitleInput = document.createElement('input');
        uploadTitleInput.type = 'text';
        uploadTitleInput.placeholder = 'Title';
        uploadTitleInput.className = 'block w-full mb-2 border border-gray-400 px-2 py-1 rounded';

        // tag select for uploaded video
        const uploadTagSelect = document.createElement('select');
        uploadTagSelect.className = 'block w-full mb-2 border border-gray-400 px-2 py-1 rounded';

        this.html.allTags.forEach((tag) => {
            const opt = document.createElement('option');
            opt.value = tag.id.toString();
            opt.textContent = tag.title;
            uploadTagSelect.appendChild(opt);
        });

        const submitUploadBtn = document.createElement('button');
        submitUploadBtn.type = 'button';
        submitUploadBtn.textContent = 'Upload';
        submitUploadBtn.className = 'px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700';

        submitUploadBtn.addEventListener('click', async () => {
            if (!fileInput.files?.length) return alert('Please select a file.');

            const formData = new FormData();
            // append all selected files
            Array.from(fileInput.files).forEach((file) => {
                formData.append('files', file);
            });
            formData.append('title', uploadTitleInput.value);
            formData.append('tagId', uploadTagSelect.value);

            const res = await fetch(`${this.state.apiUrl}/upload-video`, {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                alert('Upload successful');
                uploadFormWrapper.classList.add('hidden');
            } else {
                alert('Upload failed');
            }
        });

        uploadFormWrapper.append(fileInput, uploadTitleInput, uploadTagSelect, submitUploadBtn);

        uploadBtn.addEventListener('click', () => {
            uploadFormWrapper.classList.toggle('hidden');
        });

        // Append button and dropdown to the new wrapper
        tagButtonWrapper.append(addTagBtn, tagListDropdown);
        this.html.videoForms[index].append(tagsWrapper, tagButtonWrapper, titleInput, modelInput, studioInput, uploadBtn, uploadFormWrapper);
    }
    async updateMeta(index: PlayerIndex, key: string, value: string | string[], tagId?: number): Promise<VideoMetadata | null> {
        // gather data to send, assuming you have videos in an array like this:
        const video = this.html.videoPlayers[index];
        if (!video) {
            console.error(`Video player for index ${index} not found`);
            return null;
        }

        const src = video.src;
        if (!src) {
            console.error(`Video source for player at index ${index} is missing`);
            return null;
        }
        const filename = src.split('/').pop();
        if (!filename) {
            console.error(`Could not extract filename from src for video at index ${index}`);
            return null;
        }
        const videoId = filename.replace('.mp4', '');
        if (!videoId) {
            console.error(`Extracted video ID is empty for video at index ${index}`);
            return null;
        }

        const body: any = { id: videoId };
        // build request body dynamically
        if (key === 'title') {
            body.title = value;
        } else if (key === 'models') {
            body.models = value;
        } else if (key === 'studio') {
            body.studio = value;
        } else if (key === 'tag') {
            body.tag = { id: tagId, title: value };
        }

        try {
            const response = await fetch(`${this.state.apiUrl}/videos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`);
                return null;
            }

            // After updating, fetch the latest metadata for this video and return it
            const updated = await this.getVideoMetadata(Number(videoId));
            return updated;
        } catch (error) {
            console.error(`Failed to update metadata for video ${index}:`, error);
            return null;
        }
    }
    createVideoContainer(): HTMLElement {
        const container = document.getElementById('video-container')
        if (!container) {
            throw new Error('Video container element not found');
        }
        this.html.videoPlayers = []
        for (let i: PlayerIndex = 0; i <= 7; i++) {
            // 💡 UPDATED: Added 'relative' to the wrapper's class list
            const wrapper = this.html.createDiv(
                `player${i}`,
                `${this.html.getPositionClass(i)}`
            )

            this.createMetadataForm(i as PlayerIndex)
            // Since wrapper is the parent, and the form is absolute, it will now sit in the top-left of this wrapper.
            wrapper.appendChild(this.html.videoForms[i as PlayerIndex]);

            const video = document.createElement('video')
            video.id = `videoPlayer${i}`
            video.className = 'video-layer'
            video.muted = true
            wrapper.appendChild(video)
            container.appendChild(wrapper)
            this.html.videoPlayers.push(video)
        }

        return container
    }
}

export default Players;
