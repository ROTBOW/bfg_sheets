import assert from "node:assert/strict";
import test from "node:test";
import {
    getNovaCannonHits,
    getNovaScatterDiceCount,
    rollNovaScatter,
} from "../lib/nova-cannon.mjs";

test("Nova Cannon range selects the correct number of scatter dice", () => {
    assert.equal(getNovaScatterDiceCount(30), 1);
    assert.equal(getNovaScatterDiceCount(45), 1);
    assert.equal(getNovaScatterDiceCount(46), 2);
    assert.equal(getNovaScatterDiceCount(60), 2);
    assert.equal(getNovaScatterDiceCount(61), 3);
    assert.equal(getNovaScatterDiceCount(150), 3);
    assert.throws(() => getNovaScatterDiceCount(29));
    assert.throws(() => getNovaScatterDiceCount(151));
});

test("Nova Cannon scatter die has two hit faces and records arrow direction", () => {
    assert.deepEqual(rollNovaScatter(() => 0), { result: "hit", angleDegrees: null });

    const values = [0.5, 0.25];
    assert.deepEqual(rollNovaScatter(() => values.shift()), {
        result: "arrow",
        angleDegrees: 90,
    });
});

test("Nova Cannon template position determines automatic hits", () => {
    assert.equal(getNovaCannonHits("center", 6), 6);
    assert.equal(getNovaCannonHits("outer", 6), 1);
    assert.equal(getNovaCannonHits("miss", 6), 0);
    assert.throws(() => getNovaCannonHits("center", 0));
});
