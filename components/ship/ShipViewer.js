"use client";

import BattleStatus from "@/components/ship/BattleStatus";
import CriticalDamage from "@/components/ship/CriticalDamage";
import ShipDiagram from "@/components/ship/ShipDiagram";
import ShipName from "@/components/ship/ShipName";
import SpecialRules from "@/components/ship/SpecialRules";
import { getShip } from "@/lib/fleets.mjs";
import { getUpgradeOptions } from "@/lib/ship-upgrades.mjs";
import { weaponMarkers } from "@/lib/weapon-markers.mjs";
import { getOrderedMovement, getOrderedWeaponStrength } from "@/lib/special-orders.mjs";

/** Displays the complete standalone tracker for one selected ship. */
const ShipViewer = ({ ship, vessel, battleState, updateSelectedShip, leadership }) => {
    const shipStats = ship.stats;
    const { hull, criticalDamage } = battleState;
    const isNecron = ship.faction === "Necrons";
    const movement = getOrderedMovement(shipStats.speedCm, shipStats.turnDegrees, battleState.order);
    const characteristics = [
        ["Type", ship.type],
        ["Speed", movement.speed, "cm", movement.speedChanged],
        ["Turns", movement.turns, "", movement.turnsChanged],
        [isNecron ? "Saves" : "Shields", isNecron ? `${shipStats.reactiveHullSave} save` : shipStats.shields],
        ["Armour", `${shipStats.armour.front} / ${shipStats.armour.other}`],
        ["Turrets", shipStats.turrets],
    ];

    return (
        <div className="ship-viewer">
            <div className="breadcrumb">
                {ship.faction} <span>/</span> {ship.type} <span>/</span>{" "}
                Ship profile
            </div>
            <div className="page-heading">
                <div>
                    <p className="eyebrow">VESSEL RECORD · {vessel.registry}</p>
                    <h1>
                        <ShipName name={vessel.name} hull={hull} />
                    </h1>
                    <p className="subtitle">{ship.className} <span>·</span> {ship.faction}</p>
                </div>
                <button className="secondary-button" onClick={() => window.print()}>
                    ↗ &nbsp; Print ship sheet
                </button>
            </div>
            <div className="main-grid">
                <div>
                    <section className="panel vessel">
                        <div className="panel-heading">
                            <span className="eyebrow">{ship.classLabel.toUpperCase()}</span>
                            <span className="registry">{ship.role.toUpperCase()}</span>
                        </div>
                        <ShipDiagram ship={ship} vessel={vessel} />
                        <div className="vessel-caption">
                            <em>{ship.description}</em>
                            <span><strong>{ship.points}</strong> POINTS</span>
                        </div>
                    </section>
                    <section className="stat-strip" aria-label="Ship characteristics">
                        {characteristics.map(([label, value, unit, isChanged]) => (
                            <div key={label} title={isChanged ? movement.explanation : undefined}>
                                <span>{label}</span>
                                <strong className={isChanged ? "order-modified-value" : ""}>
                                    {isChanged && (
                                        <del>({label === "Speed" ? shipStats.speedCm : `${shipStats.turnDegrees}°`})</del>
                                    )}
                                    {value}<small>{unit}</small>
                                </strong>
                            </div>
                        ))}
                    </section>
                    <BattleStatus
                        ship={ship}
                        vessel={vessel}
                        battleState={battleState}
                        leadership={leadership}
                        onUpdate={updateSelectedShip}
                    />
                    <section className="panel armament">
                        <div className="panel-heading">
                            <h2><span className="section-number">01</span>Armament</h2>
                            <span className="registry">{ship.weapons.length} WEAPON SYSTEMS</span>
                        </div>
                        <div className="table-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Weapon system</th>
                                        <th>Range / speed</th>
                                        <th>Strength</th>
                                        <th>Fire arc</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ship.weapons.map((weapon) => {
                                        const orderedStrength = getOrderedWeaponStrength(weapon, battleState.order);
                                        const isOrderModified = orderedStrength !== weapon.strength;

                                        return (
                                        <tr key={`${weapon.name}-${weapon.rangeLabel || weapon.rangeCm}`}>
                                            <td>
                                                <span className="weapon-marker" aria-hidden="true">
                                                    {weaponMarkers[weapon.type]}
                                                </span>
                                                {weapon.name}
                                                <small>{weapon.type}</small>
                                            </td>
                                            <td>{weapon.rangeLabel || `${weapon.rangeCm} cm`}</td>
                                            <td className="strength">
                                                <span title={isOrderModified ? `Strength halved by ${battleState.order}; fractions round up.` : undefined}>
                                                    {isOrderModified && <del>({weapon.strength})</del>}
                                                    {orderedStrength}
                                                </span>
                                                {weapon.strengthUnit && <small>{weapon.strengthUnit}</small>}
                                            </td>
                                            <td><span className="arc">{weapon.arc}</span></td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="panel-footnote">
                            {ship.isDemo ? "Illustrative" : "Source"} base profile shown. Damage and purchased
                            upgrades do not modify these weapon values yet. Active special orders are reflected above.
                        </div>
                    </section>
                    {vessel.upgrades?.length > 0 && (
                        <section className="panel tracker-upgrades">
                            <h2>Purchased upgrades</h2>
                            <ul>
                                {getUpgradeOptions(getShip(vessel.classId), vessel)
                                    .filter((option) => vessel.upgrades.includes(option.id))
                                    .map((option) => (
                                        <li key={option.id}>{option.label}: {option.description}</li>
                                    ))}
                            </ul>
                        </section>
                    )}
                    <CriticalDamage
                        key={vessel.id}
                        entries={criticalDamage}
                        faction={ship.faction}
                        hasSepulchre={vessel.upgrades?.includes("sepulchre") ?? false}
                        onUpdate={(update) => updateSelectedShip((current) => ({
                            criticalDamage: update(current.criticalDamage),
                            message: "",
                        }))}
                    />
                </div>
                <aside>
                    <SpecialRules
                        key={vessel.id}
                        rules={ship.specialRules}
                        isDemo={ship.isDemo}
                        source={ship.source}
                    />
                </aside>
            </div>
            <footer>
                <span>BFG Sheets &nbsp; / &nbsp; {ship.faction.toUpperCase()}</span>
                <span>Unofficial tabletop companion · {ship.isDemo ? "Demo profile" : "Source profile"}</span>
                <span className="footer-credit">
                    A major help in creating this site:{" "}
                    <a className="rules-link" href="https://battlefleet-game.org/">
                        Battlefleet Gothic: Remastered
                    </a>
                </span>
            </footer>
        </div>
    );
};

export default ShipViewer;
