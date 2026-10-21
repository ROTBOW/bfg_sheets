"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import DiceTray from "@/components/DiceTray";
import NovaCannonAttack from "@/components/NovaCannonAttack";
import {
    getWeaponAttackProfile,
    gunneryDirections,
    parseDiceResults,
    resolveWeaponRolls,
    rollDice,
} from "@/lib/gunnery.mjs";
import { getLightningArcAvailability } from "@/lib/lightning-arc.mjs";
import { canLockOnReroll, getOrderedWeaponStrength } from "@/lib/special-orders.mjs";

const subscribeToDistanceControl = (onChange) => {
    window.addEventListener("distancecontrolchange", onChange);

    return () => window.removeEventListener("distancecontrolchange", onChange);
};

const getDistanceControlSnapshot = () =>
    document.documentElement.dataset.distanceControl === "slider";
const getServerDistanceControlSnapshot = () => false;

/** Resolves and records one standard weapon firing at the selected enemy vessel. */
const StandardWeaponAttack = ({ weapon, weaponIndex, attacker, target, targetShip, weaponFire = [], order, round, turnSide, onRecord, onClose }) => {
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
    const [initialRolls, setInitialRolls] = useState([]);
    const [rerolledMisses, setRerolledMisses] = useState([]);
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

        const revealTimer = window.setTimeout(() => setIsRolling(false), 5500);

        return () => window.clearTimeout(revealTimer);
    }, [isRolling, rollSequence]);

    const resolveRolls = (rolls) => {
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

        setResult({ rolls, ...resolvedAttack });
        setRollSequence((sequence) => sequence + 1);
        setIsRolling(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        setDamage(hits);
        setError("");
    };

    const rollAttack = () => {
        const rolledDice = rollDice(diceCount);

        setInitialRolls(rolledDice);

        if (!canLockOnReroll(weapon, order)) {
            setRerolledMisses([]);
            resolveRolls(rolledDice);
            return;
        }

        const successfulRolls = rolledDice.filter((roll) => roll >= hitThreshold);
        const failedRolls = rolledDice.filter((roll) => roll < hitThreshold);
        const replacementRolls = rollDice(failedRolls.length);

        setRerolledMisses(replacementRolls);
        resolveRolls([...successfulRolls, ...replacementRolls]);
    };

    const usePhysicalRoll = () => {
        try {
            const enteredRolls = parseDiceResults(manualRolls);

            setInitialRolls(enteredRolls);

            if (!canLockOnReroll(weapon, order)) {
                setRerolledMisses([]);
                resolveRolls(enteredRolls);
                return;
            }

            const successfulRolls = enteredRolls.filter((roll) => roll >= hitThreshold);
            const failedRolls = enteredRolls.filter((roll) => roll < hitThreshold);
            const replacementRolls = failedRolls.length ? parseDiceResults(manualRerolls) : [];

            if (replacementRolls.length !== failedRolls.length) {
                throw new Error(`Enter exactly ${failedRolls.length} Lock On re-roll result${failedRolls.length === 1 ? "" : "s"}.`);
            }

            setRerolledMisses(replacementRolls);
            resolveRolls([...successfulRolls, ...replacementRolls]);
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

    return (
        <section className="weapon-attack weapon-attack-standard" aria-label={`Fire ${weapon.name}`}>
            <div className="weapon-attack-controls">
                <div className="weapon-attack-heading">
                    <div>
                        <span className="eyebrow">FIRE WEAPON</span>
                        <h3>{weapon.name}</h3>
                        <small>{attacker.name} → {target.name}</small>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close weapon attack">×</button>
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
                    <button type="button" className="weapon-roll-button" onClick={rollAttack}>
                        Roll {diceCount}D6 · hits on {hitThreshold}+
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
                    <button type="button" onClick={usePhysicalRoll}>Use entered roll</button>
                    </div>
                )}
                {error && <p className="weapon-attack-error" role="alert">{error}</p>}
            </div>
            <div className="weapon-roll-stage">
                {result ? (
                    <div className="weapon-result" role="status">
                    <div key={rollSequence} className="weapon-dice-display">
                        <DiceTray
                            rolls={initialRolls}
                            hitThreshold={hitThreshold}
                            shieldBypassRoll={attackProfile.shieldBypassRoll}
                            label="Initial roll"
                        />
                        <DiceTray
                            rolls={rerolledMisses}
                            hitThreshold={hitThreshold}
                            shieldBypassRoll={attackProfile.shieldBypassRoll}
                            label="Lock On re-rolls"
                            isReroll
                            startDelay={300}
                        />
                    </div>
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
                ) : (
                    <div className="weapon-roll-awaiting" aria-hidden="true">
                        <span className="eyebrow">DICE TRAY</span>
                        <strong>Awaiting firing solution</strong>
                        <small>Resolved dice will appear here.</small>
                    </div>
                )}
            </div>
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
