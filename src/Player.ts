import State, { type SectionId, PlayerIndex } from "./State";
import HTML from "./HTML";
import { config } from "./config";
import type { Video, Tag, Model } from '../server/node_modules/@prisma/client';
// This creates a type that ALWAYS has the arrays, even if empty
export type VideoWithRelations = Video & {
    tags: Tag[];
    models: Model[];
};
class Players {
    state: State;
    html: HTML;

    folder = config.videoSourcePath;
    muted: boolean = true;
    playerCount: number = 8;

    constructor(state: State, html: HTML) {
        this.state = state;
        this.html = html;
    }
    async init() {
        this.attachEventListeners();
        // this.initializeMuteButton();
        await this.state.tagsPromise;
        console.log("Tags loaded:", this.state.allTags);
        // this.createVideoContainer();
        await this.loadVideos();
    }
    async loadVideos(): Promise<void> {
        for (let i = 0; i < this.html.videoPlayers.length; i++) {
            if (!this.state.multiSection && i > 1) {
                continue;
            }

            const section = Math.ceil((i + 1) / 2) as SectionId;
            if (this.html.videoPlayers[i].src && this.html.videoPlayers[i].src !== '') {
                const position = this.html.videoPlayers[i].src;
                const match = position.match(/\/(\d+)\.mp4$/);
                if (!match && position !== '') {
                    throw new Error("Could not extract video ID from source URL");
                }
                const video = await this.getVideoMetadata(Number(match?.[1]));
                console.log("Checking video ID:", match?.[1]);
                const activeTags = this.state.activeTags.get(section);
                const hasActiveTag = video?.tags?.some(tag => activeTags?.includes(tag.title));
                if (hasActiveTag) {
                    console.log("Video match active tags, skipping");
                    continue; // or continue in a loop
                }
            }
            const playerIndex = i as PlayerIndex;
            await this.state.modifyPosition(section);
            const pos = this.state.positions[section];
            console.log("New video pos:", pos);
            const videoPlayer = this.html.videoPlayers[playerIndex];
            videoPlayer.preload = 'none';
            videoPlayer.muted = true;
            videoPlayer.playsInline = true;
            videoPlayer.src = this.folder + pos + '.mp4';
            videoPlayer.load();

            if (this.state.active?.[playerIndex]) {
                console.log("active start playing");
                this.html.videoPlayers[playerIndex].play();
                this.state.playing[section] = true;
                const res = await this.getVideoMetadata(pos);
                // this.populateMetadataForm(playerIndex, res);
            }

            continue;
        }
    }
    // private initializeMuteButton(): void {
    //     const muteIcon = document.getElementById('muteIcon');

    //     // set initial state: all players muted + muted icon
    //     this.html.videoPlayers.forEach(player => {
    //         player.muted = this.muted;
    //     });

    //     if (muteIcon) {
    //         muteIcon.innerHTML = `
    //   <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" stroke-width="2"
    //     viewBox="0 0 24 24">
    //     <path stroke-linecap="round" stroke-linejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
    //     <path stroke-linecap="round" stroke-linejoin="round" d="M15 9a3 3 0 010 6" />
    //     <path stroke-linecap="round" stroke-linejoin="round" d="M17.5 7.5a6 6 0 010 9" />
    //   </svg>`;
    //     }

    //     // add click listener
    //     this.html.muteToggle?.addEventListener('click', () => {
    //         this.muted = !this.muted;

