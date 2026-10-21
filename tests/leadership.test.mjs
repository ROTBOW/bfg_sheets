import assert from "node:assert/strict";
import test from "node:test";
import {
    getLeadershipForRoll,
    resolveCommandCheck,
    rollLeadership,
} from "../lib/leadership.mjs";

test("standard leadership follows the core D6 table", () => {
    assert.deepEqual(
        [1, 2, 3, 4, 5, 6].map((roll) => getLeadershipForRoll("Imperial Navy", roll)),
        [6, 7, 7, 8, 8, 9],
    );
});

test("command checks roll 2D6 at or below modified Leadership", () => {
    const rolls = [0, 0.999];
    const result = resolveCommandCheck(7, {
        hasEnemyOnSpecialOrders: true,
        random: () => rolls.shift(),
    });

    assert.deepEqual(result, {
        dice: [1, 6],
        roll: 7,
        modifiedLeadership: 8,
        passed: true,
    });
});

test("command modifiers cancel, Leadership caps at 10, and 11 always fails", () => {
    const cancelingRolls = [0.499, 0.499];
    const cancelingResult = resolveCommandCheck(7, {
        hasBlastMarker: true,
        hasEnemyOnSpecialOrders: true,
        random: () => cancelingRolls.shift(),
    });

    assert.equal(cancelingResult.modifiedLeadership, 7);
    assert.equal(cancelingResult.passed, true);

    const automaticFailureRolls = [0.833, 0.999];
    const automaticFailure = resolveCommandCheck(10, {
        hasEnemyOnSpecialOrders: true,
        random: () => automaticFailureRolls.shift(),
    });

    assert.equal(automaticFailure.modifiedLeadership, 10);
    assert.equal(automaticFailure.roll, 11);
    assert.equal(automaticFailure.passed, false);
    assert.throws(() => resolveCommandCheck(0), RangeError);
});

test("Mechanicus and Space Marine leadership use their faction tables", () => {
    assert.deepEqual(
        [1, 2, 3, 4, 5, 6].map((roll) => getLeadershipForRoll("Adeptus Mechanicus", roll)),
        [7, 8, 8, 9, 9, 9],
    );
    assert.deepEqual(
        [1, 2, 3, 4, 5, 6].map((roll) => getLeadershipForRoll("Space Marines", roll)),
        [8, 8, 9, 9, 10, 10],
    );
});

test("Sepulchre leadership is fixed and rolling reports the die", () => {
    assert.equal(getLeadershipForRoll("Necrons", 1, true), 10);
    assert.deepEqual(rollLeadership("Imperial Navy", false, () => 0.999), {
        roll: 6,
        leadership: 9,
    });
    assert.throws(() => getLeadershipForRoll("Imperial Navy", 0), RangeError);
});
