import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const rulesPath = new URL("../firebase/database.rules.json", import.meta.url);

/** Reads the checked-in Realtime Database Rules as parsed JSON. */
const loadRules = async () => JSON.parse(await readFile(rulesPath, "utf8"));

test("Realtime Database Rules use only supported snapshot methods", async () => {
    const rulesText = await readFile(rulesPath, "utf8");

    assert.doesNotMatch(rulesText, /\.diff\s*\(/);
});

test("opponent damage permission is limited to attack result fields", async () => {
    const rules = await loadRules();
    const shipRules = rules.rules.rooms.$roomId.sides.$sideId.battle.$shipId;
    const opponentWritableFields = Object.entries(shipRules)
        .filter(([, fieldRules]) => fieldRules?.[".write"])
        .map(([fieldName]) => fieldName)
        .sort();

    assert.deepEqual(opponentWritableFields, [
        "hull",
        "message",
        "shields",
        "updatedAt",
        "updatedBy",
    ]);
    assert.match(shipRules.hull[".validate"], /newData\.val\(\) <= data\.val\(\)/);
    assert.match(shipRules.shields[".validate"], /newData\.val\(\) <= data\.val\(\)/);
});

test("weapon-fire records bound shield-bypassing damage to total damage", async () => {
    const rules = await loadRules();
    const entryRules = rules.rules.rooms.$roomId.sides.$sideId.battle.$shipId.weaponFire.$entryIndex;

    assert.match(
        entryRules.shieldBypassingDamage[".validate"],
        /newData\.val\(\) <= newData\.parent\(\)\.child\('damage'\)\.val\(\)/,
    );
});

test("battle state accepts automatic critical-damage records", async () => {
    const rules = await loadRules();
    const criticalRule = rules.rules.rooms.$roomId.sides.$sideId.battle.$shipId
        .criticalDamage.$entryIndex[".validate"];

    assert.match(criticalRule, /source.*automatic/);
});

test("live rolls are bounded and writable only by the active player", async () => {
    const rules = await loadRules();
    const liveRollRules = rules.rules.rooms.$roomId.liveRoll;

    assert.match(liveRollRules[".write"], /turn\/activeSide/);
    assert.match(liveRollRules[".write"], /ownerUid/);
    assert.match(liveRollRules[".validate"], /expiresAt/);
    assert.match(liveRollRules[".validate"], /targetNumber/);
    assert.match(liveRollRules.kind[".validate"], /command-check/);
    assert.match(liveRollRules.initialDurations.$rollIndex[".validate"], />= 1000/);
    assert.match(liveRollRules.initialDurations.$rollIndex[".validate"], /<= 5000/);
    assert.match(liveRollRules.shieldBypassingHits[".validate"], /child\('hits'\)/);
});

test("active ordnance is owned by its launcher and limited to ordnance weapon types", async () => {
    const rules = await loadRules();
    const ordnanceRules = rules.rules.rooms.$roomId.activeOrdnance.$ordnanceId;

    assert.match(ordnanceRules[".write"], /createdBy/);
    assert.match(ordnanceRules[".write"], /turn\/activeSide/);
    assert.match(ordnanceRules.weaponType[".validate"], /Torpedo/);
    assert.match(ordnanceRules.weaponType[".validate"], /Launch Bay/);
    assert.match(ordnanceRules.strength[".validate"], /<= 100/);
});

test("Nova Cannon records allow D6 hits and template resolution details", async () => {
    const rules = await loadRules();
    const entryRules = rules.rules.rooms.$roomId.sides.$sideId.battle.$shipId.weaponFire.$entryIndex;

    assert.match(entryRules.hits[".validate"], /Nova Cannon/);
    assert.match(entryRules.hits[".validate"], /<= 6/);
    assert.match(entryRules.novaOutcome[".validate"], /center/);
    assert.match(entryRules.scatterResult[".validate"], /arrow/);
    assert.match(entryRules.scatterDistance[".validate"], /<= 18/);
});
