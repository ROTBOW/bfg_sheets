"use client";

import HullWarning from "@/components/HullWarning";
import { rollLeadership } from "@/lib/leadership.mjs";

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
const BattleStatus = ({ ship, vessel, battleState, leadership, onUpdate, isReadOnly = false }) => {
    const shipStats = ship.stats;
    const { hull, shields, order, message } = battleState;
    const isNecron = ship.faction === "Necrons";
    const orderId = `order-${vessel.id}`;
    const leadershipId = `leadership-${vessel.id}`;
    const displayedLeadership = battleState.leadership ?? leadership ?? "";

    const rollShipLeadership = () => {
        const hasSepulchre = vessel.upgrades?.includes("sepulchre") ?? false;
        const result = rollLeadership(ship.faction, hasSepulchre);

        onUpdate({
            leadership: result.leadership,
            message: `Leadership roll: ${result.roll} → Ld ${result.leadership}.`,
        });
    };

    const resetBattleTrackers = () => {
        onUpdate({
            hull: shipStats.hull,
            shields: shipStats.shields,
            order: "No special orders",
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
                                onUpdate?.({ leadership: nextLeadership, message: "" });
                            }
                        }}
                    />
                    {!isReadOnly && <button type="button" onClick={rollShipLeadership}>Roll D6</button>}
                </div>
            </div>
            <div className="order-control">
                <label htmlFor={orderId}>Special orders</label>
                <select
                    id={orderId}
                    value={order}
                    disabled={isReadOnly}
                    onChange={(event) => onUpdate?.({ order: event.target.value })}
                >
                    {[
                        "No special orders",
                        "All ahead full",
                        "Come to new heading",
                        "Burn retros",
                        "Lock on",
                        "Reload ordnance",
                        "Brace for impact",
                    ].map((specialOrder) => <option key={specialOrder}>{specialOrder}</option>)}
                </select>
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
