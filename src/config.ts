const isBrowser = typeof window !== 'undefined';
const isProduction = isBrowser && (window.location.hostname === 'clip-flip.com' || window.location.hostname === 'www.clip-flip.com');

console.log(`Running in ${isProduction ? 'production' : 'development'} mode`);

const local = false;
const apiURL = true ? "https://clip-flip.com/api" : "http://127.0.0.1:3000" ;
const endIndex = local ? 3792 : 13062;
const videoPath = local ? "./videos/" : "https://clip-flip.com/video/";
const thumbnailPath = local ? "./thumbnails/" : "https://clip-flip.com/thumbnails/";

export const config = {
    baseUrl: isProduction ? 'https://clip-flip.com' : 'http://127.0.0.1:3000',
    videoSourcePath: videoPath,
    thumbnailSourcePath: thumbnailPath,
    defaultPercentChance: 25,
    defaultEndIndex: endIndex,
    apiUrl: apiURL,
    multiSection: false,
    googleClientId: "1005873499572-tfcfkhv3bhl9o8mbddvpnvsdi7ua5ele.apps.googleusercontent.com",
};
