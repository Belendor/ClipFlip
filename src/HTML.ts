import { VideoMetadata } from "./Player"
import State, { PlayerIndex, SectionId } from "./State"

export default class HTML {
  // objects
  state!: State
  // toolbar icons
  resizeIcon!: HTMLSpanElement
  muteIcon!: HTMLSpanElement
  hideIcon!: HTMLSpanElement
  // toolbar buttons
  playButton!: HTMLButtonElement
  pauseButton!: HTMLButtonElement
  fullscreenButton!: HTMLButtonElement
  resizeButton!: HTMLButtonElement
  muteToggle!: HTMLButtonElement
  hideFormsButton!: HTMLButtonElement
  // metadata
  allTags: Array<{ id: number; title: string }> = [];

  // video players
  videoPlayers: HTMLVideoElement[] = []

  // menu
  tagsWrappers: HTMLDivElement[] = []

  constructor(state: State) {
    this.state = state;
  }

  createToolbar(): HTMLElement {
    const toolbar = this.createDiv('button-toolbar')
    toolbar.className = 'button-toolbar'

    // Buttons
    this.playButton = this.createButton('playButton', this.svgPlay())

    this.pauseButton = this.createButton('pauseButton', this.svgPause())
    this.fullscreenButton = this.createButton('fullscreenButton', this.svgFullscreen())
    // this.resizeIcon = this.createSpan('resizeIcon')
    this.resizeButton = this.createButton('resizeButton', this.svgGrid4())

    this.muteIcon = this.createSpan('muteIcon')
    this.muteToggle = this.createButton('muteToggle', this.muteIcon)

    this.hideIcon = this.createSpan('hideIcon')
    const iconDown = `
  <svg class="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
  </svg>`
    const iconBurger = `
  <svg class="w-5 h-5 text-black-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" stroke-linecap="round" />
    <line x1="3" y1="12" x2="21" y2="12" stroke-linecap="round" />
    <line x1="3" y1="18" x2="21" y2="18" stroke-linecap="round" />
  </svg>
`;
    this.hideIcon.innerHTML = iconBurger;
    this.hideIcon.innerHTML = iconBurger

    this.hideFormsButton = this.createButton('hideForms', this.hideIcon)
    this.hideFormsButton.classList.add('hide-button')

    this.hideFormsButton.addEventListener('click', () => {
      const forms = document.querySelectorAll('.metadata-form')

      forms.forEach(el => {
        (el as HTMLElement).classList.toggle('hidden')
      })

      this.hideIcon.innerHTML = forms[0].classList.contains('hidden') ? iconBurger : iconBurger
    })

    toolbar.append(
      this.hideFormsButton,
      this.playButton,
      this.pauseButton,
      this.fullscreenButton,
      this.resizeButton,
      this.muteToggle,
    )

    return toolbar
  }

  createVideoContainer(): HTMLElement {
    const container = this.createDiv('video-container')

    for (let i = 1; i <= 8; i++) {
      const wrapper = this.createDiv(`player${i}`, `${this.getPositionClass(i)}`)
      const form = this.createMetadataForm(i)
      wrapper.appendChild(form)

      const video = document.createElement('video')
      video.id = `videoPlayer${i}`
      video.className = 'video-layer'
      wrapper.appendChild(video)
      container.appendChild(wrapper)
      this.videoPlayers.push(video)
    }

    return container
  }

