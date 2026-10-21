export const battleReportsStorageKey = "bfg-battle-reports";
export const battleReportsStorageVersion = 1;

/** Converts Firebase's keyed event map into a stable chronological list. */
export const getBattleEvents = (events) => {
    if (!events || typeof events !== "object") return [];

    return Object.entries(events)
        .map(([id, event]) => ({ id, ...event }))
        .sort((left, right) => (left.createdAt || 0) - (right.createdAt || 0));
};

/** Builds the browser-safe report snapshot stored by both participants. */
export const createLocalBattleReport = (roomId, room) => {
    if (!roomId || !room?.report || !room?.sides) return null;

    return {
        id: roomId,
        status: room.report.status || room.meta?.status || "active",
        result: room.report.result || "",
        startedAt: room.report.startedAt || room.meta?.createdAt || Date.now(),
        updatedAt: room.report.updatedAt || room.meta?.updatedAt || Date.now(),
        endedAt: room.report.endedAt || null,
        round: room.turn?.round || 1,
        sides: {
            host: {
                displayName: room.players?.[room.sides.host?.ownerUid]?.displayName || "Host",
                fleet: room.sides.host?.fleet || null,
                battle: room.sides.host?.battle || {},
            },
            guest: {
                displayName: room.players?.[room.sides.guest?.ownerUid]?.displayName || "Guest",
                fleet: room.sides.guest?.fleet || null,
                battle: room.sides.guest?.battle || {},
            },
        },
        events: getBattleEvents(room.report.events),
    };
};

/** Reads and validates the local battle-report archive without mutating storage. */
export const loadBattleReports = (storage) => {
    const raw = storage?.getItem(battleReportsStorageKey);

    if (!raw) return [];

    try {
        const data = JSON.parse(raw);
        if (data?.version !== battleReportsStorageVersion || !Array.isArray(data.reports)) {
            return [];
        }

        return data.reports.filter((report) => report?.id);
    } catch {
        return [];
    }
};

/** Inserts or replaces one report in local storage and returns the sorted archive. */
export const saveBattleReport = (storage, report) => {
    if (!storage || !report?.id) return [];

    const reports = loadBattleReports(storage).filter((entry) => entry.id !== report.id);
    reports.push(report);
    reports.sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0));

    storage.setItem(battleReportsStorageKey, JSON.stringify({
        version: battleReportsStorageVersion,
        reports,
    }));

    window.dispatchEvent(new Event("battlereportschange"));
    return reports;
};

/** Removes one locally archived report. */
export const deleteBattleReport = (storage, reportId) => {
    const reports = loadBattleReports(storage).filter((report) => report.id !== reportId);

    storage.setItem(battleReportsStorageKey, JSON.stringify({
        version: battleReportsStorageVersion,
        reports,
    }));

    window.dispatchEvent(new Event("battlereportschange"));
    return reports;
};

/** Formats a timestamp for a portable, human-readable text report. */
const formatReportTimestamp = (timestamp) => {
    if (!timestamp) return "Not recorded";

    return new Date(timestamp).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
    });
};

/** Describes the final recorded condition of one vessel. */
const formatVesselCondition = (vessel, battleState = {}) => {
    const details = [];

    if (battleState.hull !== undefined) details.push(`Hull ${battleState.hull}`);
    if (battleState.shields !== undefined) details.push(`Shields ${battleState.shields}`);
    if (battleState.leadership !== undefined) details.push(`Leadership ${battleState.leadership}`);
    if (battleState.order && battleState.order !== "No special orders") details.push(battleState.order);

    const activeCriticals = (battleState.criticalDamage || [])
        .filter((entry) => entry.status !== "repaired")
        .length;

    if (activeCriticals) details.push(`${activeCriticals} active critical${activeCriticals === 1 ? "" : "s"}`);
    if (battleState.hull === 0) details.unshift("DESTROYED");

    return `  - ${vessel.name || vessel.classId || "Unnamed vessel"}${details.length ? ` — ${details.join("; ")}` : " — No damage recorded"}`;
};

/** Creates a polished plain-text after-action report suitable for saving or sharing. */
export const formatBattleReportText = (report) => {
    const divider = "=".repeat(72);
    const rule = "-".repeat(72);
    const host = report?.sides?.host || {};
    const guest = report?.sides?.guest || {};
    const hostFleet = host.fleet || {};
    const guestFleet = guest.fleet || {};
    const lines = [
        divider,
        "BFG SHEETS — BATTLE REPORT",
        divider,
        "",
        `Battle ID: ${String(report?.id || "Unknown").toUpperCase()}`,
        `Status:    ${report?.status === "closed" ? "Final" : "In progress"}`,
        `Result:    ${report?.result || "Not yet decided"}`,
        `Started:   ${formatReportTimestamp(report?.startedAt)}`,
        `Ended:     ${formatReportTimestamp(report?.endedAt)}`,
        `Rounds:    ${report?.round || 1}`,
        "",
        rule,
        "FLEETS",
        rule,
        "",
        `HOST — ${hostFleet.name || "Unnamed fleet"}`,
        `Admiral: ${host.displayName || "Host"}`,
        `Faction: ${hostFleet.selectedFaction || "Unknown"}`,
        `Fleet size: ${(hostFleet.ships || []).length} ships`,
        ...(hostFleet.ships || []).map((vessel) => formatVesselCondition(vessel, host.battle?.[vessel.id])),
        "",
        `GUEST — ${guestFleet.name || "Unnamed fleet"}`,
        `Admiral: ${guest.displayName || "Guest"}`,
        `Faction: ${guestFleet.selectedFaction || "Unknown"}`,
        `Fleet size: ${(guestFleet.ships || []).length} ships`,
        ...(guestFleet.ships || []).map((vessel) => formatVesselCondition(vessel, guest.battle?.[vessel.id])),
        "",
        rule,
        "ACTION LOG",
        rule,
    ];
    let previousRound = null;

    for (const event of report?.events || []) {
        if (event.round !== previousRound) {
            lines.push("", `ROUND ${event.round}`, "");
            previousRound = event.round;
        }

        const time = event.createdAt
            ? new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Time unknown";

        lines.push(`[${time}] ${event.message}`);
    }

    if (!report?.events?.length) lines.push("", "No actions recorded.");

    lines.push("", divider, "Generated by BFG Sheets", divider, "");
    return lines.join("\r\n");
};

