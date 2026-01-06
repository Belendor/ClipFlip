import os from 'os';

const isLinux = os.platform() === 'linux';

export const config = {
    // If Linux (EC2), use the production domain. If Windows, use localhost.
    baseUrl: isLinux ? 'https://clip-flip.com' : 'http://localhost:3000',
    videoSourcePath: isLinux ? './video/' : './video/',
    defaultPercentChance: 25,
    defaultEndIndex: 5609
};