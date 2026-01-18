import { VideoMetadata } from "./Player"
import State, { PlayerIndex, SectionId } from "./State"

export default class HTML {
  // objects
  state!: State
  // toolbar buttons
  toolbar: HTMLDivElement = document.getElementById('toolbar') as HTMLDivElement
  hideFormsBtn: HTMLSpanElement = document.getElementById('hideForms') as HTMLSpanElement
  playPauseBtn: HTMLButtonElement = document.getElementById('playPauseBtn') as HTMLButtonElement
  fullscreenButton: HTMLButtonElement = document.getElementById('fullScreenBtn') as HTMLButtonElement
  resizeButton: HTMLButtonElement = document.getElementById('multiScreenBtn') as HTMLButtonElement
  muteToggle: HTMLButtonElement = document.getElementById('muteBtn') as HTMLButtonElement


  // toolbar icons
  resizeIcon!: HTMLSpanElement
  muteIcon!: HTMLSpanElement
  // toolbar buttons
  hideAdvancedIconFormsButton!: HTMLButtonElement
  // metadata
  allTags: Array<{ id: number; title: string }> = [];

  // video players
  videoPlayers: HTMLVideoElement[] = []

  // video forms
  videoForms: HTMLDivElement[] = []
  // menu
  tagsWrappers: HTMLDivElement[] = []


  constructor(state: State) {
    this.state = state;
  }



  createButton(id: string, content: HTMLElement | SVGSVGElement): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.id = id
    btn.className =
      'toolbar-item'
    btn.style.borderColor = 'rgba(0, 0, 0, 0.4)'
    btn.appendChild(content)
    return btn
  }

  createSpan(id: string): HTMLSpanElement {
    const span = document.createElement('span')
    span.id = id
    span.className = 'text-black-300'
    return span
  }

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

  svgPlay(): SVGSVGElement {
    return this.createSVG('w-5 h-5', 'M6 4l10 6-10 6V4z')
  }
  svgGrid4(): SVGSVGElement {
    const svg = this.createSVG('w-5 h-5')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.innerHTML = `
    <rect x="4" y="4" width="6" height="6" stroke="currentColor" stroke-width="2" fill="none" />
    <rect x="14" y="4" width="6" height="6" stroke="currentColor" stroke-width="2" fill="none" />
    <rect x="14" y="14" width="6" height="6" stroke="currentColor" stroke-width="2" fill="none" />
    <rect x="4" y="14" width="6" height="6" stroke="currentColor" stroke-width="2" fill="none" />
  `
    return svg
  }

  svgPause(): SVGSVGElement {
    return this.createSVG(
      'w-5 h-5',
      'M7 4h4v12H7V4zm6 0h4v12h-4V4z'
    )
  }

  svgFullscreen(): SVGSVGElement {
    return this.createSVG(
      'w-4 h-4',
      'M4 8V4h4M4 16v4h4M20 8V4h-4M20 16v4h-4',
      true
    )
  }

  createSVG(size: string, d?: string, stroke = false): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', `${size} text-black-300`)
    svg.setAttribute('viewBox', stroke ? '0 0 24 24' : '0 0 20 20')
    if (stroke) {
      svg.setAttribute('fill', 'none')
      svg.setAttribute('stroke', 'currentColor')
      svg.setAttribute('stroke-width', '2')
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('stroke-linecap', 'round')
      path.setAttribute('stroke-linejoin', 'round')
      path.setAttribute('d', d!)
      svg.appendChild(path)
    } else if (d) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('fill', 'currentColor')
      path.setAttribute('d', d)
      svg.appendChild(path)
    }
    return svg
  }

  // togglePlayUI(isPlaying: boolean) {
  //   this.playButton.style.display = isPlaying ? 'none' : 'flex'
  //   this.pauseButton.style.display = isPlaying ? 'flex' : 'none'
  // }

  setMuteIcon(muted: boolean) {
    this.muteIcon.innerHTML = muted
      ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636l-12.728 12.728" />
           <path stroke-linecap="round" stroke-linejoin="round" d="M9 9v6l5 4V5l-5 4z" />
         </svg>`
      : `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
         </svg>`
  }

  renderTags(
    container: HTMLElement,
    tags: string[],
    index: PlayerIndex,
    videoId?: number,
    toggleTag?: (tag: string, active: boolean) => void
  ) {
    container.innerHTML = '';
    const visible = 5;
    const section = Math.floor(index / 2) + 1 as SectionId;

    tags.forEach((tag, i) => {
      const btn = document.createElement('button');
      btn.className = `${tag}-id-${section} tag-button px-2 py-1 m-1 text-sm rounded border border-transparent text-gray-300 transition
      hover:bg-white/10 hover:border-gray-400 ${i >= visible ? 'hidden-tag hidden' : ''}`;

      if (this.state.activeTags[section]?.includes(tag)) {
        btn.classList.add('active-tag');
      }

      btn.textContent = tag;

      btn.addEventListener('click', () => {
        console.log("clicked tag", tag);

        if (toggleTag) toggleTag(tag, true);
      });

      /* 🔴 delete X */
      const del = document.createElement('span');
      del.className = 'tag-delete';
      del.textContent = '×';

      del.addEventListener('click', async (e) => {
        e.preventDefault();      // 👈 critical
        e.stopPropagation(); // 👈 don’t toggle tag
        console.log("clicked delete", tag);

        try {
          const body = {
            tagTitle: tag,
            videoId,
          };
          const response = await fetch(`${this.state.apiUrl}/videos/remove-tag`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          console.log(response);
          btn.remove();

        } catch (err) {
          console.error('Failed to delete tag', err);
        }
      });

      btn.appendChild(del);
      container.appendChild(btn);
    });

    if (tags.length > visible) {
      const toggleBtn = document.createElement('button');
      toggleBtn.textContent = 'More';
      toggleBtn.className = 'tag-toggle';
      toggleBtn.onclick = () => {
        container
          .querySelectorAll('.hidden-tag')
          .forEach(el => el.classList.toggle('hidden'));
      };
      container.appendChild(toggleBtn);
    }
  }
}
