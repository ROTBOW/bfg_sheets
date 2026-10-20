import assert from "node:assert/strict";
import test from "node:test";
import {
    createFleetSnapshot,
    createRoomId,
    createRoomRecord,
    getRoomSideForUser,
    maximumShipsPerFleet,
    normalizeDisplayName,
    roomLifetimeMs,
    roomSchemaVersion,
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
    } finally {
        Date.now = originalNow;
    }
});
