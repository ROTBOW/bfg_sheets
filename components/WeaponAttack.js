"use client";

import { useState, useSyncExternalStore } from "react";
import NovaCannonAttack from "@/components/NovaCannonAttack";
import {
    getWeaponAttackProfile,
    gunneryDirections,
    parseDiceResults,
    resolveWeaponRolls,
    rollDice,
} from "@/lib/gunnery.mjs";

const subscribeToDistanceControl = (onChange) => {
    window.addEventListener("distancecontrolchange", onChange);

    return () => window.removeEventListener("distancecontrolchange", onChange);
};

const getDistanceControlSnapshot = () =>
    document.documentElement.dataset.distanceControl === "slider";
const getServerDistanceControlSnapshot = () => false;

/** Resolves and records one standard weapon firing at the selected enemy vessel. */
const StandardWeaponAttack = ({ weapon, weaponIndex, attacker, target, targetShip, round, turnSide, onRecord, onClose }) => {
    const [direction, setDirection] = useState("closing");
    const [distance, setDistance] = useState("");
    const initialAttackProfile = getWeaponAttackProfile(weapon, targetShip, "closing");
    const [mode, setMode] = useState(initialAttackProfile.supportsDigitalRoll ? "digital" : "manual");
    const [manualRolls, setManualRolls] = useState("");
    const [manualHits, setManualHits] = useState(0);
    const [damage, setDamage] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const usesDistanceSlider = useSyncExternalStore(
        subscribeToDistanceControl,
        getDistanceControlSnapshot,
        getServerDistanceControlSnapshot,
    );
    const displayedDistance = usesDistanceSlider && distance === "" ? 5 : distance;
    const distanceCm = displayedDistance === "" ? null : Number(displayedDistance);
    const attackProfile = getWeaponAttackProfile(weapon, targetShip, direction, distanceCm);
    const { supportsDigitalRoll, diceCount, hitThreshold } = attackProfile;

    const resolveRolls = (rolls) => {
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
        setDamage(hits);
        setError("");
    };

    const rollAttack = () => {
        resolveRolls(rollDice(diceCount));
    };

    const usePhysicalRoll = () => {
        try {
            resolveRolls(parseDiceResults(manualRolls));
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
        <section className="weapon-attack" aria-label={`Fire ${weapon.name}`}>
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
                    Target direction
                    <select value={direction} onChange={(event) => { setDirection(event.target.value); setResult(null); }}>
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
            {result && (
                <div className="weapon-result" role="status">
                    <span>Rolls: {result.rolls.join(", ")}</span>
                    <strong>{result.hits} hits</strong>
                    {result.shieldBypassingHits > 0 && (
                        <span>{result.shieldBypassingHits} bypass shields</span>
                    )}
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
                </div>
            )}
            {error && <p className="weapon-attack-error" role="alert">{error}</p>}
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
