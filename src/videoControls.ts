import { number, modifyNumber, total } from './index';

export async function handleVideoEnded(videoPlayer: HTMLVideoElement, videoPlayer2: HTMLVideoElement): Promise<void> {
    console.log('Video ended');
    try {
        await videoPlayer2.play();
        videoPlayer2.classList.remove('hidden');
        videoPlayer.classList.add('hidden');
        const shouldSetRandom = Math.random() < 0.20; // 50% chance to either add or set to random.

        if (shouldSetRandom) {
            // If true, set 'number' to a random value.
            const random = Math.floor(Math.random() * total) + 1;
            modifyNumber(random, true); // Assuming modifyNumber is the new function name that can either add or set.
        } else {
            // If false, simply add 1 to 'number'.
            modifyNumber(1, false)
            console.log("next video number: ", number);
            
        }
        videoPlayer.src = "/video/" + number.toString() + ".mp4";
        console.log('New video started playing');
    } catch (error) {
        console.error('Error loading or playing new video:', error);
    }
}

export async function handleVideoEnded2(videoPlayer: HTMLVideoElement, videoPlayer2: HTMLVideoElement): Promise<void> {
    console.log('Video ended');
    try {
        await videoPlayer.play();
        videoPlayer.classList.remove('hidden');
        videoPlayer2.classList.add('hidden');
        const shouldSetRandom = Math.random() < 0.20; // 50% chance to either add or set to random.

        if (shouldSetRandom) {
            // If true, set 'number' to a random value.
            const random = Math.floor(Math.random() * total) + 1;
            modifyNumber(random, true); // Assuming modifyNumber is the new function name that can either add or set.
        } else {
            // If false, simply add 1 to 'number'.
            modifyNumber(1, false);
            console.log("next video number: ", number);
        }
        videoPlayer2.src = "/video/" + number.toString() + ".mp4";
        console.log('New video started playing');
    } catch (error) {
        console.error('Error loading or playing new video:', error);
    }
}