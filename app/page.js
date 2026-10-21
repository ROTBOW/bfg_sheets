"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import FleetMenu from "@/components/FleetMenu";
import MirroredShip from "@/components/MirroredShip";
import ShipDrawers from "@/components/ShipDrawers";
import ShipViewer from "@/components/ShipViewer";
import TurnCounter from "@/components/TurnCounter";
import {
    getActiveRoomFleetId,
    getActiveRoomId,
    getServerActiveRoomId,
    subscribeToActiveRoom,
} from "@/firebase/active-room";
import { ensureAnonymousUser } from "@/firebase/auth";
import {
    clearStartingSpecialOrders,
    clearLiveRoll,
    damageEnemyShip,
    launchActiveOrdnance,
    publishLiveRoll,
    removeActiveOrdnance,
    updateActiveOrdnanceStrength,
    subscribeToRoom,
    updateShipBattleState,
} from "@/firebase/room-service";
import { getRoomSideForUser } from "@/firebase/room-schema.mjs";
import { battleProfiles, createShipBattleState } from "@/lib/battle-profiles";
import { getDefaultFleetId, loadFleetLibrary } from "@/lib/fleet-storage.mjs";
import { getShip, storageKey } from "@/lib/fleets.mjs";
import { getProfileUrl, getVesselPoints } from "@/lib/ship-upgrades.mjs";
import { countShipsThatCanFire } from "@/lib/turn-warning.mjs";

