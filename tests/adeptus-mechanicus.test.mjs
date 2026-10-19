import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createFleet, getFleetIssues, getFleetPoints, getRerollCosts, getShip, parseFleets, shipCatalog } from "../lib/fleets.mjs";
import { getUpgradeOptions, getVesselPoints } from "../lib/ship-upgrades.mjs";
import { arkId } from "../lib/factions/adeptus-mechanicus/upgrades.mjs";

const mechanicus = shipCatalog.filter((ship) => ship.faction === "Adeptus Mechanicus");
const classId = (slug) => `adeptus-mechanicus-${slug}`;
const readProfile = (slug) => JSON.parse(readFileSync(new URL(`../public/ships/adeptus-mechanicus/${slug}.json`, import.meta.url), "utf8"));
const vessel = (slug, upgrades = []) => ({ id: crypto.randomUUID(), classId: classId(slug), name: "Test ship", squadron: "", upgrades });
const makeFleet = (ships) => ({ ...createFleet(), selectedFaction: "Adeptus Mechanicus", ships });

test("all 18 Mechanicus ships have registered, sourced profiles and real images", () => {
    assert.equal(mechanicus.length, 18);
    assert.equal(new Set(shipCatalog.map((ship) => ship.id)).size, shipCatalog.length);
    const registry = readFileSync(new URL("../lib/factions/adeptus-mechanicus/profiles.js", import.meta.url), "utf8");
    for (const ship of mechanicus) {
        const profile = readProfile(ship.id.replace("adeptus-mechanicus-", ""));
        assert.ok(registry.includes(`"${ship.id}"`));
        assert.equal(profile.isDemo, false);
        assert.equal(profile.points, ship.points);
        assert.equal(profile.faction, ship.faction);
        assert.equal(profile.source.factionUrl, ship.factionUrl);
        const bytes = readFileSync(new URL(`../public${profile.image.src}`, import.meta.url));
        assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
        assert.equal(bytes.readUInt32BE(16), profile.image.width);
        assert.equal(bytes.readUInt32BE(20), profile.image.height);
        for (const weapon of profile.weapons) {
            assert.ok(weapon.strength > 0);
            assert.ok(weapon.rangeCm > 0 || weapon.rangeLabel.includes("cm"));
            assert.ok(!weapon.rangeLabel?.includes("Sharks"));
        }
    }
});

test("mandatory equipment differs from Navy, escorts and the fixed Ark profile", () => {
    const lunar = readProfile("lunar-class-cruiser");
    assert.equal(lunar.points, 215);
    assert.equal(lunar.stats.turrets, 3);
    assert.deepEqual(lunar.weapons.at(-1), { name: "Dorsal lance battery", type: "Lance", rangeCm: 60, strength: 1, arc: "Left/front/right" });
    assert.equal(readProfile("dictator-class-cruiser").stats.turrets, 4);
    assert.equal(readProfile("emperor-class-battleship").stats.turrets, 6);
    const endeavour = readProfile("endeavour-class-light-cruiser");
    assert.equal(endeavour.stats.turrets, 3);
    assert.ok(!endeavour.weapons.some((weapon) => weapon.name.includes("Dorsal")));
    assert.equal(readProfile("sword-class-frigate").stats.turrets, 2);
    const ark = readProfile("omnissiahs-victory-ark-mechanicus");
    assert.equal(ark.stats.turrets, 4);
    assert.equal(ark.points, 415);
    assert.equal(ark.weapons.find((weapon) => weapon.name === "Dorsal lance battery").strength, 2);
});

test("Mechanicus refit costs, exclusivity and Ark exceptions are preserved", () => {
    const retribution = getShip(classId("retribution-class-battleship"));
    assert.equal(getVesselPoints(retribution, { upgrades: ["nova-cannon"] }), 390);
    assert.equal(getUpgradeOptions(retribution, { upgrades: ["nova-cannon"] }).find((option) => option.id === "special-torpedoes").reason.length > 0, true);
    const endeavour = getShip(classId("endeavour-class-light-cruiser"));
    const options = getUpgradeOptions(endeavour, { upgrades: ["dorsal-lance"] });
    assert.ok(options.find((option) => option.id === "special-torpedoes").reason);
    assert.ok(!options.some((option) => option.id === "nova-cannon"));
    const emperor = getShip(classId("emperor-class-battleship"));
    assert.equal(getUpgradeOptions(emperor, {}).find((option) => option.id === "torpedo-bombers").points, 80);
    assert.ok(!getUpgradeOptions(emperor, {}).some((option) => option.id === "sharks"));
    assert.deepEqual(getUpgradeOptions(getShip(arkId), {}).map((option) => option.id), ["ark-launch-bays"]);
});

test("Archmagos costs and faction saves round-trip with valid re-roll limits", () => {
    const fleet = makeFleet([vessel("lunar-class-cruiser", ["nova-cannon", "extended-batteries"])]);
    fleet.commander = "archmagos-explorator";
    fleet.rerolls = 2;
    fleet.flagshipId = fleet.ships[0].id;
    assert.equal(getFleetPoints(fleet), 420);
    assert.deepEqual(getRerollCosts(fleet), [0, 50, 125]);
    assert.deepEqual(parseFleets(JSON.stringify({ version: 1, fleets: [fleet] })), [fleet]);
    fleet.rerolls = 3;
    assert.throws(() => parseFleets(JSON.stringify({ version: 1, fleets: [fleet] })), /saved fleet/);
});

test("Mechanicus command threshold, battleship support and Ark flagship restrictions", () => {
    const fleet = makeFleet([vessel("omnissiahs-victory-ark-mechanicus"), ...Array.from({ length: 3 }, () => vessel("lunar-class-cruiser"))]);
    assert.equal(getFleetPoints(fleet), 1060);
    assert.ok(getFleetIssues(fleet).some((issue) => issue.includes("needs a Mechanicus Archmagos")));
    fleet.commander = "archmagos-veneratus";
    fleet.flagshipId = fleet.ships[0].id;
    assert.ok(!getFleetIssues(fleet).some((issue) => issue.includes("must embark") || issue.includes("(3:1)")));
    fleet.ships.pop();
    assert.ok(getFleetIssues(fleet).some((issue) => issue.includes("(3:1)")));
    const smaller = makeFleet([vessel("emperor-class-battleship"), vessel("retribution-class-battleship")]);
    assert.ok(!getFleetIssues(smaller).some((issue) => issue.includes("needs an admiral") || issue.includes("needs a Mechanicus")));
});

test("escort turret refits require the whole squadron and prohibit mixed factions", () => {
    const first = { ...vessel("sword-class-frigate", ["additional-turret"]), squadron: "Alpha" };
    const second = { ...vessel("cobra-class-destroyer"), squadron: "Alpha" };
    const fleet = makeFleet([first, second]);
    assert.ok(getFleetIssues(fleet).some((issue) => issue.includes("every Mechanicus escort")));
    second.upgrades = ["additional-turret"];
    assert.ok(!getFleetIssues(fleet).some((issue) => issue.includes("every Mechanicus escort")));
    fleet.ships.push({ id: "navy", classId: "sword", name: "Navy", squadron: "Alpha" });
    assert.ok(getFleetIssues(fleet).some((issue) => issue.includes("cannot squadron")));
});
