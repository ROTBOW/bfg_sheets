export const roomSchemaVersion = 1;
export const roomLifetimeMs = 7 * 24 * 60 * 60 * 1000;
export const maximumDisplayNameLength = 32;
export const maximumShipsPerFleet = 100;

const roomIdBytes = 16;

export const createRoomId = (cryptoApi = globalThis.crypto) => {
    if (!cryptoApi?.getRandomValues) {
        throw new Error("Secure random values are unavailable in this browser.");
    }

    const bytes = cryptoApi.getRandomValues(new Uint8Array(roomIdBytes));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const normalizeDisplayName = (displayName) => {
    const normalizedName = String(displayName || "").trim();

    if (!normalizedName) {
        return "Admiral";
    }

    return normalizedName.slice(0, maximumDisplayNameLength);
};

export const createFleetSnapshot = (fleet) => {
    if (!fleet || typeof fleet !== "object" || Array.isArray(fleet)) {
        throw new Error("Choose a valid fleet before joining a room.");
    }

    if (!Array.isArray(fleet.ships)) {
        throw new Error("The selected fleet has an invalid ship list.");
    }

    if (fleet.ships.length > maximumShipsPerFleet) {
        throw new Error(`A room fleet cannot contain more than ${maximumShipsPerFleet} ships.`);
    }

    return JSON.parse(JSON.stringify(fleet));
};

export const createRoomRecord = ({ hostUid, displayName, fleet, timestamp }) => {
    if (!hostUid) {
        throw new Error("A signed-in host is required to create a room.");
    }

    const owner = {
        displayName: normalizeDisplayName(displayName),
        role: "host",
        connected: true,
        lastSeenAt: timestamp,
    };

    return {
        meta: {
            schemaVersion: roomSchemaVersion,
            hostUid,
            status: "open",
            createdAt: timestamp,
            updatedAt: timestamp,
            expiresAt: Date.now() + roomLifetimeMs,
        },
        players: {
            [hostUid]: owner,
        },
        sides: {
            host: {
                ownerUid: hostUid,
                ready: false,
                fleet: createFleetSnapshot(fleet),
                battle: {},
            },
        },
    };
};

export const getRoomSideForUser = (room, uid) => {
    if (!room || !uid) return "";
    if (room.sides?.host?.ownerUid === uid) return "host";
    if (room.sides?.guest?.ownerUid === uid) return "guest";
    return "";
};
