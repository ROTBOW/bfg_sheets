import assert from "node:assert/strict";
import test from "node:test";
import {
    createLocalBattleReport,
    formatBattleReportText,
    getBattleEvents,
    loadBattleReports,
} from "../lib/battle-reports.mjs";

test("sorts Firebase battle events by timestamp", () => {
    const events = getBattleEvents({
        later: { message: "Later", createdAt: 20 },
        earlier: { message: "Earlier", createdAt: 10 },
    });

    assert.deepEqual(events.map((event) => event.id), ["earlier", "later"]);
});

test("creates a detached local report from a live room", () => {
    const report = createLocalBattleReport("battle-id", {
        meta: { createdAt: 10, updatedAt: 20 },
        turn: { round: 3 },
        sides: {
            host: { ownerUid: "one", fleet: { name: "Alpha" }, battle: {} },
            guest: { ownerUid: "two", fleet: { name: "Beta" }, battle: {} },
        },
        players: {
            one: { displayName: "Host" },
            two: { displayName: "Guest" },
        },
        report: { status: "active", events: {} },
    });

    assert.equal(report.id, "battle-id");
    assert.equal(report.round, 3);
    assert.equal(report.sides.guest.displayName, "Guest");
});

test("treats malformed local report data as an empty archive", () => {
    const storage = { getItem: () => "not json" };

    assert.deepEqual(loadBattleReports(storage), []);
});

test("formats a readable text report with fleets, ship conditions, and rounds", () => {
    const text = formatBattleReportText({
        id: "abc123",
        status: "closed",
        result: "Alpha victory",
        round: 2,
        sides: {
            host: {
                displayName: "Admiral One",
                fleet: {
                    name: "Alpha",
                    selectedFaction: "Imperial Navy",
                    ships: [{ id: "lunar", name: "Resolute" }],
                },
                battle: { lunar: { hull: 4, shields: 0, criticalDamage: [] } },
            },
            guest: {
                displayName: "Admiral Two",
                fleet: {
                    name: "Beta",
                    selectedFaction: "Necrons",
                    ships: [{ id: "cairn", name: "Silent King" }],
                },
                battle: { cairn: { hull: 0, criticalDamage: [{ status: "active" }] } },
            },
        },
        events: [
            { id: "one", round: 1, message: "Alpha takes the first turn." },
            { id: "two", round: 2, message: "Silent King destroyed." },
        ],
    });

    assert.match(text, /BFG SHEETS — BATTLE REPORT/);
    assert.match(text, /HOST — Alpha/);
    assert.match(text, /Resolute — Hull 4; Shields 0/);
    assert.match(text, /Silent King — DESTROYED; Hull 0; 1 active critical/);
    assert.match(text, /ROUND 1[\s\S]*Alpha takes the first turn/);
    assert.match(text, /ROUND 2[\s\S]*Silent King destroyed/);
});
