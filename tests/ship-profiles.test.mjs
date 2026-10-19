import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { shipCatalog } from "../lib/fleets.mjs";
import { getProfileUrl } from "../lib/ship-upgrades.mjs";

const readJson = (relativePath) => JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));
const images = readJson("../public/ship-images/imperial-navy/manifest.json");
const profiles = new Map();
for (const image of images) {
    profiles.set(image.id, readJson(`../public/ships/imperial-navy/${image.id}.json`));
}

test("every downloaded image has a matching profile with correct dimensions and a local asset", () => {
    assert.equal(profiles.size, 34);
    for (const image of images) {
        const profile = profiles.get(image.id);
        assert.equal(profile.id, image.id);
        assert.equal(profile.image.source, image.source);
        assert.equal(profile.image.width, image.width);
        assert.equal(profile.image.height, image.height);
        const bytes = readFileSync(new URL(`../public${profile.image.src}`, import.meta.url));
        assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
        assert.equal(bytes.readUInt32BE(16), profile.image.width);
        assert.equal(bytes.readUInt32BE(20), profile.image.height);
    }
});

test("new profiles have provenance and valid stats, ranges and weapon strengths", () => {
    const sourced = [...profiles.values()].filter((profile) => !profile.isDemo);
    assert.equal(sourced.length, 26);
    for (const profile of sourced) {
        assert.equal(profile.source.url, profile.image.source);
        for (const key of ["hull", "speedCm", "turnDegrees", "shields", "turrets"]) {
            assert.ok(Number.isInteger(profile.stats[key]) && profile.stats[key] > 0, `${profile.id}: ${key}`);
        }
        assert.match(profile.stats.armour.front, /^[2-6]\+$/);
        assert.match(profile.stats.armour.other, /^[2-6]\+$/);
        assert.ok(profile.weapons.length > 0);
        for (const weapon of profile.weapons) {
            assert.ok(Number.isInteger(weapon.strength) && weapon.strength > 0);
            if (weapon.rangeCm === null) assert.ok(weapon.rangeLabel.includes("cm"));
            else assert.ok(Number.isInteger(weapon.rangeCm) && weapon.rangeCm > 0);
            if (weapon.type === "Launch Bay") assert.match(weapon.strengthUnit, /^squadrons?$/);
        }
        for (const option of profile.options) assert.ok(Number.isInteger(option.points));
    }
});

test("all selectable classes now have profiles without changing fleet eligibility", () => {
    const registry = readFileSync(new URL("../lib/factions/imperial-navy/profiles.js", import.meta.url), "utf8");
    for (const ship of shipCatalog) {
        if (ship.faction !== "Imperial Navy") continue;
        const id = getProfileUrl(ship).split("/").at(-1).replace(".html", "");
        assert.ok(profiles.has(id), `Missing profile: ${ship.id}`);
        assert.ok(registry.includes(`public/ships/imperial-navy/${id}.json`), `Unregistered: ${ship.id}`);
    }
    assert.ok(!shipCatalog.some((ship) => ship.id === "jovian"));
    assert.ok(!shipCatalog.some((ship) => ship.id === "transport"));
});

test("Bakka variants, scenario pricing and mixed weapon ranges remain distinct", () => {
    const endeavour = profiles.get("endeavour-class-light-cruiser");
    const bakka = profiles.get("endeavour-class-light-cruiser-bakka");
    assert.equal(endeavour.points, 110);
    assert.equal(bakka.points, 115);
    assert.equal(endeavour.stats.turrets, 2);
    assert.equal(bakka.stats.turrets, 3);
    assert.equal(profiles.get("transport").points, null);
    const tyrant = profiles.get("tyrant-class-cruiser");
    assert.deepEqual(tyrant.weapons.filter((weapon) => weapon.name === "Port weapons battery").map((weapon) => weapon.rangeCm), [45, 30]);
    const nova = profiles.get("apocalypse-class-battleship").weapons.find((weapon) => weapon.type === "Nova Cannon");
    assert.equal(nova.rangeCm, null);
    assert.equal(nova.rangeLabel, "30 – 150 cm");
    const bays = profiles.get("emperor-class-battleship").weapons.filter((weapon) => weapon.type === "Launch Bay");
    assert.deepEqual(bays.map((weapon) => weapon.strength), [4, 4]);
    assert.ok(bays.every((weapon) => weapon.rangeLabel.includes("Starhawks: 20 cm")));
});
