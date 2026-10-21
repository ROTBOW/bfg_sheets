"use client";

import {
    get,
    onDisconnect,
    onValue,
    push,
    ref,
    remove,
    runTransaction,
    serverTimestamp,
    set,
    update,
} from "firebase/database";
import { ensureAnonymousUser } from "./auth";
import { getFirebaseServices } from "./client";
import {
    applyWeaponDamage,
    createFleetSnapshot,
    createRoomId,
    createRoomRecord,
    getRoomSideForUser,
    resolveReactiveHullDamage,
    normalizeDisplayName,
    advanceBattleTurn,
    startBattleTurn,
} from "./room-schema.mjs";
import { resolveAutomaticCriticals } from "../lib/critical-damage.mjs";

/**
 * Returns the database path for a capability-style room identifier.
 *
 * @param {string} roomId Secure room identifier from an invite.
 * @returns {string} Realtime Database path for the room.
 */
const roomPath = (roomId) => `rooms/${roomId}`;

/** Appends one bounded, authenticated event to the room's shared battle report. */
const appendBattleEvent = async ({ roomId, type, message, round = 1, side = "" }) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();
    const eventReference = push(ref(database, `${roomPath(roomId)}/report/events`));

    await set(eventReference, {
        type,
        message: String(message).slice(0, 500),
        round,
        side,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
    });

    await update(ref(database, `${roomPath(roomId)}/report`), {
        updatedAt: serverTimestamp(),
    });
};

/**
 * Creates a hosted room from a detached local fleet snapshot and registers presence.
 *
 * @param {object} options Room creation options.
 * @param {object} options.fleet Host fleet to snapshot.
 * @param {string} options.displayName Public host name.
 * @returns {Promise<{ roomId: string, room: object, user: import("firebase/auth").User }>} Created room details.
 */
export const createRoom = async ({ fleet, displayName }) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();
    const roomId = createRoomId();
    const room = createRoomRecord({
        hostUid: user.uid,
        displayName,
        fleet,
        timestamp: serverTimestamp(),
    });

    await set(ref(database, roomPath(roomId)), room);
    await registerPresence(roomId, user.uid);

    return { roomId, room, user };
};

/**
 * Claims the open guest side, or resumes the caller's existing side.
 * The multi-location update keeps the player record and guest fleet assignment atomic.
 *
 * @param {object} options Join options.
 * @param {string} options.roomId Room identifier from the invite.
 * @param {object} options.fleet Guest fleet to snapshot.
 * @param {string} options.displayName Public guest name.
 * @returns {Promise<{ roomId: string, side: "host"|"guest", user: import("firebase/auth").User }>} Assigned side details.
 * @throws {Error} When the room is missing, unavailable, or already has a guest.
 */
export const joinRoom = async ({ roomId, fleet, displayName }) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();
    const roomReference = ref(database, roomPath(roomId));
    const snapshot = await get(roomReference);

    if (!snapshot.exists()) {
        throw new Error("This battle room does not exist or has expired.");
    }

    const room = snapshot.val();
    const existingSide = getRoomSideForUser(room, user.uid);

    if (existingSide) {
        await registerPresence(roomId, user.uid);
        return { roomId, side: existingSide, user };
    }

    if (room.meta?.status !== "open") {
        throw new Error("This battle has already started or closed.");
    }

    if (room.sides?.guest?.ownerUid) {
        throw new Error("The opponent slot in this battle is already occupied.");
    }

    const updates = {
        [`players/${user.uid}`]: {
            displayName: normalizeDisplayName(displayName),
            role: "guest",
            connected: true,
            lastSeenAt: serverTimestamp(),
        },
        "sides/guest": {
            ownerUid: user.uid,
            ready: false,
            fleet: createFleetSnapshot(fleet),
            battle: {},
        },
    };

    await update(roomReference, updates);
    await registerPresence(roomId, user.uid);

    return { roomId, side: "guest", user };
};

/**
 * Subscribes to the complete room snapshot and reports null after room deletion.
 *
 * @param {string} roomId Room to observe.
 * @param {(room: object|null) => void} onRoom Snapshot callback.
 * @param {(error: Error) => void} [onError] Subscription error callback.
 * @returns {() => void} Function that detaches the realtime listener.
 */
