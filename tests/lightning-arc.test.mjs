import assert from "node:assert/strict";
import test from "node:test";
import {
    getLightningArcAvailability,
    getLightningFireArcs,
} from "../lib/lightning-arc.mjs";

test("normalizes the firing arcs listed on a Lightning Arc profile", () => {
    assert.deepEqual(getLightningFireArcs("Left/front/right"), [
        { id: "left", label: "Left" },
        { id: "front", label: "Front" },
        { id: "right", label: "Right" },
    ]);
});

test("Lightning Arc allocations consume strength and lock arcs and targets", () => {
    const availability = getLightningArcAvailability({
        weapon: { type: "Lightning arc", strength: 20, arc: "Left/front/right" },
        weaponIndex: 0,
        round: 2,
        turnSide: "host",
        weaponFire: [
            {
                weaponIndex: 0,
                weaponType: "Lightning arc",
                round: 2,
                turnSide: "host",
                targetShipId: "enemy-one",
                fireArc: "left",
                allocatedStrength: 5,
            },
            {
                weaponIndex: 0,
                weaponType: "Lightning arc",
                round: 1,
                turnSide: "host",
                targetShipId: "old-target",
                fireArc: "front",
                allocatedStrength: 20,
            },
        ],
    });

    assert.equal(availability.remainingStrength, 15);
    assert.deepEqual(availability.availableArcs.map((arc) => arc.id), ["front", "right"]);
    assert.equal(availability.usedTargetIds.has("enemy-one"), true);
    assert.equal(availability.usedTargetIds.has("old-target"), false);
});
