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
        loadGoogleSignIn: () => Promise<void>;
    }
}

let googleScriptLoaded = false;

function loadGoogleSignIn(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (googleScriptLoaded || window.google) {
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;

        script.onload = () => {
            googleScriptLoaded = true;
            resolve();
        };

        script.onerror = () => {
            reject(new Error("Failed to load Google Sign-In"));
        };

        document.head.appendChild(script);
    });
}

window.loadGoogleSignIn = loadGoogleSignIn;

document.addEventListener('DOMContentLoaded', async () => {
    const api = new VideoApi(config.apiUrl);
    const state = new State(api);
    const html = new HTML(state);
    const user = new User();
    const players = new Players(state, html, api, user);

    window.state = state;
    window.html = html;
    window.players = players;
    window.user = user;
    
    await user.init();
    players.init();
});