import assert from "node:assert/strict";
import test from "node:test";
import {
    canLockOnReroll,
    getOrderedMovement,
    getOrderedWeaponStrength,
    isWeaponDisabledByOrder,
} from "../lib/special-orders.mjs";

test("orders halve the correct weapon classes and round up", () => {
    const battery = { type: "Battery", strength: 5 };
    const torpedoes = { type: "Torpedo", strength: 5 };

    assert.equal(getOrderedWeaponStrength(battery, "All ahead full"), 3);
    assert.equal(getOrderedWeaponStrength(torpedoes, "All ahead full"), 5);
    assert.equal(getOrderedWeaponStrength(torpedoes, "Brace for impact"), 3);
});

test("Lock On rerolls armament while restrictive orders disable Nova Cannons", () => {
    assert.equal(canLockOnReroll({ type: "Lance" }, "Lock on"), true);
    assert.equal(canLockOnReroll({ type: "Torpedo" }, "Lock on"), false);
    assert.equal(isWeaponDisabledByOrder({ type: "Nova Cannon" }, "Burn retros"), true);
});

test("movement summaries expose changed speed and turn limits", () => {
    assert.deepEqual(getOrderedMovement(20, 45, "Come to new heading"), {
        speed: "10–20",
        turns: "45° ×2",
        speedChanged: false,
        turnsChanged: true,
        explanation: "Come to New Heading allows up to two turns after moving the normal minimum distance for each.",
    });
    assert.equal(getOrderedMovement(20, 45, "Burn retros").speed, "0–10");
});
