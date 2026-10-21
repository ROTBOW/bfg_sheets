import assert from "node:assert/strict";
import test from "node:test";
import { countShipsThatCanFire } from "../lib/turn-warning.mjs";

const vessel = (id, weaponCount = 2) => ({
    id,
    profile: {
        stats: { hull: 6 },
        weapons: Array.from({ length: weaponCount }, (_, index) => ({ name: `Weapon ${index}` })),
    },
});

test("counts operational ships with an unfired weapon in the current turn", () => {
    const vessels = [vessel("alpha"), vessel("beta"), vessel("gamma")];
    const battleStates = {
        alpha: {
            hull: 6,
            weaponFire: [
                { weaponIndex: 0, round: 2, turnSide: "host" },
                { weaponIndex: 1, round: 2, turnSide: "host" },
            ],
        },
        beta: {
            hull: 3,
            weaponFire: [{ weaponIndex: 0, round: 2, turnSide: "host" }],
        },
        gamma: { hull: 0, weaponFire: [] },
    };

    assert.equal(countShipsThatCanFire(vessels, battleStates, 2, "host"), 1);
});

test("ignores fire recorded in another round or player turn", () => {
    const vessels = [vessel("alpha", 1)];
    const battleStates = {
        alpha: {
            hull: 6,
            weaponFire: [
                { weaponIndex: 0, round: 1, turnSide: "host" },
                { weaponIndex: 0, round: 2, turnSide: "guest" },
            ],
        },
    };

    assert.equal(countShipsThatCanFire(vessels, battleStates, 2, "host"), 1);
});

test("uses profile hull and empty fire history for ships without saved battle state", () => {
    assert.equal(countShipsThatCanFire([vessel("alpha")], {}, 1, "guest"), 1);
});

test("does not count spent ordnance or a Nova Cannon blocked by orders", () => {
    const ordnanceVessel = vessel("carrier", 0);
    ordnanceVessel.profile.weapons = [{ name: "Torpedoes", type: "Torpedo" }];
    const novaVessel = vessel("nova", 0);
    novaVessel.profile.weapons = [{ name: "Nova Cannon", type: "Nova Cannon" }];

    assert.equal(countShipsThatCanFire(
        [ordnanceVessel, novaVessel],
        {
            carrier: { spentOrdnance: [0] },
            nova: { order: "All ahead full" },
        },
        1,
        "host",
    ), 0);
});