    //         this.html.videoPlayers.forEach(player => {
    //             player.muted = this.muted;
    //         });
    //     });
    // }
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
            this.loadVideos();
        });
        this.html.muteToggle.addEventListener('click', () => {
            this.html.muteToggle.classList.toggle('is-muted');
        });
        this.html.hideFormsBtn.addEventListener('click', () => {
           const allForms = document.querySelectorAll<HTMLElement>('.metadata-form');
            allForms.forEach(form => {
                form.classList.toggle('hidden');
            });
        });
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        const advancedPanel = document.getElementById('advancedPanel');
        if (!searchInput || !advancedPanel) return;
        searchInput.addEventListener('focus', async (e) => {
            advancedPanel?.classList.remove("hidden");
            try {
                this.renderTagResults(this.state.allTags, advancedPanel, searchInput);
            } catch (err) {
                throw err;
            }
        });

        searchInput.addEventListener('focusout', () => {
            setTimeout(() => {
                advancedPanel?.classList.add("hidden");
            }, 200); // 500ms delay
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
    private renderTagResults(
        tags: any[],
        advancedPanel: HTMLElement,
        searchInput: HTMLInputElement
    ) {
        advancedPanel.innerHTML = '';

        tags.forEach(tag => {
            const card = document.createElement('div');
            card.className = 'tag-card';

            // default image
            const defaultImg = './thumbnails/thumbnail.jpg';
            const imgPath = `./thumbnails/${encodeURIComponent(tag.title)}.jpg`;

            // preload
            const img = new Image();
            img.onload = () => {
                card.style.backgroundImage = `url(${imgPath})`;
            };
            img.onerror = () => {
                card.style.backgroundImage = `url(${defaultImg})`;
            };
            img.src = imgPath;

            const title = document.createElement('div');
            title.className = 'tag-card-title';
            title.textContent = tag.title;

            card.appendChild(title);

            card.addEventListener('click', async () => {
                console.log('Clicked tag:', tag.title);

                // 1. Correct Map Iteration: Loop directly over the Map entries
                this.state.activeTags.forEach((currentTags, sectionId) => {
                    console.log("Processing section:", sectionId);

                    // 2. Check current state before clearing
                    const isAlreadyActive = currentTags.includes(tag.title);

                    // 3. THE RESET: Empty the array for this section
                    // currentTags.length = 0 keeps the reference so the Map stays updated
                    currentTags.length = 0;

                    if (!isAlreadyActive) {
                        // 4. ASSIGN: Now this is the ONLY active tag
                        currentTags.push(tag.title);

                        // If toggleTag handles UI state, call it here
                        this.toggleTag(tag.title, false);
                    }
                });

                // 5. RELOAD: Now that all sections are updated, fetch new videos
                await this.loadVideos();

                // 6. UI CLEANUP
                searchInput.value = '';
            });

            advancedPanel.appendChild(card);
        });
    }

    async getVideoMetadata(videoId: number): Promise<VideoWithRelations | null> {
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
        const section = (Math.floor(playerIndex / 2) + 1) as SectionId;
        const nextPlayerIndex = (playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1) as PlayerIndex;

        const primary = this.html.videoPlayers[playerIndex];   
        const secondary = this.html.videoPlayers[nextPlayerIndex]; 

        if (!primary || !secondary) return;

        const currentPoster = primary.poster;
        if (currentPoster) secondary.poster = currentPoster;
        // 1. Play the secondary (hidden) video first
        await secondary.play();
                // 6. Update the metadata in the hidden form so it's ready for the next swap
        const currentPos = this.state.positions[section];
        const res = await this.getVideoMetadata(currentPos);
        // this.populateMetadataForm(playerIndex, res);
        // 2. SWAP VIDEO CLASSES (Cross-fade)
        secondary.classList.replace("layer-back", "layer-front");
        primary.classList.replace("layer-front", "layer-back");

        // 4. Update State
        if (this.state.active) {
            this.state.active[nextPlayerIndex] = true;
            this.state.active[playerIndex] = false;
        }

        // 5. Preload the next video into the now-hidden primary player
        await this.state.modifyPosition(section);
        const nextPos = this.state.positions[section];

        primary.src = `${this.folder}${nextPos}.mp4`;
        primary.load();
    } catch (err) {
        console.error(`Error swapping players in section ${Math.floor(playerIndex / 2) + 1}:`, err);
    }
}

    private async togglePlayPause(index: PlayerIndex): Promise<void> {
        const player = this.html.videoPlayers[index];
        const section = Math.floor(index / 2 + 1) as SectionId;

        if (this.state.active && this.state.active[index] && !this.state.playing[section]) {
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

    // populateMetadataForm(index: PlayerIndex, data: VideoWithRelations | null): void {
    //     if (!this.isMetadataValid(data) || !data) {
    //         console.warn(`Invalid or empty metadata for Player ${index}`);
    //         return;
    //     }
    //     console.log("Populating metadata form for player index:", index, data   );
        
    //     const section = Math.floor(index / 2) + 1;
    //     const form = document.getElementById(`metaForm${section}`) as HTMLDivElement;
    //     if (!form) return;

    //     const inputs = form.querySelectorAll('input');

    //     inputs.forEach((input) => {
    //         switch (input.placeholder) {
    //             case 'id' :
    //                 input.value = data.id.toString();
    //                 break;
    //             case 'Title':
    //                 input.value = data.title || '';
    //                 break;
    //             case 'Models':
    //                 input.value = Array.isArray(data.models) ? data.models.join(', ') : (data.models || '');
    //                 break;
    //             case 'Studio':
    //                 input.value = data.studio || '';
    //                 break;
    //         }
    //     });
    //     // if (!data.tags || data.tags.length === 0) {
    //     //     return;
    //     // }

    //     const tagsWrapper = this.html.tagsWrappers[index as PlayerIndex];

    //     if (!tagsWrapper) return;
    //     // render toggleable tags directly here
    //     this.html.renderTags(
    //         tagsWrapper,
    //         data.tags,
    //         index,
    //         data.id,
    //         this.toggleTag.bind(this)
    //     )
    // }

    async toggleTag(tag: string, reset: boolean = true): Promise<void> {
        console.log("Activating tags on buttons:", tag);
        const allButtons = document.querySelectorAll<HTMLButtonElement>(`.tag-button`);
        allButtons.forEach(btn => {
            btn.classList.remove('active-tag');
        });
        console.log("Reseting active first");
        this.state.activeTags.forEach((currentTags, sectionId) => {
            const tagClass = `${tag}-id-${sectionId}`;
            const btns = document.querySelectorAll<HTMLButtonElement>(`.${tagClass}`);
            currentTags.length = 0;
            currentTags.push(tag);
            if (!btns.length) return;
            console.log("Activating active");
            btns.forEach(btn => {
                btn.classList.add('active-tag');
            });
        });
        console.log("activated taggs", this.state.activeTags);

        if (!reset) return;
        // reload once
        await this.loadVideos();
    }

    isMetadataValid(data: VideoWithRelations | null): boolean {
        if (!data) return false;

        const hasTitle = !!data.title?.trim();
        const hasModels = Array.isArray(data.models) && data.models.length > 0;
        const hasStudio = !!data.studio?.trim();
        const hasTags = Array.isArray(data.tags) && data.tags.length > 0;

        return hasTitle || hasModels || hasStudio || hasTags;
    }
    async fetchVideos(query?: string) {
        const url = query ? `${this.state.apiUrl}/videos?search=${encodeURIComponent(query)}` : `${this.state.apiUrl}/videos`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch videos');
        const data = await res.json();
        return data;
    }
    createMetadataForm(index: PlayerIndex): HTMLElement {
        // 💡 UPDATED: Added positioning classes 'absolute top-0 left-0 z-20 relative'.
        // 'absolute top-0 left-0' places it in the top-left of the parent.
        // 'relative' is crucial for the internal dropdowns (tagListDropdown, uploadFormWrapper) to position correctly relative to the form.
        const section = Math.floor(index / 2) + 1;
        this.html.videoForms[index] = this.html.createDiv(
            `metaForm${section}`,
            'metadata-form hidden'
        );

        const shouldHide = this.state.playing[Math.floor(index / 2 + 1) as SectionId];

        if (shouldHide) {
            this.html.videoForms[index].classList.add('hidden');
        }

        const makeInput = (placeholder: string, key: keyof VideoWithRelations) => {
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
        const idInput = makeInput('id', 'id');

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

        this.state.allTags.forEach((tag) => {
            const tagItem = document.createElement('div');
            tagItem.textContent = tag.title
            tagItem.className = 'px-3 py-2 hover:bg-gray-200 cursor-pointer';
            tagItem.addEventListener('click', async () => {
                if (!tag.title) return;
                const video = await this.updateMeta(index, 'tag', tag.title, tag.id);
                tagListDropdown.classList.add('hidden'); // hide dropdown
                // this.populateMetadataForm((index) as PlayerIndex, video);
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

        this.state.allTags.forEach((tag) => {
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
        this.html.videoForms[index].append(tagsWrapper, tagButtonWrapper, titleInput, modelInput, studioInput,  idInput, uploadBtn, uploadFormWrapper)
        return this.html.videoForms[index];
    }
    async updateMeta(index: PlayerIndex, key: string, value: string | string[], tagId?: number): Promise<VideoWithRelations | null> {
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

        console.log(response);
        

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
    // createVideoContainer(): void {

    //     // 1. Loop through the 4 existing sections in your HTML
    //     for (let s = 1; s <= 4; s++) {
    //         const section = document.getElementById(`section-${s}`);
    //         if (!section) continue;

    //         // 2. Find the existing videos (Front and Back) and link them to our array
    //         const front = section.querySelector(`#v${s}-front`) as HTMLVideoElement;
    //         const back = section.querySelector(`#v${s}-back`) as HTMLVideoElement;

    //         if (front) this.html.videoPlayers.push(front);
    //         if (back) this.html.videoPlayers.push(back);

    //         // 3. Create and Append the Metadata Forms
    //         // We create two forms (one for front, one for back) 
    //         // and append them to the section
    //         [0, 1].forEach((j) => {
    //             const playerIndex = ((s - 1) * 2 + j) as PlayerIndex;

    //             // Create the form using your existing method
    //             const form = this.createMetadataForm(playerIndex);
    //             form.classList.add('metadata-form');

    //             // Link to your tracking array
    //             this.html.videoForms[playerIndex] = form as HTMLDivElement;
    //             if (j === 1) {
    //               return
    //             }
    //             // APPEND ONLY: Add it to the existing section div
    //             section.appendChild(form);
    //         });
    //     }
    // }

}
export default Players;
