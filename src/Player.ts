import State from "./State";

class Players {
    state: State;

    videoPlayers: HTMLVideoElement[];
    playButton: HTMLButtonElement;
    pauseButton: HTMLButtonElement;
    resizeButton: HTMLButtonElement;
    fullscreenButton: HTMLButtonElement;
    muteToggleBtn: HTMLButtonElement;
    muteIcon: HTMLElement;
    // hideForm: HTMLButtonElement;

    active: Record<number, boolean>;
    folder = 'https://s3.eu-central-1.amazonaws.com/clipflip.online/video/';
    muted: boolean = true;

    constructor(state: State, playerCount: number = 8) {
        this.state = state;
        this.videoPlayers = [];
        this.active = this.initializeActive(playerCount);
        for (let i = 1; i <= playerCount; i++) {
            const player = document.getElementById(`videoPlayer${i}`);
            if (!(player instanceof HTMLVideoElement)) {
                throw new Error(`Element with id "videoPlayer${i}" not found or not a <video> element.`);
            }
            this.videoPlayers.push(player);
        }

        this.playButton = this.getButton('playButton');
        this.pauseButton = this.getButton('pauseButton');
        this.resizeButton = this.getButton('resizeButton');
        this.fullscreenButton = this.getButton('fullscreenButton');
        this.muteToggleBtn = this.getButton('muteToggle');
        this.muteIcon = document.getElementById('muteIcon') as HTMLElement;
        // this.hideForm = this.getButton('hideForm');
        this.attachEventListeners();
        this.loadVideos();
        this.updateLayout();
        this.updateResizeIcon();
        this.initializeMuteButton();
        // this.addFormsToPlayers();

    }
    private updateLayout(): void {
        const isMulti = this.state.getMultiSection;
        console.log('Multi-section view:', isMulti);

        // toggle 'half-size' class on players 0 and 1
        [0, 1].forEach(index => {
            const player = this.videoPlayers[index];
            const wrapper = player.parentElement as HTMLDivElement;
            wrapper.classList.toggle('half-size', isMulti);
        });

        this.videoPlayers.forEach((player, index) => {
            if (index >= 2) {
                const shouldBeVisible = isMulti
                    ? (index === 2 || index === 4 || index === 6)
                    : false;

                const wrapper = player.parentElement as HTMLDivElement;
                const isHidden = player.classList.contains('hidden');

                if (shouldBeVisible) {
                    // player.classList.remove('hidden');
                    wrapper?.classList.remove('hidden');
                    console.log(`Showing player ${index + 1}`);
                } else if (!shouldBeVisible) {
                    // player.classList.add('hidden');
                    wrapper?.classList.add('hidden');
                    console.log(`Hiding player ${index + 1}`);
                }

                // always apply half-size in multi layout
                wrapper?.classList.toggle('half-size', isMulti);
            }
        });
    }
    private updateResizeIcon(): void {
        const isMulti = !this.state.multiSection;

        const iconHTML = isMulti
            ? `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
        </svg>`
            : `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" />
        </svg>`;

        const iconSpan = document.getElementById('viewIcon');
        if (iconSpan) iconSpan.innerHTML = iconHTML;
    }
    private initializeMuteButton(): void {
        const muteIcon = document.getElementById('muteIcon');

        // set initial state: all players muted + muted icon
        this.videoPlayers.forEach(player => {
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
        this.muteToggleBtn?.addEventListener('click', () => {
            this.muted = !this.muted;

            this.videoPlayers.forEach(player => {
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
    private getButton(id: string): HTMLButtonElement {
        const btn = document.getElementById(id);
        if (!(btn instanceof HTMLButtonElement)) {
            throw new Error(`Element with id "${id}" not found or not a <button> element.`);
        }
        return btn;
    }
    private attachEventListeners() {
        this.playButton.addEventListener('click', async () => {
            try {
                // play only videos where the player is active in state
                const playPromises = this.videoPlayers
                    .filter((_, index) => this.active[index + 1])
                    .map(player => player.play());

                await Promise.all(playPromises);
            } catch (error) {
                console.error('Error playing selected videos:', error);
            }
        });
        this.pauseButton.addEventListener('click', async () => {
            try {
                // play only videos where the player is active in state
                const playPromises = this.videoPlayers
                    .map(player => player.pause());

                await Promise.all(playPromises);
            } catch (error) {
                console.error('Error playing selected videos:', error);
            }
        });
        this.videoPlayers.forEach((player, index) => {
            player.addEventListener('ended', () => {
                this.handlePlayerEnded(index);
            });
            player.addEventListener('click', () => this.togglePlayPause(player));
        });
        this.resizeButton.addEventListener('click', () => {
            this.state.setMultiSection = !this.state.getMultiSection;
            this.updateResizeIcon();
            this.updateLayout();
        });
        this.fullscreenButton.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // this.hideForm.addEventListener('click', () => {
        //     const forms = document.querySelectorAll('.form-container');
        //     forms.forEach(form => {
        //         form.classList.toggle('hidden');
        //     });
        // });
    }
    private initializeActive(playerCount: number): Record<number, boolean> {
        const act: Record<number, boolean> = {};
        for (let i = 1; i <= playerCount; i++) {
            // active only players 1, 3, 5, 7 (odd numbers)
            act[i] = (i % 2 === 1);
        }
        return act;
    }
    loadVideos() {
        for (let i = 0; i < this.videoPlayers.length; i++) {
            // determine section: players 1&2 → 1, 3&4 → 2, 5&6 → 3, 7&8 → 4
            const section = Math.floor(i / 2) + 1;

            // get current position for that section
            const pos = this.state.positions[section];

            // assign video source based on position
            this.videoPlayers[i].src = this.folder + pos + '.mp4';

            // increment position for section for next video load
            this.state.modifyPosition(section);
        }
    }
    async handlePlayerEnded(playerIndex: number) {
        if (!this.state.getMultiSection && playerIndex > 1) {
            return;
        }
        const section = Math.floor(playerIndex / 2) + 1;
        const primary = this.videoPlayers[section * 2 - 2];
        const secondary = this.videoPlayers[section * 2 - 1];

        const current = this.videoPlayers[playerIndex];
        const next = current === primary ? secondary : primary;

        try {
            await next.play();

            // hide/show wrappers instead of videos
            const currentWrapper = current.parentElement as HTMLElement;
            const nextWrapper = next.parentElement as HTMLElement;

            nextWrapper.classList.remove('hidden');
            currentWrapper.classList.add('hidden');

            const pos = this.state.positions[section];
            const filename = this.folder + pos + '.mp4';
            current.src = filename;
            current.load();

            this.state.modifyPosition(section, true);

            console.log(`Section ${section}, switching from Player ${playerIndex + 1}`);
            console.log(`Assigned new video: ${filename}`);
        } catch (err) {
            console.error(`Error in section ${section}, player ${playerIndex + 1}:`, err);
        }
    }
    private togglePlayPause(video: HTMLVideoElement): void {
        if (video.paused) {
            video.play();

            // // hide form when playing
            // const wrapper = video.parentElement;
            // if (wrapper) {
            //     const form = wrapper.querySelector('.form-container');
            //     form?.classList.add('hidden');
            // }
        } else {
            video.pause();

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
            const response = await fetch('http://localhost:3000/tags');
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
                    const response = await fetch('http://localhost:3000/videos', {
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
}

export default Players;