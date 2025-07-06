import State from './State';
import Players from './Player';

document.addEventListener('DOMContentLoaded', async () => {
    const state = new State();
    const players = new Players(state); // Initialize with 8 players
});