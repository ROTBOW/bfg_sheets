import assert from "node:assert/strict";
import test from "node:test";
import { getLeadershipForRoll, rollLeadership } from "../lib/leadership.mjs";

test("standard leadership follows the core D6 table", () => {
    assert.deepEqual(
        [1, 2, 3, 4, 5, 6].map((roll) => getLeadershipForRoll("Imperial Navy", roll)),
        [6, 7, 7, 8, 8, 9],
    );
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
