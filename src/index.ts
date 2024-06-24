import {handleVideoEnded, handleVideoEnded2} from './videoControls';

export let number = 1
export function addToNumber(value: number) {
    number += value;
}
document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('videoPlayer') as HTMLVideoElement;
    const videoPlayer2 = document.getElementById('videoPlayer2') as HTMLVideoElement;
    const startButton = document.getElementById('startButton');
    if (!startButton) {
        throw new Error('No start button found');
    }
    startButton.addEventListener('click', async () => {
        try {
            videoPlayer.play();
        } catch (error) {
          console.error('Error loading or playing video:', error);
        }
      });


    // Set initial video source and play it
    videoPlayer.src = '/video/' + number.toString()+ '.mp4';
    number+= 1;
    videoPlayer2.src = '/video/' + number.toString()+ '.mp4';

    // Event listener for when the video ends
    videoPlayer.addEventListener('ended', () => handleVideoEnded(videoPlayer,videoPlayer2));
    videoPlayer2.addEventListener('ended', () => handleVideoEnded2(videoPlayer,videoPlayer2));
});