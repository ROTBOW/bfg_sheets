import assert from "node:assert/strict";
import test from "node:test";
import { deriveBattleProfile } from "../lib/derived-battle-profile.mjs";
import { getWeaponAttackProfile } from "../lib/gunnery.mjs";

const profile = (weapons, stats = {}) => ({
    id: "test-cruiser",
    stats: {
        hull: 8,
        speedCm: 20,
        turnDegrees: 90,
        shields: 2,
        armour: { front: "5+", other: "5+" },
        turrets: 2,
        ...stats,
    },
    weapons,
});

test("nova cannon refit replaces prow torpedoes without mutating the base profile", () => {
    const baseProfile = profile([
        { name: "Port battery", type: "Battery", rangeCm: 30, strength: 6, arc: "Left" },
        { name: "Prow torpedoes", type: "Torpedo", rangeCm: 30, strength: 6, arc: "Front" },
    ]);
    const derivedProfile = deriveBattleProfile(baseProfile, { upgrades: ["nova-cannon"] });

    assert.equal(derivedProfile.weapons.some((weapon) => weapon.type === "Torpedo"), false);
    assert.deepEqual(derivedProfile.weapons.find((weapon) => weapon.type === "Nova Cannon"), {
        name: "Prow nova cannon",
        type: "Nova Cannon",
        rangeCm: null,
        rangeLabel: "30 – 150 cm",
        strength: 1,
        arc: "Front",
    });
    assert.equal(baseProfile.weapons[1].type, "Torpedo");
});

test("derived profiles apply weapon and characteristic refits together", () => {
    const baseProfile = profile([
        { name: "Port battery", type: "Battery", rangeCm: 30, strength: 6, arc: "Left" },
        { name: "Starboard battery", type: "Battery", rangeCm: 30, strength: 6, arc: "Right" },
    ]);
    const derivedProfile = deriveBattleProfile(baseProfile, {
        upgrades: ["extended-batteries", "targeting-matrix", "armoured-prow", "third-turret"],
    });

    assert.equal(derivedProfile.weapons[0].rangeCm, 45);
    assert.equal(derivedProfile.weapons[0].gunneryColumnShift, -1);
    assert.equal(derivedProfile.stats.armour.front, "6+");
    assert.equal(derivedProfile.stats.turnDegrees, 45);
    assert.equal(derivedProfile.stats.turrets, 3);
});

test("targeting matrix affects the digital battery attack", () => {
    const target = profile([]);
    target.type = "Cruiser";
    const baseWeapon = { type: "Battery", strength: 6 };
    const normalAttack = getWeaponAttackProfile(baseWeapon, target, "closing", 30);
    const upgradedAttack = getWeaponAttackProfile(
        { ...baseWeapon, gunneryColumnShift: -1 },
        target,
        "closing",
        30,
    );

    assert.equal(normalAttack.diceCount, 4);
    assert.equal(upgradedAttack.diceCount, 5);
});

test("fleet transfer data derives the same profile after serialization", () => {
    const baseProfile = profile([
        { name: "Prow lances", type: "Lance", rangeCm: 30, strength: 3, arc: "Front" },
    ]);
    const savedVessel = { id: "ship-1", classId: "dauntless", upgrades: ["prow-torpedoes"] };
    const transferredVessel = JSON.parse(JSON.stringify(savedVessel));

    assert.deepEqual(
        deriveBattleProfile(baseProfile, transferredVessel),
        deriveBattleProfile(baseProfile, savedVessel),
    );
    assert.equal(deriveBattleProfile(baseProfile, transferredVessel).weapons[0].type, "Torpedo");
});
