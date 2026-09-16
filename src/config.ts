const isBrowser = typeof window !== 'undefined';
const isProduction = isBrowser && (window.location.hostname === 'clip-flip.com' || window.location.hostname === 'www.clip-flip.com');

console.log(`Running in ${isProduction ? 'production' : 'development'} mode`);

// Set to true only if you run a local backend and local media files
const local = false;

const prodDomain = "https://clip-flip.com";
const apiURL = `${prodDomain}/api`;
const endIndex = local ? 3792 : 13642;

// Video & thumbnail paths point to production when local is false
const videoPath = local ? "./videos/" : `${prodDomain}/video/`;
const videoPath1 = local ? "./video1/" : `${prodDomain}/video1/`;
const videoPathNew = local ? "./video1/new/" : `${prodDomain}/video1/new/`;
const thumbnailPath = local ? "./thumbnails/" : `${prodDomain}/thumbnails/`;

export const config = {
    baseUrl: local ? 'http://127.0.0.1:3000' : prodDomain,
    videoSourcePath: videoPath,
    videoSourcePath2: videoPath1,
    videoSourcePathNew: videoPathNew,
    thumbnailSourcePath: thumbnailPath,
    defaultPercentChance: 25,
    defaultEndIndex: endIndex,
    apiUrl: apiURL,
    multiSection: false,
    googleClientId: "1005873499572-tfcfkhv3bhl9o8mbddvpnvsdi7ua5ele.apps.googleusercontent.com",
};