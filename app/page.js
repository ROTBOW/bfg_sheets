"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import HullWarning from "@/components/HullWarning";
import ShipName from "@/components/ShipName";
import SpecialRules from "@/components/SpecialRules";
import FleetMenu from "@/components/FleetMenu";
import CriticalDamage from "@/components/CriticalDamage";
import {
    getActiveRoomFleetId,
    getActiveRoomId,
    getServerActiveRoomId,
    subscribeToActiveRoom,
} from "@/firebase/active-room";
import { ensureAnonymousUser } from "@/firebase/auth";
import { subscribeToRoom, updateShipBattleState } from "@/firebase/room-service";
import { getRoomSideForUser } from "@/firebase/room-schema.mjs";
import { getShip, storageKey } from "@/lib/fleets.mjs";
import { getDefaultFleetId, loadFleetLibrary } from "@/lib/fleet-storage.mjs";
import { battleProfiles, createShipBattleState } from "@/lib/battle-profiles";
import { rollLeadership } from "@/lib/leadership.mjs";
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

const Tracker = ({ label, value, max, onChange, tone = "", isHull = false, isReadOnly = false }) => {
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
                    disabled={isReadOnly || !value}
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
                    disabled={isReadOnly || value === max}
                    onClick={() => onChange(value + 1)}
                >
                    +
                </button>
            </div>
        </div>
    );
};

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
            <div
                role="status"
                className={`status-banner ${hull < shipStats.hull ? "damaged" : ""}`}
            >
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
                    Leadership<small>{leadership && battleState.leadership == null ? "Fleet commander" : "Ship or squadron value"}</small>
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
                    {!isReadOnly && (
                        <button type="button" onClick={rollShipLeadership}>
                            Roll D6
                        </button>
                    )}
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
                    {["No special orders", "All ahead full", "Come to new heading", "Burn retros", "Lock on", "Reload ordnance", "Brace for impact"].map((specialOrder) => (
                        <option key={specialOrder}>{specialOrder}</option>
                    ))}
                </select>
            </div>
            {!isReadOnly && (
                <button className="reset-button" onClick={resetBattleTrackers}>
                    ↺ &nbsp; Reset battle trackers
                </button>
            )}
            {message && <p role="status" className="reset-message">{message}</p>}
        </section>
    );
};

