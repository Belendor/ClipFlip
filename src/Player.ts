import State, { type SectionId, PlayerIndex } from "./State";
import HTML from "./HTML";

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
    folder = './videos/';
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
        const toolbar = this.createToolbar()
        const videoContainer = this.createVideoContainer()

        document.body.appendChild(toolbar)
        document.body.appendChild(videoContainer)

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

            // assign video source based on position
            console.log("assigning to player", playerIndex, "the video", pos);

            this.html.videoPlayers[playerIndex].src = this.folder + pos + '.mp4';
            this.html.videoPlayers[playerIndex].preload = 'auto';
            const res = await this.getVideoMetadata(pos);
            this.populateMetadataForm(playerIndex, res);
            await this.state.modifyPosition(section);
        }
    }
    createToolbar(): HTMLElement {
        const toolbar = this.html.createDiv('button-toolbar')
        toolbar.className = 'button-toolbar flex justify-center items-center gap-3 p-3 bg-gray-900'

        // Buttons
        this.html.playButton = this.html.createButton('playButton', this.html.svgPlay())
        this.html.pauseButton = this.html.createButton('pauseButton', this.html.svgPause())
        this.html.fullscreenButton = this.html.createButton('fullscreenButton', this.html.svgFullscreen())
        this.html.resizeButton = this.html.createButton('resizeButton', this.html.svgGrid4())

        this.html.muteIcon = this.html.createSpan('muteIcon')
        this.html.muteToggle = this.html.createButton('muteToggle', this.html.muteIcon)

        this.html.hideIcon = this.html.createSpan('hideIcon')
        const iconBurger = `
    <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <line x1="3" y1="6" x2="21" y2="6" stroke-linecap="round" />
      <line x1="3" y1="12" x2="21" y2="12" stroke-linecap="round" />
      <line x1="3" y1="18" x2="21" y2="18" stroke-linecap="round" />
    </svg>
  `
        this.html.hideIcon.innerHTML = iconBurger

        this.html.hideFormsButton = this.html.createButton('hideForms', this.html.hideIcon)
        this.html.hideFormsButton.classList.add('hide-button')

        this.html.hideFormsButton.addEventListener('click', () => {
            const forms = document.querySelectorAll('.metadata-form')
            forms.forEach(el => (el as HTMLElement).classList.toggle('hidden'))
        })

        // Search bar element
        const searchInput = document.createElement('input')
        searchInput.id = 'search-input'
        searchInput.type = 'text'
        searchInput.placeholder = 'Search videos...'
        searchInput.className =
            'w-1/3 p-2 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-pink-500'

        searchInput.addEventListener('input', async (e) => {
            const value = (e.target as HTMLInputElement).value.trim()
            await this.fetchVideos(value)
                .then((videos) => this.renderSearchResults(videos))
                .catch(console.error)
        })

        // append everything inline
        toolbar.append(
            this.html.hideFormsButton,
            this.html.playButton,
            this.html.pauseButton,
            searchInput, // ⬅ add here between buttons
            this.html.fullscreenButton,
            this.html.resizeButton,
            this.html.muteToggle
        )
        return toolbar
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

            muteIcon!.innerHTML = !this.muted
                ? `
      <!-- Muted icon: speaker only -->
      <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
      </svg>`
                : `
      <!-- Unmuted icon: speaker with waves -->
      <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" stroke-width="2"
        viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 9a3 3 0 010 6" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M17.5 7.5a6 6 0 010 9" />
      </svg>`;
        });
    }
    private attachEventListeners() {
        this.html.playButton.addEventListener('click', async () => {
            try {
                for (let i = 0; i < this.html.videoPlayers.length; i++) {
                    const player = this.html.videoPlayers[i];
                    if (this.active && this.active[i]) {
                        await player.play();
                    }
                }
            } catch (error) {
                console.error('Error playing selected videos:', error);
            }
        });
        this.html.pauseButton.addEventListener('click', async () => {
            try {
                // play only videos where the player is active in state
                this.html.videoPlayers
                    .forEach(player => player.pause());
            } catch (error) {
                console.error('Error playing selected videos:', error);
            }
        });
        this.html.videoPlayers.forEach((player, index) => {
            player.addEventListener('ended', () => {
                this.handlePlayerEnded(index as PlayerIndex);
            });
            player.addEventListener('click', () => this.togglePlayPause(index as PlayerIndex));
        });
        this.html.resizeButton.addEventListener('click', () => {
            console.log("Resizing, status:", this.state.multiSection);

            this.state.multiSection = !this.state.multiSection;
            console.log("Resizing, new status:", this.state.multiSection);

            // this.updateResizeIcon();
            this.updateLayout();
            this.loadVideos(true, true);
        });
        this.html.fullscreenButton.addEventListener('click', () => {
            this.toggleFullscreen();
        });
    }
    private initializeActive(playerCount: number): Record<number, boolean> {
        const act: Record<number, boolean> = {};
        for (let i = 0; i < playerCount; i++) {
            act[i] = (i % 2 === 0);
        }
        console.log(act);

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
        console.log(`Player ${playerIndex} ended, switching video...`);

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
        console.log("section", section);

        this.state.modifyPosition(section);

        try {
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

            console.log(this.state.positions[section], "current position for section", section);

            const pos = this.state.positions[section];
            const filename = `${this.folder}${pos}.mp4`;
            primary.src = filename;
            primary.preload = "auto";

            const res = await this.getVideoMetadata(pos);
            this.populateMetadataForm(playerIndex as PlayerIndex, res);
            // primary.load();
        } catch (err) {
            console.error(`Error in section ${section}, player ${playerIndex}:`, err);
        }
    }

    private togglePlayPause(index: PlayerIndex): void {
        const video = this.html.videoPlayers[index];
        if (video.paused) {
            video.play();
            // this.active![index + 1] = true; // mark as active
            // // hide form when playing
            // const wrapper = video.parentElement;
            // if (wrapper) {
            //     const form = wrapper.querySelector('.form-container');
            //     form?.classList.add('hidden');
            // }
        } else {
            video.pause();
            // this.active![index + 1] = false; // mark as inactive

            // // show form when paused
            // const wrapper = video.parentElement;
            // if (wrapper) {
            //     const form = wrapper.querySelector('.form-container');
            //     form?.classList.remove('hidden');
            // }
        }
    }
    // private async addFormsToPlayers() {
    //     let tags: { id: number; title: string }[] = [];

    //     try {
    //         const response = await fetch('http://:3000/tags');
    //         if (!response.ok) throw new Error('Failed to fetch tags');
    //         const bodyText = await new Response(response.body).text();
    //         console.log(JSON.parse(bodyText));

    //         tags = JSON.parse(bodyText);
    //     } catch (error) {
    //         console.error('Error loading tags:', error);
    //     }
    //     for (let i = 1; i <= 8; i++) {
    //         const wrapper = document.getElementById(`player${i}`);
    //         if (!wrapper) continue;
    //         const optionsHtml = tags.length
    //             ? tags.map(tag => `<option value="${tag.title}">${tag.title}</option>`).join('')
    //             : `...`;
    //         console.log(tags);

    //         const formContainer = document.createElement('div');
    //         formContainer.className = 'form-container hidden'; // initially hidden
    //         formContainer.innerHTML = `
    //         <form id="videoForm${i}">
    //             <select id="tagSelect${i}" multiple style="width: 100%;">
    //                 ${optionsHtml}
    //             </select>
    //             <input type="text" id="videoTitle${i}" placeholder="Video Title" style="width: 100%; margin-top: 5px;" />
    //             <input type="text" id="videoModel${i}" placeholder="Model" style="width: 100%; margin-top: 5px;" />
    //             <button type="submit" class="submit-button" style="margin-top: 5px;">Submit</button>
    //         </form>
    //     `;

    //         wrapper.appendChild(formContainer);

    //         const form = formContainer.querySelector('form');
    //         form?.addEventListener('submit', async (event) => {
    //             event.preventDefault();

    //             const titleInput = form.querySelector(`#videoTitle${i}`) as HTMLInputElement;
    //             const tagSelect = form.querySelector(`#tagSelect${i}`) as HTMLSelectElement;

    //             const title = titleInput?.value || '';
    //             const tags = Array.from(tagSelect?.selectedOptions || []).map(opt => opt.value);
    //             const video = document.getElementById(`videoPlayer${i}`) as HTMLVideoElement | null;

    //             let videoName = '';
    //             if (video && video.src) {
    //                 videoName = video.src.split('/').pop()?.replace(/\.mp4$/, '') || '';
    //             }
    //             const data = {
    //                 title,
    //                 tags,
    //                 id: videoName,
    //             };

    //             try {
    //                 const response = await fetch(`${this.state.apiUrl}/videos`, {
    //                     method: 'POST',
    //                     headers: { 'Content-Type': 'application/json' },
    //                     body: JSON.stringify(data),
    //                 });

    //                 if (!response.ok) {
    //                     throw new Error(`Server responded with status ${response.status}`);
    //                 }

    //                 console.log(`Data from player ${i} submitted successfully:`, data);
    //             } catch (error) {
    //                 console.error(`Error submitting data for player ${i}:`, error);
    //             }
    //         });
    //     }
    // }
    private async toggleFullscreen(): Promise<void> {
        const doc = document;
        const el = document.documentElement;

        if (!doc.fullscreenElement) {
            await el.requestFullscreen();
        } else {
            await doc.exitFullscreen();
        }
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
            return tags; // array of tag objects
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
    createMetadataForm(index: PlayerIndex): HTMLElement {
        const form = this.html.createDiv(`metaForm${index}`, 'metadata-form p-2');

        const makeInput = (placeholder: string, key: keyof VideoMetadata) => {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = placeholder;
            input.className = 'block w-full mb-2 bg-transparent text-black border border-gray-400 px-2 py-1 rounded placeholder-black-400';

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

        // + Button to show available tags
        const addTagBtn = document.createElement('button');
        addTagBtn.type = 'button';
        addTagBtn.textContent = '+';
        addTagBtn.className = 'plus-button px-2 py-1 m-1 text-sm rounded border border-transparent text-gray-300 transition hover:bg-white/10 hover:border-gray-400';
        const tagListDropdown = document.createElement('div');
        tagListDropdown.className = 'tag-list mt-2 hidden bg-white text-black border border-gray-300 rounded shadow-md z-10 absolute';
        tagListDropdown.style.minWidth = '10rem';

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
        uploadFormWrapper.className = 'upload-form hidden mt-2 bg-white text-black border border-gray-300 rounded shadow-md p-2 z-10 absolute';
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

        form.append(titleInput, modelInput, studioInput, tagsWrapper, addTagBtn, tagListDropdown, uploadBtn, uploadFormWrapper);
        return form;
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
        const container = this.html.createDiv('video-container')
        this.html.videoPlayers = []
        for (let i: PlayerIndex = 0; i <= 7; i++) {
            const wrapper = this.html.createDiv(`player${i}`, `${this.html.getPositionClass(i)}`)

            const form = this.createMetadataForm(i as PlayerIndex)
            wrapper.appendChild(form)

            const video = document.createElement('video')
            video.id = `videoPlayer${i}`
            video.className = 'video-layer'
            video.playsInline = true
            video.setAttribute('webkit-playsinline', '')
            video.muted = true
            video.autoplay = true
            wrapper.appendChild(video)
            container.appendChild(wrapper)
            this.html.videoPlayers.push(video)
        }

        return container
    }
}

export default Players;
