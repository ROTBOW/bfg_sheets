"use client";

import { useState, useSyncExternalStore } from "react";
import { updateBattleTurn } from "@/firebase/room-service";

const subscribeToEndTurnWarning = (onChange) => {
    window.addEventListener("endturnwarningchange", onChange);

    return () => window.removeEventListener("endturnwarningchange", onChange);
};

const getEndTurnWarningSnapshot = () =>
    document.documentElement.dataset.endTurnWarning !== "disabled";
const getServerEndTurnWarningSnapshot = () => true;

/** Displays and advances the shared game round and active player turn. */
const TurnCounter = ({
    roomId,
    turn,
    localSide,
    friendlyName,
    enemyName,
    shipsThatCanFire = 0,
    onResetLeadershipChecks,
}) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [turnError, setTurnError] = useState("");
    const [isResettingLeadership, setIsResettingLeadership] = useState(false);
    const round = turn?.round || 1;
    const activeSide = turn?.activeSide || "";
    const friendlyDatabaseSide = localSide;
    const enemyDatabaseSide = localSide === "host" ? "guest" : "host";
    const activeName = activeSide === friendlyDatabaseSide ? friendlyName : enemyName;
    const isLocalTurn = activeSide === localSide;
    const warnsBeforeEndingTurn = useSyncExternalStore(
        subscribeToEndTurnWarning,
        getEndTurnWarningSnapshot,
        getServerEndTurnWarningSnapshot,
    );

    const changeTurn = async (options) => {
        setIsUpdating(true);
        setTurnError("");

        try {
            await updateBattleTurn({ roomId, ...options });
        } catch (error) {
            setTurnError(error instanceof Error ? error.message : String(error));
        } finally {
            setIsUpdating(false);
        }
    };

    /** Confirms intentional turn completion when friendly ships still have weapons available. */
    const endTurn = () => {
        if (warnsBeforeEndingTurn && shipsThatCanFire > 0) {
            const shipLabel = shipsThatCanFire === 1 ? "ship still has" : "ships still have";
            const shouldEndTurn = window.confirm(
                `${shipsThatCanFire} ${shipLabel} weapons available to fire. End your turn anyway?`,
            );

            if (!shouldEndTurn) {
                return;
            }
        }

        changeTurn({ action: "advance" });
    };

    /** Clears fleet-wide Command-check outcomes without changing any ship trackers. */
    const resetLeadershipChecks = async () => {
        setIsResettingLeadership(true);
        setTurnError("");

        try {
            await onResetLeadershipChecks?.();
        } catch (error) {
            setTurnError(error instanceof Error ? error.message : String(error));
        } finally {
            setIsResettingLeadership(false);
        }
    };

    return (
        <section className="turn-counter turn-counter-compact" aria-labelledby="turn-counter-title">
            <span className="sr-only">Game turn</span>
            <h2 id="turn-counter-title">Round {round}</h2>
            {activeSide ? (
                <>
                    <strong>{isLocalTurn ? "Your turn" : `${activeName || "Opponent"}'s turn`}</strong>
                    <span className="sr-only">Movement, Shooting, Ordnance, then End phase.</span>
                    <button
                        type="button"
                        disabled={!isLocalTurn || isUpdating}
                        onClick={endTurn}
                    >
                        {isUpdating ? "Updating…" : isLocalTurn ? "End your turn" : "Waiting for opponent"}
                    </button>
                </>
            ) : (
                <>
                    <strong>Choose who takes the first turn</strong>
                    <small>The round advances after both fleets complete a turn.</small>
                    <div className="first-turn-actions">
                        <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => changeTurn({ action: "start", firstSide: friendlyDatabaseSide })}
                        >
                            {friendlyName || "Your fleet"}
                        </button>
                        <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => changeTurn({ action: "start", firstSide: enemyDatabaseSide })}
                        >
                            {enemyName || "Enemy fleet"}
                        </button>
                    </div>
                </>
            )}
            <button
                type="button"
                className="turn-counter-secondary-action"
                disabled={isResettingLeadership}
                onClick={resetLeadershipChecks}
            >
                {isResettingLeadership ? "Resetting…" : "Reset leadership checks"}
            </button>
            {turnError && <small className="turn-counter-error" role="alert">{turnError}</small>}
        </section>
    );
};

export default TurnCounter;
