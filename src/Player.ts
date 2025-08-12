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
    folder = './video/';
    muted: boolean = true;
    playerCount: number = 8;
    selectedTags: Map<number, string> = new Map();

    constructor(state: State, html: HTML) {
        this.state = state;
        this.html = html;

        // this.addFormsToPlayers();

    }
    async init() {
        this.active = this.initializeActive(this.playerCount);
        this.html.allTags = await this.fetchAllTags();
        console.log('Fetched all tags:', this.html.allTags);
        const toolbar = this.html.createToolbar()
        const videoContainer = this.html.createVideoContainer()

        document.body.appendChild(toolbar)
        document.body.appendChild(videoContainer)

        this.attachEventListeners();
        this.initializeMuteButton();
        await this.loadVideos();
        this.updateLayout();
        // this.addFormsToPlayers();
    }
    async loadVideos(active = false, reload = false): Promise<void> {
        for (let i = 1; i <= this.html.videoPlayers.length; i++) {
            console.log(`Loading video for Player ${i}...`);

            if (!this.state.multiSection && i > 2) {
                console.log(`Player ${i} is not active in single section mode, skipping...`);
                continue;
            }

            if (reload && !this.html.videoPlayers[i - 1].src) {

            } else if (active && this.active && this.active[i] && this.html.videoPlayers[i - 1].src) {
                console.log(`Player ${i} currently active with source, skipping...`);
                continue;
            }

            const section = Math.ceil(i / 2) as SectionId;

            console.log(`Loading video for Player ${i} in section ${section}`);


            // get current position for that section
            await this.state.modifyPosition(section);
            const pos = this.state.positions[section];
            console.log(`Loading video for Player ${i} at position ${pos}`);

            const playerIndex = i - 1 as PlayerIndex;

            // assign video source based on position
            this.html.videoPlayers[playerIndex].src = this.folder + pos + '.mp4';
            this.html.videoPlayers[playerIndex].preload = 'auto';
            const res = await this.getVideoMetadata(pos);
            console.log(`Loaded metadata for video ${pos}:`, res);
            this.populateMetadataForm(playerIndex, res);

            // increment position for section for next video load
            console.log(`first loading section ${section} position:`, this.state.positions[section]);
            await this.state.modifyPosition(section);
            console.log(`changed section ${section} position:`, this.state.positions[section]);
        }
    }
    private updateLayout(): void {
        const isMulti = this.state.multiSection;

        // Always update players 0 and 1
        [0, 1].forEach(index => {
            const player = this.html.videoPlayers[index];
            const wrapper = player.parentElement as HTMLDivElement;
            // wrapper.classList.remove('hidden'); // always visible
            console.log("Toggling player", index + 1, "visibility:", !wrapper.classList.contains('half-size'));

            wrapper.classList.toggle('half-size', isMulti);
            console.log(`Player ${index + 1} visibility toggled to:`, !wrapper.classList.contains('half-size'));

        });

        this.html.videoPlayers.forEach((player, index) => {
            if (index < 2) return;

            const wrapper = player.parentElement as HTMLDivElement | null;
            if (!wrapper) return;

            const shouldBeVisible = isMulti && index % 2 === 0;

            if (shouldBeVisible) {
                wrapper.classList.remove('hidden');
            } else {
                wrapper.classList.add('hidden');
            }

            console.log(`${shouldBeVisible ? 'Showing' : 'Hiding'} player ${index + 1}`);
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
            console.log('Play button clicked, playing selected videos...');
            console.log('Active players:', this.active);

            try {
                for (let i = 0; i < this.html.videoPlayers.length; i++) {
                    const player = this.html.videoPlayers[i];
                    if (this.active && this.active[i + 1]) {
                        console.log(`Player ${i + 1} is active, playing...`);
                        await player.play();
                    } else {
                        console.log(`Player ${i + 1} is inactive, skipping...`);
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
        for (let i = 1; i < playerCount; i++) {
            // active only players 1, 3, 5, 7 (odd numbers)
            act[i] = (i % 2 === 1);
        }
        return act;
    }
    async getVideoMetadata(videoId: number): Promise<VideoMetadata | null> {
        try {
            const response = await fetch(`https://www.clipflip.online/api/videos/${videoId}`);
            if (!response.ok) throw new Error(`Failed to fetch metadata for videoId ${videoId}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching metadata for videoId ${videoId}:`, error);
            return null;
        }
    }
    async handlePlayerEnded(playerIndex: PlayerIndex) {
        console.log(`Player ${playerIndex + 1} ended, switching video...`);
        const section = Math.floor(playerIndex / 2) + 1 as SectionId;

        let nextPlayerIndex = undefined
        if (playerIndex === 0) {
            nextPlayerIndex = 1;
        } else if (playerIndex === 1) {
            nextPlayerIndex = 0;
        } else if (playerIndex === 2) {
            nextPlayerIndex = 3;
        } else if (playerIndex === 3) {
            nextPlayerIndex = 2;
        } else if (playerIndex === 4) {
            nextPlayerIndex = 5;
        } else if (playerIndex === 5) {
            nextPlayerIndex = 4;
        } else if (playerIndex === 6) {
            nextPlayerIndex = 7;
        } else if (playerIndex === 7) {
            nextPlayerIndex = 6;
        }
        if (nextPlayerIndex === undefined) {
            console.error(`Invalid player index: ${playerIndex}`);
            return;
        }
        const primary = this.html.videoPlayers[playerIndex];
        const secondary = this.html.videoPlayers[nextPlayerIndex];
        await this.state.modifyPosition(section);
        try {
            await secondary.play();
            // hide/show wrappers instead of videos
            const currentWrapper = primary.parentElement as HTMLElement;
            const nextWrapper = secondary.parentElement as HTMLElement;

            nextWrapper.classList.remove('hidden');
            currentWrapper.classList.add('hidden');
            this.active![nextPlayerIndex + 1] = !this.active![nextPlayerIndex + 1];
            this.active![playerIndex + 1] = !this.active![playerIndex + 1];

            console.log(this.state.positions[section], 'current position for section', section);

            const pos = this.state.positions[section];
            const filename = this.folder + pos + '.mp4';
            primary.classList.add('video-offscreen');
            primary.src = filename;
            primary.preload = 'auto';
            primary.load();
            const res = await this.getVideoMetadata(pos);
            this.populateMetadataForm(playerIndex as PlayerIndex, res);
            secondary.classList.remove('video-offscreen');
        } catch (err) {
            console.error(`Error in section ${section}, player ${playerIndex + 1}:`, err);
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
    private async addFormsToPlayers() {
        let tags: { id: number; title: string }[] = [];

        try {
            const response = await fetch('http://:3000/tags');
            if (!response.ok) throw new Error('Failed to fetch tags');
            const bodyText = await new Response(response.body).text();
            console.log(JSON.parse(bodyText));

            tags = JSON.parse(bodyText);
        } catch (error) {
            console.error('Error loading tags:', error);
        }
        for (let i = 1; i <= 8; i++) {
            const wrapper = document.getElementById(`player${i}`);
            if (!wrapper) continue;
            const optionsHtml = tags.length
                ? tags.map(tag => `<option value="${tag.title}">${tag.title}</option>`).join('')
                : `...`;
            console.log(tags);

            const formContainer = document.createElement('div');
            formContainer.className = 'form-container hidden'; // initially hidden
            formContainer.innerHTML = `
            <form id="videoForm${i}">
                <select id="tagSelect${i}" multiple style="width: 100%;">
                    ${optionsHtml}
                </select>
                <input type="text" id="videoTitle${i}" placeholder="Video Title" style="width: 100%; margin-top: 5px;" />
                <input type="text" id="videoModel${i}" placeholder="Model" style="width: 100%; margin-top: 5px;" />
                <button type="submit" class="submit-button" style="margin-top: 5px;">Submit</button>
            </form>
        `;

            wrapper.appendChild(formContainer);

            const form = formContainer.querySelector('form');
            form?.addEventListener('submit', async (event) => {
                event.preventDefault();

                const titleInput = form.querySelector(`#videoTitle${i}`) as HTMLInputElement;
                const tagSelect = form.querySelector(`#tagSelect${i}`) as HTMLSelectElement;

                const title = titleInput?.value || '';
                const tags = Array.from(tagSelect?.selectedOptions || []).map(opt => opt.value);
                const video = document.getElementById(`videoPlayer${i}`) as HTMLVideoElement | null;

                let videoName = '';
                if (video && video.src) {
                    videoName = video.src.split('/').pop()?.replace(/\.mp4$/, '') || '';
                }
                const data = {
                    title,
                    tags,
                    id: videoName,
                };

                try {
                    const response = await fetch('https://www.clipflip.online/api/videos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data),
                    });

                    if (!response.ok) {
                        throw new Error(`Server responded with status ${response.status}`);
                    }

                    console.log(`Data from player ${i} submitted successfully:`, data);
                } catch (error) {
                    console.error(`Error submitting data for player ${i}:`, error);
                }
            });
        }
    }
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
        console.log(`Populating metadata form for Player ${index + 1} with data:`, data);

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
            console.log(`Player ${index} has no tags.`);
            return;
        }

        console.log(`Populating metadata form for Player ${index + 1} with data:`, data);

        const tagsWrapper = this.html.tagsWrappers[index as PlayerIndex];
        this.html.tagsWrappers.forEach((wrapper, i) => {
            console.log(wrapper.id, 'wrapper id');
        });

        if (!tagsWrapper) return;
        // render toggleable tags directly here
        this.html.renderTags(
            tagsWrapper,
            data.tags.map(t => t.title),
            index,
            this.toggleTag.bind(this)
        )

        // tagSelect.innerHTML = ''; // clear existing options

        // const currentTag = (data.tags && data.tags.length > 0) ? data.tags[0].title : 'Select a tag';

        // // add main tag as first selected option, or default text if none
        // const mainOption = document.createElement('option');
        // mainOption.value = currentTag;
        // mainOption.textContent = currentTag || 'Select a tag';
        // mainOption.selected = true;
        // mainOption.disabled = false; // allow reselecting if you want
        // tagSelect.appendChild(mainOption);

        // // add other tags, excluding the main one to avoid duplicates
        // data.tags.forEach(tag => {
        //     if (tag.title !== currentTag) {
        //         const option = document.createElement('option');
        //         option.value = tag.title;
        //         option.textContent = tag.title;
        //         tagSelect.appendChild(option);
        //     }
        // });
        // // listen for changes and update map
        // tagSelect.addEventListener('change', () => {
        //     const selectedTag = tagSelect.value;
        //     this.html.updateMeta(index, 'tag', selectedTag); // if needed
        //     this.selectedTags.set(index, selectedTag);
        // });
    }

    async toggleTag(btn: HTMLElement) {
        // find all elements with id `{tag}-id` and sync class
        const tag = btn.textContent?.trim() ?? '';

        if (!tag) return;
        const tagId = `${tag}-id`;

        // find the closest section container (e.g. player div)
        const sectionEl = btn.closest('[id^="player"]');
        if (!sectionEl) throw new Error(`Section element not found for tag ${tag}`);

        // within that section only, find elements with the tag class and toggle
        sectionEl.querySelectorAll(`.${tagId}`).forEach(el => {
            if (el instanceof HTMLElement) {
                el.classList.toggle('active-tag');
            }
        });
        // Extract player number from parent id like "player3"
        const sectionId = btn.closest('[id^="player"]')?.id;
        const match = sectionId?.match(/\d+/);
        const playerNumber: PlayerIndex = match ? (parseInt(match[0]) as PlayerIndex) : NaN as PlayerIndex;
        if (isNaN(playerNumber)) return;

        const section = Math.floor(playerNumber / 2 + 1) as SectionId;

        const tags = this.state.activeTags[section];

        const isActive = btn.classList.contains('active-tag');

        if (isActive && !tags.includes(tag)) {
            tags.push(tag); // add tag
        } else if (!isActive && tags.includes(tag)) {
            // remove tag
            this.state.activeTags[section] = tags.filter((t: string) => t !== tag);
        }

        await this.loadVideos(true);
    }

    async fetchAllTags() {
        try {
            const response = await fetch('https://www.clipflip.online/api/tags', {
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
}

export default Players;
