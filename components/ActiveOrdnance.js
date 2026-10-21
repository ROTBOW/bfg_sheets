"use client";

import { useState } from "react";
import DiceTray from "@/components/DiceTray";
import { createRollDurations, getLiveRollTimestamp } from "@/lib/live-roll.mjs";
import { resolveOrdnanceHit } from "@/lib/ordnance.mjs";

/** Resolves turret defence and the surviving ordnance's attack against one ship. */
const ActiveOrdnanceAttack = ({ ordnance, target, turnSide, onResolve, onRoll, onClearRoll, onClose }) => {
    const [result, setResult] = useState(null);
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
            })).catch(() => {
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
        } catch {
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
const ActiveOrdnance = ({ ordnance, localSide, targets, turnSide, onResolve, onRoll, onClearRoll }) => {
    const [selectedId, setSelectedId] = useState("");
    const [targetId, setTargetId] = useState(targets[0]?.vessel.id || "");
    const selectedOrdnance = ordnance.find((entry) => entry.id === selectedId);
    const selectedTarget = targets.find(({ vessel }) => vessel.id === targetId) || targets[0];
    const canResolve = selectedOrdnance?.sourceSide === localSide && turnSide === localSide;

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
                    {entry.sourceSide === localSide && (
                        <button
                            type="button"
                            className="active-ordnance-confirm"
                            disabled={turnSide !== localSide}
                            aria-expanded={selectedId === entry.id}
                            onClick={() => setSelectedId((current) => current === entry.id ? "" : entry.id)}
                        >
                            CONFIRM HIT
                        </button>
                    )}
                </article>
            ))}
            {selectedOrdnance && canResolve && selectedTarget && (
                <div className="active-ordnance-attack">
                    <label>
                        Ship being hit
                        <select value={selectedTarget.vessel.id} onChange={(event) => setTargetId(event.target.value)}>
                            {targets.map(({ vessel, side }) => (
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
