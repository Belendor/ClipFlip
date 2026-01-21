// Detect environment based on the URL in the browser
// If 'window' is undefined (like during SSR), it defaults to localhost
const isBrowser = typeof window !== 'undefined';
const isProduction = isBrowser && (window.location.hostname === 'clip-flip.com' || window.location.hostname === 'www.clip-flip.com');
console.log(`Running in ${isProduction ? 'production' : 'development'} mode`);

export const config = {
    // If Linux (EC2), use the production domain. If Windows, use localhost.
    baseUrl: isProduction ? 'https://clip-flip.com' : 'http://localhost:3000',
    videoSourcePath: isProduction ? '/video/' : 'https://clip-flip.com/video/',
    defaultPercentChance: 25,
    defaultEndIndex: 5609,
    apiUrl: isProduction ? 'https://clip-flip.com/api' : 'https://clip-flip.com/api',
    multiSection: false,
    randomPercentChance: 25,
};