import State, { SectionId } from "./State";
import type { Tag } from "./types";

type ToggleTagHandler = (tag: string, active: boolean) => void;
type DeleteTagHandler = (tag: Tag, videoId?: number) => Promise<void>;

export default class HTML {
    state: State;
    appRoot: HTMLElement;
    videoGrid: HTMLElement;
    sections: HTMLElement[] = [];
    hideTimeout: number | null = null;
    readonly HIDE_DELAY = 4000;

    toolbar: HTMLDivElement = document.getElementById("toolbar") as HTMLDivElement;
    hideFormsBtn: HTMLButtonElement = document.getElementById("hideForms") as HTMLButtonElement;
    playPauseBtn: HTMLButtonElement = document.getElementById("playPauseBtn") as HTMLButtonElement;
    fullscreenButton: HTMLButtonElement = document.getElementById("fullScreenBtn") as HTMLButtonElement;
    muteToggle: HTMLButtonElement = document.getElementById("muteBtn") as HTMLButtonElement;
    reloadToggle: HTMLButtonElement = document.getElementById("reloadBtn") as HTMLButtonElement;
    iconPlay: HTMLSpanElement;
    iconPause: HTMLSpanElement;

    videoPlayers: HTMLVideoElement[] = [];
    videoForms: HTMLElement[] = [];
    videoTagsContainers: HTMLDivElement[] = [];
    metadataVisible = true;

    constructor(state: State) {
        this.state = state;
        this.appRoot = document.getElementById("app-root") as HTMLElement;
        this.videoGrid = document.getElementById("video-grid") as HTMLElement;
        this.iconPlay = document.getElementById("icon-play") as HTMLSpanElement;
        this.iconPause = document.getElementById("icon-pause") as HTMLSpanElement;
        this.sections = Array.from(document.querySelectorAll(".video-section"));
        this.videoForms = Array.from(document.querySelectorAll(".metadata-form"));
        this.mapPlayersById();
        this.init();
    }

    private init() {
        this.setMetadataVisibility(true);
        this.appRoot.addEventListener("mousemove", this.handleInteraction);
        this.appRoot.addEventListener("click", this.handleInteraction);
        window.addEventListener("keydown", this.handleInteraction);
    }

    private handleInteraction = () => {
        this.showToolbar();

        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }

        if (this.state.playing[0] || this.state.playing[1]) {
            this.hideTimeout = window.setTimeout(() => {
                this.hideToolbar();
            }, this.HIDE_DELAY);
        }
    };

    private mapPlayersById(): void {
        const idMap = [
            "v1-front", "v1-back",
            "v2-front", "v2-back",
            "v3-front", "v3-back",
            "v4-front", "v4-back",
        ];

        idMap.forEach((id) => {
            const element = document.getElementById(id) as HTMLVideoElement | null;
            if (!element) {
                throw new Error(`Video element with ID ${id} not found.`);
            }

            this.videoPlayers.push(element);
        });
    }

    showToolbar() {
        this.toolbar.style.opacity = "1";
        this.toolbar.style.pointerEvents = "auto";
    }

    hideToolbar() {
        this.toolbar.style.opacity = "0";
        this.toolbar.style.pointerEvents = "none";
    }

    createDiv(id: string, className = ""): HTMLDivElement {
        const div = document.createElement("div");
        div.id = id;
        div.className = className;
        return div;
    }

    setMetadataVisibility(visible: boolean) {
        this.metadataVisible = visible;
        this.videoForms.forEach((form) => {
            form.classList.toggle("hidden", !visible);
        });
        this.hideFormsBtn.classList.toggle("is-active", visible);
    }

    hideNoVideosBox() {
        document.getElementById("no-videos-box")?.setAttribute("hidden", "");
    }

    async renderTags(
        container: HTMLElement,
        tags: Tag[],
        section: SectionId,
        videoId?: number,
        onToggleTag?: ToggleTagHandler,
        onDeleteTag?: DeleteTagHandler,
    ) {
        container.innerHTML = "";

        if (tags.length === 0) {
            return;
        }

        const visibleCount = 7;

        tags.forEach((tag, index) => {
            const button = document.createElement("button");
            button.className = `tag-button section-tag-${section}`;
            button.classList.add(
                "px-2",
                "py-1",
                "text-base",
                "font-semibold",
                "rounded-2xl",
                "bg-black/30",
                "backdrop-blur-lg",
                "border",
                "border-white/40",
                "text-white",
                "shadow-md",
                "hover:bg-black/50",
                "hover:scale-105",
                "transition-all",
                "duration-200",
                "ease-out",
            );

            if (index >= visibleCount) {
                button.classList.add("hidden-tag", "hidden");
            }

            if (this.state.activeTags.get(section)?.includes(tag.title)) {
                button.classList.add("active-tag");
            }

            const textSpan = document.createElement("span");
            textSpan.textContent = tag.title;
            button.appendChild(textSpan);

            button.addEventListener("click", (event) => {
                event.stopPropagation();
                onToggleTag?.(tag.title, true);
            });

            const deleteButton = document.createElement("span");
            deleteButton.className = "tag-delete ml-2 px-1 hover:text-red-500 transition-colors cursor-pointer font-bold";
            deleteButton.classList.toggle("hidden", !this.state.advancedMode);
            deleteButton.innerHTML = "&times;";
            deleteButton.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();

                if (!onDeleteTag || !videoId) {
                    return;
                }

                if (!confirm(`Remove tag "${tag.title}" from this video?`)) {
                    return;
                }

                await onDeleteTag(tag, videoId);
                button.remove();
            });

            button.appendChild(deleteButton);
            container.appendChild(button);
        });

        if (tags.length > visibleCount) {
            const toggleButton = document.createElement("button");
            toggleButton.textContent = "...";
            toggleButton.className = "px-2 py-1 m-1 text-xs rounded-full bg-white/10 text-white hover:bg-white/30";
            toggleButton.onclick = (event) => {
                event.stopPropagation();
                container.querySelectorAll(".hidden-tag").forEach((element) => element.classList.toggle("hidden"));
                toggleButton.textContent = toggleButton.textContent === "..." ? "less" : "...";
            };
            container.appendChild(toggleButton);
        }
    }
}
