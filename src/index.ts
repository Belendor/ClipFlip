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

let googleScriptLoadPromise: Promise<void> | null = null;

function loadGoogleSignIn(): Promise<void> {
    if (window.google?.accounts?.id) {
        return Promise.resolve();
    }

    if (googleScriptLoadPromise) {
        return googleScriptLoadPromise;
    }

    googleScriptLoadPromise = new Promise((resolve, reject) => {
        const existingScript = document.querySelector(
            'script[src="https://accounts.google.com/gsi/client"]'
        );

        if (existingScript) {
            existingScript.addEventListener("load", () => resolve());
            existingScript.addEventListener("error", () =>
                reject(new Error("Failed to load Google Sign-In"))
            );
            return;
        }

        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;

        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Google Sign-In"));

        document.head.appendChild(script);
    });

    return googleScriptLoadPromise;
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

    players.init();
});