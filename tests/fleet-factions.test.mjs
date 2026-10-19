import assert from "node:assert/strict";
import test from "node:test";
import { createFleet, getFleetIssues, getFleetPoints, getReserveAllowances, parseFleets } from "../lib/fleets.mjs";

const vessel = (classId) => ({ id: classId, classId, name: classId, squadron: "" });
const serialize = (fleets) => JSON.stringify({ version: 1, fleets });

test("legacy saves gain a faction without losing roster or command data", () => {
    const navy = createFleet();
    const marines = { ...createFleet(), ships: [vessel("space-marines-battle-barge"), vessel("lunar")] };
    delete navy.selectedFaction;
    delete marines.selectedFaction;

    const restored = parseFleets(serialize([navy, marines]));
    assert.deepEqual(restored, [
        { ...navy, selectedFaction: "Imperial Navy" },
        { ...marines, selectedFaction: "Space Marines" },
    ]);
    assert.deepEqual(parseFleets(serialize(restored)), restored);
});

test("explicit faction survives mixed-fleet saves and drives composition checks", () => {
    const fleet = {
        ...createFleet(),
        ships: [vessel("space-marines-battle-barge"), vessel("emperor"), vessel("defiant")],
    };
    assert.deepEqual(parseFleets(serialize([fleet])), [fleet]);
    const navyIssues = getFleetIssues(fleet);
    assert.ok(navyIssues.includes("This fleet needs an admiral."));
    assert.ok(navyIssues.some((issue) => issue.includes("support (3:1)")));
    assert.ok(navyIssues.some((issue) => issue.startsWith("Bastion reserves:")));
    assert.ok(!navyIssues.some((issue) => issue.includes("needs a Master")));

    const marineFleet = { ...fleet, selectedFaction: "Space Marines" };
    const marineIssues = getFleetIssues(marineFleet);
    assert.ok(marineIssues.includes("This fleet needs a Master of the Fleet."));
    assert.ok(!marineIssues.some((issue) => issue.includes("support (3:1)") || issue.startsWith("Bastion reserves:")));
    assert.deepEqual(getReserveAllowances(marineFleet), []);
    assert.equal(getFleetPoints(marineFleet), getFleetPoints(fleet));
    assert.deepEqual(parseFleets(serialize([marineFleet])), [marineFleet]);
});

test("faction stays selected with no matching ships and invalid values are rejected", () => {
    const fleet = { ...createFleet(), selectedFaction: "Space Marines", ships: [vessel("emperor"), vessel("retribution"), vessel("lunar")] };
    assert.ok(getFleetIssues(fleet).includes("This fleet needs a Master of the Fleet."));
    for (const selectedFaction of [null, "Unknown", "", 1]) {
        assert.throws(() => parseFleets(serialize([{ ...fleet, selectedFaction }])), /fleet faction/);
    }
});
