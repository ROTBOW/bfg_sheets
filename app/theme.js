export const accentCookieName = "bfg-accent";
export const defaultAccent = "amber";
export const terminalAccents = [
    { id: "amber", label: "Amber" },
    { id: "green", label: "Phosphor green" },
    { id: "cyan", label: "Cyan" },
    { id: "blue", label: "Ice blue" },
    { id: "magenta", label: "Magenta" },
    { id: "white", label: "White" },
];

export const themeCookieName = "bfg-theme";

// Run before the page paints. Omitting Expires and Max-Age keeps a session cookie.
export const themeInitializationScript = `
    (() => {
        const cookie = document.cookie
            .split("; ")
            .find((entry) => entry.startsWith("${themeCookieName}="));
        const theme = cookie === "${themeCookieName}=light" ? "light" : "dark";
        const secure = location.protocol === "https:" ? "; Secure" : "";

        const accentCookie = document.cookie
            .split("; ")
            .find((entry) => entry.startsWith("${accentCookieName}="));
        const storedAccent = accentCookie?.split("=")[1];
        const allowedAccents = ${JSON.stringify(terminalAccents.map((accent) => accent.id))};
        const accent = allowedAccents.includes(storedAccent) ? storedAccent : "${defaultAccent}";

        document.documentElement.dataset.accent = accent;
        document.cookie = "${accentCookieName}=" + accent + "; Path=/; SameSite=Lax" + secure;
        document.documentElement.dataset.theme = theme;
        document.cookie = "${themeCookieName}=" + theme + "; Path=/; SameSite=Lax" + secure;
    })();
`;
