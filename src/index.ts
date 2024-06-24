import {handleVideoEnded} from './videoControls';

export let number = 1
export function addToNumber(value: number) {
    number += value;
}
document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('videoPlayer') as HTMLVideoElement;
    const videoPlayer2 = document.getElementById('videoPlayer2') as HTMLVideoElement;

    // Set initial video source and play it
    videoPlayer.src = '/video/' + number.toString()+ '.mp4';
    number+= 1;
    videoPlayer2.src = '/video/' + number.toString()+ '.mp4';

    // Event listener for when the video ends
    videoPlayer.addEventListener('ended', () => handleVideoEnded(videoPlayer,videoPlayer2));
    videoPlayer2.addEventListener('ended', () => handleVideoEnded2(videoPlayer,videoPlayer2));
});