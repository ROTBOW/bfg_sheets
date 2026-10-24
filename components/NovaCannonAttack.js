"use client";

import { useState } from "react";
import {
    getNovaCannonHits,
    getNovaScatterDiceCount,
    novaCannonOutcomes,
    rollNovaScatter,
} from "@/lib/nova-cannon.mjs";
import { parseDiceResults, rollDice } from "@/lib/gunnery.mjs";

/** Resolves template scatter and records one Nova Cannon shot. */
const NovaCannonAttack = ({ weapon, weaponIndex, attacker, target, round, turnSide, onRecord, onClose }) => {
    const [distance, setDistance] = useState("");
    const [mode, setMode] = useState("digital");
    const [manualScatterResult, setManualScatterResult] = useState("hit");
    const [manualScatterAngle, setManualScatterAngle] = useState(0);
    const [manualRolls, setManualRolls] = useState("");
    const [result, setResult] = useState(null);
    const [outcome, setOutcome] = useState("miss");
    const [damage, setDamage] = useState(0);
    const [error, setError] = useState("");
    const [isRecording, setIsRecording] = useState(false);

    /** Applies the selected template outcome to a resolved scatter result. */
    const updateOutcome = (nextOutcome, resolvedResult = result) => {
        setOutcome(nextOutcome);

        if (resolvedResult) {
            setDamage(getNovaCannonHits(nextOutcome, resolvedResult.damageRoll));
        }
    };

    /** Validates range and returns the required scatter-distance dice count. */
    const getScatterDiceCount = () => {
        try {
            return getNovaScatterDiceCount(Number(distance));
        } catch (rangeError) {
            setError(rangeError instanceof Error ? rangeError.message : String(rangeError));
            return null;
        }
    };

    const rollAttack = () => {
        const scatterDiceCount = getScatterDiceCount();
        if (scatterDiceCount === null) return;

        const scatter = rollNovaScatter();
        const scatterRolls = rollDice(scatterDiceCount);
        const damageRoll = rollDice(1)[0];
        const resolvedResult = {
            ...scatter,
            scatterRolls,
            scatterDistance: scatter.result === "hit"
                ? 0
                : scatterRolls.reduce((total, roll) => total + roll, 0),
            damageRoll,
        };

        setResult(resolvedResult);
        setOutcome("miss");
        setDamage(0);
        setError("");
    };

    const usePhysicalRoll = () => {
        const scatterDiceCount = getScatterDiceCount();
        if (scatterDiceCount === null) return;

        try {
            const rolls = parseDiceResults(manualRolls);
            const expectedRollCount = scatterDiceCount + 1;

            if (rolls.length !== expectedRollCount) {
                throw new Error(`Enter ${scatterDiceCount} scatter dice and then the D6 damage roll.`);
            }

            const scatterRolls = rolls.slice(0, scatterDiceCount);
            const scatterAngle = Number(manualScatterAngle);

            if (
                manualScatterResult === "arrow"
                && (!Number.isInteger(scatterAngle) || scatterAngle < 0 || scatterAngle > 359)
            ) {
                throw new Error("Enter an arrow angle from 0 to 359 degrees.");
            }

            const resolvedResult = {
                result: manualScatterResult,
                angleDegrees: manualScatterResult === "arrow" ? scatterAngle : null,
                scatterRolls,
                scatterDistance: manualScatterResult === "hit"
                    ? 0
                    : scatterRolls.reduce((total, roll) => total + roll, 0),
                damageRoll: rolls.at(-1),
            };

            setResult(resolvedResult);
            setOutcome("miss");
            setDamage(0);
            setError("");
        } catch (rollError) {
            setError(rollError instanceof Error ? rollError.message : String(rollError));
        }
    };

    const recordAttack = async () => {
        if (!result) {
            setError("Resolve the scatter before recording this shot.");
            return;
        }

        const recordedDamage = Number(damage);
        const resolvedHits = getNovaCannonHits(outcome, result.damageRoll);

        if (!Number.isInteger(recordedDamage) || recordedDamage < 0 || recordedDamage > resolvedHits) {
            setError(`Damage must be a whole number from 0 to ${resolvedHits}.`);
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
                direction: "closing",
                mode,
                rolls: [...result.scatterRolls, result.damageRoll],
                shots: 1,
                hits: resolvedHits,
                damage: recordedDamage,
                shieldBypassingDamage: 0,
                accuracy: outcome === "miss" ? 0 : 1,
                novaOutcome: outcome,
                scatterResult: result.result,
                scatterAngle: result.angleDegrees,
                scatterDistance: result.scatterDistance,
                createdAt: Date.now(),
            });
        } catch (error) {
            console.error("Failed to record Nova Cannon attack.", error);
            setError("Damage could not be sent to your opponent. Check your connection and try again.");
            setIsRecording(false);
        }
    };

    return (
        <section className="weapon-attack" aria-label={`Fire ${weapon.name}`}>
            <div className="weapon-attack-heading">
                <div>
                    <span className="eyebrow">FIRE NOVA CANNON</span>
                    <h3>{weapon.name}</h3>
                    <small>{attacker.name} → {target.name}</small>
                </div>
                <button type="button" onClick={onClose} aria-label="Close weapon attack">×</button>
            </div>
            <div className="weapon-attack-fields">
                <label>
                    Template range (cm)
                    <input
                        type="number"
                        min="30"
                        max="150"
                        step="1"
                        value={distance}
                        onChange={(event) => {
                            setDistance(event.target.value);
                            setResult(null);
                        }}
                    />
                </label>
                <label>
                    Dice method
                    <select
                        value={mode}
                        onChange={(event) => {
                            setMode(event.target.value);
                            setResult(null);
                        }}
                    >
                        <option value="digital">Roll digitally</option>
                        <option value="manual">Enter physical dice</option>
                    </select>
                </label>
            </div>
            <p className="weapon-attack-note">
                Place the 5 cm template 30–150 cm away. Scatter 1D6 below 45 cm, 2D6 from 45–60 cm,
                or 3D6 beyond 60 cm; the centre causes D6 hits and the outer template causes one.
            </p>
            {mode === "digital" ? (
                <button type="button" className="weapon-roll-button" onClick={rollAttack}>
                    Roll scatter and damage
                </button>
            ) : (
                <div className="physical-roll-fields">
                    <label>
                        Scatter die
                        <select value={manualScatterResult} onChange={(event) => setManualScatterResult(event.target.value)}>
                            <option value="hit">Hit</option>
                            <option value="arrow">Arrow</option>
                        </select>
                    </label>
                    {manualScatterResult === "arrow" && (
                        <label>
                            Arrow angle (degrees)
                            <input
                                type="number"
                                min="0"
                                max="359"
                                step="1"
                                value={manualScatterAngle}
                                onChange={(event) => setManualScatterAngle(event.target.value)}
                            />
                        </label>
                    )}
                    <label>
                        Scatter dice, then damage D6
                        <input
                            value={manualRolls}
                            placeholder="4, 2, 6"
                            onChange={(event) => setManualRolls(event.target.value)}
                        />
                    </label>
                    <button type="button" onClick={usePhysicalRoll}>Use entered roll</button>
                </div>
            )}
            {result && (
                <div className="weapon-result" role="status">
                    <span>
                        Scatter: {result.result === "hit"
                            ? "Hit — no movement"
                            : `${result.scatterDistance} cm at ${result.angleDegrees}°`}
                    </span>
                    <span>Damage roll: {result.damageRoll}</span>
                    <label>
                        Final template position
                        <select value={outcome} onChange={(event) => updateOutcome(event.target.value)}>
                            {novaCannonOutcomes.map((option) => (
                                <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    <strong>{getNovaCannonHits(outcome, result.damageRoll)} hits</strong>
                    <label>
                        Damage inflicted
                        <input
                            type="number"
                            min="0"
                            max={String(getNovaCannonHits(outcome, result.damageRoll))}
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

export default NovaCannonAttack;
