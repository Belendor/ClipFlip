import State, { PlayerIndex, SectionId } from "./State"
import type { Tag, Video } from '../server/node_modules/@prisma/client/index.js';

export default class HTML {

  state: State
  appRoot: HTMLElement;
  videoGrid: HTMLElement;
  sections: HTMLElement[] = [];
  hideTimeout: number | null = null;
  readonly HIDE_DELAY = 4000; // ms

  // objects
  // toolbar buttons
  toolbar: HTMLDivElement = document.getElementById('toolbar') as HTMLDivElement
  hideFormsBtn: HTMLSpanElement = document.getElementById('hideForms') as HTMLSpanElement
  playPauseBtn: HTMLButtonElement = document.getElementById('playPauseBtn') as HTMLButtonElement
  fullscreenButton: HTMLButtonElement = document.getElementById('fullScreenBtn') as HTMLButtonElement
  resizeButton: HTMLButtonElement = document.getElementById('multiScreenBtn') as HTMLButtonElement
  muteToggle: HTMLButtonElement = document.getElementById('muteBtn') as HTMLButtonElement

  // toolbar icons
  resizeIconActive!: HTMLSpanElement
  resizeIconInactive!: HTMLSpanElement
  muteIcon!: HTMLSpanElement
  iconPlay!: HTMLSpanElement
  iconPause!: HTMLSpanElement
  // toolbar buttons
  hideAdvancedIconFormsButton!: HTMLButtonElement

  // video players
  videoPlayers: HTMLVideoElement[] = []

  // video forms
  videoForms: HTMLElement[] = []
  // menu
  videoTagsContainers: HTMLDivElement[] = []


