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
        await this.checkAuth();

        if (!this.currentUser) {
            await this.renderGoogleButton();    
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
        console.log("Checking autgh");
        
        const res = await fetch(`${config.apiUrl}/auth/me`, {
            credentials: "include",
        });

        const data = await res.json();
        console.log(data, "Auth data");
        

        if (data.loggedIn) {
            this.currentUser = data.user;
        }
    }
    getId () {
        return this.currentUser?.id;
    }

    async renderGoogleButton() {
        await window.loadGoogleSignIn();

        const buttonDiv = document.getElementById("google-login");
        if (!buttonDiv) return;

        buttonDiv.innerHTML = "";

        window.google.accounts.id.initialize({
            client_id: config.googleClientId,
            callback: this.handleGoogleLogin.bind(this),
        });

        window.google.accounts.id.renderButton(buttonDiv, {
            theme: "filled_black",
            type: "icon",
            size: "medium",
        });
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

        div.onclick = () => {
            this.logout();
        };
    }

    async signInWithGoogle() {
        await window.loadGoogleSignIn();
        window.google.accounts.id.prompt();
    }

    async logout() {
        await fetch(`${config.apiUrl}/auth/logout`, {
            method: "POST",
            credentials: "include",
        });

        this.currentUser = null;

        await this.renderGoogleButton();
    }
}