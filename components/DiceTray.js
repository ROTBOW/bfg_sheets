"use client";

import { useEffect, useState } from "react";

const dieFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

/** Displays one die cycling through faces before revealing its resolved result. */
const AnimatedDie = ({ roll, index, hitThreshold, shieldBypassRoll, startDelay, duration, elapsedMs }) => {
    const landingDelay = Math.max(0, startDelay + duration - elapsedMs);
    const hasAlreadyLanded = landingDelay === 0;
    const [prefersReducedMotion] = useState(() => (
        typeof window !== "undefined"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ));
    const [displayedRoll, setDisplayedRoll] = useState(
        prefersReducedMotion || hasAlreadyLanded ? roll : ((roll + index + 1) % 6) + 1,
    );
    const [hasLanded, setHasLanded] = useState(prefersReducedMotion || hasAlreadyLanded);

    useEffect(() => {
        if (prefersReducedMotion || hasAlreadyLanded) return undefined;

        let faceInterval;
        let landingTimer;

        const remainingStartDelay = Math.max(0, startDelay - elapsedMs);
        const remainingRollDuration = Math.max(0, landingDelay - remainingStartDelay);
        const startTimer = window.setTimeout(() => {
            faceInterval = window.setInterval(() => {
                setDisplayedRoll((currentRoll) => (currentRoll % 6) + 1);
            }, 90);

            landingTimer = window.setTimeout(() => {
                window.clearInterval(faceInterval);
                setDisplayedRoll(roll);
                setHasLanded(true);
            }, remainingRollDuration);
        }, remainingStartDelay);

        return () => {
            window.clearTimeout(startTimer);
            window.clearTimeout(landingTimer);
            window.clearInterval(faceInterval);
        };
    }, [elapsedMs, hasAlreadyLanded, landingDelay, prefersReducedMotion, roll, startDelay]);

    const isHit = hasLanded && Number.isInteger(hitThreshold) && roll >= hitThreshold;
    const bypassesShields = hasLanded
        && Number.isInteger(shieldBypassRoll)
        && roll >= shieldBypassRoll;
    const resultClass = !hasLanded
        ? "die-rolling"
        : bypassesShields
            ? "die-bypass"
            : isHit
                ? "die-hit"
                : "die-miss";

    return (
        <span className={`die ${resultClass}`} aria-hidden="true">
            {dieFaces[displayedRoll - 1]}
        </span>
    );
};

/**
 * Displays resolved D6 rolls with staggered hit, miss, and shield-bypass states.
 * The supplied rolls must contain integers from 1 through 6.
 */
const DiceTray = ({
    rolls,
    hitThreshold,
    hitThresholds = [],
    shieldBypassRoll = null,
    label = "Attack roll",
    isReroll = false,
    startDelay = 0,
    durations = [],
    elapsedMs = 0,
}) => {
    if (!rolls.length) return null;

    return (
        <div className={`dice-group ${isReroll ? "dice-group-reroll" : ""}`}>
            <span className="dice-group-label">
                {isReroll && <span aria-hidden="true">↻ </span>}
                {label}
            </span>
            <div className="dice-tray" aria-label={`${label}: ${rolls.join(", ")}`}>
                {rolls.map((roll, index) => (
                    <AnimatedDie
                        key={`${index}-${roll}`}
                        roll={roll}
                        index={index}
                        hitThreshold={hitThresholds[index] ?? hitThreshold}
                        shieldBypassRoll={shieldBypassRoll}
                        startDelay={startDelay}
                        duration={durations[index] || 1000}
                        elapsedMs={elapsedMs}
                    />
                ))}
            </div>
        </div>
    );
};

export default DiceTray;
