"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import HullWarning from "@/components/HullWarning";
import SpecialRules from "@/components/SpecialRules";
import FleetMenu from "@/components/FleetMenu";
import CriticalDamage from "@/components/CriticalDamage";
import { getShip, storageKey } from "@/lib/fleets.mjs";
import { getDefaultFleetId, loadFleetLibrary } from "@/lib/fleet-storage.mjs";
import { battleProfiles, createShipBattleState } from "@/lib/battle-profiles";
import { getProfileUrl, getUpgradeOptions, getVesselPoints } from "@/lib/ship-upgrades.mjs";

const weaponMarkers = {
    Battery: "⊞",
    Lance: "✧",
    Torpedo: "↑",
    "Nova Cannon": "◎",
    "Launch Bay": "◇",
    "Bombardment Cannon": "⊞",
};

const getHullStatus = (hull, maxHull) => {
    if (hull === 0) {
        return "Hull depleted";
    }

    if (hull <= maxHull / 2) {
        return "Hull Crippled";
    }

    if (hull < maxHull) {
        return "Hull damaged";
    }

    return "Battle ready";
};

const ShipDiagram = ({ ship, vessel }) => {
    if (!ship.image) {
        return <p className="ship-image-placeholder">No ship image available yet.</p>;
    }

    return (
        <Image
            className="ship-image"
            src={ship.image.src}
            width={ship.image.width}
            height={ship.image.height}
            alt={`${vessel.name} — ${ship.className} side profile`}
            sizes="(max-width: 760px) 100vw, 620px"
        />
    );
};

const Tracker = ({ label, value, max, onChange, tone = "", isHull = false }) => {
    return (
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
                    disabled={!value}
                    onClick={() => onChange(value - 1)}
                >
                    −
                </button>
                <div
                    className="segments"
                    aria-hidden="true"
                >
                    {Array.from({ length: max }, (_, i) => (
                        <span
                            key={i}
                            className={i < value ? "filled" : ""}
                        />
                    ))}
                </div>
                <button
                    aria-label={`Increase ${label}`}
                    disabled={value === max}
                    onClick={() => onChange(value + 1)}
                >
                    +
                </button>
            </div>
        </div>
    );
};

