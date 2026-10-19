import assert from "node:assert/strict";
import test from "node:test";
import { createFleet, getFleetIssues, getFleetPoints, getReserveAllowances, getShip, parseFleets } from "../lib/fleets.mjs";
import { getUpgradeOptions, getVesselPoints } from "../lib/ship-upgrades.mjs";

const vessel = (classId, squadron = "") => ({
    id: crypto.randomUUID(), classId, name: classId, squadron,
});

test("support ratios include light cruisers and battlecruisers correctly", () => {
    const fleet = createFleet();
    fleet.ships = [vessel("dauntless"), vessel("lunar"), vessel("overlord"), vessel("retribution")];
    fleet.commander = "fleet-admiral";
    fleet.flagshipId = fleet.ships[3].id;
    assert.deepEqual(getFleetIssues(fleet), []);

    fleet.ships.shift();
    assert.equal(getFleetIssues(fleet).length, 2);
});

test("admiral requirement uses actual total, including command costs", () => {
    const fleet = createFleet();
    fleet.ships = Array.from({ length: 25 }, () => vessel("cobra", "test"));
    assert.equal(getFleetPoints(fleet), 750);
    assert.ok(!getFleetIssues(fleet).includes("This fleet needs an admiral."));
    fleet.ships.push(vessel("cobra", "test"));
    assert.ok(getFleetIssues(fleet).includes("This fleet needs an admiral."));
    fleet.commander = "admiral";
    fleet.rerolls = 2;
    assert.equal(getFleetPoints(fleet), 955);
    assert.ok(getFleetIssues(fleet).includes("Assign your admiral to a ship."));
});

test("mixed escort squadrons accept 2–6 ships and reject missing assignments", () => {
    const fleet = createFleet();
    fleet.ships = [vessel("cobra", "Alpha"), vessel("sword", "Alpha")];
    assert.deepEqual(getFleetIssues(fleet), []);
    fleet.ships.push(...Array.from({ length: 4 }, () => vessel("sword", "Alpha")));
    assert.deepEqual(getFleetIssues(fleet), []);
    fleet.ships.push(vessel("firestorm", "Alpha"));
    assert.equal(getFleetIssues(fleet).length, 1);
    fleet.ships[0].squadron = " ";
    assert.deepEqual(getFleetIssues(fleet), ["Assign every escort to a named squadron."]);
});

test("budget and cruiser cap are checked independently", () => {
    const fleet = createFleet();
    fleet.ships = Array.from({ length: 13 }, () => vessel("dauntless"));
    fleet.limit = 1000;
    assert.ok(getFleetIssues(fleet).includes("430 points over your budget."));
    assert.ok(getFleetIssues(fleet).includes("The cruiser allowance is exceeded."));
});

test("saved fleets round-trip and invalid versions or entries are rejected", () => {
    const fleet = createFleet();
    fleet.ships = [vessel("lunar")];
    const serialize = () => JSON.stringify({ version: 1, fleets: [fleet] });
    assert.deepEqual(parseFleets(serialize()), [fleet]);
    assert.deepEqual(parseFleets(null), []);
    assert.throws(() => parseFleets("not json"));
    assert.throws(() => parseFleets('{"version":2,"fleets":[]}'));
    fleet.ships.push({ ...fleet.ships[0] });
    assert.throws(() => parseFleets(serialize()));
    fleet.ships.pop();
    fleet.ships[0].classId = "unknown";
    assert.throws(() => parseFleets(serialize()));
});

test("ship options include free variants, discounts and carrier strength pricing", () => {
    const lunar = { ...vessel("lunar"), upgrades: ["nova-cannon"] };
    const dominator = { ...vessel("dominator"), upgrades: ["older-batteries"] };
    const dauntless = { ...vessel("dauntless"), upgrades: ["prow-torpedoes", "special-torpedoes"] };
    const emperor = { ...vessel("emperor"), upgrades: ["sharks", "torpedo-bombers"] };
    assert.equal(getVesselPoints(getShip("lunar"), lunar), 200);
    assert.equal(getVesselPoints(getShip("dominator"), dominator), 185);
    assert.equal(getVesselPoints(getShip("dauntless"), dauntless), 130);
    assert.equal(getVesselPoints(getShip("emperor"), emperor), 450);
    const retribution = { ...vessel("retribution"), upgrades: ["special-torpedoes"] };
    assert.equal(getVesselPoints(getShip("retribution"), retribution), 375);
});