export const subscribeToRoom = (roomId, onRoom, onError) => {
    const { database } = getFirebaseServices();
    const roomReference = ref(database, roomPath(roomId));

    return onValue(
        roomReference,
        (snapshot) => onRoom(snapshot.exists() ? snapshot.val() : null),
        onError,
    );
};

/** Publishes a short-lived dice presentation for both room participants. */
export const publishLiveRoll = async ({ roomId, liveRoll }) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();

    await set(ref(database, `${roomPath(roomId)}/liveRoll`), {
        ...liveRoll,
        createdBy: user.uid,
    });
};

/** Removes the active dice presentation after it is closed or committed. */
export const clearLiveRoll = async (roomId) => {
    await ensureAnonymousUser();
    const { database } = getFirebaseServices();

    await remove(ref(database, `${roomPath(roomId)}/liveRoll`));
};

/** Places one launched ordnance marker in the room-wide battlefield pool. */
export const launchActiveOrdnance = async ({ roomId, ordnance }) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();

    await set(ref(database, `${roomPath(roomId)}/activeOrdnance/${ordnance.id}`), {
        ...ordnance,
        createdBy: user.uid,
    });
};

/** Removes an owned ordnance marker after its attack has been recorded. */
export const removeActiveOrdnance = async ({ roomId, ordnanceId }) => {
    const { database } = getFirebaseServices();
    await remove(ref(database, `${roomPath(roomId)}/activeOrdnance/${ordnanceId}`));
};

/** Keeps a surviving torpedo salvo in play at its reduced strength. */
export const updateActiveOrdnanceStrength = async ({ roomId, ordnanceId, strength }) => {
    const { database } = getFirebaseServices();
    await update(ref(database, `${roomPath(roomId)}/activeOrdnance/${ordnanceId}`), { strength });
};

/**
 * Restores presence for a participant who already owns a side in a room.
 *
 * @param {string} roomId Previously active room identifier.
 * @returns {Promise<{ room: object, side: "host"|"guest", user: import("firebase/auth").User }>} Restored room identity.
 * @throws {Error} When the room no longer exists or this browser does not own a side.
 */
export const reconnectToRoom = async (roomId) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();
    const snapshot = await get(ref(database, roomPath(roomId)));

    if (!snapshot.exists()) {
        throw new Error("This battle room no longer exists.");
    }

    const room = snapshot.val();
    const side = getRoomSideForUser(room, user.uid);

    if (!side) {
        throw new Error("This browser no longer owns a fleet in that battle room.");
    }

    await registerPresence(roomId, user.uid);

    return { room, side, user };
};

/**
 * Subscribes to this browser's connection to Firebase Realtime Database.
 *
 * @param {(isConnected: boolean) => void} onChange Connection-state callback.
 * @returns {() => void} Function that detaches the connection listener.
 */
export const subscribeToFirebaseConnection = (onChange) => {
    const { database } = getFirebaseServices();

    return onValue(
        ref(database, ".info/connected"),
        (snapshot) => onChange(snapshot.val() === true),
    );
};

/**
 * Sends a per-player realtime handshake that the other participant can observe.
 *
 * @param {string} roomId Active room identifier.
 * @returns {Promise<void>} Resolves after Firebase accepts the handshake.
 */
export const sendRoomHandshake = async (roomId) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();

    await set(ref(database, `${roomPath(roomId)}/signals/${user.uid}`), {
        id: createRoomId(),
        sentAt: serverTimestamp(),
    });
};

/**
 * Marks the current participant offline without discarding their claimed side.
 * This lets the same anonymous browser identity reconnect to the battle later.
 *
 * @param {string} roomId Room to leave.
 * @returns {Promise<void>} Resolves after the offline state is stored.
 */
export const disconnectFromRoom = async (roomId) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();

    await update(ref(database, `${roomPath(roomId)}/players/${user.uid}`), {
        connected: false,
        lastSeenAt: serverTimestamp(),
    });
};

/**
 * Marks a participant online and schedules server-side offline timestamps.
 *
 * @param {string} roomId Room containing the participant.
 * @param {string} uid Authenticated participant UID.
 * @returns {Promise<void>} Resolves after presence hooks and the online state are stored.
 */
