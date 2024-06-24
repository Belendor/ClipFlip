"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const videoControls_1 = require("./videoControls");
document.addEventListener('DOMContentLoaded', () => {
    const videoPlayer = document.getElementById('videoPlayer');
    const videoPlayer2 = document.getElementById('videoPlayer2');
    let videoFile1Name = 'panties4.mp4'; // Example initial video file
    let videoCount = 6;
    (0, videoControls_1.videoConverter)();
    function playVideoWithLoad() {
        return new Promise((resolve, reject) => {
            videoPlayer.addEventListener('loadedmetadata', function onLoadedMetadata() {
                videoPlayer.removeEventListener('loadedmetadata', onLoadedMetadata); // Remove listener once loaded
                resolve();
            });
            videoPlayer.addEventListener('error', function onError(event) {
                reject(event.error || new Error('Unknown video loading error'));
            });
            videoPlayer.src = "/video/" + videoCount.toString() + ".mp4";
            videoCount++;
            videoPlayer.load(); // Reload the video source
        });
    }
    // Function to handle video ended event
    async function handleVideoEnded() {
        console.log('Video ended');
        try {
            await playVideoWithLoad();
            videoPlayer.play();
            console.log('New video started playing');
        }
        catch (error) {
            console.error('Error loading or playing new video:', error);
        }
    }
    // Set initial video source and play it
    videoPlayer.src = videoFile1Name;
    videoPlayer.play().then(() => {
        console.log('Initial video started playing');
    }).catch(error => {
        console.error('Error playing initial video:', error);
    });
    // Event listener for when the video ends
    videoPlayer.addEventListener('ended', handleVideoEnded);
});
