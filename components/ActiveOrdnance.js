"use client";

import { useState } from "react";
import DiceTray from "@/components/DiceTray";
import { createRollDurations, getLiveRollTimestamp } from "@/lib/live-roll.mjs";
import { resolveOrdnanceHit } from "@/lib/ordnance.mjs";

/** Resolves turret defence and the surviving ordnance's attack against one ship. */
const ActiveOrdnanceAttack = ({ ordnance, target, turnSide, onResolve, onRoll, onClearRoll, onClose }) => {
    const [result, setResult] = useState(null);
    const [supportingShips, setSupportingShips] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState("");
    const targetTurrets = target.ship.stats.turrets;
    const targetArmour = Math.min(
        Number.parseInt(target.ship.stats.armour.front, 10),
        Number.parseInt(target.ship.stats.armour.other, 10),
    );
    const isTorpedo = ordnance.weaponType === "Torpedo";

    const rollAttack = () => {
        const resolved = resolveOrdnanceHit({
            weaponType: ordnance.weaponType,
            strength: ordnance.strength,
            turrets: targetTurrets,
            armour: targetArmour,
            supportingShips,
        });
        const startedAt = getLiveRollTimestamp();

        setResult(resolved);
        setError("");

        if (resolved.attackRolls.length) {
            Promise.resolve(onRoll?.({
                id: crypto.randomUUID(),
                kind: "weapon",
                sourceSide: turnSide,
                attackerId: ordnance.attackerId,
                attackerName: ordnance.attackerName,
                targetId: target.vessel.id,
                targetName: target.vessel.name,
                weaponName: ordnance.weaponName,
                initialRolls: resolved.attackRolls,
                rerolls: [],
                initialDurations: createRollDurations(resolved.attackRolls.length),
                rerollDurations: [],
                hitThreshold: targetArmour,
                hitThresholds: [],
                shieldBypassRoll: targetArmour,
                hits: resolved.damage,
                shieldBypassingHits: resolved.damage,
                startedAt,
                expiresAt: startedAt + 15000,
            })).catch((error) => {
                console.error("Failed to share ordnance attack roll.", error);
                setError("The attack was resolved locally but could not be shown to your opponent.");
            });
        }
    };

    const recordAttack = async () => {
        setIsRecording(true);
        setError("");

        try {
            await Promise.resolve(onClearRoll?.()).catch(() => {});
            await onResolve({
                targetShipId: target.vessel.id,
                targetName: target.vessel.name,
                damage: result.damage,
                shieldBypassingDamage: result.damage,
                remainingStrength: result.remainingStrength,
            });
            onClose();
        } catch (error) {
            console.error("Failed to record ordnance attack.", error);
            setError("The ordnance result could not be recorded. Check your connection and try again.");
            setIsRecording(false);
        }
    };

    return (
        <section className="ordnance-attack" aria-label={`Resolve ${ordnance.weaponName} against ${target.vessel.name}`}>
            <header>
                <div>
                    <span className="eyebrow">RESOLVE ORDNANCE</span>
                    <h3>{ordnance.weaponName}</h3>
                    <small>{ordnance.attackerName} → {target.vessel.name}</small>
                </div>
                <button type="button" onClick={onClose} aria-label="Close ordnance attack">×</button>
            </header>
            <div className="ordnance-target-summary">
                <span>Turrets <strong>{targetTurrets}</strong></span>
                <span>Lowest armour <strong>{targetArmour}+</strong></span>
                <span>Incoming strength <strong>{ordnance.strength}</strong></span>
            </div>
            <p>
                {isTorpedo
                    ? "Turrets destroy torpedoes on 4+. Survivors roll against the ship’s lowest armour and ignore shields."
                    : "Turrets destroy bomber squadrons on 4+. Each survivor generates D6 minus Turrets attack dice against the ship’s lowest armour."}
            </p>
            <label className="ordnance-massed-turrets">
                Supporting ships in base contact
                <select
                    value={supportingShips}
                    onChange={(event) => {
                        setSupportingShips(Number(event.target.value));
                        setResult(null);
                    }}
                >
                    {[0, 1, 2, 3].map((count) => (
                        <option key={count} value={count}>{count} (+{count} turret dice)</option>
                    ))}
                </select>
                <small>Only the target ship’s {targetTurrets} turrets reduce bomber attack dice.</small>
            </label>
            {!result && (
                <button type="button" className="ordnance-roll-button" onClick={rollAttack}>
                    Roll turrets and attack
                </button>
            )}
            {result && (
                <div className="ordnance-roll-results" role="status">
                    <DiceTray
                        rolls={result.turretRolls}
                        hitThreshold={4}
                        label={`Turret fire · ${result.turretHits} destroyed`}
                    />
                    {!isTorpedo && result.survivingStrength > 0 && (
                        <div className="ordnance-bomber-counts">
                            <span>Bomber attack dice</span>
                            <strong>{result.bomberAttackCounts.join(" + ") || "0"}</strong>
                        </div>
                    )}
                    <DiceTray
                        rolls={result.attackRolls}
                        hitThreshold={targetArmour}
                        shieldBypassRoll={targetArmour}
                        label={`Attack roll · hits on ${targetArmour}+`}
                    />
                    {!result.attackRolls.length && <p>Turret fire destroyed all incoming ordnance.</p>}
                    <div className="ordnance-result-summary">
                        <strong>{result.damage} damage</strong>
                        <span>Ignores shields</span>
                        {isTorpedo && <span>{result.remainingStrength} torpedoes continue</span>}
                    </div>
                    <button type="button" className="ordnance-record-button" disabled={isRecording} onClick={recordAttack}>
                        {isRecording ? "Recording…" : "Record result"}
                    </button>
                </div>
            )}
            {error && <p className="weapon-attack-error" role="alert">{error}</p>}
        </section>
    );
};

