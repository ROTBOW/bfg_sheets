"use client";

import {
    get,
    onDisconnect,
    onValue,
    ref,
    remove,
    serverTimestamp,
    set,
    update,
} from "firebase/database";
import { ensureAnonymousUser } from "./auth";
import { getFirebaseServices } from "./client";
import {
    createFleetSnapshot,
    createRoomId,
    createRoomRecord,
    getRoomSideForUser,
    normalizeDisplayName,
} from "./room-schema.mjs";

const roomPath = (roomId) => `rooms/${roomId}`;

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

export const subscribeToRoom = (roomId, onRoom, onError) => {
    const { database } = getFirebaseServices();
    const roomReference = ref(database, roomPath(roomId));

    return onValue(
        roomReference,
        (snapshot) => onRoom(snapshot.exists() ? snapshot.val() : null),
        onError,
    );
};

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

export const updateShipBattleState = async ({ roomId, side, shipId, changes }) => {
    const user = await ensureAnonymousUser();
    const { database } = getFirebaseServices();
    const battleReference = ref(database, `${roomPath(roomId)}/sides/${side}/battle/${shipId}`);

    await update(battleReference, {
        ...changes,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
    });
};

export const setSideReady = async ({ roomId, side, isReady }) => {
    const { database } = getFirebaseServices();
    await set(ref(database, `${roomPath(roomId)}/sides/${side}/ready`), Boolean(isReady));
};

export const closeRoom = async (roomId) => {
    const { database } = getFirebaseServices();
    await update(ref(database, `${roomPath(roomId)}/meta`), {
        status: "closed",
        updatedAt: serverTimestamp(),
    });
};

export const deleteRoom = async (roomId) => {
    const { database } = getFirebaseServices();
    await remove(ref(database, roomPath(roomId)));
};
