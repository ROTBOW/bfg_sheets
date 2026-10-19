import assert from "node:assert/strict";
import test from "node:test";
import { getDefaultFleetId, loadFleetLibrary } from "../lib/fleet-storage.mjs";
import { createFleet, storageKey } from "../lib/fleets.mjs";

const createStorage = (initial = null) => {
    let value = initial;
    return {
        getItem: (key) => {
            assert.equal(key, storageKey);
            return value;
        },
        setItem: (key, next) => {
            assert.equal(key, storageKey);
            value = next;
        },
    };
};

test("tracker-first and builder-first visits share one persisted demo fleet", () => {
    const storage = createStorage();
    const first = loadFleetLibrary(storage);
    const second = loadFleetLibrary(storage);
    assert.deepEqual(second, first);
    assert.equal(first.fleets.length, 1);
    assert.equal(first.fleets[0].name, "Demo fleet");
    assert.deepEqual(first.fleets[0].ships.map((ship) => ship.name), ["His Will", "Steadfast"]);
    assert.ok(first.fleets[0].ships.every((ship) => ship.classId === "lunar"));
});

test("demo is preferred over other saved fleets, with safe empty-library fallback", () => {
    const other = createFleet();
    const demo = { ...createFleet(), name: "Demo fleet" };
    assert.equal(getDefaultFleetId([other, demo]), demo.id);
    assert.equal(getDefaultFleetId([other]), other.id);
    assert.equal(getDefaultFleetId([]), "");
    const storage = createStorage(JSON.stringify({ version: 1, fleets: [] }));
    assert.deepEqual(loadFleetLibrary(storage), { fleets: [], saveError: false });
});

test("storage errors never overwrite corrupt saved fleets or claim a successful save", () => {
    const storage = createStorage("invalid data");
    assert.throws(() => loadFleetLibrary(storage));
    assert.equal(storage.getItem(storageKey), "invalid data");
    const unavailable = { getItem: () => null, setItem: () => { throw new Error("Quota exceeded"); } };
    assert.equal(loadFleetLibrary(unavailable).saveError, true);
});
