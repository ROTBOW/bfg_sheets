"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import NovaCannonAttack from "@/components/NovaCannonAttack";
import {
    getWeaponAttackProfile,
    gunneryDirections,
    parseDiceResults,
    resolveWeaponRolls,
    rollDice,
} from "@/lib/gunnery.mjs";
import { getLightningArcAvailability } from "@/lib/lightning-arc.mjs";
import { getLiveRollTimestamp } from "@/lib/live-roll.mjs";
import { canLockOnReroll, getOrderedWeaponStrength } from "@/lib/special-orders.mjs";

const subscribeToDistanceControl = (onChange) => {
    window.addEventListener("distancecontrolchange", onChange);

    return () => window.removeEventListener("distancecontrolchange", onChange);
};

const getDistanceControlSnapshot = () =>
    document.documentElement.dataset.distanceControl === "slider";
const getServerDistanceControlSnapshot = () => false;

/** Resolves and records one standard weapon firing at the selected enemy vessel. */
const StandardWeaponAttack = ({ weapon, weaponIndex, attacker, target, targetShip, weaponFire = [], order, round, turnSide, onRoll, onClearRoll, onRecord, onClose }) => {
    const [direction, setDirection] = useState("closing");
    const [distance, setDistance] = useState("");
    const isLightningArc = weapon.type === "Lightning arc";
    const lightningAvailability = isLightningArc
        ? getLightningArcAvailability({ weapon, weaponIndex, weaponFire, round, turnSide })
        : null;
    const [fireArc, setFireArc] = useState(lightningAvailability?.availableArcs[0]?.id || "");
    const [allocatedStrength, setAllocatedStrength] = useState(lightningAvailability?.remainingStrength || weapon.strength);
    const orderedStrength = getOrderedWeaponStrength(weapon, order);
    const effectiveWeapon = {
        ...weapon,
        strength: isLightningArc
            ? Math.min(Number(allocatedStrength), orderedStrength)
            : orderedStrength,
    };
    const initialAttackProfile = getWeaponAttackProfile(effectiveWeapon, targetShip, "closing");
    const [mode, setMode] = useState(initialAttackProfile.supportsDigitalRoll ? "digital" : "manual");
    const [manualRolls, setManualRolls] = useState("");
    const [manualRerolls, setManualRerolls] = useState("");
    const [manualHits, setManualHits] = useState(0);
    const [damage, setDamage] = useState(0);
    const [result, setResult] = useState(null);
    const [rollSequence, setRollSequence] = useState(0);
    const [isRolling, setIsRolling] = useState(false);
    const [rollRevealDelay, setRollRevealDelay] = useState(0);
    const [error, setError] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const usesDistanceSlider = useSyncExternalStore(
        subscribeToDistanceControl,
        getDistanceControlSnapshot,
        getServerDistanceControlSnapshot,
    );
    const displayedDistance = usesDistanceSlider && distance === "" ? 5 : distance;
    const distanceCm = displayedDistance === "" ? null : Number(displayedDistance);
    const attackProfile = getWeaponAttackProfile(effectiveWeapon, targetShip, direction, distanceCm);
    const { supportsDigitalRoll, diceCount, hitThreshold } = attackProfile;

    useEffect(() => {
        if (!isRolling) return undefined;

        const revealTimer = window.setTimeout(() => setIsRolling(false), rollRevealDelay);

        return () => window.clearTimeout(revealTimer);
    }, [isRolling, rollRevealDelay, rollSequence]);

    /** Creates stable per-die animation timings that can be shared with the opponent. */
    const createRollDurations = (count) => (
        Array.from({ length: count }, () => 1000 + Math.floor(Math.random() * 4001))
    );

    const resolveRolls = (rolls, presentationRolls = rolls, presentationRerolls = [], startedAt) => {
        if (
            isLightningArc
            && (!Number.isInteger(Number(allocatedStrength))
                || Number(allocatedStrength) < 1
                || Number(allocatedStrength) > lightningAvailability.remainingStrength)
        ) {
            setError(`Allocate 1–${lightningAvailability.remainingStrength} Firepower to this arc.`);
            return;
        }

        if (isLightningArc && !lightningAvailability.availableArcs.some((arc) => arc.id === fireArc)) {
            setError("Choose an unused firing arc.");
            return;
        }

        if (!Number.isFinite(distanceCm) || distanceCm <= 0) {
            setError("Enter the distance to the target before resolving the attack.");
            return;
        }

        if (Number.isFinite(weapon.rangeCm) && distanceCm > weapon.rangeCm) {
            setError(`${weapon.name} is out of range (${weapon.rangeCm} cm).`);
            return;
        }

        const resolvedAttack = supportsDigitalRoll
            ? resolveWeaponRolls(rolls, attackProfile)
            : { hits: Number(manualHits), shieldBypassingHits: 0 };
        const { hits } = resolvedAttack;

        if (!Number.isInteger(hits) || hits < 0 || hits > rolls.length) {
            setError("Resolved hits must be a whole number no greater than the dice entered.");
            return;
        }

        const nextRollSequence = rollSequence + 1;
        const nextInitialDurations = createRollDurations(presentationRolls.length);
        const nextRerollDurations = createRollDurations(presentationRerolls.length);
        const longestInitialRoll = Math.max(0, ...nextInitialDurations);
        const longestReroll = nextRerollDurations.length
            ? 300 + Math.max(...nextRerollDurations)
            : 0;
        const liveRoll = {
            id: crypto.randomUUID(),
            sourceSide: turnSide,
            attackerId: attacker.id,
            attackerName: attacker.name,
            targetId: target.id,
            targetName: target.name,
            weaponName: weapon.name,
            initialRolls: presentationRolls,
            rerolls: presentationRerolls,
            initialDurations: nextInitialDurations,
            rerollDurations: nextRerollDurations,
            hitThreshold,
            shieldBypassRoll: attackProfile.shieldBypassRoll || 0,
            hits: resolvedAttack.hits,
            shieldBypassingHits: resolvedAttack.shieldBypassingHits,
            startedAt,
            expiresAt: startedAt + 15000,
        };

        setResult({ rolls, ...resolvedAttack });
        setRollSequence(nextRollSequence);
        setIsRolling(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        setRollRevealDelay(Math.max(longestInitialRoll, longestReroll));
        setDamage(hits);
        setError("");
        Promise.resolve(onRoll?.(liveRoll)).catch(() => {
            setError("The roll was resolved locally but could not be shown to your opponent.");
        });
    };

    const rollAttack = () => {
        const rolledDice = rollDice(diceCount);
        const startedAt = getLiveRollTimestamp();

        if (!canLockOnReroll(weapon, order)) {
            resolveRolls(rolledDice, rolledDice, [], startedAt);
            return;
        }

        const successfulRolls = rolledDice.filter((roll) => roll >= hitThreshold);
        const failedRolls = rolledDice.filter((roll) => roll < hitThreshold);
        const replacementRolls = rollDice(failedRolls.length);

        resolveRolls([...successfulRolls, ...replacementRolls], rolledDice, replacementRolls, startedAt);
    };

    const usePhysicalRoll = () => {
        try {
            const enteredRolls = parseDiceResults(manualRolls);
            const startedAt = getLiveRollTimestamp();

            if (!canLockOnReroll(weapon, order)) {
                resolveRolls(enteredRolls, enteredRolls, [], startedAt);
                return;
            }

            const successfulRolls = enteredRolls.filter((roll) => roll >= hitThreshold);
            const failedRolls = enteredRolls.filter((roll) => roll < hitThreshold);
            const replacementRolls = failedRolls.length ? parseDiceResults(manualRerolls) : [];

            if (replacementRolls.length !== failedRolls.length) {
                throw new Error(`Enter exactly ${failedRolls.length} Lock On re-roll result${failedRolls.length === 1 ? "" : "s"}.`);
            }

            resolveRolls([...successfulRolls, ...replacementRolls], enteredRolls, replacementRolls, startedAt);
        } catch (rollError) {
            setError(rollError instanceof Error ? rollError.message : String(rollError));
        }
    };

    const recordAttack = async () => {
        if (!result) {
            setError("Roll the attack or enter the physical dice before recording it.");
            return;
        }

        const shots = result.rolls.length;
        const recordedDamage = Number(damage);

        if (!Number.isInteger(recordedDamage) || recordedDamage < 0 || recordedDamage > 100) {
            setError("Damage must be a whole number from 0 to 100.");
            return;
        }

        setIsRecording(true);
        setError("");

        try {
            await Promise.resolve(onClearRoll?.()).catch(() => {});
            await onRecord({
                id: crypto.randomUUID(),
                weaponIndex,
                weaponName: weapon.name,
                weaponType: weapon.type,
                round,
                turnSide,
                targetShipId: target.id,
                targetName: target.name,
                direction,
                ...(isLightningArc ? {
                    fireArc,
                    allocatedStrength: Number(allocatedStrength),
                } : {}),
                mode,
                rolls: result.rolls,
                shots,
                hits: result.hits,
                damage: recordedDamage,
                shieldBypassingDamage: Math.min(result.shieldBypassingHits, recordedDamage),
                accuracy: shots ? result.hits / shots : 0,
                createdAt: Date.now(),
            });
        } catch {
            setError("Damage could not be sent to your opponent. Check your connection and try again.");
            setIsRecording(false);
        }
    };

    /** Closes the firing workspace and removes any uncommitted shared roll. */
    const closeAttack = () => {
        Promise.resolve(onClearRoll?.()).catch(() => {});
        onClose();
    };

    return (
        <section className="weapon-attack" aria-label={`Fire ${weapon.name}`}>
                <div className="weapon-attack-heading">
                    <div>
                        <span className="eyebrow">FIRE WEAPON</span>
                        <h3>{weapon.name}</h3>
                        <small>{attacker.name} → {target.name}</small>
                    </div>
                    <button type="button" onClick={closeAttack} aria-label="Close weapon attack">×</button>
                </div>
                <div className="weapon-attack-fields">
                    <label>
                        Distance to target (cm)
                        <input
                            type={usesDistanceSlider ? "range" : "number"}
                            min={usesDistanceSlider ? "5" : "1"}
                            max={usesDistanceSlider ? String(weapon.rangeCm || 120) : undefined}
                            step={usesDistanceSlider ? "5" : "1"}
                            value={displayedDistance}
                            onChange={(event) => {
                                setDistance(event.target.value);
                                setResult(null);
                            }}
                        />
                        {usesDistanceSlider && <output>{displayedDistance} cm</output>}
                    </label>
                    <label>
                        Target aspect
                        <select
                            value={direction}
                            onChange={(event) => {
                                setDirection(event.target.value);
                                setResult(null);
                            }}
                        >
                            {gunneryDirections.map((option) => (
                                <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Dice method
                        <select value={mode} onChange={(event) => { setMode(event.target.value); setResult(null); }}>
                            {supportsDigitalRoll && <option value="digital">Roll digitally</option>}
                            <option value="manual">Enter physical dice</option>
                        </select>
                    </label>
                </div>
                <p className="weapon-attack-note">{attackProfile.note}</p>
                {canLockOnReroll(weapon, order) && (
                    <p className="weapon-attack-note">Lock On re-rolls failed hit rolls.</p>
                )}
                {isLightningArc && (
                    <div className="lightning-allocation">
                        <p>
                            <strong>{lightningAvailability.remainingStrength}</strong> Firepower remaining.
                            Each firing arc and target may be used once this turn.
                        </p>
                        <label>
                            Firing arc
                            <select value={fireArc} onChange={(event) => { setFireArc(event.target.value); setResult(null); }}>
                                {lightningAvailability.availableArcs.map((arc) => (
                                    <option key={arc.id} value={arc.id}>{arc.label}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Firepower allocated
                            <input
                                type="number"
                                min="1"
                                max={lightningAvailability.remainingStrength}
                                step="1"
                                value={allocatedStrength}
                                onChange={(event) => { setAllocatedStrength(event.target.value); setResult(null); }}
                            />
                        </label>
                    </div>
                )}
                {mode === "digital" && supportsDigitalRoll ? (
                    <button
                        type="button"
                        className="weapon-roll-button"
                        disabled={isRolling}
                        onClick={rollAttack}
                    >
                        {isRolling ? "Resolving salvo…" : `Roll ${diceCount}D6 · hits on ${hitThreshold}+`}
                    </button>
                ) : (
                    <div className="physical-roll-fields">
                    <label>
                        D6 results
                        <input value={manualRolls} placeholder="6, 4, 2" onChange={(event) => setManualRolls(event.target.value)} />
                    </label>
                    {canLockOnReroll(weapon, order) && (
                        <label>
                            Failed-die re-rolls
                            <input
                                value={manualRerolls}
                                placeholder="Enter one result per failed die"
                                onChange={(event) => setManualRerolls(event.target.value)}
                            />
                        </label>
                    )}
                    {!supportsDigitalRoll && (
                        <label>
                            Resolved hits
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={manualHits}
                                onChange={(event) => setManualHits(event.target.value)}
                            />
                        </label>
                    )}
                    <button type="button" disabled={isRolling} onClick={usePhysicalRoll}>Use entered roll</button>
                    </div>
                )}
                {error && <p className="weapon-attack-error" role="alert">{error}</p>}
            {result && (
                <div className="weapon-result" role="status">
                    {isRolling ? (
                        <p className="weapon-result-resolving">Resolving salvo…</p>
                    ) : (
                        <>
                            <div className="weapon-result-summary">
                                <strong>{result.hits} hit{result.hits === 1 ? "" : "s"}</strong>
                                {result.shieldBypassingHits > 0 && (
                                    <span>{result.shieldBypassingHits} bypass shield{result.shieldBypassingHits === 1 ? "" : "s"}</span>
                                )}
                            </div>
                            <label>
                                Damage inflicted
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={damage}
                                    onChange={(event) => setDamage(event.target.value)}
                                />
                            </label>
                            <button type="button" disabled={isRecording} onClick={recordAttack}>
                                {isRecording ? "Sending damage…" : "Record firing"}
                            </button>
                        </>
                    )}
                </div>
            )}
        </section>
    );
};

/** Selects the rules-specific firing controls for the chosen weapon. */
const WeaponAttack = (props) => {
    if (props.weapon.type === "Nova Cannon") {
        return <NovaCannonAttack {...props} />;
    }

    return <StandardWeaponAttack {...props} />;
};

export default WeaponAttack;
