"use client";

import Image from "next/image";
import HullWarning from "@/components/HullWarning";
import { resolveCommandCheck, rollLeadership } from "@/lib/leadership.mjs";
import { createRollDurations, getLiveRollTimestamp } from "@/lib/live-roll.mjs";

const specialOrders = [
    {
        name: "All ahead full",
        icon: "/icons/special-orders/all-ahead-full.svg",
        description: "Move cruising speed +4D6 cm with no turns. Armament has half effect; Nova Cannon cannot fire.",
    },
    {
        name: "Come to new heading",
        icon: "/icons/special-orders/come-to-new-heading.svg",
        description: "Move half to full speed and make up to two turns. Armament has half effect; Nova Cannon cannot fire.",
    },
    {
        name: "Burn retros",
        icon: "/icons/special-orders/burn-retros.svg",
        description: "Move zero to half speed and make one turn without first moving forward. Armament has half effect; Nova Cannon cannot fire.",
    },
    {
        name: "Lock on",
        icon: "/icons/special-orders/lock-on.svg",
        description: "Re-roll missed weapon battery and lance attacks. Move half to full speed with no turns.",
    },
    {
        name: "Reload ordnance",
        icon: "/icons/special-orders/reload-ordnance.svg",
        description: "Reload all ordnance. Move half to full speed and make up to one turn.",
    },
    {
        name: "Brace for impact",
        icon: "/icons/special-orders/brace-for-impact.svg",
        description: "Gain a 4+ save against damage. Armament and ordnance have half effect; Nova Cannon cannot fire.",
    },
];

/** Returns the status label for a ship's remaining hull. */
const getHullStatus = (hull, maxHull) => {
    if (hull === 0) return "Hull depleted";
    if (hull <= maxHull / 2) return "Hull Crippled";
    if (hull < maxHull) return "Hull damaged";
    return "Battle ready";
};

/** Displays and edits one segmented ship resource. */
const Tracker = ({ label, value, max, onChange, tone = "", isHull = false, isReadOnly = false }) => (
    <div className={`tracker ${tone}`}>
        <div className="tracker-heading">
            <span>{label}</span>
            <strong>
                {value}
                <small> / {max}</small>
                {isHull && <HullWarning hull={value} maxHull={max} />}
            </strong>
        </div>
        <div className="tracker-controls">
            <button
                aria-label={`Decrease ${label}`}
                disabled={isReadOnly || !value}
                onClick={() => onChange(value - 1)}
            >
                −
            </button>
            <div className="segments" aria-hidden="true">
                {Array.from({ length: max }, (_, index) => (
                    <span key={index} className={index < value ? "filled" : ""} />
                ))}
            </div>
            <button
                aria-label={`Increase ${label}`}
                disabled={isReadOnly || value === max}
                onClick={() => onChange(value + 1)}
            >
                +
            </button>
        </div>
    </div>
);