  constructor(state: State) {
    this.state = state;
    // Grab the main containers
    this.appRoot = document.getElementById('app-root') as HTMLElement;
    this.videoGrid = document.getElementById('video-grid') as HTMLElement;
    // this.resizeButton = document.getElementById('multiScreenBtn') as HTMLButtonElement;
    // this.resizeIconActive = document.getElementById('icon-grid') as HTMLSpanElement;
    // this.resizeIconInactive = document.getElementById('icon-single') as HTMLSpanElement;
    this.fullscreenButton = document.getElementById('fullScreenBtn') as HTMLButtonElement;
    this.muteToggle = document.getElementById('muteBtn') as HTMLButtonElement;
    this.playPauseBtn = document.getElementById('playPauseBtn') as HTMLButtonElement;
    this.iconPlay = document.getElementById('icon-play') as HTMLSpanElement;
    this.iconPause = document.getElementById('icon-pause') as HTMLSpanElement;
    // Find all 4 sections
    this.sections = Array.from(document.querySelectorAll('.video-section'));
    this.mapPlayersById();
    this.init()
  }
  private init() {
    // start hidden
    this.hideToolbar();

    // mouse movement inside player
    this.appRoot.addEventListener('mousemove', this.handleInteraction);
    this.appRoot.addEventListener('click', this.handleInteraction);

    // optional: keyboard
    window.addEventListener('keydown', this.handleInteraction);
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

  private showToolbar() {
    this.toolbar.style.opacity = '1';
    this.toolbar.style.pointerEvents = 'auto';
  }

  private hideToolbar() {
    this.toolbar.style.opacity = '0';
    this.toolbar.style.pointerEvents = 'none';
  }
  private mapPlayersById(): void {
    // We define the exact order to ensure "v1-front" is always index 0
    const idMap = [
      'v1-front', 'v1-back',
      'v2-front', 'v2-back',
      'v3-front', 'v3-back',
      'v4-front', 'v4-back'
    ];

    idMap.forEach((id) => {
      const el = document.getElementById(id) as HTMLVideoElement;
      if (el) {
        this.videoPlayers.push(el);
      } else {
        throw new Error(`Video element with ID ${id} not found.`);
      }
    });
  }


  // createButton(id: string, content: HTMLElement | SVGSVGElement): HTMLButtonElement {
  //   const btn = document.createElement('button')
  //   btn.id = id
  //   btn.className =
  //     'toolbar-item'
  //   btn.style.borderColor = 'rgba(0, 0, 0, 0.4)'
  //   btn.appendChild(content)
  //   return btn
  // }

  // createSpan(id: string): HTMLSpanElement {
  //   const span = document.createElement('span')
  //   span.id = id
  //   span.className = 'text-black-300'
  //   return span
  // }

  createDiv(id: string, className = ''): HTMLDivElement {
    const div = document.createElement('div')
    div.id = id
    div.className = className
    return div
  }

  getPositionClass(i: number): string {
    switch (i) {
      case 0: case 1:
        return i === 1 ? 'video-layer hidden' : 'video-layer'
      case 2: case 3:
        return 'video-layer-right half-size hidden'
      case 4: case 5:
        return 'video-layer-botttom half-size hidden'
      case 6: case 7:
        return 'video-layer-botttom-right half-size hidden'
      default:
        return 'video-layer hidden'
    }
  }

  // svgPlay(): SVGSVGElement {
  //   return this.createSVG('w-5 h-5', 'M6 4l10 6-10 6V4z')
  // }
  // svgGrid4(): SVGSVGElement {
  //   const svg = this.createSVG('w-5 h-5')
  //   svg.setAttribute('viewBox', '0 0 24 24')
  //   svg.innerHTML = `
  //   <rect x="4" y="4" width="6" height="6" stroke="currentColor" stroke-width="2" fill="none" />
  //   <rect x="14" y="4" width="6" height="6" stroke="currentColor" stroke-width="2" fill="none" />
  //   <rect x="14" y="14" width="6" height="6" stroke="currentColor" stroke-width="2" fill="none" />
  //   <rect x="4" y="14" width="6" height="6" stroke="currentColor" stroke-width="2" fill="none" />
  // `
  //   return svg
  // }

  // svgPause(): SVGSVGElement {
  //   return this.createSVG(
  //     'w-5 h-5',
  //     'M7 4h4v12H7V4zm6 0h4v12h-4V4z'
  //   )
  // }

  // svgFullscreen(): SVGSVGElement {
  //   return this.createSVG(
  //     'w-4 h-4',
  //     'M4 8V4h4M4 16v4h4M20 8V4h-4M20 16v4h-4',
  //     true
  //   )
  // }

  // createSVG(size: string, d?: string, stroke = false): SVGSVGElement {
  //   const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  //   svg.setAttribute('class', `${size} text-black-300`)
  //   svg.setAttribute('viewBox', stroke ? '0 0 24 24' : '0 0 20 20')
  //   if (stroke) {
  //     svg.setAttribute('fill', 'none')
  //     svg.setAttribute('stroke', 'currentColor')
  //     svg.setAttribute('stroke-width', '2')
  //     const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  //     path.setAttribute('stroke-linecap', 'round')
  //     path.setAttribute('stroke-linejoin', 'round')
  //     path.setAttribute('d', d!)
  //     svg.appendChild(path)
  //   } else if (d) {
  //     const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  //     path.setAttribute('fill', 'currentColor')
  //     path.setAttribute('d', d)
  //     svg.appendChild(path)
  //   }
  //   return svg
  // }

  // togglePlayUI(isPlaying: boolean) {
  //   this.playButton.style.display = isPlaying ? 'none' : 'flex'
  //   this.pauseButton.style.display = isPlaying ? 'flex' : 'none'
  // }

  // setMuteIcon(muted: boolean) {
  //   this.muteIcon.innerHTML = muted
  //     ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
  //          <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636l-12.728 12.728" />
  //          <path stroke-linecap="round" stroke-linejoin="round" d="M9 9v6l5 4V5l-5 4z" />
  //        </svg>`
  //     : `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
  //          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
  //        </svg>`
  // }

  async renderTags(
    container: HTMLElement,
    tags: Tag[], // This should match your Prisma Tag type
    section: SectionId,
    videoId?: number,
    toggleTag?: (tag: string, active: boolean) => void
  ) {
    container.innerHTML = ''; // Clear existing tags

    if (tags.length === 0) {
      return
    }
    const visibleCount = 7;

    tags.forEach((tag, i) => {
      // 1. Create Button Wrapper
      const btn = document.createElement('button');

      // Use your specialized class for section-specific styling
      btn.className = `tag-button section-tag-${section}`;
      btn.classList.add(
        'px-2',             // wider
        'py-1',           // taller
        'text-base',        // bigger, readable text
        'font-semibold',    // bold enough
        'rounded-2xl',      // more rounded corners
        'bg-black/30',      // darker semi-transparent background
        'backdrop-blur-lg', // stronger blur for glass effect
        'border',
        'border-white/40',
        'text-white',
        'shadow-md',        // subtle depth
        'hover:bg-black/50',
        'hover:scale-105',  // slight hover zoom
        'transition-all',
        'duration-200',
        'ease-out'
      );

      // Hide tags beyond the visible limit
      if (i >= visibleCount) {
        btn.classList.add('hidden-tag', 'hidden');
      }

      // 2. Active State Check

      const isActive = this.state.activeTags.get(section)?.includes(tag.title);
      if (isActive) {
        btn.classList.add('active-tag');
      }

      // Set Tag Text
      const textSpan = document.createElement('span');
      textSpan.textContent = tag.title;

      btn.appendChild(textSpan);

      // 3. Main Click Event (Filter Toggle)
      btn.addEventListener('click', (e) => {
        // Prevent triggering the video container click (which expands/shrinks grid)
        e.stopPropagation();
        console.log(`Filtering section ${section} by tag: ${tag.title}`);

        if (toggleTag && tag.title) {
          toggleTag(tag.title, true);
        }
      });

      // 4. Delete Action (The 'X')
      const del = document.createElement('span');
      del.className = 'tag-delete ml-2 px-1 hover:text-red-500 transition-colors cursor-pointer font-bold';

      if (this.state.advancedMode) {
        del.classList.remove('hidden');
      } else {
        del.classList.add('hidden');
      }
      del.innerHTML = '&times;';

      del.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation(); // CRITICAL: Stop the 'btn' click from firing

        if (!confirm(`Remove tag "${tag.title}" from this video?`)) return;

        try {
          const response = await fetch(`${this.state.apiUrl}/videos/remove-tag`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tagTitle: tag.title, videoId }),
          });

          if (response.ok) {
            btn.remove();
            console.log("Tag removed from Prisma DB");
          }
        } catch (err) {
          console.error('Failed to delete tag', err);
        }
      });

      btn.appendChild(del);

      container.appendChild(btn);
    });

    // 5. Expandable 'More' Button
    if (tags.length > visibleCount) {
      const toggleBtn = document.createElement('button');
      toggleBtn.textContent = '...';
      toggleBtn.className = 'px-2 py-1 m-1 text-xs rounded-full bg-white/10 text-white hover:bg-white/30';

      toggleBtn.onclick = (e) => {
        e.stopPropagation();
        const hiddenTags = container.querySelectorAll('.hidden-tag');
        hiddenTags.forEach(el => el.classList.toggle('hidden'));
        toggleBtn.textContent = toggleBtn.textContent === '...' ? 'less' : '...';
      };
      container.appendChild(toggleBtn);
    }
  }
}
