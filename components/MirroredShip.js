"use client";

import { Fragment, useState } from "react";
import BattleStatus from "@/components/BattleStatus";
import ShipDiagram from "@/components/ShipDiagram";
import ShipName from "@/components/ShipName";
import WeaponAttack from "@/components/WeaponAttack";
import { weaponMarkers } from "@/lib/weapon-markers.mjs";
import { getLightningArcAvailability } from "@/lib/lightning-arc.mjs";

/** Compact ship record used for each half of a connected mirrored battle. */
const MirroredShip = ({
    ship,
    vessel,
    battleState,
    leadership,
    onUpdate,
    onDamageTarget,
    isEnemy = false,
    target,
    targetShip,
    round = 1,
    turnSide = "",
    isActiveTurn = false,
}) => {
    const [selectedWeaponIndex, setSelectedWeaponIndex] = useState(null);
    const isNecron = ship.faction === "Necrons";
    const shipNameLength = vessel.name.length;
    const shipNameClass = shipNameLength > 42
        ? "ship-title-extra-long"
        : shipNameLength > 24
            ? "ship-title-long"
            : "";
    const characteristics = [
        ["Type", ship.type],
        ["Speed", ship.stats.speedCm, "cm"],
        ["Turns", ship.stats.turnDegrees, "°"],
        [isNecron ? "Saves" : "Shields", isNecron ? `${ship.stats.reactiveHullSave} save` : ship.stats.shields],
        ["Armour", `${ship.stats.armour.front} / ${ship.stats.armour.other}`],
        ["Turrets", ship.stats.turrets],
    ];

    /** Records the firing result and closes the inline attack controls. */
    const recordAttack = async (entry) => {
        await onDamageTarget(entry);
        onUpdate((current) => ({
            weaponFire: [...current.weaponFire, entry],
            message: entry.weaponType === "Lightning arc"
                ? `${entry.weaponName} ${entry.fireArc} arc (${entry.allocatedStrength} FP): ${entry.hits} hits, ${entry.damage} damage.`
                : `${entry.weaponName} recorded: ${entry.hits} hits, ${entry.damage} damage.`,
        }));
        setSelectedWeaponIndex(null);
    };

    return (
        <article className={`mirrored-ship ${isEnemy ? "is-enemy" : ""}`}>
            <header className="mirrored-ship-heading">
                <p className="eyebrow">{isEnemy ? "ENEMY CONTACT" : "VESSEL RECORD"} · {vessel.registry}</p>
                <h1 className={shipNameClass}>
                    <ShipName name={vessel.name} hull={battleState.hull} />
                </h1>
                <p className="subtitle">{ship.className} <span>·</span> {ship.faction}</p>
            </header>
            <section className="panel vessel">
                <ShipDiagram ship={ship} vessel={vessel} />
                <div className="vessel-caption">
                    <em>{ship.description}</em>
                    <span><strong>{ship.points}</strong> POINTS</span>
                </div>
            </section>
            <section className="stat-strip" aria-label={`${vessel.name} characteristics`}>
                {characteristics.map(([label, value, unit]) => (
                    <div key={label}>
                        <span>{label}</span>
                        <strong>{value}<small>{unit}</small></strong>
                    </div>
                ))}
            </section>
            <BattleStatus
                ship={ship}
                vessel={vessel}
                battleState={battleState}
                leadership={leadership}
                onUpdate={onUpdate}
                isReadOnly={isEnemy}
            />
            <section className="panel armament">
                <div className="panel-heading">
                    <h2>Armament</h2>
                    <span className="registry">{ship.weapons.length} SYSTEMS</span>
                </div>
                <div className="table-scroll">
                    <table>
                        <thead><tr><th>Weapon system</th><th>Range</th><th>Strength</th><th>Arc</th></tr></thead>
                        <tbody>
                            {ship.weapons.map((weapon, weaponIndex) => {
                                const hasStandardWeaponFired = battleState.weaponFire.some((entry) => (
                                    entry.weaponIndex === weaponIndex
                                    && entry.round === round
                                    && entry.turnSide === turnSide
                                ));
                                const lightningAvailability = weapon.type === "Lightning arc"
                                    ? getLightningArcAvailability({
                                        weapon,
                                        weaponIndex,
                                        weaponFire: battleState.weaponFire,
                                        round,
                                        turnSide,
                                    })
                                    : null;
                                const targetWasEngaged = lightningAvailability?.usedTargetIds.has(target?.id) || false;
                                const hasFired = lightningAvailability
                                    ? lightningAvailability.remainingStrength === 0 || lightningAvailability.availableArcs.length === 0
                                    : hasStandardWeaponFired;
                                const isSelected = selectedWeaponIndex === weaponIndex;
                                const canSelect = !isEnemy && isActiveTurn && !hasFired && !targetWasEngaged && Boolean(target);
                                const weaponRowClass = [
                                    canSelect ? "weapon-row-selectable" : "",
                                    isSelected ? "weapon-row-selected" : "",
                                ].filter(Boolean).join(" ");

                                return (
                                    <Fragment key={`${weapon.name}-${weapon.rangeLabel || weapon.rangeCm}`}>
                                        <tr className={weaponRowClass}>
                                            <td>
                                                <span className="weapon-marker" aria-hidden="true">{weaponMarkers[weapon.type]}</span>
                                                {!isEnemy ? (
                                                    <button
                                                        type="button"
                                                        className="weapon-select-button"
                                                        disabled={!canSelect}
                                                        aria-pressed={isSelected}
                                                        onClick={() => setSelectedWeaponIndex(weaponIndex)}
                                                    >
                                                        {weapon.name}
                                                        {hasFired && <span> · Fired</span>}
                                                        {!hasFired && targetWasEngaged && <span> · Target already engaged</span>}
                                                        {lightningAvailability && lightningAvailability.allocations.length > 0 && !hasFired && (
                                                            <span> · {lightningAvailability.remainingStrength} FP remains</span>
                                                        )}
                                                    </button>
                                                ) : weapon.name}
                                                <small>{weapon.type}</small>
                                            </td>
                                            <td>{weapon.rangeLabel || `${weapon.rangeCm} cm`}</td>
                                            <td className="strength">
                                                {weapon.strength}
                                                {weapon.strengthUnit && <small>{weapon.strengthUnit}</small>}
                                            </td>
                                            <td><span className="arc">{weapon.arc}</span></td>
                                        </tr>
                                        {!isEnemy && isSelected && target && (
                                            <tr className="weapon-attack-row">
                                                <td colSpan="4">
                                                    <WeaponAttack
                                                        key={`${vessel.id}-${weaponIndex}-${target.id}`}
                                                        weapon={weapon}
                                                        weaponIndex={weaponIndex}
                                                        attacker={vessel}
                                                        target={target}
                                                        targetShip={targetShip}
                                                        weaponFire={battleState.weaponFire}
                                                        round={round}
                                                        turnSide={turnSide}
                                                        onClose={() => setSelectedWeaponIndex(null)}
                                                        onRecord={recordAttack}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </article>
    );
};

export default MirroredShip;
