import assert from "node:assert/strict";
import test from "node:test";
import {
    criticalDamageTypes,
    resolveAutomaticCriticals,
} from "../lib/critical-damage.mjs";

const fixedRandom = (values) => {
    let index = 0;

    return () => values[index++];
};

test("one critical check is rolled for each point of hull damage", () => {
    const result = resolveAutomaticCriticals(
        3,
        "Imperial Navy",
        false,
        fixedRandom([0, 0.99, 0.7, 0.7, 0.9, 0.9]),
        () => "critical-1",
    );

    assert.deepEqual(result.criticalChecks, [1, 6, 5]);
    assert.equal(result.criticals[0].typeId, "hull-breach");
    assert.deepEqual(result.criticals[0].tableRolls, [5, 6]);
    assert.equal(result.extraDamage, 3);
});

test("an escort is destroyed as soon as a critical check succeeds", () => {
    const result = resolveAutomaticCriticals(2, "Imperial Navy", true, fixedRandom([0.99, 0]));

    assert.equal(result.escortDestroyed, true);
    assert.deepEqual(result.criticals, []);
});

test("Necron criticals use their faction table and roll their extra damage", () => {
    const result = resolveAutomaticCriticals(
        1,
        "Necrons",
        false,
        fixedRandom([0.99, 0.99, 0.99, 0.99]),
        () => "necron-critical",
    );

    assert.equal(result.criticals[0].typeId, "necron-core");
    assert.equal(result.extraDamage, 6);
});

test("the standard critical table includes hull breach and bulkhead collapse", () => {
    assert.deepEqual(criticalDamageTypes.slice(-2).map(({ roll }) => roll), [11, 12]);
});