export const registerPresence = async (roomId, uid) => {
    const { database } = getFirebaseServices();
    const connectedReference = ref(database, `${roomPath(roomId)}/players/${uid}/connected`);
    const lastSeenReference = ref(database, `${roomPath(roomId)}/players/${uid}/lastSeenAt`);

    await onDisconnect(connectedReference).set(false);
    await onDisconnect(lastSeenReference).set(serverTimestamp());
    await update(ref(database), {
        [`${roomPath(roomId)}/players/${uid}/connected`]: true,
        [`${roomPath(roomId)}/players/${uid}/lastSeenAt`]: serverTimestamp(),
    });
};

/**
 * Merges tracker changes into one ship and records the authenticated writer.
 *
 * @param {object} options Battle-state update.
 * @param {string} options.roomId Active room identifier.
 * @param {"host"|"guest"} options.side Player-owned side.
 * @param {string} options.shipId Stable fleet ship identifier.
 * @param {object} options.changes Changed tracker fields only.
 * @returns {Promise<void>} Resolves after Firebase accepts the update.
 */
export const updateShipBattleState = async ({ roomId, side, shipId, shipName, round = 1, changes }) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();
    const battleReference = ref(database, `${roomPath(roomId)}/sides/${side}/battle/${shipId}`);
    const previousState = (await get(battleReference)).val() || {};

    await update(battleReference, {
        ...changes,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
    });

    const descriptions = [];
    const labels = { hull: "Hull", shields: "Shields", leadership: "Leadership" };

    for (const field of ["hull", "shields", "leadership"]) {
        if (changes[field] !== undefined && changes[field] !== previousState[field]) {
            descriptions.push(`${labels[field]} ${previousState[field] ?? "—"} → ${changes[field]}`);
        }
    }

    if (changes.order !== undefined && changes.order !== previousState.order) {
        descriptions.push(`Special orders: ${changes.order}`);
    }

    if (
        changes.criticalDamage !== undefined
        && JSON.stringify(changes.criticalDamage) !== JSON.stringify(previousState.criticalDamage || [])
    ) {
        const previousCount = previousState.criticalDamage?.length || 0;
        const nextCount = changes.criticalDamage?.length || 0;

        descriptions.push(previousCount === nextCount
            ? "Critical damage status updated"
            : `Critical damage ${previousCount} → ${nextCount}`);
    }

    if (changes.weaponFire?.length > (previousState.weaponFire?.length || 0)) {
        const attack = changes.weaponFire.at(-1);
        const allocation = attack.weaponType === "Lightning arc"
            ? ` (${attack.allocatedStrength} FP, ${attack.fireArc} arc)`
            : "";

        descriptions.push(`${attack.weaponName}${allocation} fired at ${attack.targetName}: ${attack.hits} hits, ${attack.damage} damage`);
    }

    if (descriptions.length) {
        await appendBattleEvent({
            roomId,
            type: changes.hull === 0 && previousState.hull !== 0 ? "ship-destroyed" : "ship-update",
            message: `${shipName || "Ship"}: ${descriptions.join(" · ")}`,
            round,
            side,
        });
    }
};

/**
 * Removes ordinary special orders when the owning fleet begins its next turn.
 * Brace for Impact remains until that player turn ends.
 *
 * @param {object} options Order cleanup options.
 * @param {string} options.roomId Active room identifier.
 * @param {"host"|"guest"} options.side Player-owned side beginning its turn.
 * @returns {Promise<void>} Resolves after stale orders are removed.
 */
export const clearStartingSpecialOrders = async ({ roomId, side }) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();
    const sideReference = ref(database, `${roomPath(roomId)}/sides/${side}`);
    const sideSnapshot = await get(sideReference);
    const sideData = sideSnapshot.val();

    if (sideData?.ownerUid !== user.uid) {
        throw new Error("Only the fleet owner can clear its expired special orders.");
    }

    const updates = {};

    for (const [shipId, battleState] of Object.entries(sideData.battle || {})) {
        if (!battleState.order || battleState.order === "No special orders" || battleState.order === "Brace for impact") {
            continue;
        }

        updates[`battle/${shipId}/order`] = "No special orders";
        updates[`battle/${shipId}/updatedAt`] = serverTimestamp();
        updates[`battle/${shipId}/updatedBy`] = user.uid;
    }

    if (Object.keys(updates).length) {
        await update(sideReference, updates);
    }
};

