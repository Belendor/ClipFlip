import State from './State';
import Players from './Player';
import HTML from './HTML';

declare global {
    interface Window {
        html: HTML;
        state: State;
        players: Players;
    }
}

document.addEventListener('DOMContentLoaded', async (e) => {
    e.preventDefault();
    const state = new State();
    const html = new HTML(state);
    const players = new Players(state, html);
    players.init();

    // expose for debugging or external access
    window.html = html;
    window.state = state;
    window.players = players;
});