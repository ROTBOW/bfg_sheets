import "./globals.css";

export const metadata = {
    title: "BFG Sheets",
    description:
        "A Battlefleet Gothic companion for ship profiles and battle bookkeeping.",
};

const RootLayout = ({ children }) => {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
};

export default RootLayout;