test("refits follow equipment prerequisites and conflicting replacements", () => {
    const reason = (classId, upgrades, optionId) => (
        getUpgradeOptions(getShip(classId), { upgrades }).find((option) => option.id === optionId)?.reason
    );
    assert.ok(reason("lunar", ["nova-cannon"], "power-ram"));
    assert.ok(reason("lunar", ["nova-cannon"], "special-torpedoes"));
    assert.ok(reason("lunar", ["power-ram"], "nova-cannon"));
    assert.ok(reason("dauntless", [], "special-torpedoes"));
    assert.equal(reason("dauntless", ["prow-torpedoes"], "special-torpedoes"), "");
    assert.ok(reason("endeavour", [], "power-ram"));
    assert.equal(reason("endeavour", ["armoured-prow"], "power-ram"), "");
    assert.ok(reason("dictator", ["orbital-mines"], "torpedo-bombers"));
    assert.ok(reason("exorcist", ["sharks"], "orbital-mines"));
    assert.equal(reason("emperor", [], "orbital-mines"), undefined);
    assert.equal(reason("cobra", [], "special-torpedoes"), undefined);
    assert.equal(reason("mars", [], "power-ram"), undefined);

    const fleet = createFleet();
    fleet.ships = [{ ...vessel("lunar"), upgrades: ["nova-cannon", "power-ram"] }];
    assert.ok(getFleetIssues(fleet).some((issue) => issue.includes("Remove the nova cannon")));
});

test("reserves use three core vessels per category and never unlock more reserves", () => {
    const fleet = createFleet();
    fleet.ships = [vessel("lunar"), vessel("gothic"), vessel("overlord"), vessel("vengeance")];
    assert.deepEqual(getReserveAllowances(fleet).find((entry) => entry.type === "Cruiser"), {
        type: "Cruiser", core: 3, used: 1, allowed: 1,
    });
    fleet.ships.push(vessel("endeavour"));
    assert.ok(getFleetIssues(fleet).some((issue) => issue.includes("Reserve cruiser allowance")));
    fleet.ships.push(vessel("apocalypse"));
    assert.ok(getFleetIssues(fleet).some((issue) => issue.includes("Reserve battleship allowance")));
    fleet.ships.push(vessel("falchion", "Alpha"));
    assert.ok(getFleetIssues(fleet).some((issue) => issue.includes("Reserve escort allowance")));
    fleet.ships.push(...Array.from({ length: 3 }, () => vessel("sword", "Alpha")));
    assert.ok(!getFleetIssues(fleet).some((issue) => issue.includes("Reserve escort allowance")));
});

test("Bastion light cruiser limits and Cobra squadron upgrades are validated", () => {
    const fleet = createFleet();
    fleet.ships = [vessel("endurance")];
    assert.ok(getFleetIssues(fleet).some((issue) => issue.includes("cannot outnumber Endeavour")));
    fleet.ships.push(vessel("endeavour"));
    assert.ok(!getFleetIssues(fleet).some((issue) => issue.includes("cannot outnumber Endeavour")));

    fleet.ships = [
        { ...vessel("cobra", "Alpha"), upgrades: ["detection-gear"] },
        vessel("cobra", "Alpha"), vessel("sword", "Alpha"),
    ];
    assert.ok(getFleetIssues(fleet).some((issue) => issue.includes("detection gear")));
    fleet.ships[1].upgrades = ["detection-gear"];
    assert.deepEqual(getFleetIssues(fleet), []);
    fleet.ships.push(vessel("sword", "Alpha"));
    assert.ok(getFleetIssues(fleet).some((issue) => issue.includes("Cobra majority")));
});

test("new upgrade saves round-trip and unsupported options cannot silently change totals", () => {
    const fleet = createFleet();
    fleet.ships = [{ ...vessel("lunar"), upgrades: ["special-torpedoes"], torpedoResult: 5 }];
    const serialize = () => JSON.stringify({ version: 1, fleets: [fleet] });
    assert.deepEqual(parseFleets(serialize()), [fleet]);
    fleet.ships[0].upgrades.push("orbital-mines");
    assert.throws(() => parseFleets(serialize()));
    fleet.ships[0].upgrades = ["special-torpedoes", "special-torpedoes"];
    assert.throws(() => parseFleets(serialize()));
    fleet.ships[0].upgrades = ["special-torpedoes"];
    fleet.ships[0].torpedoResult = 7;
    assert.throws(() => parseFleets(serialize()));
});
