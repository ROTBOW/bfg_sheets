"use client";

import { useState } from "react";
import CriticalDamage from "@/components/CriticalDamage";
import SpecialRules from "@/components/SpecialRules";
import { gunneryTable } from "@/lib/gunnery.mjs";

/** Rules reference for resolving weapon-battery fire. */
const GunneryReference = () => (
    <section className="gunnery-reference" aria-labelledby="gunnery-table-title">
        <div className="panel-heading">
            <h2 id="gunnery-table-title">Gunnery table</h2>
        </div>
        <div className="table-scroll">
            <table>
                <thead>
                    <tr>
                        <th>FP</th>
                        <th>Defences</th>
                        <th>Closing capital</th>
                        <th>Closing escort / Away capital</th>
                        <th>Away escort / Abeam capital</th>
                        <th>Abeam escort</th>
                        <th>Ordnance</th>
                    </tr>
                </thead>
                <tbody>
                    {gunneryTable.map((row, index) => (
                        <tr key={index + 1}>
                            <th scope="row">{index + 1}</th>
                            {row.map((dice, column) => <td key={column}>{dice}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <p>
            Within 15 cm shifts one column left. Over 30 cm or intervening Blast Markers each shift one column right.
        </p>
    </section>
);

/** Center controls that reveal ship references and the shared Gunnery table. */
const ShipDrawers = ({ friendlyShip, enemyShip }) => {
    const [openDrawer, setOpenDrawer] = useState("");
    const [drawerType, drawerSide] = openDrawer.split("-");
    const activeShip = drawerSide === "friendly"
        ? friendlyShip
        : drawerSide === "enemy"
            ? enemyShip
            : null;

    const toggleDrawer = (type, side) => {
        const drawerId = `${type}-${side}`;

        setOpenDrawer((current) => current === drawerId ? "" : drawerId);
    };

    return (
        <div className="rules-drawers">
            <div className="drawer-trigger-row">
                <button type="button" title="Your critical damage" aria-label="Show your ship critical damage" aria-expanded={openDrawer === "critical-friendly"} onClick={() => toggleDrawer("critical", "friendly")}>◁</button>
                <span>CRIT</span>
                <button type="button" title="Enemy critical damage" aria-label="Show enemy critical damage" aria-expanded={openDrawer === "critical-enemy"} onClick={() => toggleDrawer("critical", "enemy")}>▷</button>
            </div>
            <div className="drawer-trigger-row">
                <button type="button" title="Your special rules" aria-label="Show your ship special rules" aria-expanded={openDrawer === "rules-friendly"} onClick={() => toggleDrawer("rules", "friendly")}>◁</button>
                <span>RULES</span>
                <button type="button" title="Enemy special rules" aria-label="Show enemy special rules" aria-expanded={openDrawer === "rules-enemy"} onClick={() => toggleDrawer("rules", "enemy")}>▷</button>
            </div>
            <button
                type="button"
                className="gunnery-drawer-trigger"
                aria-expanded={openDrawer === "gunnery"}
                onClick={() => setOpenDrawer((current) => current === "gunnery" ? "" : "gunnery")}
            >
                GUNNERY TABLE
            </button>
            {openDrawer === "gunnery" && (
                <div className="rules-drawer rules-drawer-gunnery">
                    <button type="button" className="rules-drawer-close" onClick={() => setOpenDrawer("")} aria-label="Close Gunnery table">×</button>
                    <GunneryReference />
                </div>
            )}
            {openDrawer && openDrawer !== "gunnery" && activeShip && (
                <div className={`rules-drawer rules-drawer-${drawerSide}`}>
                    <button type="button" className="rules-drawer-close" onClick={() => setOpenDrawer("")} aria-label={`Close ${drawerType === "critical" ? "critical damage" : "special rules"}`}>×</button>
                    {drawerType === "critical" ? (
                        <CriticalDamage
                            key={`${drawerSide}-${activeShip.vessel.id}`}
                            entries={activeShip.battleState.criticalDamage}
                            faction={activeShip.ship.faction}
                            hasSepulchre={activeShip.vessel.upgrades?.includes("sepulchre") ?? false}
                            isReadOnly={drawerSide === "enemy"}
                            onUpdate={(update) => activeShip.onUpdate?.((current) => ({
                                criticalDamage: update(current.criticalDamage),
                                message: "",
                            }))}
                        />
                    ) : (
                        <SpecialRules
                            key={`${drawerSide}-${activeShip.vessel.id}`}
                            rules={activeShip.ship.specialRules}
                            isDemo={activeShip.ship.isDemo}
                            source={activeShip.ship.source}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default ShipDrawers;
