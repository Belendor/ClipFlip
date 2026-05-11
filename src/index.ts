import State from './State';
import Players from './Player';
import HTML from './HTML';
import User from "./User";
import VideoApi from './VideoApi';
import { config } from './config';

declare global {
    interface Window {
        html: HTML;
        state: State;
        players: Players;
        user: User;
        google: any;
    }
}

document.addEventListener('DOMContentLoaded', async (e) => {
    const api = new VideoApi(config.apiUrl);
    const state = new State(api);
    const html = new HTML(state);
    const user = new User();
    const players = new Players(state, html, api, user);
    window.state = state;
    window.html = html;
    window.players = players;
    window.user = user;
    players.init();
});
