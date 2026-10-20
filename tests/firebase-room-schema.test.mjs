import assert from "node:assert/strict";
import test from "node:test";
import {
    applyWeaponDamage,
    createFleetSnapshot,
    createRoomId,
    createRoomRecord,
    advanceBattleTurn,
    getRoomSideForUser,
    maximumShipsPerFleet,
    normalizeDisplayName,
    roomLifetimeMs,
    roomSchemaVersion,
    startBattleTurn,
} from "../firebase/room-schema.mjs";

const fleet = {
    id: "fleet-1",
    name: "Battle Group Gothic",
    selectedFaction: "Imperial Navy",
    limit: 1500,
    commander: "fleet-admiral",
    flagshipId: "ship-1",
    rerolls: 1,
    ships: [{ id: "ship-1", classId: "lunar", name: "His Will", squadron: "" }],
};

test("room IDs contain 128 bits from the supplied cryptographic source", () => {
    const cryptoApi = {
        getRandomValues: (bytes) => {
            bytes.fill(171);
            return bytes;
        },
    };

    assert.equal(createRoomId(cryptoApi), "ab".repeat(16));
});

test("display names are trimmed, bounded, and receive a useful fallback", () => {
    assert.equal(normalizeDisplayName("  Admiral Spire  "), "Admiral Spire");
    assert.equal(normalizeDisplayName(""), "Admiral");
    assert.equal(normalizeDisplayName("x".repeat(100)), "x".repeat(32));
});

test("fleet snapshots are detached from the saved local fleet", () => {
    const snapshot = createFleetSnapshot(fleet);
    snapshot.ships[0].name = "Renamed in room";

    assert.equal(fleet.ships[0].name, "His Will");
    assert.throws(() => createFleetSnapshot({ ...fleet, ships: Array(maximumShipsPerFleet + 1) }));
});

test("new rooms assign the host and use the versioned room format", () => {
    const originalNow = Date.now;
    Date.now = () => 1_000;

    try {
        const room = createRoomRecord({
            hostUid: "host-uid",
            displayName: "  Josiah  ",
            fleet,
            timestamp: 900,
        });

        assert.equal(room.meta.schemaVersion, roomSchemaVersion);
        assert.equal(room.meta.expiresAt, 1_000 + roomLifetimeMs);
        assert.equal(room.players["host-uid"].displayName, "Josiah");
        assert.equal(room.sides.host.ownerUid, "host-uid");
        assert.equal(getRoomSideForUser(room, "host-uid"), "host");
        assert.equal(getRoomSideForUser(room, "stranger"), "");
        assert.deepEqual(room.turn, { round: 1, firstSide: "", activeSide: "" });
    } finally {
        Date.now = originalNow;
    }
});

test("a game round advances only after both players complete a turn", () => {
    const firstTurn = startBattleTurn("guest");
    const secondPlayerTurn = advanceBattleTurn(firstTurn);
    const nextRound = advanceBattleTurn(secondPlayerTurn);

    assert.deepEqual(firstTurn, { round: 1, firstSide: "guest", activeSide: "guest" });
    assert.deepEqual(secondPlayerTurn, { round: 1, firstSide: "guest", activeSide: "host" });
    assert.deepEqual(nextRound, { round: 2, firstSide: "guest", activeSide: "guest" });
});

test("weapon damage consumes shields before reducing hull", () => {
    assert.deepEqual(
        applyWeaponDamage({ hull: 8, shields: 2 }, 1, { hull: 8, shields: 2 }),
        { hull: 8, shields: 1 },
    );
    assert.deepEqual(
        applyWeaponDamage({ hull: 8, shields: 1 }, 3, { hull: 8, shields: 2 }),
        { hull: 6, shields: 0 },
    );
});

test("weapon damage uses profile defaults and cannot reduce hull below zero", () => {
    assert.deepEqual(
        applyWeaponDamage(null, 20, { hull: 6, shields: 1 }),
        { hull: 0, shields: 0 },
    );
    assert.deepEqual(
        applyWeaponDamage({ hull: 4, shields: 0 }, 0, { hull: 6, shields: 1 }),
        { hull: 4, shields: 0 },
    );
});

test("shield-bypassing weapon damage strikes hull before normal damage reaches shields", () => {
    assert.deepEqual(
        applyWeaponDamage(
            { hull: 8, shields: 2 },
            3,
            { hull: 8, shields: 2, shieldBypassingDamage: 1 },
        ),
        { hull: 7, shields: 0 },
    );
    assert.deepEqual(
        applyWeaponDamage(
            { hull: 8, shields: 2 },
            2,
            { hull: 8, shields: 2, shieldBypassingDamage: 5 },
        ),
        { hull: 6, shields: 2 },
    );
});