/** Removes Brace for Impact orders after the owning fleet completes its turn. */
const clearEndingBraceOrders = async ({ roomId, side, turn, user, database }) => {
    const sideReference = ref(database, `${roomPath(roomId)}/sides/${side}`);
    const sideData = (await get(sideReference)).val();

    if (sideData?.ownerUid !== user.uid) {
        throw new Error("Only the active fleet owner can end its turn.");
    }

    const updates = {};

    for (const [shipId, battleState] of Object.entries(sideData.battle || {})) {
        if (battleState.order !== "Brace for impact") {
            continue;
        }

        if (
            battleState.commandCheckRound === turn.round
            && battleState.commandCheckTurnSide === side
        ) {
            continue;
        }

        updates[`battle/${shipId}/order`] = "No special orders";
        updates[`battle/${shipId}/updatedAt`] = serverTimestamp();
        updates[`battle/${shipId}/updatedBy`] = user.uid;
    }

    if (Object.keys(updates).length) {
        await update(sideReference, updates);
    }
};

/**
 * Applies an attack to an opposing ship, consuming shields before hull.
 * Security Rules limit this cross-side write to the player whose turn is active.
 *
 * @param {object} options Incoming attack details.
 * @param {string} options.roomId Active room identifier.
 * @param {"host"|"guest"} options.targetSide Opposing side receiving damage.
 * @param {string} options.shipId Target ship identifier.
 * @param {number} options.damage Damage inflicted by the recorded attack.
 * @param {number} options.maximumHull Target profile's starting hull.
 * @param {number} options.maximumShields Target profile's starting shields.
 * @param {number} options.shieldBypassingDamage Damage applied directly to hull.
 * @param {string|null} options.reactiveHullSave Target's normal reactive-hull save.
 * @param {string} options.targetFaction Target faction used to select the critical table.
 * @param {string} options.targetType Target vessel type; escorts are destroyed by criticals.
 * @param {string} options.message Short attack summary for the target's tracker.
 * @returns {Promise<void>} Resolves after Firebase commits the damage.
 */
export const damageEnemyShip = async ({
    roomId,
    targetSide,
    shipId,
    damage,
    maximumHull,
    maximumShields,
    shieldBypassingDamage,
    reactiveHullSave = null,
    targetFaction = "Imperial Navy",
    targetType = "Cruiser",
    message,
}) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();
    const battleReference = ref(database, `${roomPath(roomId)}/sides/${targetSide}/battle/${shipId}`);
    const snapshot = await get(battleReference);
    const currentBattleState = snapshot.val();
    const activeSave = currentBattleState?.order === "Brace for impact"
        ? "2+"
        : reactiveHullSave;
    const reactiveHullResult = resolveReactiveHullDamage(
        damage,
        activeSave,
        shieldBypassingDamage,
    );
    const defenses = applyWeaponDamage(currentBattleState, reactiveHullResult.damage, {
        hull: maximumHull,
        shields: maximumShields,
        shieldBypassingDamage: Math.min(shieldBypassingDamage, reactiveHullResult.damage),
    });
    const currentHull = Number(currentBattleState?.hull ?? maximumHull);
    const hullDamage = Math.max(0, currentHull - defenses.hull);
    const criticalResult = resolveAutomaticCriticals(
        hullDamage,
        targetFaction,
        targetType === "Escort",
    );
    const criticalDamage = [
        ...(currentBattleState?.criticalDamage || []),
        ...criticalResult.criticals.map(({ id, typeId, source, status }) => ({
            id,
            typeId,
            source,
            status,
        })),
    ];
    const finalHull = criticalResult.escortDestroyed
        ? 0
        : Math.max(0, defenses.hull - criticalResult.extraDamage);
    const saveMessage = reactiveHullResult.rolls.length
        ? ` Reactive hull saved ${reactiveHullResult.savedDamage} damage (${reactiveHullResult.rolls.join(", ")}).`
        : "";
    const criticalMessage = criticalResult.escortDestroyed
        ? " Critical hit destroyed the escort."
        : criticalResult.criticals.length
            ? ` Critical checks ${criticalResult.criticalChecks.join(", ")}; ${criticalResult.criticals.length} critical hit${criticalResult.criticals.length === 1 ? "" : "s"}${criticalResult.extraDamage ? ` caused ${criticalResult.extraDamage} extra damage` : ""}.`
            : criticalResult.criticalChecks.length
                ? ` Critical checks ${criticalResult.criticalChecks.join(", ")}: no critical damage.`
                : "";

    await update(battleReference, {
        ...defenses,
        hull: finalHull,
        criticalDamage,
        message: `${message}${saveMessage}${criticalMessage}`,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
    });

    return { ...reactiveHullResult, criticalResult };
};

