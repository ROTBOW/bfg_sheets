import assert from "node:assert/strict";
import test from "node:test";
import {
    canLockOnReroll,
    getEffectiveWeaponStrength,
    getOrderedMovement,
    getOrderedWeaponStrength,
    isWeaponDisabledByOrder,
    isWeaponDisabled,
} from "../lib/special-orders.mjs";
import { getWeaponAttackProfile } from "../lib/gunnery.mjs";

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

test("ships become crippled at half starting Hull and halve weapon Strength", () => {
    const battery = { type: "Battery", strength: 5 };

    assert.equal(getEffectiveWeaponStrength(battery, "No special orders", 5, 8), 5);
    assert.equal(getEffectiveWeaponStrength(battery, "No special orders", 4, 8), 3);
    assert.equal(getEffectiveWeaponStrength(battery, "No special orders", 3, 8), 3);
});

test("crippled and special-order penalties halve sequentially and round up", () => {
    const battery = { type: "Battery", strength: 5 };
    const torpedoes = { type: "Torpedo", strength: 5 };

    assert.equal(getEffectiveWeaponStrength(battery, "Brace for impact", 4, 8), 2);
    assert.equal(getEffectiveWeaponStrength(torpedoes, "Brace for impact", 4, 8), 2);
    assert.equal(getEffectiveWeaponStrength(torpedoes, "All ahead full", 4, 8), 3);
});

test("digital attacks use crippled Strength after combined modifiers", () => {
    const weapon = { type: "Lance", strength: 5 };
    const target = {
        type: "Cruiser",
        stats: { armour: { front: "6+", other: "5+" } },
    };
    const effectiveStrength = getEffectiveWeaponStrength(weapon, "Brace for impact", 4, 8);
    const attack = getWeaponAttackProfile({ ...weapon, strength: effectiveStrength }, target, "closing");

    assert.equal(effectiveStrength, 2);
    assert.equal(attack.diceCount, 2);
});

test("crippled ships cannot fire Nova Cannons", () => {
    const novaCannon = { type: "Nova Cannon", strength: 1 };

    assert.equal(isWeaponDisabled(novaCannon, "No special orders", 4, 8), true);
    assert.equal(isWeaponDisabled(novaCannon, "No special orders", 5, 8), false);
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
