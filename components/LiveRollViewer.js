"use client";

import { useEffect, useState } from "react";
import DiceTray from "@/components/DiceTray";
import { getLiveRollTimestamp } from "@/lib/live-roll.mjs";

/** Presents one local or remote weapon roll inside the shared dice tray. */
const LiveRollViewer = ({ liveRoll, localSide }) => {
    const [viewerOpenedAt] = useState(getLiveRollTimestamp);
    const [isExpired, setIsExpired] = useState(viewerOpenedAt >= liveRoll.expiresAt);
    const elapsedMs = Math.max(0, viewerOpenedAt - liveRoll.startedAt);
    const longestInitialRoll = Math.max(0, ...(liveRoll.initialDurations || []));
    const longestReroll = liveRoll.rerollDurations?.length
        ? 300 + Math.max(...liveRoll.rerollDurations)
        : 0;
    const revealAfter = Math.max(longestInitialRoll, longestReroll);
    const [isRolling, setIsRolling] = useState(elapsedMs < revealAfter);

    useEffect(() => {
        if (!isRolling) return undefined;

        const revealTimer = window.setTimeout(
            () => setIsRolling(false),
            Math.max(0, revealAfter - elapsedMs),
        );

        return () => window.clearTimeout(revealTimer);
    }, [elapsedMs, isRolling, revealAfter]);

    useEffect(() => {
        if (isExpired) return undefined;

        const expirationTimer = window.setTimeout(
            () => setIsExpired(true),
            Math.max(0, liveRoll.expiresAt - viewerOpenedAt),
        );

        return () => window.clearTimeout(expirationTimer);
    }, [isExpired, liveRoll.expiresAt, viewerOpenedAt]);

    if (isExpired) {
        return null;
    }

    const isLocalRoll = liveRoll.sourceSide === localSide;

    return (
        <div className="shared-dice-roll" aria-label={`${isLocalRoll ? "Your" : "Incoming"} fire from ${liveRoll.attackerName}`}>
            <header className="live-roll-heading">
                <div>
                    <span className="eyebrow">{isLocalRoll ? "YOUR ROLL" : "INCOMING FIRE"}</span>
                    <h2>{liveRoll.weaponName}</h2>
                    <small>{liveRoll.attackerName} → {liveRoll.targetName}</small>
                </div>
                <strong>{isRolling ? "ROLLING" : "RESOLVED"}</strong>
            </header>
            <div className="live-roll-content" role="status">
                <DiceTray
                    rolls={liveRoll.initialRolls || []}
                    hitThreshold={liveRoll.hitThreshold}
                    shieldBypassRoll={liveRoll.shieldBypassRoll || null}
                    label="Initial roll"
                    durations={liveRoll.initialDurations || []}
                    elapsedMs={elapsedMs}
                />
                <DiceTray
                    rolls={liveRoll.rerolls || []}
                    hitThreshold={liveRoll.hitThreshold}
                    shieldBypassRoll={liveRoll.shieldBypassRoll || null}
                    label="Lock On re-rolls"
                    isReroll
                    startDelay={300}
                    durations={liveRoll.rerollDurations || []}
                    elapsedMs={elapsedMs}
                />
                {!isRolling && (
                    <div className="live-roll-summary">
                        <strong>{liveRoll.hits} hit{liveRoll.hits === 1 ? "" : "s"}</strong>
                        {liveRoll.shieldBypassingHits > 0 && (
                            <span>
                                {liveRoll.shieldBypassingHits} bypass shield
                                {liveRoll.shieldBypassingHits === 1 ? "" : "s"}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveRollViewer;