/**
 * Selects the first player or advances the shared player-turn counter atomically.
 *
 * @param {object} options Turn update.
 * @param {string} options.roomId Active room identifier.
 * @param {"start"|"advance"} options.action Requested transition.
 * @param {"host"|"guest"} [options.firstSide] Side chosen to act first.
 * @returns {Promise<void>} Resolves after Firebase commits the transition.
 */
export const updateBattleTurn = async ({ roomId, action, firstSide }) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();
    const turnReference = ref(database, `${roomPath(roomId)}/turn`);

    if (action === "advance") {
        const room = (await get(ref(database, roomPath(roomId)))).val();
        const side = getRoomSideForUser(room, user.uid);

        if (!side || room?.turn?.activeSide !== side) {
            throw new Error("Only the active player can end this turn.");
        }

        await clearEndingBraceOrders({
            roomId,
            side,
            turn: room.turn,
            user,
            database,
        });
    }

    const result = await runTransaction(turnReference, (currentTurn) => {
        if (action === "start") {
            return startBattleTurn(firstSide);
        }

        return advanceBattleTurn(currentTurn);
    });

    const nextTurn = result.snapshot.val();
    await appendBattleEvent({
        roomId,
        type: action === "start" ? "battle-started" : "turn-ended",
        message: action === "start"
            ? `${firstSide === "host" ? "Host" : "Guest"} fleet takes the first turn.`
            : `Turn ended. ${nextTurn.activeSide === "host" ? "Host" : "Guest"} fleet to act in round ${nextTurn.round}.`,
        round: nextTurn.round,
        side: nextTurn.activeSide,
    });
};

/** Finalizes the shared report and closes the room after local confirmation. */
export const endBattle = async ({ roomId, result }) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();
    const roomReference = ref(database, roomPath(roomId));
    const room = (await get(roomReference)).val();
    const side = getRoomSideForUser(room, user.uid);
    const round = room?.turn?.round || 1;

    await appendBattleEvent({
        roomId,
        type: "battle-ended",
        message: `Battle ended: ${result}.`,
        round,
        side,
    });

    const finalUpdates = {
        "report/status": "closed",
        "report/result": result,
        "report/endedAt": serverTimestamp(),
        "report/updatedAt": serverTimestamp(),
    };

    if (side === "host") {
        finalUpdates["meta/status"] = "closed";
        finalUpdates["meta/updatedAt"] = serverTimestamp();
    }

    await update(roomReference, finalUpdates);
};

/**
 * Changes the readiness flag for a player-owned side.
 *
 * @param {object} options Readiness update.
 * @param {string} options.roomId Active room identifier.
 * @param {"host"|"guest"} options.side Player-owned side.
 * @param {boolean} options.isReady Desired readiness state.
 * @returns {Promise<void>} Resolves after Firebase accepts the update.
 */
export const setSideReady = async ({ roomId, side, isReady }) => {
    const { database } = getFirebaseServices();
    await set(ref(database, `${roomPath(roomId)}/sides/${side}/ready`), Boolean(isReady));
};

/**
 * Marks a room closed. Security Rules restrict this lifecycle change to the host.
 *
 * @param {string} roomId Room to close.
 * @returns {Promise<void>} Resolves after the closed state is stored.
 */
export const closeRoom = async (roomId) => {
    const { database } = getFirebaseServices();
    await update(ref(database, `${roomPath(roomId)}/meta`), {
        status: "closed",
        updatedAt: serverTimestamp(),
    });
};

/**
 * Permanently removes a room. Security Rules restrict deletion to the host.
 *
 * @param {string} roomId Room to delete.
 * @returns {Promise<void>} Resolves after the room is removed.
 */
export const deleteRoom = async (roomId) => {
    const { database } = getFirebaseServices();
    await remove(ref(database, roomPath(roomId)));
};
