import assert from "node:assert/strict";
import test from "node:test";
import {
    areFleetCommandChecksBlocked,
    clearFleetCommandCheckMetadata,
    getRoomBattleStateUpdates,
} from "../lib/command-checks.mjs";

const failedCheck = (round, side) => ({
    hull: 6,
    shields: 1,
    order: "No special orders",
    weaponFire: [{ id: "attack-1" }],
    criticalDamage: [{ id: "critical-1" }],
    commandCheckPassed: false,
    commandCheckFailed: true,
    commandCheckRound: round,
    commandCheckTurnSide: side,
});

test("a failed check blocks only its owner's matching player turn", () => {
    const battle = { "ship-1": failedCheck(2, "host") };

    assert.equal(areFleetCommandChecksBlocked(battle, { round: 2, activeSide: "host" }, "host"), true);
    assert.equal(areFleetCommandChecksBlocked(battle, { round: 2, activeSide: "guest" }, "host"), false);
    assert.equal(areFleetCommandChecksBlocked(battle, { round: 3, activeSide: "host" }, "host"), false);
});

test("both player transitions into round two ignore prior-round failures", () => {
    const hostBattle = { "host-ship": failedCheck(1, "host") };
    const guestBattle = { "guest-ship": failedCheck(1, "guest") };

    assert.equal(areFleetCommandChecksBlocked(guestBattle, { round: 2, activeSide: "guest" }, "guest"), false);
    assert.equal(areFleetCommandChecksBlocked(hostBattle, { round: 2, activeSide: "host" }, "host"), false);
});

test("manual reset preserves damage, orders, weapons, and critical damage", () => {
    const battle = { "ship-1": failedCheck(2, "host") };
    const cleared = clearFleetCommandCheckMetadata(battle);

    assert.deepEqual(cleared["ship-1"], {
        hull: 6,
        shields: 1,
        order: "No special orders",
        weaponFire: [{ id: "attack-1" }],
        criticalDamage: [{ id: "critical-1" }],
    });
    assert.equal(battle["ship-1"].commandCheckFailed, true);
});

test("reconnect snapshots and empty remote resets replace stale fleet battle maps", () => {
    const room = {
        sides: {
            host: { fleet: { id: "host-fleet" }, battle: {} },
            guest: { fleet: { id: "guest-fleet" }, battle: { "ship-2": failedCheck(2, "guest") } },
        },
    };
    const previous = { "host-fleet": { "stale-ship": failedCheck(2, "host") } };
    const merged = { ...previous, ...getRoomBattleStateUpdates(room) };

    assert.deepEqual(merged["host-fleet"], {});
    assert.equal(merged["guest-fleet"]["ship-2"].commandCheckFailed, true);
});