/** Compact ship record used for each half of a connected mirrored battle. */
const MirroredShip = ({ ship, vessel, battleState, leadership, onUpdate, isEnemy = false }) => {
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
                            {ship.weapons.map((weapon) => (
                                <tr key={`${weapon.name}-${weapon.rangeLabel || weapon.rangeCm}`}>
                                    <td><span className="weapon-marker" aria-hidden="true">{weaponMarkers[weapon.type]}</span>{weapon.name}<small>{weapon.type}</small></td>
                                    <td>{weapon.rangeLabel || `${weapon.rangeCm} cm`}</td>
                                    <td className="strength">{weapon.strength}{weapon.strengthUnit && <small>{weapon.strengthUnit}</small>}</td>
                                    <td><span className="arc">{weapon.arc}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </article>
    );
};

/** Center controls that reveal either ship's critical damage or special rules. */
const ShipDrawers = ({ friendlyShip, enemyShip }) => {
    const [openDrawer, setOpenDrawer] = useState("");
    const [drawerType, drawerSide] = openDrawer.split("-");
    const activeShip = drawerSide === "friendly" ? friendlyShip : enemyShip;

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
            {openDrawer && activeShip && (
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

const ShipViewer = ({
    ship,
    vessel,
    battleState,
    updateSelectedShip,
    leadership,
}) => {
    const shipStats = ship.stats;
    const { hull, criticalDamage } = battleState;
    const isNecron = ship.faction === "Necrons";
    const characteristics = [
        ["Type", ship.type],
        ["Speed", shipStats.speedCm, "cm"],
        ["Turns", shipStats.turnDegrees, "°"],
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
                    <p className="eyebrow">
                        VESSEL RECORD · {vessel.registry}
                    </p>
                    <h1>
                        <ShipName name={vessel.name} hull={hull} />
                    </h1>
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
                    <BattleStatus
                        ship={ship}
                        vessel={vessel}
                        battleState={battleState}
                        leadership={leadership}
                        onUpdate={updateSelectedShip}
                    />
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
    const [selectedEnemyShipId, setSelectedEnemyShipId] = useState("");
    const [battleStates, setBattleStates] = useState({});
    const [room, setRoom] = useState(null);
    const [localSide, setLocalSide] = useState("");
    const [loaded, setLoaded] = useState(false);
    const [storageMessage, setStorageMessage] = useState("");
    const activeRoomId = useSyncExternalStore(
        subscribeToActiveRoom,
        getActiveRoomId,
        getServerActiveRoomId,
    );

    useEffect(() => {
        let active = true;
        const loadFleets = () => {
            if (!active) return;

            try {
                const library = loadFleetLibrary(window.localStorage);
                const roomFleetId = getActiveRoomFleetId();
                setFleets(library.fleets);
                setSelectedFleetId((previous) => (
                    library.fleets.some((fleet) => fleet.id === roomFleetId)
                        ? roomFleetId
                        : library.fleets.some((fleet) => fleet.id === previous)
                            ? previous
                            : getDefaultFleetId(library.fleets)
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

    useEffect(() => {
        if (!activeRoomId) {
            return undefined;
        }

        let isActive = true;
        let unsubscribe = () => {};

        const connectToRoom = async () => {
            try {
                const user = await ensureAnonymousUser();

                if (!isActive) return;

                unsubscribe = subscribeToRoom(
                    activeRoomId,
                    (nextRoom) => {
                        if (!isActive) return;

                        setRoom(nextRoom);
                        setLocalSide(getRoomSideForUser(nextRoom, user.uid));

                        if (nextRoom?.sides) {
                            const roomBattleStates = {};

                            for (const side of ["host", "guest"]) {
                                const sideFleet = nextRoom.sides[side]?.fleet;

                                if (sideFleet?.id) {
                                    roomBattleStates[sideFleet.id] = nextRoom.sides[side]?.battle || {};
                                }
                            }

                            setBattleStates((previous) => ({ ...previous, ...roomBattleStates }));
                        }
                    },
                    () => setStorageMessage("The connected battle could not be updated. Check your connection."),
                );
            } catch {
                setStorageMessage("The connected battle could not be opened. Check your connection and try again.");
            }
        };

        connectToRoom();

        return () => {
            isActive = false;
            unsubscribe();
        };
    }, [activeRoomId]);

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
        ? { ...createShipBattleState(vessel.profile), ...fleetBattleStates[vessel.id] }
        : null;
    const commanderLeadership = {
        "fleet-admiral": 8,
        admiral: 9,
        "solar-admiral": 10,
        "master-of-the-fleet": 10,
        "archmagos-explorator": 8,
        "archmagos-veneratus": 9,
    };
    const connectedRoom = activeRoomId ? room : null;
    const connectedLocalSide = activeRoomId ? localSide : "";
    const enemySide = connectedLocalSide === "host" ? "guest" : connectedLocalSide === "guest" ? "host" : "";
    const enemyFleet = enemySide ? connectedRoom?.sides?.[enemySide]?.fleet : null;
    const enemyVessels = (enemyFleet?.ships || []).map((enemyVessel, index) => {
        const catalogShip = getShip(enemyVessel.classId);
        const profile = battleProfiles[enemyVessel.classId];

        return {
            ...enemyVessel,
            name: enemyVessel.name || `${catalogShip.name} ${index + 1}`,
            registry: `CONTACT ${String(index + 1).padStart(2, "0")}`,
            className: profile?.className || `${catalogShip.name} · ${catalogShip.type}`,
            profile,
        };
    });
    const enemyBattleStates = enemyFleet ? battleStates[enemyFleet.id] || {} : {};
    const enemyVessel = enemyVessels.find((entry) => entry.id === selectedEnemyShipId) || enemyVessels[0];
    const enemyState = enemyVessel?.profile
        ? { ...createShipBattleState(enemyVessel.profile), ...enemyBattleStates[enemyVessel.id] }
        : null;

    const selectFleet = (id) => {
        if (activeRoomId) {
            return;
        }

        setSelectedFleetId(id);
        setSelectedShipId("");
    };

    const updateSelectedShip = (changes) => {
        const current = {
            ...createShipBattleState(vessel.profile),
            ...battleStates[fleet.id]?.[vessel.id],
        };
        const updates = typeof changes === "function" ? changes(current) : changes;

        setBattleStates((previous) => {
            return {
                ...previous,
                [fleet.id]: {
                    ...previous[fleet.id],
                    [vessel.id]: { ...current, ...updates },
                },
            };
        });

        if (activeRoomId && connectedLocalSide) {
            updateShipBattleState({
                roomId: activeRoomId,
                side: connectedLocalSide,
                shipId: vessel.id,
                changes: updates,
            }).catch(() => {
                setStorageMessage("A battle update could not be shared with your opponent. Check your connection.");
            });
        }
    };

    const selectEnemyShip = (shipId) => {
        setSelectedEnemyShipId(shipId);
        updateSelectedShip({ targetId: shipId });
    };

    if (!loaded) return <main role="status">Loading saved fleets…</main>;

    if (activeRoomId && enemyFleet && vessel?.profile && enemyVessel?.profile) {
        const friendlyShip = {
            ...vessel.profile,
            points: getVesselPoints(getShip(vessel.classId), vessel),
        };
        const enemyShip = {
            ...enemyVessel.profile,
            points: getVesselPoints(getShip(enemyVessel.classId), enemyVessel),
        };

        return (
            <main className="connected-battle-layout">
                <FleetMenu
                    fleets={fleets}
                    selectedFleetId={selectedFleetId}
                    onSelectFleet={selectFleet}
                    isFleetSelectionLocked
                    fleet={vessels}
                    selectedShipId={vessel.id}
                    onSelect={setSelectedShipId}
                    battleStates={fleetBattleStates}
                    storageMessage={storageMessage}
                    title="Your fleet"
                    label="Your fleet"
                />
                <section className="mirrored-battlefield" aria-label="Connected battle ships">
                    <MirroredShip
                        ship={friendlyShip}
                        vessel={vessel}
                        battleState={state}
                        leadership={fleet.flagshipId === vessel.id ? commanderLeadership[fleet.commander] : undefined}
                        onUpdate={updateSelectedShip}
                    />
                    <ShipDrawers
                        friendlyShip={{ ship: friendlyShip, vessel, battleState: state, onUpdate: updateSelectedShip }}
                        enemyShip={{ ship: enemyShip, vessel: enemyVessel, battleState: enemyState }}
                    />
                    <MirroredShip
                        ship={enemyShip}
                        vessel={enemyVessel}
                        battleState={enemyState}
                        leadership={enemyFleet.flagshipId === enemyVessel.id ? commanderLeadership[enemyFleet.commander] : undefined}
                        isEnemy
                    />
                </section>
                <FleetMenu
                    fleet={enemyVessels}
                    selectedShipId={enemyVessel.id}
                    onSelect={selectEnemyShip}
                    battleStates={enemyBattleStates}
                    title="Enemy fleet"
                    label="Opposing fleet"
                    fleetName={enemyFleet.name}
                    side="enemy"
                />
            </main>
        );
    }

    return (
        <main className="battle-layout">
            <FleetMenu
                fleets={fleets}
                selectedFleetId={selectedFleetId}
                onSelectFleet={selectFleet}
                isFleetSelectionLocked={Boolean(activeRoomId)}
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
