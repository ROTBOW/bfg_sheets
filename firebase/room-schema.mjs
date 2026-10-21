export const roomSchemaVersion = 1;
export const roomLifetimeMs = 7 * 24 * 60 * 60 * 1000;
export const maximumDisplayNameLength = 32;
export const maximumShipsPerFleet = 100;

const roomIdBytes = 16;

/**
 * Applies incoming weapon damage to shields before hull without exceeding ship limits.
 *
 * @param {object|null} battleState Current stored battle state.
 * @param {number} damage Non-negative whole-number damage to apply.
 * @param {object} maximums Ship profile maximums and shield-bypassing damage.
 * @returns {{ hull: number, shields: number }} Updated defensive values.
 */
export const applyWeaponDamage = (battleState, damage, maximums) => {
    const maximumHull = Math.max(0, Number(maximums?.hull) || 0);
    const maximumShields = Math.max(0, Number(maximums?.shields) || 0);
    const currentHull = Math.min(maximumHull, Math.max(0, Number(battleState?.hull ?? maximumHull)));
    const currentShields = Math.min(maximumShields, Math.max(0, Number(battleState?.shields ?? maximumShields)));
    const incomingDamage = Number.isInteger(damage) && damage > 0 ? damage : 0;
    const requestedBypassingDamage = Number(maximums?.shieldBypassingDamage);
    const shieldBypassingDamage = Number.isInteger(requestedBypassingDamage)
        ? Math.min(incomingDamage, Math.max(0, requestedBypassingDamage))
        : 0;
    const hullAfterBypassingDamage = Math.max(0, currentHull - shieldBypassingDamage);
    const remainingDamage = incomingDamage - shieldBypassingDamage;
    const shieldDamage = Math.min(currentShields, remainingDamage);
    const hullDamage = remainingDamage - shieldDamage;

    return {
        hull: Math.max(0, hullAfterBypassingDamage - hullDamage),
        shields: currentShields - shieldDamage,
    };
};

/** Rolls a Necron reactive-hull save against each non-bypassing point of damage. */
export const resolveReactiveHullDamage = (
    damage,
    save,
    shieldBypassingDamage = 0,
    random = Math.random,
) => {
    const incomingDamage = Number.isInteger(damage) && damage > 0 ? damage : 0;
    const bypassingDamage = Math.min(
        incomingDamage,
        Math.max(0, Number(shieldBypassingDamage) || 0),
    );
    const saveThreshold = Number.parseInt(save, 10);

    if (!Number.isInteger(saveThreshold) || saveThreshold < 2 || saveThreshold > 6) {
        return { damage: incomingDamage, savedDamage: 0, rolls: [] };
    }

    const rolls = Array.from(
        { length: incomingDamage - bypassingDamage },
        () => Math.floor(random() * 6) + 1,
    );
    const savedDamage = rolls.filter((roll) => roll >= saveThreshold).length;

    return {
        damage: incomingDamage - savedDamage,
        savedDamage,
        rolls,
    };
};

/**
 * Creates an unguessable 128-bit room identifier encoded as lowercase hex.
 *
 * @param {Crypto} [cryptoApi=globalThis.crypto] Cryptographic source; injectable for tests.
 * @returns {string} A 32-character room identifier.
 * @throws {Error} When secure random generation is unavailable.
 */
export const createRoomId = (cryptoApi = globalThis.crypto) => {
    if (!cryptoApi?.getRandomValues) {
        throw new Error("Secure random values are unavailable in this browser.");
    }

    const bytes = cryptoApi.getRandomValues(new Uint8Array(roomIdBytes));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

/**
 * Produces the bounded public name stored with a room participant.
 *
 * @param {unknown} displayName User-provided name.
 * @returns {string} A trimmed name, or `Admiral` when the input is empty.
 */
export const normalizeDisplayName = (displayName) => {
    const normalizedName = String(displayName || "").trim();

    if (!normalizedName) {
        return "Admiral";
    }

    return normalizedName.slice(0, maximumDisplayNameLength);
};

/**
 * Validates basic room limits and deep-clones a local fleet for online play.
 * The detached copy prevents later fleet-builder edits from changing a battle.
 *
 * @param {object} fleet Local fleet selected by the player.
 * @returns {object} A JSON-safe, detached fleet snapshot.
 * @throws {Error} When the fleet or its ship list is invalid or oversized.
 */
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

/**
 * Builds the initial versioned database record for a host and their fleet.
 *
 * @param {object} options Room creation values.
 * @param {string} options.hostUid Authenticated host UID.
 * @param {unknown} options.displayName Public host name.
 * @param {object} options.fleet Fleet selected for this battle.
 * @param {number|object} options.timestamp Firebase timestamp or deterministic test value.
 * @returns {object} A new room record ready to write to Realtime Database.
 * @throws {Error} When no host is present or the fleet snapshot is invalid.
 */
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
        turn: {
            round: 1,
            firstSide: "",
            activeSide: "",
        },
        report: {
            status: "active",
            result: "",
            startedAt: timestamp,
            updatedAt: timestamp,
            endedAt: 0,
            events: {},
        },
    };
};

/** Creates round one after the players determine which side takes the first turn. */
export const startBattleTurn = (firstSide) => {
    if (firstSide !== "host" && firstSide !== "guest") {
        throw new Error("Choose the host or guest fleet to take the first turn.");
    }

    return {
        round: 1,
        firstSide,
        activeSide: firstSide,
    };
};

/** Advances one player turn, increasing the round after both players have acted. */
export const advanceBattleTurn = (turn) => {
    const firstSide = turn?.firstSide;
    const activeSide = turn?.activeSide;
    const round = Number.isInteger(turn?.round) && turn.round > 0 ? turn.round : 1;

    if (!firstSide || !activeSide) {
        throw new Error("Choose which fleet takes the first turn before advancing.");
    }

    const secondSide = firstSide === "host" ? "guest" : "host";

    if (activeSide === firstSide) {
        return { round, firstSide, activeSide: secondSide };
    }

    return { round: round + 1, firstSide, activeSide: firstSide };
};

/**
 * Finds the player-controlled side assigned to a Firebase user.
 *
 * @param {object|null} room Current room snapshot.
 * @param {string} uid Firebase user ID.
 * @returns {"host"|"guest"|""} The owned side, or an empty string for spectators.
 */
export const getRoomSideForUser = (room, uid) => {
    if (!room || !uid) return "";
    if (room.sides?.host?.ownerUid === uid) return "host";
    if (room.sides?.guest?.ownerUid === uid) return "guest";
    return "";
};