/** Renders live ship bookkeeping controls, or a read-only opponent summary. */
const BattleStatus = ({
    ship,
    vessel,
    battleState,
    leadership,
    onUpdate,
    onRoll,
    isReadOnly = false,
    hasEnemyOnSpecialOrders = false,
    commandChecksBlocked = false,
    round = 1,
    turnSide = "",
}) => {
    const shipStats = ship.stats;
    const { hull, shields, order, message } = battleState;
    const isNecron = ship.faction === "Necrons";
    const leadershipId = `leadership-${vessel.id}`;
    const displayedLeadership = battleState.leadership ?? leadership ?? "";
    const hasCurrentCommandCheck = battleState.commandCheckPassed === true
        && battleState.commandCheckRound === round
        && battleState.commandCheckTurnSide === turnSide;
    const availableOrders = commandChecksBlocked
        ? specialOrders.filter((specialOrder) => specialOrder.name === "Brace for impact")
        : specialOrders;
    const selectedOrder = specialOrders.find((specialOrder) => specialOrder.name === order);

    /** Rolls the Command check required before choosing a special order. */
    const makeCommandCheck = () => {
        if (!Number.isInteger(displayedLeadership)) {
            onUpdate?.({ message: "Set or roll Leadership before attempting special orders." });
            return;
        }

        const result = resolveCommandCheck(displayedLeadership, {
            hasBlastMarker: battleState.hasBlastMarker,
            hasEnemyOnSpecialOrders,
        });
        const modifierText = result.modifiedLeadership === displayedLeadership
            ? ""
            : ` (modified to ${result.modifiedLeadership})`;
        const startedAt = getLiveRollTimestamp();
        const initialDurations = createRollDurations(result.dice.length);

        Promise.resolve(onRoll?.({
            id: crypto.randomUUID(),
            kind: "command-check",
            sourceSide: turnSide,
            attackerId: vessel.id,
            attackerName: vessel.name,
            targetId: vessel.id,
            targetName: vessel.name,
            weaponName: "Leadership check",
            initialRolls: result.dice,
            rerolls: [],
            initialDurations,
            rerollDurations: [],
            hitThreshold: 6,
            shieldBypassRoll: 0,
            hits: result.passed ? 1 : 0,
            shieldBypassingHits: 0,
            total: result.roll,
            targetNumber: result.modifiedLeadership,
            passed: result.passed,
            startedAt,
            expiresAt: startedAt + 15000,
        })).catch(() => {
            onUpdate?.({ message: "The Leadership check was resolved but could not be shown to your opponent." });
        });

        onUpdate?.({
            order: "No special orders",
            commandCheckPassed: result.passed,
            commandCheckFailed: commandChecksBlocked ? true : !result.passed,
            commandCheckRound: round,
            commandCheckTurnSide: turnSide,
            message: `Command check ${result.dice.join(" + ")} = ${result.roll} vs Ld ${displayedLeadership}${modifierText}: ${result.passed ? "passed; choose a special order." : commandChecksBlocked ? "failed; Brace for Impact was not issued." : "failed; no more fleet Command checks this turn."}`,
        });
    };

    /** Applies the order unlocked by the current successful Command check. */
    const selectSpecialOrder = (specialOrder) => {
        onUpdate?.({
            order: specialOrder,
            commandCheckPassed: false,
            ...(specialOrder === "Reload ordnance" ? { spentOrdnance: [] } : {}),
            message: `${specialOrder} orders issued.`,
        });
    };

    const rollShipLeadership = () => {
        const hasSepulchre = vessel.upgrades?.includes("sepulchre") ?? false;
        const result = rollLeadership(ship.faction, hasSepulchre);

        onUpdate({
            leadership: result.leadership,
            commandCheckPassed: false,
            message: `Leadership roll: ${result.roll} → Ld ${result.leadership}.`,
        });
    };

    const resetBattleTrackers = () => {
        onUpdate({
            hull: shipStats.hull,
            shields: shipStats.shields,
            order: "No special orders",
            commandCheckPassed: false,
            commandCheckFailed: false,
            spentOrdnance: [],
            criticalDamage: [],
            message: "Battle trackers reset. Critical damage cleared.",
        });
    };

    return (
        <section className={`panel battle ${isReadOnly ? "battle-read-only" : ""}`}>
            <div className="panel-heading">
                <h2>Battle status</h2>
                <span className="live-dot" />
            </div>
            <div role="status" className={`status-banner ${hull < shipStats.hull ? "damaged" : ""}`}>
                ◇ &nbsp; {getHullStatus(hull, shipStats.hull)}
            </div>
            <Tracker
                label="Hull integrity"
                isHull
                value={hull}
                max={shipStats.hull}
                onChange={(value) => onUpdate?.({ hull: value })}
                isReadOnly={isReadOnly}
            />
            {isNecron ? (
                <div className="tracker shield">
                    <div className="tracker-heading">
                        <span>Saves</span>
                        <strong>{shipStats.reactiveHullSave} save</strong>
                    </div>
                </div>
            ) : (
                <Tracker
                    label="Active shields"
                    value={shields}
                    max={shipStats.shields}
                    onChange={(value) => onUpdate?.({ shields: value })}
                    tone="shield"
                    isReadOnly={isReadOnly}
                />
            )}
            <div className="leadership">
                <label htmlFor={leadershipId}>
                    Leadership
                    <small>{leadership && battleState.leadership == null ? "Fleet commander" : "Ship or squadron value"}</small>
                </label>
                <div className="leadership-controls">
                    <input
                        id={leadershipId}
                        type="number"
                        min="1"
                        max="10"
                        inputMode="numeric"
                        value={displayedLeadership}
                        disabled={isReadOnly}
                        aria-label={`Leadership for ${vessel.name}`}
                        onChange={(event) => {
                            const nextLeadership = Number(event.target.value);

                            if (Number.isInteger(nextLeadership) && nextLeadership >= 1 && nextLeadership <= 10) {
                                onUpdate?.({
                                    leadership: nextLeadership,
                                    commandCheckPassed: false,
                                    message: "",
                                });
                            }
                        }}
                    />
                    {!isReadOnly && <button type="button" onClick={rollShipLeadership}>Roll D6</button>}
                </div>
            </div>
            <div className="order-control">
                <span className="order-control-label">Special orders</span>
                <label className="command-modifier">
                    <input
                        type="checkbox"
                        checked={Boolean(battleState.hasBlastMarker)}
                        disabled={isReadOnly}
                        onChange={(event) => onUpdate?.({
                            hasBlastMarker: event.target.checked,
                            commandCheckPassed: false,
                            message: "",
                        })}
                    />
                    Blast Marker touching base (−1 Ld)
                </label>
                {hasEnemyOnSpecialOrders && <small>Enemy on special orders: +1 Ld</small>}
                {selectedOrder ? (
                    <div className="selected-order" title={selectedOrder.description}>
                        <Image src={selectedOrder.icon} width={42} height={42} alt="" />
                        <strong>{selectedOrder.name}</strong>
                        {!isReadOnly && (
                            <button
                                type="button"
                                onClick={() => onUpdate?.({ order: "No special orders", message: "" })}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                ) : !isReadOnly && hasCurrentCommandCheck ? (
                    <div className="special-order-grid" aria-label="Choose a special order">
                        {availableOrders.map((specialOrder) => (
                            <button
                                type="button"
                                key={specialOrder.name}
                                title={specialOrder.description}
                                aria-label={specialOrder.name}
                                onClick={() => selectSpecialOrder(specialOrder.name)}
                            >
                                <Image src={specialOrder.icon} width={48} height={48} alt="" />
                                <span>{specialOrder.name}</span>
                            </button>
                        ))}
                    </div>
                ) : !isReadOnly ? (
                    <button
                        type="button"
                        className="command-check-button"
                        onClick={makeCommandCheck}
                    >
                        {commandChecksBlocked ? "Leadership check for Brace for Impact" : "Leadership check"}
                    </button>
                ) : (
                    <p>No special orders</p>
                )}
            </div>
            {!isReadOnly && (
                <button className="reset-button mt-4" onClick={resetBattleTrackers}>
                    ↺ &nbsp; Reset battle trackers
                </button>
            )}
            {message && <p role="status" className="reset-message">{message}</p>}
        </section>
    );
};

export default BattleStatus;
