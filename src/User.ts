import { config } from "./config";

export interface AuthUser {
    id: number;
    email: string;
    name?: string;
    picture?: string;
}

export default class User {
    currentUser: AuthUser | null = null;

    async init() {
        console.log("User init");

        await this.checkAuth();

        if (!this.currentUser) {
            this.renderGoogleButton();
        } else {
            this.renderUser();
        }
    }

    async handleGoogleLogin(response: { credential: string }) {
        const res = await fetch(`${config.apiUrl}/auth/google`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
                credential: response.credential,
            }),
        });

        const data = await res.json();

        if (!data.success) {
            console.error("Login failed");
            return;
        }

        this.currentUser = data.user;

        this.renderUser();
    }

    async checkAuth() {
        const res = await fetch(`${config.apiUrl}/auth/me`, {
            credentials: "include",
        });

        const data = await res.json();

        if (data.loggedIn) {
            this.currentUser = data.user;
        }
    }

    renderGoogleButton() {
        window.google.accounts.id.initialize({
            client_id: config.googleClientId,
            callback: this.handleGoogleLogin.bind(this),
        });
        console.log("rendering")

        window.google.accounts.id.renderButton(
            document.getElementById("google-login"),
            {
                theme: "filled_black",      // outline | filled_blue | filled_black
                type: "icon",       // standard | icon
                size: "medium",         // small | medium | large
                // "data-text": "signin",   // signin_with | signup_with | continue_with | signin
                // shape: "rectangular",         // rectangular | pill | circle | square
                // logo_alignment: "left", // left | center
                // width: "40"
            }
        );
    }

    renderUser() {
        const div = document.getElementById("google-login");

        if (!div || !this.currentUser) return;

        div.innerHTML = `
            <img
                src="${this.currentUser.picture}"
                title="${this.currentUser.email}"
                style="
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    cursor: pointer;
                "
            />
        `;
        div.addEventListener("click", () => {
            this.logout();
        });
    }

    async signInWithGoogle() {
            // This function is now handled by the Google Sign-In button callback
            window.google.accounts.id.prompt();
    }
    async logout() {
        await fetch(`${config.apiUrl}/auth/logout`, {
            method: "POST",
            credentials: "include",
        });

        this.currentUser = null;

        this.renderGoogleButton();
    }
}