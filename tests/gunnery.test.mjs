import assert from "node:assert/strict";
import test from "node:test";
import {
    getGunneryColumn,
    getGunneryDice,
    parseDiceResults,
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

test("physical and digital dice results normalize to D6 values", () => {
    assert.deepEqual(parseDiceResults("6, 4  2"), [6, 4, 2]);
    assert.deepEqual(rollDice(3, () => 0), [1, 1, 1]);
    assert.throws(() => parseDiceResults("6, 7"));
});
