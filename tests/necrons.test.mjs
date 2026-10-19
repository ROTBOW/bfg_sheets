import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createFleet, getFleetIssues, getFleetPoints, getRerollCosts, parseFleets } from "../lib/fleets.mjs";
import { necronCatalog } from "../lib/factions/necrons/catalog.mjs";
import {
    changeCriticalDamage, getCriticalDamageCount, getCriticalDamageTable,
    getCriticalLeadershipLoss, repairNecronCritical, removeCriticalEntry,
} from "../lib/critical-damage.mjs";

const vessel = (slug, upgrades = []) => ({
    id: crypto.randomUUID(), classId: `necrons-${slug}`, name: slug, squadron: "Raiders", upgrades,
});
const harvestFleet = () => ({
    ...createFleet(), selectedFaction: "Necrons", ships: [
        vessel("cairn-class-tombship", ["sepulchre"]),
        vessel("scythe-class-harvest-ship"),
    ],
});

test("all five Necron classes have sourced profiles and reactive saves instead of shields", () => {
    const registry = readFileSync(new URL("../lib/factions/necrons/profiles.js", import.meta.url), "utf8");
    assert.equal(necronCatalog.length, 5);
    for (const ship of necronCatalog) {
        const slug = ship.id.replace("necrons-", "");
        const profile = JSON.parse(readFileSync(new URL(`../public/ships/necrons/${slug}.json`, import.meta.url), "utf8"));
        assert.ok(registry.includes(`"${ship.id}"`));
        assert.equal(profile.points, ship.points);
        assert.equal(profile.source.url, ship.profileUrl);
        assert.equal(profile.stats.shields, 0);
        assert.match(profile.stats.reactiveHullSave, /^[4-6]\+$/);
        assert.ok(profile.weapons.every((weapon) => weapon.strength > 0 && weapon.rangeCm > 0));
    }
});

test("Necron fleet re-rolls cost points without a commander and survive save/import validation", () => {
    const fleet = harvestFleet();
    assert.deepEqual(getRerollCosts(fleet), [0, 25, 75]);
    assert.deepEqual(getFleetIssues(fleet), []);
    for (const [rerolls, cost] of [0, 25, 75].entries()) {
        const updated = { ...fleet, rerolls };
        assert.equal(getFleetPoints(updated), 825 + cost);
        assert.deepEqual(parseFleets(JSON.stringify({ version: 1, fleets: [updated] })), [updated]);
    }
    assert.throws(() => parseFleets(JSON.stringify({ version: 1, fleets: [{ ...fleet, rerolls: 3 }] })));
});

test("Harvest composition checks enforce support, class caps, Sepulchre uniqueness and command", () => {
    const fleet = harvestFleet();
    fleet.ships.push(vessel("cairn-class-tombship", ["sepulchre"]));
    assert.ok(getFleetIssues(fleet).some((issue) => issue.includes("Each Cairn")));
    assert.ok(getFleetIssues(fleet).some((issue) => issue.includes("Only one Sepulchre")));
    for (const [slug, limit] of [["scythe-class-harvest-ship", 6], ["shroud-class-light-cruiser", 3], ["jackal-class-raider", 12], ["dirge-class-raider", 12]]) {
        const oversized = { ...harvestFleet(), ships: Array.from({ length: limit + 1 }, () => vessel(slug)) };
        assert.ok(getFleetIssues(oversized).some((issue) => issue.includes(`maximum ${limit}`)));
    }
    assert.ok(getFleetIssues({ ...fleet, commander: "admiral" }).some((issue) => issue.includes("no fleet commander")));
});

test("critical tables switch by ship faction and reject results from the other table", () => {
    assert.deepEqual(getCriticalDamageTable("Necrons").map((type) => type.roll), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    assert.equal(getCriticalDamageTable("Imperial Navy")[0].id, "dorsal");
    assert.deepEqual(changeCriticalDamage([], "dorsal", 1, "a", "Necrons"), []);
    assert.deepEqual(changeCriticalDamage([], "necron-core", 1, "a"), []);
});

test("Necron repairs retain cumulative Leadership loss; correcting an entry removes its penalty", () => {
    let entries = changeCriticalDamage([], "necron-speed", 1, "a", "Necrons");
    entries = changeCriticalDamage(entries, "necron-speed", 1, "b", "Necrons");
    entries = repairNecronCritical(entries, "necron-speed");
    assert.equal(getCriticalDamageCount(entries, "necron-speed"), 1);
    assert.equal(getCriticalLeadershipLoss(entries), 2);
    entries = repairNecronCritical(entries, "necron-speed");
    assert.equal(getCriticalDamageCount(entries, "necron-speed"), 0);
    assert.equal(getCriticalLeadershipLoss(entries), 2);
    entries = removeCriticalEntry(entries, "necron-speed");
    assert.equal(getCriticalLeadershipLoss(entries), 1);
});

test("repeat permanent Necron criticals stack but cannot be repaired; standard toggles stay singular", () => {
    let entries = changeCriticalDamage([], "necron-core", 1, "a", "Necrons");
    entries = changeCriticalDamage(entries, "necron-core", 1, "b", "Necrons");
    assert.equal(getCriticalLeadershipLoss(entries), 4);
    assert.equal(getCriticalDamageCount(repairNecronCritical(entries, "necron-core"), "necron-core"), 2);
    const standard = changeCriticalDamage([], "bridge", 1, "a");
    assert.equal(changeCriticalDamage(standard, "bridge", 1, "b").length, 1);
    assert.deepEqual(changeCriticalDamage(standard, "bridge", -1), []);
});
