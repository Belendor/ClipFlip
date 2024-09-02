import { handleVideoEnded, handleVideoEnded2 } from './videoControls';

export let number = 1
export function modifyNumber(value: number, setRandom: boolean = false) {
    if (setRandom) {
        // Set the number to a random value within the specified range.
        number = value;
    } else {
        // Add the specified value to the current number.
        number += value;
    }
}
export let total = 1681;

document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('videoPlayer') as HTMLVideoElement;
    const videoPlayer2 = document.getElementById('videoPlayer2') as HTMLVideoElement;
    const startButton = document.getElementById('startButton') as HTMLButtonElement;
    const playButton = document.getElementById('playButton') as HTMLButtonElement
    const fullscreenButton = document.getElementById('fullscreenButton') as HTMLButtonElement;

    startButton.addEventListener('click', async () => {
        try {
            // Set initial video source and play it
            videoPlayer.play();
        } catch (error) {
            console.error('Error loading or playing video:', error);
        }
    });

    videoPlayer.src = '/video/' + (Math.floor(Math.random() * total) + 1).toString() + '.mp4';
    videoPlayer2.src = '/video/' + (Math.floor(Math.random() * total) + 1).toString() + '.mp4';

    // Event listener for when the video ends
    videoPlayer.addEventListener('ended', () => handleVideoEnded(videoPlayer, videoPlayer2));
    videoPlayer2.addEventListener('ended', () => handleVideoEnded2(videoPlayer, videoPlayer2));


    // Function to toggle full-screen mode
    function toggleFullScreen(): void {
        const doc = document as any; // Use 'any' type to avoid TypeScript errors for vendor-prefixed APIs

        if (!document.fullscreenElement) {
            // Enter full-screen mode
            if (doc.documentElement.requestFullscreen) {
                doc.documentElement.requestFullscreen();
            } else if (doc.documentElement.mozRequestFullScreen) { // Firefox
                doc.documentElement.mozRequestFullScreen();
            } else if (doc.documentElement.webkitRequestFullscreen) { // Chrome, Safari, Opera
                doc.documentElement.webkitRequestFullscreen();
            } else if (doc.documentElement.msRequestFullscreen) { // IE/Edge
                doc.documentElement.msRequestFullscreen();
            }
        } else {
            // Exit full-screen mode
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (doc.mozCancelFullScreen) { // Firefox
                doc.mozCancelFullScreen();
            } else if (doc.webkitExitFullscreen) { // Chrome, Safari, Opera
                doc.webkitExitFullscreen();
            } else if (doc.msExitFullscreen) { // IE/Edge
                doc.msExitFullscreen();
            }
        }
    }
    // Function to toggle play/pause
    function togglePlayButton(): void {
        videoPlayer.pause();
        videoPlayer2.pause();
    }

    // Add event listener to the button
    fullscreenButton.addEventListener('click', toggleFullScreen);
    playButton.addEventListener('click', togglePlayButton);
});