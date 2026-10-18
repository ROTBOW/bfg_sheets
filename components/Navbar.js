"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    accentCookieName,
    defaultAccent,
    terminalAccents,
    themeCookieName,
} from "@/app/theme";
const subscribeToTheme = (onChange) => {
    window.addEventListener("themechange", onChange);

    return () => window.removeEventListener("themechange", onChange);
};

const getLightThemeSnapshot = () =>
    document.documentElement.dataset.theme === "light";
const getServerThemeSnapshot = () => false;

const toggleTheme = () => {
    const theme = getLightThemeSnapshot() ? "dark" : "light";
    const secure = window.location.protocol === "https:" ? "; Secure" : "";

    document.documentElement.dataset.theme = theme;
    document.cookie = `${themeCookieName}=${theme}; Path=/; SameSite=Lax${secure}`;
    window.dispatchEvent(new Event("themechange"));
};

const getAccentSnapshot = () =>
    document.documentElement.dataset.accent || defaultAccent;
const getServerAccentSnapshot = () => defaultAccent;

const selectAccent = (accent) => {
    if (!terminalAccents.some((option) => option.id === accent)) {
        return;
    }

    const secure = window.location.protocol === "https:" ? "; Secure" : "";

    document.documentElement.dataset.accent = accent;
    document.cookie = `${accentCookieName}=${accent}; Path=/; SameSite=Lax${secure}`;
    window.dispatchEvent(new Event("themechange"));
};

const OptionsDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const isLightTheme = useSyncExternalStore(
        subscribeToTheme,
        getLightThemeSnapshot,
        getServerThemeSnapshot,
    );
    const selectedAccent = useSyncExternalStore(
        subscribeToTheme,
        getAccentSnapshot,
        getServerAccentSnapshot,
    );
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const closeOnOutsideClick = (event) => {
            if (!dropdownRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const closeOnEscape = (event) => {
            if (event.key === "Escape") {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };

        document.addEventListener("pointerdown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.removeEventListener("pointerdown", closeOnOutsideClick);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [isOpen]);

    return (
        <div
            className="options-dropdown"
            ref={dropdownRef}
            onBlur={(event) => {
                // Label clicks can briefly clear focus before focusing their radio.
                // Outside pointer clicks are handled by the document listener.
                if (
                    event.relatedTarget &&
                    !event.currentTarget.contains(event.relatedTarget)
                ) {
                    setIsOpen(false);
                }
            }}
        >
            <button
                type="button"
                className="options-button"
                ref={buttonRef}
                aria-expanded={isOpen}
                aria-controls="site-options"
                onClick={() => setIsOpen((wasOpen) => !wasOpen)}
            >
                <span aria-hidden="true">⚙</span>
                Options
                <span aria-hidden="true">▾</span>
            </button>
            {isOpen && (
                <div
                    className="options-panel"
                    id="site-options"
                >
                    <p className="eyebrow">Appearance</p>
                    <button
                        type="button"
                        className="theme-toggle"
                        role="switch"
                        aria-checked={isLightTheme}
                        onClick={toggleTheme}
                    >
                        <span>Light theme</span>
                        <span
                            className="theme-switch"
                            aria-hidden="true"
                        >
                            <span />
                        </span>
                    </button>
                    <p className="theme-description">
                        {isLightTheme
                            ? "Light theme enabled"
                            : "Dark theme enabled"}
                    </p>
                    <fieldset className="accent-picker">
                        <legend className="eyebrow">Accent</legend>
                        <div className="accent-options">
                            {terminalAccents.map((accent) => (
                                <label
                                    className="accent-option"
                                    key={accent.id}
                                    data-accent={accent.id}
                                    htmlFor={`accent-${accent.id}`}
                                >
                                    <input
                                        id={`accent-${accent.id}`}
                                        type="radio"
                                        name="terminal-accent"
                                        value={accent.id}
                                        checked={selectedAccent === accent.id}
                                        onChange={() => selectAccent(accent.id)}
                                    />
                                    <span
                                        className="accent-swatch"
                                        aria-hidden="true"
                                    />
                                    <span>{accent.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </div>
            )}
        </div>
    );
};

const navigationLinks = [
    { href: "/", label: "Battle Tracker" },
    { href: "/fleet-creator", label: "Fleet creator" },
    { href: "/connect", label: "Connect" },
];

const Navbar = () => {
    const pathname = usePathname();
    return (
        <header className="topbar">
            <Link
                href="/"
                className="brand"
            >
                <svg
                    className="brand-mark"
                    viewBox="0 0 64 64"
                    aria-hidden="true"
                    focusable="false"
                >
                    <use
                        href="/logo.svg#logo-blades"
                        fill="var(--accent)"
                    />
                </svg>
                <span>
                    BFG Sheets<small>BATTLEFLEET GOTHIC COMPANION</small>
                </span>
            </Link>
            <nav className="navbar-tabs" aria-label="Main navigation">
                {navigationLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        aria-current={pathname === link.href ? "page" : undefined}
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>
            {pathname === "/" && <span className="demo-badge">DEMO DATA</span>}
            <OptionsDropdown />
        </header>
    );
};

export default Navbar;
