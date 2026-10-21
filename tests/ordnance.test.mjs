import assert from "node:assert/strict";
import test from "node:test";
import {
    getActiveAttackCraftStrength,
    getAttackCraftCapacity,
    resolveOrdnanceHit,
} from "../lib/ordnance.mjs";

const fixedRolls = (rolls) => {
    let index = 0;

    return () => (rolls[index++] - 1) / 6;
};

test("turrets reduce a torpedo salvo before surviving torpedoes test armour", () => {
    const result = resolveOrdnanceHit(
        { weaponType: "Torpedo", strength: 6, turrets: 2, armour: 5 },
        fixedRolls([4, 2, 6, 5, 3, 1, 4]),
    );

    assert.deepEqual(result.turretRolls, [4, 2]);
    assert.equal(result.survivingStrength, 5);
    assert.deepEqual(result.attackRolls, [6, 5, 3, 1, 4]);
    assert.equal(result.damage, 2);
    assert.equal(result.remainingStrength, 3);
});

test("massed turrets add up to three defensive dice without reducing bomber attack dice", () => {
    const result = resolveOrdnanceHit(
        { weaponType: "Launch Bay", strength: 2, turrets: 2, supportingShips: 3, armour: 5 },
        fixedRolls([1, 1, 1, 1, 1, 6, 5, 6, 5, 4, 3, 2, 1]),
    );

    assert.equal(result.turretRolls.length, 5);
    assert.deepEqual(result.bomberAttackCounts, [6 - 2, 5 - 2]);
});

test("attack-craft capacity and active strength are fleet-wide", () => {
    const vessels = [
        { profile: { weapons: [{ type: "Launch Bay", strength: 4 }, { type: "Torpedo", strength: 6 }] } },
        { profile: { weapons: [{ type: "Launch Bay", strength: 2 }] } },
    ];
    const markers = [
        { sourceSide: "host", weaponType: "Launch Bay", strength: 3 },
        { sourceSide: "host", weaponType: "Torpedo", strength: 6 },
        { sourceSide: "guest", weaponType: "Launch Bay", strength: 2 },
    ];

    assert.equal(getAttackCraftCapacity(vessels), 6);
    assert.equal(getActiveAttackCraftStrength(markers, "host"), 3);
});

test("surviving bombers each generate D6 minus target-turret attack dice", () => {
    const result = resolveOrdnanceHit(
        { weaponType: "Launch Bay", strength: 3, turrets: 2, armour: 5 },
        fixedRolls([4, 1, 6, 5, 3, 6, 5, 4, 2, 1, 1]),
    );

    assert.equal(result.survivingStrength, 2);
    assert.deepEqual(result.bomberAttackCounts, [6 - 2, 5 - 2]);
    assert.deepEqual(result.attackRolls, [3, 6, 5, 4, 2, 1, 1]);
    assert.equal(result.damage, 2);
    assert.equal(result.remainingStrength, 0);
});
