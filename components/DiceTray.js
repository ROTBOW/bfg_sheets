"use client";

import { useEffect, useState } from "react";

const dieFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

/** Displays one die cycling through faces before revealing its resolved result. */
const AnimatedDie = ({ roll, index, hitThreshold, shieldBypassRoll, startDelay }) => {
    const [prefersReducedMotion] = useState(() => (
        typeof window !== "undefined"
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ));
    const [displayedRoll, setDisplayedRoll] = useState(
        prefersReducedMotion ? roll : ((roll + index + 1) % 6) + 1,
    );
    const [hasLanded, setHasLanded] = useState(prefersReducedMotion);
    const [rollDuration] = useState(() => 1000 + Math.floor(Math.random() * 4001));

    useEffect(() => {
        if (prefersReducedMotion) return undefined;

        let faceInterval;
        let landingTimer;

        const startTimer = window.setTimeout(() => {
            faceInterval = window.setInterval(() => {
                setDisplayedRoll((currentRoll) => (currentRoll % 6) + 1);
            }, 90);

            landingTimer = window.setTimeout(() => {
                window.clearInterval(faceInterval);
                setDisplayedRoll(roll);
                setHasLanded(true);
            }, rollDuration);
        }, startDelay);

        return () => {
            window.clearTimeout(startTimer);
            window.clearTimeout(landingTimer);
            window.clearInterval(faceInterval);
        };
    }, [prefersReducedMotion, roll, rollDuration, startDelay]);

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
    shieldBypassRoll = null,
    label = "Attack roll",
    isReroll = false,
    startDelay = 0,
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
                        hitThreshold={hitThreshold}
                        shieldBypassRoll={shieldBypassRoll}
                        startDelay={startDelay}
                    />
                ))}
            </div>
        </div>
    );
};

export default DiceTray;
