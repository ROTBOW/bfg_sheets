import assert from "node:assert/strict";
import test from "node:test";
import { createDemoFleet, createFleet } from "../lib/fleets.mjs";
import { exportFleetJson, importFleetJson } from "../lib/fleet-transfer.mjs";

test("JSON round trip preserves the roster and remaps the flagship with fresh identities", () => {
    const fleet = createDemoFleet();
    fleet.flagshipId = fleet.ships[1].id;
    const original = structuredClone(fleet);
    const json = exportFleetJson(fleet);
    const imported = importFleetJson(json);
    const repeated = importFleetJson(json);

    assert.notEqual(imported.id, fleet.id);
    assert.notEqual(repeated.id, imported.id);
    assert.equal(imported.flagshipId, imported.ships[1].id);
    for (const [index, ship] of imported.ships.entries()) {
        assert.notEqual(ship.id, fleet.ships[index].id);
        assert.notEqual(ship.id, repeated.ships[index].id);
        assert.deepEqual({ ...ship, id: fleet.ships[index].id }, fleet.ships[index]);
    }
    assert.deepEqual({ ...imported, id: fleet.id, ships: fleet.ships, flagshipId: fleet.flagshipId }, fleet);
    assert.deepEqual(fleet, original);
});

test("empty draft fleets can be exported and imported", () => {
    const imported = importFleetJson(exportFleetJson(createFleet()));
    assert.deepEqual(imported.ships, []);
    assert.equal(imported.flagshipId, "");
});

test("invalid JSON, incompatible versions, invalid ships, and library exports are rejected", () => {
    const fleet = createDemoFleet();
    const invalidShip = structuredClone(fleet);
    invalidShip.ships[0].classId = "unknown-class";
    const invalidInputs = [
        "not JSON",
        "null",
        "{}",
        JSON.stringify({ version: 2, fleets: [fleet] }),
        JSON.stringify({ version: 1, fleets: [] }),
        JSON.stringify({ version: 1, fleets: [fleet, createFleet()] }),
        exportFleetJson(invalidShip),
    ];

    for (const raw of invalidInputs) {
        assert.throws(() => importFleetJson(raw));
    }
});
