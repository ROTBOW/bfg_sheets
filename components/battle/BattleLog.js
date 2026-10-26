"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { endBattle, subscribeToRoom } from "@/firebase/room-service";
import { createLocalBattleReport, getBattleEvents, saveBattleReport } from "@/lib/battle-reports.mjs";

/** Returns the database side when every vessel in a populated fleet has zero hull. */
const getDestroyedSide = (room) => {
    for (const side of ["host", "guest"]) {
        const vessels = room?.sides?.[side]?.fleet?.ships || [];
        const battle = room?.sides?.[side]?.battle || {};

        if (vessels.length && vessels.every((vessel) => battle[vessel.id]?.hull === 0)) return side;
    }

    return "";
};

/** Shows the synchronized battle timeline and match-ending controls. */
const BattleLog = ({ roomId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [room, setRoom] = useState(null);
    const [error, setError] = useState("");
    const [isEnding, setIsEnding] = useState(false);
    const promptedDestroyedSide = useRef("");

    useEffect(() => subscribeToRoom(
        roomId,
        (nextRoom) => {
            setRoom(nextRoom);
            const report = createLocalBattleReport(roomId, nextRoom);

            if (report) {
                try {
                    saveBattleReport(window.localStorage, report);
                } catch {
                    setError("This report could not be saved on this device.");
                }
            }
        },
        () => setError("The live battle log could not be loaded."),
    ), [roomId]);

    useEffect(() => {
        const destroyedSide = getDestroyedSide(room);

        if (!destroyedSide || room?.report?.status === "closed" || promptedDestroyedSide.current === destroyedSide) return;

        promptedDestroyedSide.current = destroyedSide;
        const fleetName = room.sides[destroyedSide]?.fleet?.name || "A fleet";

        if (window.confirm(`${fleetName} has no operational ships remaining. Open the battle log to end the match?`)) {
            queueMicrotask(() => setIsOpen(true));
        }
    }, [room]);

    const finishBattle = async () => {
        const hostName = room?.sides?.host?.fleet?.name || "Host fleet";
        const guestName = room?.sides?.guest?.fleet?.name || "Guest fleet";
        const destroyedSide = getDestroyedSide(room);
        const suggestedResult = destroyedSide === "host"
            ? `${guestName} victory`
            : destroyedSide === "guest"
                ? `${hostName} victory`
                : "Draw";
        const result = window.prompt(
            `Enter the result: “${hostName} victory”, “${guestName} victory”, “Draw”, or “Abandoned”.`,
            suggestedResult,
        );

        if (!result?.trim()) return;
        if (!window.confirm(`End this match as “${result.trim()}”? The battle report will be finalized.`)) return;

        setIsEnding(true);
        setError("");

        try {
            await endBattle({ roomId, result: result.trim().slice(0, 100) });
        } catch {
            setError("The match could not be ended. Check your connection and try again.");
        } finally {
            setIsEnding(false);
        }
    };

    const events = getBattleEvents(room?.report?.events).slice().reverse();
    const isClosed = room?.report?.status === "closed";

    return (
        <div className="battle-log-control">
            <button type="button" className="options-button" aria-label="Open battle log" title="Battle log" aria-expanded={isOpen} onClick={() => setIsOpen((wasOpen) => !wasOpen)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V3Z" /><path d="M8 7h8M8 11h8M8 15h5M5 18h14" /></svg>
            </button>
            {isOpen && (
                <aside className="battle-log-drawer" aria-label="Battle log">
                    <header>
                        <div><p className="eyebrow">LIVE BATTLE RECORD</p><h2>Round {room?.turn?.round || 1}</h2></div>
                        <button type="button" aria-label="Close battle log" onClick={() => setIsOpen(false)}>×</button>
                    </header>
                    <p className="battle-log-id">BATTLE {roomId.toUpperCase()}</p>
                    {events.length ? (
                        <ol className="battle-log-events">
                            {events.map((event) => (
                                <li key={event.id}>
                                    <time>{event.createdAt ? new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Syncing…"}</time>
                                    <span>ROUND {event.round}</span>
                                    <p>{event.message}</p>
                                </li>
                            ))}
                        </ol>
                    ) : <p className="battle-log-empty">Actions will appear here once the battle begins.</p>}
                    {error && <p className="battle-log-error" role="alert">{error}</p>}
                    <footer>
                        <Link href="/battle-reports">Open battle reports</Link>
                        {!isClosed && <button type="button" disabled={isEnding} onClick={finishBattle}>{isEnding ? "Ending…" : "End match"}</button>}
                        {isClosed && <strong>{room.report.result}</strong>}
                    </footer>
                </aside>
            )}
        </div>
    );
};

export default BattleLog;