const ShipViewer = ({ ship, vessel, battleState, updateSelectedShip, leadership }) => {
    const shipStats = ship.stats;
    const { hull, shields, order, criticalDamage, message } = battleState;
    const hullStatus = getHullStatus(hull, shipStats.hull);
    const characteristics = [
        ["Type", ship.type],
        ["Speed", shipStats.speedCm, "cm"],
        ["Turns", shipStats.turnDegrees, "°"],
        ["Shields", shipStats.shields],
        ["Armour", `${shipStats.armour.front} / ${shipStats.armour.other}`],
        ["Turrets", shipStats.turrets],
    ];

    const resetBattleTrackers = () => {
        updateSelectedShip({
            hull: shipStats.hull,
            shields: shipStats.shields,
            order: "No special orders",
            criticalDamage: [],
            message: "Battle trackers reset. Critical damage cleared.",
        });
    };

    return (
        <div className="ship-viewer">
            <div className="breadcrumb">
                {ship.faction} <span>/</span> {ship.type} <span>/</span>{" "}
                Ship profile
            </div>
            <div className="page-heading">
                <div>
                    <p className="eyebrow">
                        VESSEL RECORD · {vessel.registry}
                    </p>
                    <h1>{vessel.name}</h1>
                    <p className="subtitle">
                        {ship.className} <span>·</span> {ship.faction}
                    </p>
                </div>
                <button
                    className="secondary-button"
                    onClick={() => window.print()}
                >
                    ↗ &nbsp; Print ship sheet
                </button>
            </div>
            <div className="main-grid">
                <div>
                    <section className="panel vessel">
                        <div className="panel-heading">
                            <span className="eyebrow">
                                {ship.classLabel.toUpperCase()}
                            </span>
                            <span className="registry">
                                {ship.role.toUpperCase()}
                            </span>
                        </div>
                        <ShipDiagram ship={ship} vessel={vessel} />
                        <div className="vessel-caption">
                            <em>{ship.description}</em>
                            <span>
                                <strong>{ship.points}</strong> POINTS
                            </span>
                        </div>
                    </section>
                    <section
                        className="stat-strip"
                        aria-label="Ship characteristics"
                    >
                        {characteristics.map(([label, value, unit]) => (
                            <div key={label}>
                                <span>{label}</span>
                                <strong>
                                    {value}
                                    <small>{unit}</small>
                                </strong>
                            </div>
                        ))}
                    </section>
                    <section className="panel armament">
                        <div className="panel-heading">
                            <h2>
                                <span className="section-number">01</span>
                                Armament
                            </h2>
                            <span className="registry">
                                {ship.weapons.length} WEAPON SYSTEMS
                            </span>
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
                                    {ship.weapons.map(
                                        ({
                                            name,
                                            type,
                                            rangeCm,
                                            rangeLabel,
                                            strength,
                                            strengthUnit,
                                            arc,
                                        }) => (
                                            <tr key={`${name}-${rangeLabel || rangeCm}`}>
                                                <td>
                                                    <span
                                                        className="weapon-marker"
                                                        aria-hidden="true"
                                                    >
                                                        {
                                                            weaponMarkers[
                                                                type
                                                            ]
                                                        }
                                                    </span>
                                                    {name}
                                                    <small>{type}</small>
                                                </td>
                                                <td>{rangeLabel || `${rangeCm} cm`}</td>
                                                <td className="strength">
                                                    {strength}
                                                    {strengthUnit && <small>{strengthUnit}</small>}
                                                </td>
                                                <td>
                                                    <span className="arc">
                                                        {arc}
                                                    </span>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="panel-footnote">
                            {ship.isDemo ? "Illustrative" : "Source"} base profile shown. Damage and purchased
                            upgrades do not modify these weapon values yet.
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
                        onUpdate={(update) => updateSelectedShip((current) => ({
                            criticalDamage: update(current.criticalDamage),
                            message: "",
                        }))}
                    />
                </div>
                <aside>
                    <section className="panel battle">
                        <div className="panel-heading">
                            <h2>Battle status</h2>
                            <span className="live-dot" />
                        </div>
                        <div
                            role="status"
                            className={`status-banner ${hull < shipStats.hull ? "damaged" : ""}`}
                        >
                            ◇ &nbsp; {hullStatus}
                        </div>
                        <Tracker
                            label="Hull integrity"
                            isHull
                            value={hull}
                            max={shipStats.hull}
                            onChange={(value) => updateSelectedShip({ hull: value })}
                        />
                        <Tracker
                            label="Active shields"
                            value={shields}
                            max={shipStats.shields}
                            onChange={(value) => updateSelectedShip({ shields: value })}
                            tone="shield"
                        />
                        <div className="leadership">
                            <span>
                                Leadership<small>{leadership ? "Fleet commander" : "Determine at the table"}</small>
                            </span>
                            <strong>{leadership || "—"}</strong>
                        </div>
                        <div className="order-control">
                            <label htmlFor="order">Special orders</label>
                            <select
                                id="order"
                                value={order}
                                onChange={(event) =>
                                    updateSelectedShip({ order: event.target.value })
                                }
                            >
                                {[
                                    "No special orders",
                                    "All ahead full",
                                    "Come to new heading",
                                    "Burn retros",
                                    "Lock on",
                                    "Reload ordnance",
                                    "Brace for impact",
                                ].map((specialOrder) => (
                                    <option key={specialOrder}>
                                        {specialOrder}
                                    </option>
                                ))}
                            </select>
                            <p>
                                Record the current order after resolving it
                                at the table.
                            </p>
                        </div>
                        <button
                            className="reset-button"
                            onClick={resetBattleTrackers}
                        >
                            ↺ &nbsp; Reset battle trackers
                        </button>
                        {message && (
                            <p
                                role="status"
                                className="reset-message"
                            >
                                {message}
                            </p>
                        )}
                    </section>
                    <SpecialRules
                        key={vessel.id}
                        rules={ship.specialRules}
                        isDemo={ship.isDemo}
                        source={ship.source}
                    />
                </aside>
            </div>
            <footer>
                <span>
                    BFG Sheets &nbsp; / &nbsp; {ship.faction.toUpperCase()}
                </span>
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

const BattleTracker = () => {
    const [fleets, setFleets] = useState([]);
    const [selectedFleetId, setSelectedFleetId] = useState("");
    const [selectedShipId, setSelectedShipId] = useState("");
    const [battleStates, setBattleStates] = useState({});
    const [loaded, setLoaded] = useState(false);
    const [storageMessage, setStorageMessage] = useState("");

    useEffect(() => {
        let active = true;
        const loadFleets = () => {
            if (!active) return;

            try {
                const library = loadFleetLibrary(window.localStorage);
                setFleets(library.fleets);
                setSelectedFleetId((previous) => (
                    library.fleets.some((fleet) => fleet.id === previous)
                        ? previous : getDefaultFleetId(library.fleets)
                ));
                setStorageMessage(library.saveError ? "Demo fleet could not be saved. Browser storage is unavailable or full." : "");
            } catch {
                setStorageMessage("Saved fleets could not be read. Stored data has not been changed. Check browser storage access and reload.");
            }
            setLoaded(true);
        };
        const onStorage = (event) => {
            if (event.key === storageKey || event.key === null) loadFleets();
        };

        queueMicrotask(loadFleets);
        window.addEventListener("storage", onStorage);
        window.addEventListener("focus", loadFleets);
        return () => {
            active = false;
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("focus", loadFleets);
        };
    }, []);

    const fleet = fleets.find((entry) => entry.id === selectedFleetId);
    const vessels = (fleet?.ships || []).map((vessel, index) => {
        const catalogShip = getShip(vessel.classId);
        const profile = battleProfiles[vessel.classId];
        return {
            ...vessel,
            name: vessel.name || `${catalogShip.name} ${index + 1}`,
            registry: `VESSEL ${String(index + 1).padStart(2, "0")}`,
            className: profile?.className || `${catalogShip.name} · ${catalogShip.type}`,
            profile,
        };
    });
    const vessel = vessels.find((entry) => entry.id === selectedShipId) || vessels[0];
    const fleetBattleStates = battleStates[selectedFleetId] || {};
    const state = vessel?.profile
        ? fleetBattleStates[vessel.id] || createShipBattleState(vessel.profile)
        : null;
    const commanderLeadership = {
        "fleet-admiral": 8,
        admiral: 9,
        "solar-admiral": 10,
        "master-of-the-fleet": 10,
        "archmagos-explorator": 8,
        "archmagos-veneratus": 9,
    };

    const selectFleet = (id) => {
        setSelectedFleetId(id);
        setSelectedShipId("");
    };

    const updateSelectedShip = (changes) => {
        setBattleStates((previous) => {
            const current = previous[fleet.id]?.[vessel.id] || createShipBattleState(vessel.profile);
            const updates = typeof changes === "function" ? changes(current) : changes;

            return {
                ...previous,
                [fleet.id]: {
                    ...previous[fleet.id],
                    [vessel.id]: { ...current, ...updates },
                },
            };
        });
    };

    if (!loaded) return <main role="status">Loading saved fleets…</main>;

    return (
        <main className="battle-layout">
            <FleetMenu
                fleets={fleets}
                selectedFleetId={selectedFleetId}
                onSelectFleet={selectFleet}
                fleet={vessels}
                selectedShipId={vessel?.id}
                onSelect={setSelectedShipId}
                battleStates={fleetBattleStates}
                storageMessage={storageMessage}
            />
            {vessel?.profile ? (
                <ShipViewer
                    key={fleet.id}
                    ship={{ ...vessel.profile, points: getVesselPoints(getShip(vessel.classId), vessel) }}
                    vessel={vessel}
                    battleState={state}
                    updateSelectedShip={updateSelectedShip}
                    leadership={fleet.flagshipId === vessel.id ? commanderLeadership[fleet.commander] : undefined}
                />
            ) : (
                <div className="ship-viewer">
                    <h1>{vessel?.name || (fleet ? "This fleet is empty" : "No saved fleets")}</h1>
                    {vessel ? (
                        <>
                            <p>{vessel.className} · {getVesselPoints(getShip(vessel.classId), vessel)} pts</p>
                            <p>This class does not have a battle-tracker profile yet.</p>
                            <a className="secondary-button rules-link" href={getProfileUrl(getShip(vessel.classId))} target="_blank" rel="noreferrer">Open ship rules ↗</a>
                        </>
                    ) : <Link className="secondary-button" href="/fleet-creator">Open fleet builder</Link>}
                </div>
            )}
        </main>
    );
};

export default BattleTracker;
