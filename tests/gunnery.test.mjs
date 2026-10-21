import assert from "node:assert/strict";
import test from "node:test";
import {
    getGunneryColumn,
    getGunneryDice,
    getWeaponAttackProfile,
    parseDiceResults,
    resolveWeaponRolls,
    rollDice,
} from "../lib/gunnery.mjs";

test("target aspect and type select the correct gunnery column", () => {
    assert.equal(getGunneryColumn("closing", "Cruiser"), 1);
    assert.equal(getGunneryColumn("closing", "Escort"), 2);
    assert.equal(getGunneryColumn("abeam", "Cruiser"), 3);
    assert.equal(getGunneryColumn("abeam", "Escort"), 4);
});

test("gunnery dice follow the table and split firepower above twenty", () => {
    assert.equal(getGunneryDice(10, "closing", "Cruiser"), 7);
    assert.equal(getGunneryDice(10, "abeam", "Cruiser"), 4);
    assert.equal(getGunneryDice(32, "closing", "Cruiser"), 22);
});

test("target distance shifts battery fire along the Gunnery table", () => {
    assert.equal(getGunneryDice(10, "closing", "Cruiser", 15), 9);
    assert.equal(getGunneryDice(10, "closing", "Cruiser", 16), 7);
    assert.equal(getGunneryDice(10, "closing", "Cruiser", 31), 5);
});

test("physical and digital dice results normalize to D6 values", () => {
    assert.deepEqual(parseDiceResults("6, 4  2"), [6, 4, 2]);
    assert.deepEqual(rollDice(3, () => 0), [1, 1, 1]);
    assert.throws(() => parseDiceResults("6, 7"));
});

test("Necron lightning arcs always use the closing gunnery column", () => {
    const target = { type: "Cruiser", stats: { armour: { front: "6+", other: "5+" } } };
    const profile = getWeaponAttackProfile(
        { type: "Lightning arc", strength: 10 },
        target,
        "abeam",
    );

    assert.equal(profile.diceCount, 7);
    assert.equal(profile.hitThreshold, 5);
    assert.match(profile.note, /closing Gunnery-table column/);
    assert.match(profile.note, /target aspect.*armour value/);
});

test("Gauss particle whips use lance rolls and sixes bypass shields", () => {
    const target = { type: "Cruiser", stats: { armour: { front: "6+", other: "5+" } } };
    const profile = getWeaponAttackProfile(
        { type: "Gauss particle whip", strength: 4 },
        target,
        "closing",
    );

    assert.equal(profile.diceCount, 4);
    assert.equal(profile.hitThreshold, 4);
    assert.deepEqual(resolveWeaponRolls([3, 4, 5, 6], profile), {
        hits: 3,
        shieldBypassingHits: 1,
    });
});

test("star pulse generators roll once against the selected armour", () => {
    const target = { type: "Cruiser", stats: { armour: { front: "6+", other: "5+" } } };
    const profile = getWeaponAttackProfile(
        { type: "Star pulse generator", strength: 1 },
        target,
        "abeam",
    );

    assert.equal(profile.diceCount, 1);
    assert.equal(profile.hitThreshold, 5);
});
