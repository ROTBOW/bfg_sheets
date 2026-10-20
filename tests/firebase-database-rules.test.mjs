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
