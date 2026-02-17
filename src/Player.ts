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
    primarySlot!: HTMLElement;
    secondarySlot!: HTMLElement;
    isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    firedEvent = false;
    constructor(state: State, html: HTML) {
        this.state = state;
        this.state.onEmptyPlays = () => this.showNoVideosBox();
        this.html = html;
    }
    async init() {
        this.attachEventListeners();
        await this.state.tagsPromise;
        await this.state.taggedVideosPromise;
        console.log("Tags loaded:", this.state.allTags.length)
        console.log("Active tags:", this.state.activeTags)
        console.log("Videos for tag loaded :", this.state.taggedVideos);
        this.createVideoContainer();
        await this.loadVideos();
    }
    async loadVideos(): Promise<void> {
        for (let i = 0; i < this.html.videoPlayers.length; i++) {
            if (!this.state.multiSection && i > 1) {
                continue;
            }
            const playerIndex = i as PlayerIndex;
            const section = Math.ceil((i + 1) / 2) as SectionId;
            await this.state.modifyPosition(section)
            console.log("loading new videos", this.state.positions[section]);


            // if (this.state.positions[section] === 0 && this.state.active[playerIndex]) {
            //     console.warn("Position is 0, skipping load for section", section);
            //     this.html.videoPlayers[i].src = '';
            //     this.html.videoPlayers[i].poster = '';
            //     this.showNoVideosBox()
            //     continue;
            // }

            if (this.html.videoPlayers[i].src && this.html.videoPlayers[i].src !== '') {
                const position = this.html.videoPlayers[i].getAttribute('data-video-id') || '';

                if (Number(position) !== 0) {
                    const video = await this.getVideoMetadata(Number(position));
                    console.log(this.state.positions[section]);

                    const activeTags = this.state.activeTags.get(section);
                    const hasAllActiveTags = activeTags?.every(activeTag =>
                        video?.tags?.some(tag => tag.title === activeTag)
                    );
                    if (hasAllActiveTags) {
                        console.log("Video match active tags, skipping");
                        console.log(this.state.active?.[playerIndex]);

                        if (this.state.active && this.state.active[playerIndex]) {
                            this.populateMetadataForm(section, video);
                            // this.html.videoPlayers[i].play()
                        }

                        continue; // or continue in a loop
                    }
                }

            }

            const pos = this.state.positions[section];
            if (this.state.positions[section] == 0) {
                // primary.src = "";
                // primary.poster = ""
                this.showNoVideosBox();

                return
            }
            console.log("New video pos:", pos);
            const videoPlayer = this.html.videoPlayers[playerIndex];
            videoPlayer.poster = this.folder + "thumbnails/" + pos + '.jpg'
            videoPlayer.preload = 'auto';
            videoPlayer.muted = this.muted;
            videoPlayer.playsInline = true;
            const response = await fetch(this.folder + pos + '.mp4');
            const blob = await response.blob();
            const videoUrl = URL.createObjectURL(blob);
            videoPlayer.src = videoUrl; // This is now instant because it's in memory
            if (this.state.active && this.state.active[playerIndex]) {
                console.log("Active start playing section: ", section);
                this.html.videoPlayers[playerIndex].play();
                this.state.playing[playerIndex] = true;
                console.log("checking this postion: ", pos);

                const res = await this.getVideoMetadata(pos);
                this.populateMetadataForm(section, res);
                console.log("initial metadata population");
                videoPlayer.setAttribute('data-video-id', pos.toString()); // Store it here
                continue
            }
            videoPlayer.setAttribute('data-video-id', pos.toString()); // Store it here
            videoPlayer.load();
            // videoPlayer.pause();
            // videoPlayer.currentTime = 0;
        }
    }
    private attachEventListeners() {
        this.html.playPauseBtn.addEventListener('click', async () => {
            if (!this.state.active) return;

            const activeIndexes = Object.keys(this.state.active)
                .map(Number)
                .filter(idx => this.state.active[idx as PlayerIndex]);
            if (activeIndexes.length === 0) return;

            // check if any active video is currently playing
            const anyPlaying = activeIndexes.some(idx => this.state.playing[idx as PlayerIndex]);

            // toggle all in parallel
            await Promise.all(activeIndexes.map(idx => this.togglePlayPause(idx as PlayerIndex, true)));

            // update master button icon correctly
            if (anyPlaying) {
                // we just paused them, show play
                this.html.iconPlay.classList.remove('hidden');
                this.html.iconPause.classList.add('hidden');
            } else {
                // we just played them, show pause
                this.html.iconPlay.classList.add('hidden');
                this.html.iconPause.classList.remove('hidden');
            }
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

        // this.html.resizeButton.addEventListener('click', () => {
        //     this.html.resizeButton.classList.toggle('is-multi');
        //     this.state.multiSection ? this.html.videoGrid.classList.add('single-view') : this.html.videoGrid.classList.remove('single-view');
        //     this.state.multiSection ? this.html.resizeIconActive.classList.remove('hidden') : this.html.resizeIconActive.classList.add('hidden');
        //     this.state.multiSection ? this.html.resizeIconInactive.classList.add('hidden') : this.html.resizeIconInactive.classList.remove('hidden');
        //     this.state.multiSection = !this.state.multiSection;
        //     this.loadVideos();
        // });
        this.html.muteToggle.addEventListener('click', () => {
            this.html.muteToggle.classList.toggle('is-muted');
            this.muted = !this.muted;
            this.html.videoPlayers.forEach((player) => {
                player.muted = this.muted;
                player.volume = 0.1;
            });
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
        // Detect Safari

        // Safari needs 20% buffer, Chrome only needs 2-5% to be safe
        const threshold = this.isSafari ? 70 : 80;

        this.html.videoPlayers.forEach((player, index) => {
            player.addEventListener('timeupdate', () => {
                const progress = (player.currentTime / player.duration) * 100;

                if (progress > threshold && this.state.active?.[index as PlayerIndex] && !this.firedEvent) {
                    this.handlePlayerEnded(index as PlayerIndex);
                    this.firedEvent = true;
                }
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
            if (this.state.activeTags.get(1)?.includes(tag.title)) {
                card.classList.add('active-tag');
            }

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
                console.log("Clicked tag:", tag.title);
                await this.toggleTag(tag.title, true);
                console.log("Current active tags", this.state.activeTags);
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
        console.log("End event for player index:", playerIndex);
        const section = (Math.floor(playerIndex / 2) + 1) as SectionId;

        console.log("section", section);

        const nextIdx = (playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1) as PlayerIndex;
        const primary = this.html.videoPlayers[playerIndex];   // The video nearing its end
        const secondary = this.html.videoPlayers[nextIdx];     // The next video
        secondary.play()
        secondary.pause();
        secondary.currentTime = 0;
        try {
            // // 2. Start secondary while hidden (warm up decoder)
            // await secondary.play();
            // secondary.pause();
            // secondary.currentTime = 0;
            // 2. WAIT FOR PRIMARY TO FINISH
            const position = primary.getAttribute('data-video-id') || '';
            this.state.markVideoAsPlayed(Number(position));
            await new Promise(r => {
                const checkEnd = () => {
                    // Using 0.06s for 30fps or 60fps safety margin
                    if (primary.ended || (primary.duration - primary.currentTime < 0.03)) {
                        r(0);
                    } else {
                        requestAnimationFrame(checkEnd);
                    }
                };
                checkEnd();
            });

            secondary.play();
            secondary.parentElement!.classList.add('onscreen');
            primary.parentElement!.classList.remove('onscreen');
            const pos = secondary.getAttribute('data-video-id');
            // if (!pos) {
            //     console.warn("No data-video-id on secondary player");
            //     return;
            // }

            // 4. THE SWAP: Now that the first is done, show the second
            if (this.state && this.state.active) {
                this.state.active[nextIdx as PlayerIndex] = true;
                this.state.playing[nextIdx as PlayerIndex] = true;
                this.state.active[playerIndex as PlayerIndex] = false;
                this.state.playing[playerIndex as PlayerIndex] = false;
            }

            await this.state.modifyPosition(section);
            if (this.state.positions[section] == 0) {
                // primary.src = "";
                // primary.poster = ""
                setTimeout(() => {
                    this.showNoVideosBox();
                }, 2000);
            } else {
                await this.populateMetadataForm(section, await this.getVideoMetadata(Number(pos)));
                const res = await fetch(`${this.folder}${this.state.positions[section]}.mp4`);
                this.firedEvent = false;
                primary.src = URL.createObjectURL(await res.blob());
                primary.setAttribute('data-video-id', this.state.positions[section].toString()); // Store it here
                primary.load();

            }
        } catch (e) {
            console.error("Error during player swap:", e);
        }
    }
    private async togglePlayPause(index: PlayerIndex, multi: boolean = false): Promise<void> {
        const player = this.html.videoPlayers[index];
        const section = Math.floor(index / 2 + 1) as SectionId;

        if (this.state.active && this.state.active[index] && this.state.playing[index]) {
            player.pause();
            if (!multi) {
                console.log("Pausing video index", index);
                this.html.iconPlay.classList.remove('hidden');
                this.html.iconPause.classList.add('hidden');
            }


            const pair = index % 2 === 0 ? index + 1 : index - 1;
            // if (this.html.videoForms[pair] && this.state.advancedMode) {
            //     this.html.videoForms[pair].classList.add('hidden');
            // }
            this.state.playing[index] = false;
        } else {
            player.play();
            if (!multi) {
                this.html.iconPlay.classList.add('hidden');
                this.html.iconPause.classList.remove('hidden');
            }
            console.log("Playing video index", index);
            this.state.playing[index] = true;
            // this.html.toolbar.classList.toggle('hidden');
        }
    }
    async populateMetadataForm(section: SectionId, data: VideoWithRelations | null): Promise<void> {
        // if (!this.isMetadataValid(data) || !data) {
        //     console.warn(`Invalid or empty metadata for Player ${index}`);
        //     return;
        // }
        const video = data as VideoWithRelations;
        console.log("Populating metadata form for section:", section, data);

        const form = document.getElementById(`metaForm${section}`) as HTMLDivElement;

        if (!form) return;

        const inputs = form.querySelectorAll('input');

        inputs.forEach((input) => {
            switch (input.placeholder) {
                case 'id':
                    input.value = video.id.toString();
                    break;
                case 'Title':
                    input.value = video.title || '';
                    break;
                case 'Models':
                    input.value = Array.isArray(video.models) ? video.models.join(', ') : (video.models || '');
                    break;
                case 'Studio':
                    input.value = video.studio || '';
                    break;
            }
        });
        // if (!data.tags || data.tags.length === 0) {
        //     return;
        // }

        const tagsWrapper = this.html.videoTagsContainers[section - 1];

        if (!tagsWrapper) return;
        // render toggleable tags directly here
        await this.html.renderTags(
            tagsWrapper,
            video.tags,
            section,
            video.id,
            this.toggleTag.bind(this)
        )
    }
    showNoVideosBox() {
        console.log("running no no videos box");
        this.state.advancedMode = false;
        // reset all video players
        for (let i = 0; i < this.html.videoPlayers.length; i++) {
            const player = this.html.videoPlayers[i];
            player.src = '';
            player.poster = '';
            player.pause();
            player.setAttribute('data-video-id', '');
        }

        this.firedEvent = false;

        // get existing HTML elements by ID
        const box = document.getElementById("no-videos-box")!;
        const tagsBox = document.getElementById("active-tags")!;
        const resetWrapper = document.getElementById("reset-section")!;
        const resetInfo = resetWrapper.querySelector(".reset-info") as HTMLParagraphElement;
        const resetBtn = resetWrapper.querySelector("#reset-btn") as HTMLButtonElement;

        // clear old tags
        tagsBox.innerHTML = "";

        // get unique active tags
        const rawTags = this.state.activeTags.get(1) ?? [];
        const uniqueTags = [...new Set(rawTags)];

        // adapt strings -> Tag[]
        const tags: Tag[] = uniqueTags.map(t => ({ title: t })) as Tag[];

        // reuse same renderer
        this.html.renderTags(
            tagsBox,
            tags,
            1,            // section
            undefined,    // no videoId
            (tag) => {
                box.setAttribute("hidden", "");
                this.toggleTag(tag, true);
            }
        );

        // update reset description text
        resetInfo.textContent =
            "You have watched all available videos. Reset your progress to clear cached data and watch everything again.";

        // reset button click handler
        resetBtn.onclick = () => {
            resetBtn.disabled = true;
            resetBtn.textContent = "Resetting...";
            box.setAttribute("hidden", "");
            this.state.resetVideoProgress();
            this.loadVideos();
        };

        // make sure box flex layout
        box.classList.remove("items-center");
        box.classList.add("flex", "flex-col");

        // show box
        box.removeAttribute("hidden");
    }

    async toggleTag(tag: string, reset: boolean = true): Promise<void> {
        console.log("Activating tags on buttons:", tag);
        const allButtons = document.querySelectorAll<HTMLButtonElement>(`.tag-button`);
        allButtons.forEach(btn => {
            btn.classList.remove('active-tag');
        });
        this.state.activeTags.forEach((currentTags, sectionId) => {
            const tagClass = `${tag}-id-${sectionId}`;
            const btns = document.querySelectorAll<HTMLButtonElement>(`.${tagClass}`);
            // Remove tag if it exists, otherwise add it
            const index = currentTags.indexOf(tag);
            if (index >= 0) {
                currentTags.splice(index, 1);
                console.log(`Removed tag "${tag}" from section ${sectionId}`);
            } else {
                currentTags.push(tag);
            }
            if (!btns.length) return;
            console.log("Activating active");
            btns.forEach(btn => {
                btn.classList.add('active-tag');
            });
        });

        if (!reset) return;
        await this.state.fetchVideosByTags(1);
        // this.state.emptyPlays = false;
        // // reload once
        // this.state.clearPlayedVideos();
        // this.state.enableTagsAgain();
        // this.state.hideNoVideosBox();
        await this.loadVideos();
    }
    isMetadataValid(data: VideoWithRelations | null): boolean {
        if (!data) return false;

        const hasTitle = !!data.title?.trim();
        const hasModels = Array.isArray(data.models) && data.models.length > 0;
        const hasStudio = !!data.studio?.trim();
        // const hasTags = Array.isArray(data.tags) && data.tags.length > 0;

        return hasTitle || hasModels || hasStudio;
    }
    async fetchVideos(query?: string) {
        const url = query ? `${this.state.apiUrl}/videos?search=${encodeURIComponent(query)}` : `${this.state.apiUrl}/videos`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch videos');
        const data = await res.json();
        return data;
    }
    createMetadataForm(section: SectionId): HTMLElement {
        this.html.videoForms[section] = this.html.createDiv(
            `metaForm${section}`,
            'metadata-form hidden'
        );

        const makeInput = (placeholder: string, key: keyof VideoWithRelations) => {
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = placeholder;
            input.className = 'input-fields';

            input.addEventListener('input', async (event) => {
                event.preventDefault();
                await this.updateMeta(section, key, input.value);
            });

            return input;
        };
        const titleInput = makeInput('Title', 'title');
        const modelInput = makeInput('Models', 'models'); // or 'model' if that is your key
        const studioInput = makeInput('Studio', 'studio');
        const idInput = makeInput('id', 'id');
        // OUTER container (never cleared)
        const videoTagsContainer = this.html.createDiv(
            `video-tags-${section}`,
            'tag-section video-tags mt-2'
        );

        // LABEL (never removed)
        const videoTagsLabel = document.createElement('div');
        videoTagsLabel.textContent = '🎬 Video tags';
        videoTagsLabel.className = 'tag-section-label text-white mb-1';

        // INNER wrapper (this is what you mutate)
        const videoTagsWrapper = this.html.createDiv(
            `video-tags-wrapper-${section}`,
            'tag-container'
        );

        const editToggleBtn = document.createElement('button');
        editToggleBtn.type = 'button';
        editToggleBtn.className = `
    absolute 
    top-2 
    right-2
    p-2 rounded-lg
    bg-white/10 backdrop-blur
    text-white
    text-lg
    hover:text-white
    hover:bg-white/20
    transition
    edit-toggle
`;

        editToggleBtn.innerHTML = '✏️';
        editToggleBtn.title = 'Edit metadata';
        // assemble
        videoTagsContainer.append(
            editToggleBtn,
            videoTagsLabel,
            videoTagsWrapper
        );

        // store reference to the INNER wrapper, not the container
        this.html.videoTagsContainers.push(videoTagsWrapper);

        // 1. Create a container for the button and the dropdown
        const tagButtonWrapper = this.html.createDiv('tag-button-wrapper', 'relative inline-block'); // Make this wrapper relative

        // + Button to show available tags
        const addTagBtn = document.createElement('button');
        addTagBtn.type = 'button';
        addTagBtn.textContent = '+ Add Tag';
        addTagBtn.className = 'plus-button px-2 py-1 m-1 text-sm  bg-black/30 backdrop-blur-lg rounded border border-transparent text-gray-300 transition hover:bg-white/10 hover:border-gray-400';
        // 2. Adjust dropdown classes to position relative to the new wrapper
        const tagListDropdown = document.createElement('div');
        tagListDropdown.className = 'tag-list hidden';

        this.state.allTags.forEach((tag) => {
            const tagItem = document.createElement('div');
            tagItem.textContent = tag.title
            tagItem.className = 'px-3 py-2 hover:bg-gray-200 cursor-pointer';
            tagItem.addEventListener('click', async () => {
                if (!tag.title) return;
                const res = await this.updateMeta(section, 'tag', tag.title, tag.id);
                console.log("Update meta response:", res);
                this.populateMetadataForm(section, res);
                tagListDropdown.classList.add('hidden'); // hide dropdown
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
        uploadBtn.innerHTML = '📤 Upload New Video'; // could be replaced with an icon <svg> if you want
        uploadBtn.className = 'upload-button px-2 py-1 m-1 text-sm rounded border border-gray-300 text-gray-300 transition hover:bg-white/10 hover:border-gray-400';
        uploadBtn.style.cursor = 'pointer';
        uploadBtn.style.marginLeft = '10px';

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
        // submitUploadBtn.innerHTML = 'Upload';
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
        if (true) {
            tagButtonWrapper.classList.add('hidden');
            titleInput.classList.add('hidden');
            modelInput.classList.add('hidden');
            studioInput.classList.add('hidden');
            idInput.classList.add('hidden');
            uploadBtn.classList.add('hidden');
            uploadFormWrapper.classList.add('hidden');
        }
        const toggleEditMode = () => {

            const show = (el: HTMLElement) => el.classList.remove('hidden');
            const hide = (el: HTMLElement) => el.classList.add('hidden');

            if (!this.state.advancedMode) {
                show(tagButtonWrapper);
                show(titleInput);
                show(modelInput);
                show(studioInput);
                show(idInput);
                show(uploadBtn);
                const deleteButtons: NodeListOf<HTMLButtonElement> = window.document.querySelectorAll('.tag-delete');
                console.log(deleteButtons);

                deleteButtons.forEach(btn => show(btn));

                editToggleBtn.innerHTML = '⏷';
                editToggleBtn.title = 'View mode';
            } else {
                hide(tagButtonWrapper);
                hide(titleInput);
                hide(modelInput);
                hide(studioInput);
                hide(idInput);
                hide(uploadBtn);
                hide(uploadFormWrapper);
                const deleteButtons: NodeListOf<HTMLButtonElement> = window.document.querySelectorAll('.tag-delete');
                console.log(deleteButtons);
                deleteButtons.forEach(btn => hide(btn));

                editToggleBtn.innerHTML = '✏️';
                editToggleBtn.title = 'Edit metadata';
            }
            this.state.advancedMode = !this.state.advancedMode;
        };
        editToggleBtn.addEventListener('click', () => {
            toggleEditMode();
        });
        this.html.videoForms[section].append(videoTagsContainer, tagButtonWrapper, titleInput, modelInput, studioInput, idInput, uploadBtn, uploadFormWrapper)
        return this.html.videoForms[section];
    }
    getActiveIndexForSection(section: number): number | null {
        // section is 1-based
        const base = (section - 1) * 2;

        if (this.state.active?.[base as PlayerIndex]) return base;
        if (this.state.active?.[(base + 1) as PlayerIndex]) return base + 1;

        return null;
    }
    async updateMeta(section: SectionId, key: string, value: string | string[], tagId?: number): Promise<VideoWithRelations | null> {
        // gather data to send, assuming you have videos in an array like this:
        const activeIndex = this.getActiveIndexForSection(section);
        const video = this.html.videoPlayers[activeIndex as PlayerIndex];
        console.log("video clicked to update", video);

        const videoId = video.getAttribute('data-video-id');

        if (!videoId) {
            console.error(`Extracted video ID is empty for video at index ${activeIndex}`);
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
            console.error(`Failed to update metadata for video ${activeIndex}:`, error);
            return null;
        }
    }
    createVideoContainer(): void {

        // 1. Loop through the 4 existing sections in your HTML
        for (let section = 1; section <= 4; section++) {
            const sectionHTML = document.getElementById(`section-${section}`);
            if (!sectionHTML) continue;

            // 2. Find the existing videos (Front and Back) and link them to our array
            const front = sectionHTML.querySelector(`#v${section}-front`) as HTMLVideoElement;
            const back = sectionHTML.querySelector(`#v${section}-back`) as HTMLVideoElement;

            if (front) this.html.videoPlayers.push(front);
            if (back) this.html.videoPlayers.push(back);

            // 3. Create and Append the Metadata Forms
            // We create two forms (one for front, one for back) 
            // and append them to the section
            [0, 1].forEach((j) => {
                const playerIndex = ((section - 1) * 2 + j) as PlayerIndex;

                // Create the form using your existing method
                const form = this.createMetadataForm(section as unknown as SectionId);

                // Link to your tracking array
                this.html.videoForms[playerIndex] = form as HTMLDivElement;
                if (j === 1) {
                    return
                }
                // APPEND ONLY: Add it to the existing section div
                sectionHTML.appendChild(form);
            });
        }
    }

}
export default Players;
