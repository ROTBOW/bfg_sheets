import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { shipCatalog, createFleet, getFleetPoints, getFleetIssues, getReserveAllowances, parseFleets } from "../lib/fleets.mjs";
import { getProfileUrl, getUpgradeOptions } from "../lib/ship-upgrades.mjs";

const marines = shipCatalog.filter((ship) => ship.faction === "Space Marines");
const readProfile = (ship) => JSON.parse(readFileSync(new URL(`../public/ships/space-marines/${ship.id.replace("space-marines-", "")}.json`, import.meta.url), "utf8"));
const vessel = (classId, id = classId) => ({ id, classId, name: "Test vessel", squadron: "First", upgrades: [] });

test("all eleven Space Marine classes resolve to profiles and real shared images", () => {
    assert.equal(marines.length, 11);
    assert.equal(new Set(shipCatalog.map((ship) => ship.id)).size, shipCatalog.length);
    const registry = readFileSync(new URL("../lib/factions/space-marines/profiles.js", import.meta.url), "utf8");
    for (const ship of marines) {
        const profile = readProfile(ship);
        assert.ok(registry.includes(`"${ship.id}"`));
        assert.equal(profile.points, ship.points);
        assert.equal(profile.faction, ship.faction);
        assert.equal(profile.isDemo, false);
        const bytes = readFileSync(new URL(`../public${profile.image.src}`, import.meta.url));
        assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
        assert.equal(bytes.readUInt32BE(16), profile.image.width);
        assert.equal(bytes.readUInt32BE(20), profile.image.height);
        assert.ok(profile.weapons.length);
        assert.ok(profile.source.url.startsWith("https://"));
        assert.ok(getProfileUrl(ship).includes("space-marines/"));
        assert.deepEqual(getUpgradeOptions(ship, { upgrades: [] }), []);
    }
});

test("Marine commander pricing, saved fleets and Navy reserve accounting stay distinct", () => {
    const fleet = { ...createFleet(), commander: "master-of-the-fleet", rerolls: 2, ships: [vessel("space-marines-battle-barge")] };
    fleet.flagshipId = fleet.ships[0].id;
    assert.equal(getFleetPoints(fleet), 525);
    assert.deepEqual(parseFleets(JSON.stringify({ version: 1, fleets: [fleet] })), [fleet]);
    assert.ok(getFleetIssues(fleet).every((issue) => !issue.includes("support (3:1)")));
    assert.ok(getReserveAllowances(fleet).every((allowance) => allowance.core === 0));
    fleet.ships.push(vessel("space-marines-battle-barge", "second"));
    assert.ok(getFleetIssues(fleet).some((issue) => issue.startsWith("Battle barges:")));
});

test("rapid strike hulls share Navy assets and fortress limitations are explicit", () => {
    const cobra = readProfile(marines.find((ship) => ship.id === "space-marines-rapid-strike-cobra"));
    assert.equal(cobra.image.src, "/ship-images/imperial-navy/cobra-class-destroyer.png");
    assert.equal(cobra.points, 35);
    assert.equal(cobra.stats.armour.front, "4+");
    const fortress = readProfile(marines.find((ship) => ship.type === "Defence"));
    assert.equal(fortress.stats.speedCm, 0);
    assert.ok(fortress.specialRules.some((rule) => rule.name.includes("manual tracking")));
});
