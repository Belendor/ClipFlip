import { number,addToNumber } from './index';

export function playVideoWithLoad(videoPlayer: HTMLVideoElement, videoPlayer2: HTMLVideoElement): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        function onLoadedMetadata() {
            videoPlayer.removeEventListener('loadedmetadata', onLoadedMetadata); // Remove listener once loaded
            resolve();
        }

        function onError(event: Event) {
            reject((event as any).error || new Error('Unknown video loading error'));
        }

        videoPlayer.addEventListener('loadedmetadata', onLoadedMetadata);
        videoPlayer.addEventListener('error', onError);

        videoPlayer.src = "/video/" + number.toString() + ".mp4";
        addToNumber(1);
        videoPlayer2.src = "/video/" + number.toString() + ".mp4";
        videoPlayer.load(); // Reload the video source
        videoPlayer2.load(); // Reload the video source
    });
}

export async function handleVideoEnded(videoPlayer: HTMLVideoElement, videoPlayer2: HTMLVideoElement): Promise<void> {
    console.log('Video ended');
    try {
        videoPlayer2.classList.remove('hidden');
        videoPlayer.classList.add('hidden');
        await playVideoWithLoad(videoPlayer2, videoPlayer);
        await videoPlayer2.play();
        console.log('New video started playing');
    } catch (error) {
        console.error('Error loading or playing new video:', error);
    }
}
export async function handleVideoEnded2(videoPlayer: HTMLVideoElement, videoPlayer2: HTMLVideoElement): Promise<void> {
    console.log('Video ended');
    try {
        videoPlayer.classList.remove('hidden');
        videoPlayer2.classList.add('hidden');
        await playVideoWithLoad(videoPlayer, videoPlayer2);
        await videoPlayer.play();
        console.log('New video started playing');
    } catch (error) {
        console.error('Error loading or playing new video:', error);
    }
}