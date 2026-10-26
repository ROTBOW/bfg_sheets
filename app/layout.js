import localFont from "next/font/local";
import Navbar from "@/components/navigation/Navbar";
import "./globals.css";
import { themeInitializationScript } from "./theme";

const monaspaceKrypton = localFont({
    src: "../public/fonts/MonaspaceKrypton-Variable.woff2",
    variable: "--font-monaspace-krypton",
    weight: "200 800",
    display: "swap",
});

const monaspaceNeon = localFont({
    src: "../public/fonts/MonaspaceNeon-Variable.woff2",
    variable: "--font-monaspace-neon",
    weight: "200 800",
    display: "swap",
});

export const metadata = {
    title: "BFG Sheets",
    description:
        "A Battlefleet Gothic companion for ship profiles and battle bookkeeping.",
    icons: {
        icon: {
            url: "/logo.svg",
            type: "image/svg+xml",
        },
    },
};

const RootLayout = ({ children }) => {
    return (
        <html
            lang="en"
            className={`${monaspaceKrypton.variable} ${monaspaceNeon.variable}`}
            suppressHydrationWarning
        >
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: themeInitializationScript,
                    }}
                />
            </head>
            <body>
                <Navbar />
                {children}
            </body>
        </html>
    );
};

export default RootLayout;
