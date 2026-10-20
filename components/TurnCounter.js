"use client";

import { useState } from "react";
import { updateBattleTurn } from "@/firebase/room-service";

/** Displays and advances the shared game round and active player turn. */
const TurnCounter = ({ roomId, turn, localSide, friendlyName, enemyName }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [turnError, setTurnError] = useState("");
    const round = turn?.round || 1;
    const activeSide = turn?.activeSide || "";
    const friendlyDatabaseSide = localSide;
    const enemyDatabaseSide = localSide === "host" ? "guest" : "host";
    const activeName = activeSide === friendlyDatabaseSide ? friendlyName : enemyName;
    const isLocalTurn = activeSide === localSide;

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
                        onClick={() => changeTurn({ action: "advance" })}
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
            {turnError && <small className="turn-counter-error" role="alert">{turnError}</small>}
        </section>
    );
};

export default TurnCounter;