/** Coordinates saved fleets, room synchronization, and the active ship views. */
const BattleTracker = () => {
    const [fleets, setFleets] = useState([]);
    const [selectedFleetId, setSelectedFleetId] = useState("");
    const [selectedShipId, setSelectedShipId] = useState("");
    const [selectedEnemyShipId, setSelectedEnemyShipId] = useState("");
    const [battleStates, setBattleStates] = useState({});
    const [room, setRoom] = useState(null);
    const [localSide, setLocalSide] = useState("");
    const [localLiveRoll, setLocalLiveRoll] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [storageMessage, setStorageMessage] = useState("");
    const clearedOrdersForTurn = useRef("");
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
                setStorageMessage(
                    library.saveError
                        ? "Demo fleet could not be saved. Browser storage is unavailable or full."
                        : "",
                );
            } catch {
                setStorageMessage(
                    "Saved fleets could not be read. Stored data has not been changed. Check browser storage access and reload.",
                );
            }

            setLoaded(true);
        };

        const onStorage = (event) => {
            if (event.key === storageKey || event.key === null) {
                loadFleets();
            }
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

    useEffect(() => {
        const turn = room?.turn;

        if (!activeRoomId || !localSide || turn?.activeSide !== localSide) {
            return;
        }

        const turnKey = `${activeRoomId}:${turn.round}:${turn.activeSide}`;

        if (clearedOrdersForTurn.current === turnKey) {
            return;
        }

        clearedOrdersForTurn.current = turnKey;
        clearStartingSpecialOrders({
            roomId: activeRoomId,
            side: localSide,
        }).catch(() => {
            clearedOrdersForTurn.current = "";
            setStorageMessage("Expired special orders could not be cleared. Check your connection.");
        });
    }, [activeRoomId, localSide, room?.turn]);

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
    const enemySide = connectedLocalSide === "host"
        ? "guest"
        : connectedLocalSide === "guest"
            ? "host"
            : "";
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
    const shipsThatCanFire = connectedRoom && connectedLocalSide
        ? countShipsThatCanFire(
            vessels,
            fleetBattleStates,
            connectedRoom.turn?.round || 1,
            connectedLocalSide,
        )
        : 0;
    const enemyHasSpecialOrders = Object.values(enemyBattleStates).some((battleState) => (
        battleState.order && battleState.order !== "No special orders"
    ));
    const commandChecksBlocked = Object.values(fleetBattleStates).some((battleState) => (
        battleState.commandCheckFailed === true
        && battleState.commandCheckRound === (connectedRoom?.turn?.round || 1)
        && battleState.commandCheckTurnSide === (connectedRoom?.turn?.activeSide || "")
    ));

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

        setBattleStates((previous) => ({
            ...previous,
            [fleet.id]: {
                ...previous[fleet.id],
                [vessel.id]: { ...current, ...updates },
            },
        }));

        if (activeRoomId && connectedLocalSide) {
            updateShipBattleState({
                roomId: activeRoomId,
                side: connectedLocalSide,
                shipId: vessel.id,
                shipName: vessel.name,
                round: connectedRoom?.turn?.round || 1,
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

    /** Sends inflicted damage to the opposing ship named by a firing record. */
    const damageSelectedEnemyShip = async (entry) => {
        if (!entry.damage) {
            return;
        }

        const damagedVessel = enemyVessels.find((candidate) => candidate.id === entry.targetShipId);

        if (!damagedVessel?.profile) {
            throw new Error("The target vessel is no longer available.");
        }

        const bypassMessage = entry.shieldBypassingDamage
            ? ` ${entry.shieldBypassingDamage} bypassed shields.`
            : "";

        await damageEnemyShip({
            roomId: activeRoomId,
            targetSide: enemySide,
            shipId: damagedVessel.id,
            damage: entry.damage,
            maximumHull: damagedVessel.profile.stats.hull,
            maximumShields: damagedVessel.profile.stats.shields,
            shieldBypassingDamage: entry.shieldBypassingDamage,
            reactiveHullSave: damagedVessel.profile.stats.reactiveHullSave ?? null,
            targetFaction: damagedVessel.profile.faction,
            targetType: damagedVessel.profile.type,
            message: `${vessel.name}'s ${entry.weaponName} inflicted ${entry.damage} damage.${bypassMessage}`,
        });
    };

    /** Shares a resolved roll so the opposing browser can replay its presentation. */
    const shareLiveRoll = async (liveRoll) => {
        setLocalLiveRoll(liveRoll);
        await publishLiveRoll({ roomId: activeRoomId, liveRoll });
    };

    /** Clears the transient roll without changing the recorded attack history. */
    const dismissLiveRoll = async () => {
        setLocalLiveRoll(null);
        await clearLiveRoll(activeRoomId);
    };

    /** Launches ordnance without applying damage or binding it to the selected target. */
    const launchOrdnance = async (ordnance) => {
        await launchActiveOrdnance({ roomId: activeRoomId, ordnance });
        updateSelectedShip((current) => ({
            spentOrdnance: [...new Set([...current.spentOrdnance, ordnance.weaponIndex])],
            message: `${ordnance.weaponName} launched at strength ${ordnance.strength}.`,
        }));
    };

    /** Applies an active-ordnance hit and removes its battlefield marker. */
    const resolveOrdnance = async (ordnance, attack, targetSide) => {
        const targetFleet = targetSide === connectedLocalSide ? vessels : enemyVessels;
        const damagedVessel = targetFleet.find((candidate) => candidate.id === attack.targetShipId);

        if (!damagedVessel?.profile) {
            throw new Error("The target vessel is no longer available.");
        }

        if (attack.damage) {
            await damageEnemyShip({
                roomId: activeRoomId,
                targetSide,
                shipId: damagedVessel.id,
                damage: attack.damage,
                maximumHull: damagedVessel.profile.stats.hull,
                maximumShields: damagedVessel.profile.stats.shields,
                shieldBypassingDamage: attack.shieldBypassingDamage,
                reactiveHullSave: damagedVessel.profile.stats.reactiveHullSave ?? null,
                targetFaction: damagedVessel.profile.faction,
                targetType: damagedVessel.profile.type,
                message: `${ordnance.attackerName}'s ${ordnance.weaponName} inflicted ${attack.damage} damage.`,
            });
        }

        if (attack.remainingStrength > 0) {
            await updateActiveOrdnanceStrength({
                roomId: activeRoomId,
                ordnanceId: ordnance.id,
                strength: attack.remainingStrength,
            });
        } else {
            await removeActiveOrdnance({ roomId: activeRoomId, ordnanceId: ordnance.id });
        }
        await dismissLiveRoll().catch(() => {});
    };

    if (!loaded) {
        return <main role="status">Loading saved fleets…</main>;
    }

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
                    <TurnCounter
                        roomId={activeRoomId}
                        turn={connectedRoom.turn}
                        localSide={connectedLocalSide}
                        friendlyName={fleet.name}
                        enemyName={enemyFleet.name}
                        shipsThatCanFire={shipsThatCanFire}
                    />
                    <MirroredShip
                        ship={friendlyShip}
                        vessel={vessel}
                        battleState={state}
                        leadership={fleet.flagshipId === vessel.id ? commanderLeadership[fleet.commander] : undefined}
                        onUpdate={updateSelectedShip}
                        onDamageTarget={damageSelectedEnemyShip}
                        onRoll={shareLiveRoll}
                        onClearRoll={dismissLiveRoll}
                        onLaunchOrdnance={launchOrdnance}
                        target={enemyVessel}
                        targetShip={enemyShip}
                        targets={enemyVessels
                            .filter((candidate) => candidate.profile)
                            .map((candidate) => ({
                                vessel: candidate,
                                ship: candidate.profile,
                            }))}
                        round={connectedRoom.turn?.round || 1}
                        turnSide={connectedRoom.turn?.activeSide || ""}
                        isActiveTurn={connectedRoom.turn?.activeSide === connectedLocalSide}
                        hasEnemyOnSpecialOrders={enemyHasSpecialOrders}
                        commandChecksBlocked={commandChecksBlocked}
                    />
                    <ShipDrawers
                        friendlyShip={{ ship: friendlyShip, vessel, battleState: state, onUpdate: updateSelectedShip }}
                        enemyShip={{ ship: enemyShip, vessel: enemyVessel, battleState: enemyState }}
                        liveRoll={localLiveRoll || connectedRoom.liveRoll}
                        localSide={connectedLocalSide}
                        activeOrdnance={Object.values(connectedRoom.activeOrdnance || {})}
                        ordnanceTargets={[
                            ...enemyVessels
                                .filter((candidate) => candidate.profile)
                                .map((candidate) => ({ vessel: candidate, ship: candidate.profile, side: enemySide })),
                            ...vessels
                                .filter((candidate) => candidate.profile)
                                .map((candidate) => ({ vessel: candidate, ship: candidate.profile, side: connectedLocalSide })),
                        ]}
                        turnSide={connectedRoom.turn?.activeSide || ""}
                        onResolveOrdnance={resolveOrdnance}
                        onRoll={shareLiveRoll}
                        onClearRoll={dismissLiveRoll}
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
                            <a
                                className="secondary-button rules-link"
                                href={getProfileUrl(getShip(vessel.classId))}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Open ship rules ↗
                            </a>
                        </>
                    ) : (
                        <Link className="secondary-button" href="/fleet-creator">Open fleet builder</Link>
                    )}
                </div>
            )}
        </main>
    );
};

export default BattleTracker;
