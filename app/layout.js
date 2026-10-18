import "./globals.css";
import { themeInitializationScript } from "./theme";

export const metadata = {
    title: "BFG Sheets",
    description:
        "A Battlefleet Gothic companion for ship profiles and battle bookkeeping.",
};

const RootLayout = ({ children }) => {
    return (
        <html
            lang="en"
            suppressHydrationWarning
        >
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: themeInitializationScript,
                    }}
                />
            </head>
            <body>{children}</body>
        </html>
    );
};

export default RootLayout;