  private createButton(id: string, content: HTMLElement | SVGSVGElement): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.id = id
    btn.className =
      'w-8 h-8 rounded border-2 bg-transparent flex items-center justify-center hover:bg-black/10 transition'
    btn.style.borderColor = 'rgba(0, 0, 0, 0.4)'
    btn.appendChild(content)
    return btn
  }

  private createSpan(id: string): HTMLSpanElement {
    const span = document.createElement('span')
    span.id = id
    span.className = 'text-black-300'
    return span
  }

  private createDiv(id: string, className = ''): HTMLDivElement {
    const div = document.createElement('div')
    div.id = id
    div.className = className
    return div
  }

  private getPositionClass(i: number): string {
    switch (i) {
      case 1: case 2:
        return i === 2 ? 'video-layer hidden' : 'video-layer'
      case 3: case 4:
        return 'video-layer-right half-size hidden'
      case 5: case 6:
        return 'video-layer-botttom half-size hidden'
      case 7: case 8:
        return 'video-layer-botttom-right half-size hidden'
      default:
        return 'video-layer hidden'
    }
  }

  private svgPlay(): SVGSVGElement {
    return this.createSVG('w-5 h-5', 'M6 4l10 6-10 6V4z')
  }
  private svgGrid4(): SVGSVGElement {
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

  private svgPause(): SVGSVGElement {
    return this.createSVG(
      'w-5 h-5',
      'M7 4h4v12H7V4zm6 0h4v12h-4V4z'
    )
  }

  private svgFullscreen(): SVGSVGElement {
    return this.createSVG(
      'w-4 h-4',
      'M4 8V4h4M4 16v4h4M20 8V4h-4M20 16v4h-4',
      true
    )
  }

  private createSVG(size: string, d?: string, stroke = false): SVGSVGElement {
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

  togglePlayUI(isPlaying: boolean) {
    this.playButton.style.display = isPlaying ? 'none' : 'flex'
    this.pauseButton.style.display = isPlaying ? 'flex' : 'none'
  }

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

  private createMetadataForm(index: number): HTMLElement {
    const form = this.createDiv(`metaForm${index}`, 'metadata-form p-2');

    const makeInput = (placeholder: string, key: keyof VideoMetadata) => {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = placeholder;
      input.className = 'block w-full mb-2 bg-transparent text-black border border-gray-400 px-2 py-1 rounded placeholder-black-400';

      input.addEventListener('input', (event) => {
        event.preventDefault();
        this.updateMeta(index, key, input.value);
      });

      return input;
    };
    const titleInput = makeInput('Title', 'title');
    const modelInput = makeInput('Models', 'models'); // or 'model' if that is your key
    const studioInput = makeInput('Studio', 'studio');

    const tagsWrapper = this.createDiv(`tags${index}`, 'tag-container');

    // in your constructor or before usage
    this.tagsWrappers.push(tagsWrapper);

    // + Button to show available tags
    const addTagBtn = document.createElement('button');
    addTagBtn.type = 'button';
    addTagBtn.textContent = '+';
    addTagBtn.className = 'plus-button px-2 py-1 m-1 text-sm rounded border border-transparent text-gray-300 transition hover:bg-white/10 hover:border-gray-400';
    const tagListDropdown = document.createElement('div');
    tagListDropdown.className = 'tag-list mt-2 hidden bg-white text-black border border-gray-300 rounded shadow-md z-10 absolute';
    tagListDropdown.style.minWidth = '10rem';

    this.allTags.forEach((tag) => {
      const tagItem = document.createElement('div');
      tagItem.textContent = tag.title
      tagItem.className = 'px-3 py-2 hover:bg-gray-200 cursor-pointer';
      tagItem.addEventListener('click', () => {
        this.updateMeta(index, 'tag', tag.title, tag.id);
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
    this.allTags.forEach((tag) => {
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

      const res = await fetch('https://www.clipflip.online/api/upload-video', {
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

  async updateMeta(index: number, key: string, value: string | string[], tagId?: number) {
    // gather data to send, assuming you have videos in an array like this:
    const video = this.videoPlayers[index - 1];
    if (!video) {
      throw new Error(`Video player for index ${index} not found`);
    }

    const src = video.src;
    if (!src) {
      throw new Error(`Video source for player at index ${index} is missing`);
    }
    const filename = src.split('/').pop();
    if (!filename) {
      throw new Error(`Could not extract filename from src for video at index ${index}`);
    }
    const videoId = filename.replace('.mp4', '');
    if (!videoId) {
      throw new Error(`Extracted video ID is empty for video at index ${index}`);
    }

    console.log(videoId);

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
      const response = await fetch('https://www.clipflip.online/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to update metadata for video ${index}:`, error);
      throw error; // rethrow to handle it upstream if needed
    }
  }

  renderTags(container: HTMLElement, tags: string[], index: PlayerIndex, toggleTag?: (btn: HTMLButtonElement) => void) {
    console.log(container.id, 'container class');
    container.innerHTML = ''; // clear previous tags
    const visible = 5
    const section = Math.floor(index / 2) + 1 as SectionId
    tags.forEach((tag, i) => {
      const btn = document.createElement('button')
      btn.className = `${tag}-id tag-button px-2 py-1 m-1 text-sm rounded border border-transparent text-gray-300 transition 
  hover:bg-white/10 hover:border-gray-400 ${i >= visible ? 'hidden-tag hidden' : ''}`

      // check if tag is already active for this section (index)
      console.log(this.state.activeTags[section], tag, 'active check');

      if (this.state.activeTags[section] && this.state.activeTags[section].includes(tag)) {
        console.log(this.state.activeTags[section], tag, 'active');

        btn.classList.add('active-tag')  // mark button active
      }
      btn.textContent = tag
      btn.addEventListener('click', () => {
        if (toggleTag) {
          toggleTag(btn)
        }
      })

      container.appendChild(btn)
    })

    if (tags.length > visible) {
      const toggleBtn = document.createElement('button')
      toggleBtn.textContent = 'More'
      toggleBtn.className = 'tag-toggle'
      toggleBtn.onclick = () => {
        container.querySelectorAll('.hidden-tag').forEach(el => el.classList.toggle('hidden'))
      }
      container.appendChild(toggleBtn)
    }
  }
}
