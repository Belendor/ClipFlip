import State from './State';
import Players from './Player';
import HTML from './HTML';
import VideoApi from './VideoApi';
import { config } from './config';

declare global {
    interface Window {
        html: HTML;
        state: State;
        players: Players;
    }
}

document.addEventListener('DOMContentLoaded', async (e) => {
    e.preventDefault();
    const api = new VideoApi(config.apiUrl);
    const state = new State(api);
    const html = new HTML(state);
    const players = new Players(state, html, api);
    window.state = state;
    window.html = html;
    window.players = players;
    players.init();
});
