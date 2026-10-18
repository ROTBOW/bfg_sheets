export const themeCookieName = "bfg-theme";

// Run before the page paints. Omitting Expires and Max-Age keeps a session cookie.
export const themeInitializationScript = `
    (() => {
        const cookie = document.cookie
            .split("; ")
            .find((entry) => entry.startsWith("${themeCookieName}="));
        const theme = cookie === "${themeCookieName}=light" ? "light" : "dark";
        const secure = location.protocol === "https:" ? "; Secure" : "";

        document.documentElement.dataset.theme = theme;
        document.cookie = "${themeCookieName}=" + theme + "; Path=/; SameSite=Lax" + secure;
    })();
`;
