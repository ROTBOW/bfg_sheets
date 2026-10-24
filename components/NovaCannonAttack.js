"use client";

import { useState } from "react";
import {
    getNovaCannonHits,
    getNovaScatterDiceCount,
    novaCannonOutcomes,
    rollNovaScatter,
} from "@/lib/nova-cannon.mjs";
import { parseDiceResults, rollDice } from "@/lib/gunnery.mjs";

/** Resolves one Nova Cannon template and records every vessel caught beneath it. */
const NovaCannonAttack = ({ weapon, weaponIndex, attacker, target, targets, round, turnSide, onRecord, onClose }) => {
    const eligibleTargets = targets.map(({ vessel }) => vessel);
    const [distance, setDistance] = useState("");
    const [mode, setMode] = useState("digital");
    const [manualScatterResult, setManualScatterResult] = useState("hit");
    const [manualScatterAngle, setManualScatterAngle] = useState(0);
    const [manualRolls, setManualRolls] = useState("");
    const [result, setResult] = useState(null);
    const [selectedTargetIds, setSelectedTargetIds] = useState([target.id]);
    const [targetDetails, setTargetDetails] = useState({
        [target.id]: { outcome: "center", damage: 0 },
    });
    const [error, setError] = useState("");
    const [isRecording, setIsRecording] = useState(false);

    /** Resets the template coverage after resolving a new scatter roll. */
    const resetTargetCoverage = (resolvedResult) => {
        setSelectedTargetIds([target.id]);
        setTargetDetails({
            [target.id]: {
                outcome: "center",
                damage: getNovaCannonHits("center", resolvedResult.damageRoll),
            },
        });
    };

    /** Adds or removes one vessel from the final template coverage. */
    const toggleTarget = (targetId) => {
        setSelectedTargetIds((current) => (
            current.includes(targetId)
                ? current.filter((id) => id !== targetId)
                : [...current, targetId]
        ));
        setTargetDetails((current) => ({
            ...current,
            [targetId]: current[targetId] || {
                outcome: "outer",
                damage: result ? getNovaCannonHits("outer", result.damageRoll) : 0,
            },
        }));
    };

    /** Updates how one selected vessel intersects the Nova Cannon template. */
    const updateTargetDetail = (targetId, changes) => {
        setTargetDetails((current) => {
            const nextDetail = { ...current[targetId], ...changes };

            if (changes.outcome && result) {
                nextDetail.damage = getNovaCannonHits(changes.outcome, result.damageRoll);
            }

            return { ...current, [targetId]: nextDetail };
        });
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
        resetTargetCoverage(resolvedResult);
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
            resetTargetCoverage(resolvedResult);
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

        const selectedTargets = eligibleTargets.filter((candidate) => selectedTargetIds.includes(candidate.id));

        if (!selectedTargets.length) {
            setError("Choose at least one ship beneath the final template.");
            return;
        }

        const hasInvalidDamage = selectedTargets.some((selectedTarget) => {
            const detail = targetDetails[selectedTarget.id];
            const resolvedHits = getNovaCannonHits(detail.outcome, result.damageRoll);
            const recordedDamage = Number(detail.damage);

            return !Number.isInteger(recordedDamage) || recordedDamage < 0 || recordedDamage > resolvedHits;
        });

        if (hasInvalidDamage) {
            setError("Damage must be a whole number no greater than the hits for every selected ship.");
            return;
        }

        setIsRecording(true);
        setError("");

        try {
            await onRecord(selectedTargets.map((selectedTarget) => {
                const detail = targetDetails[selectedTarget.id];
                const resolvedHits = getNovaCannonHits(detail.outcome, result.damageRoll);

                return {
                    id: crypto.randomUUID(),
                    weaponIndex,
                    weaponName: weapon.name,
                    weaponType: weapon.type,
                    round,
                    turnSide,
                    targetShipId: selectedTarget.id,
                    targetName: selectedTarget.name,
                    direction: "closing",
                    mode,
                    rolls: [...result.scatterRolls, result.damageRoll],
                    shots: 1,
                    hits: resolvedHits,
                    damage: Number(detail.damage),
                    shieldBypassingDamage: 0,
                    accuracy: 1,
                    novaOutcome: detail.outcome,
                    scatterResult: result.result,
                    scatterAngle: result.angleDegrees,
                    scatterDistance: result.scatterDistance,
                    createdAt: Date.now(),
                };
            }));
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
                    <small>{attacker.name} → template area</small>
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
                    <p className="weapon-attack-note">
                        Select every ship beneath the final template and choose whether its base is under the centre or outer area.
                    </p>
                    <div className="star-pulse-targets">
                        {eligibleTargets.map((candidate) => {
                            const isSelected = selectedTargetIds.includes(candidate.id);
                            const detail = targetDetails[candidate.id] || { outcome: "outer", damage: 1 };
                            const resolvedHits = getNovaCannonHits(detail.outcome, result.damageRoll);

                            return (
                                <fieldset key={candidate.id}>
                                    <label className="star-pulse-target-toggle">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleTarget(candidate.id)}
                                        />
                                        <strong>{candidate.name}</strong>
                                    </label>
                                    {isSelected && (
                                        <div className="weapon-attack-fields">
                                            <label>
                                                Template area
                                                <select
                                                    value={detail.outcome}
                                                    onChange={(event) => updateTargetDetail(candidate.id, { outcome: event.target.value })}
                                                >
                                                    {novaCannonOutcomes.filter((option) => option.id !== "miss").map((option) => (
                                                        <option key={option.id} value={option.id}>{option.label}</option>
                                                    ))}
                                                </select>
                                            </label>
                                            <span><strong>{resolvedHits} hits</strong></span>
                                            <label>
                                                Damage inflicted
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={String(resolvedHits)}
                                                    step="1"
                                                    value={detail.damage}
                                                    onChange={(event) => updateTargetDetail(candidate.id, { damage: event.target.value })}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </fieldset>
                            );
                        })}
                    </div>
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