/** Lists launched ordnance and opens its delayed attack controls. */
const ActiveOrdnance = ({
    ordnance,
    localSide,
    targets,
    turnSide,
    onResolve,
    onRemove,
    onAdjustStrength,
    onRoll,
    onClearRoll,
}) => {
    const [selectedId, setSelectedId] = useState("");
    const [targetId, setTargetId] = useState(targets[0]?.vessel.id || "");
    const [strengths, setStrengths] = useState({});
    const selectedOrdnance = ordnance.find((entry) => entry.id === selectedId);
    const eligibleTargets = selectedOrdnance
        ? targets.filter(({ side }) => side !== selectedOrdnance.sourceSide)
        : [];
    const selectedTarget = eligibleTargets.find(({ vessel }) => vessel.id === targetId) || eligibleTargets[0];
    const canResolve = Boolean(selectedOrdnance && selectedTarget);

    const toggleResolution = (entry) => {
        const nextTargets = targets.filter(({ side }) => side !== entry.sourceSide);

        setSelectedId((current) => current === entry.id ? "" : entry.id);
        setTargetId(nextTargets[0]?.vessel.id || "");
    };

    const changeStrength = async (entry) => {
        const requestedStrength = Number(strengths[entry.id] ?? entry.strength);

        if (!Number.isInteger(requestedStrength) || requestedStrength < 0 || requestedStrength > entry.strength) {
            return;
        }

        await onAdjustStrength(entry, requestedStrength);
    };

    if (!ordnance.length) {
        return (
            <div className="active-ordnance-empty" role="status">
                <strong>No active ordnance</strong>
                <small>Launched torpedoes and attack craft will remain here until they hit a target.</small>
            </div>
        );
    }

    return (
        <div className="active-ordnance-list">
            {ordnance.map((entry) => (
                <article key={entry.id} className="active-ordnance-card">
                    <div>
                        <span className="eyebrow">{entry.sourceSide === localSide ? "YOUR ORDNANCE" : "ENEMY ORDNANCE"}</span>
                        <strong>{entry.weaponName}</strong>
                        <small>{entry.attackerName} · Strength {entry.strength}</small>
                    </div>
                    <div className="active-ordnance-actions">
                        <button
                            type="button"
                            className="active-ordnance-confirm"
                            aria-expanded={selectedId === entry.id}
                            onClick={() => toggleResolution(entry)}
                        >
                            RESOLVE HIT
                        </button>
                        {entry.sourceSide === localSide && (
                            <>
                                <input
                                    type="number"
                                    min="0"
                                    max={entry.strength}
                                    step="1"
                                    aria-label={`Remaining strength for ${entry.weaponName}`}
                                    value={strengths[entry.id] ?? entry.strength}
                                    onChange={(event) => setStrengths((current) => ({
                                        ...current,
                                        [entry.id]: event.target.value,
                                    }))}
                                />
                                <button type="button" onClick={() => changeStrength(entry)}>SET</button>
                                <button type="button" onClick={() => onRemove(entry)}>REMOVE</button>
                            </>
                        )}
                    </div>
                </article>
            ))}
            {selectedOrdnance && canResolve && selectedTarget && (
                <div className="active-ordnance-attack">
                    <label>
                        Ship being hit
                        <select value={selectedTarget.vessel.id} onChange={(event) => setTargetId(event.target.value)}>
                            {eligibleTargets.map(({ vessel, side }) => (
                                <option key={`${side}-${vessel.id}`} value={vessel.id}>{vessel.name}</option>
                            ))}
                        </select>
                    </label>
                    <ActiveOrdnanceAttack
                        key={`${selectedOrdnance.id}-${selectedTarget.vessel.id}`}
                        ordnance={selectedOrdnance}
                        target={selectedTarget}
                        turnSide={turnSide}
                        onRoll={onRoll}
                        onClearRoll={onClearRoll}
                        onClose={() => setSelectedId("")}
                        onResolve={(attack) => onResolve(selectedOrdnance, attack, selectedTarget.side)}
                    />
                </div>
            )}
        </div>
    );
};

export default ActiveOrdnance;
