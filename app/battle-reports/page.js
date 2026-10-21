"use client";

import { useEffect, useState } from "react";
import {
    battleReportsStorageKey,
    deleteBattleReport,
    formatBattleReportText,
    loadBattleReports,
} from "@/lib/battle-reports.mjs";

const formatDate = (timestamp) => timestamp
    ? new Date(timestamp).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "Unknown date";

/** Downloads report content without changing the local archive. */
const downloadReport = (report, content, extension, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `bfg-battle-${report.id}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
};

/** Lists locally retained reports and reveals their complete action timelines. */
const BattleReports = () => {
    const [reports, setReports] = useState([]);
    const [selectedId, setSelectedId] = useState("");

    useEffect(() => {
        const refresh = () => setReports(loadBattleReports(window.localStorage));
        const onStorage = (event) => {
            if (event.key === battleReportsStorageKey || event.key === null) refresh();
        };

        refresh();
        window.addEventListener("storage", onStorage);
        window.addEventListener("battlereportschange", refresh);

        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("battlereportschange", refresh);
        };
    }, []);

    const selectedReport = reports.find((report) => report.id === selectedId) || reports[0];

    const removeReport = (report) => {
        const hostName = report.sides.host.fleet?.name || "Host";
        const guestName = report.sides.guest.fleet?.name || "Guest";

        if (!window.confirm(`Delete the local report for ${hostName} vs ${guestName}?`)) return;

        setReports(deleteBattleReport(window.localStorage, report.id));
        setSelectedId("");
    };

    return (
        <main className="battle-reports-page" aria-label="Battle reports">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">BATTLE ARCHIVE</p>
                    <h1>Battle reports</h1>
                    <p className="subtitle">Reports are stored on this device and updated during connected battles.</p>
                </div>
            </div>
            {!reports.length ? (
                <section className="panel battle-reports-empty">
                    <h2>No reports recorded</h2>
                    <p>Connect to another fleet and begin a battle to create your first report.</p>
                </section>
            ) : (
                <div className="battle-reports-grid">
                    <nav className="battle-report-list" aria-label="Saved battle reports">
                        {reports.map((report) => (
                            <button type="button" key={report.id} aria-pressed={report.id === selectedReport?.id} onClick={() => setSelectedId(report.id)}>
                                <strong>{report.sides.host.fleet?.name || "Host fleet"}</strong>
                                <span>vs {report.sides.guest.fleet?.name || "Guest fleet"}</span>
                                <small>{formatDate(report.startedAt)} · Round {report.round}</small>
                            </button>
                        ))}
                    </nav>
                    {selectedReport && (
                        <article className="panel battle-report-detail">
                            <header>
                                <div>
                                    <p className="eyebrow">{selectedReport.status === "closed" ? "FINAL REPORT" : "LIVE REPORT"}</p>
                                    <h2>{selectedReport.sides.host.fleet?.name} vs {selectedReport.sides.guest.fleet?.name}</h2>
                                    <p>{selectedReport.result || `In progress · Round ${selectedReport.round}`}</p>
                                </div>
                                <div className="battle-report-actions">
                                    <button
                                        type="button"
                                        onClick={() => downloadReport(
                                            selectedReport,
                                            formatBattleReportText(selectedReport),
                                            "txt",
                                            "text/plain;charset=utf-8",
                                        )}
                                    >
                                        Export TXT
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => downloadReport(
                                            selectedReport,
                                            JSON.stringify(selectedReport, null, 2),
                                            "json",
                                            "application/json",
                                        )}
                                    >
                                        Export JSON
                                    </button>
                                    <button type="button" onClick={() => removeReport(selectedReport)}>Delete</button>
                                </div>
                            </header>
                            <dl className="battle-report-summary">
                                <div><dt>Started</dt><dd>{formatDate(selectedReport.startedAt)}</dd></div>
                                <div><dt>Updated</dt><dd>{formatDate(selectedReport.updatedAt)}</dd></div>
                                <div><dt>Battle ID</dt><dd>{selectedReport.id.toUpperCase()}</dd></div>
                            </dl>
                            <ol className="battle-report-timeline">
                                {selectedReport.events.map((event) => (
                                    <li key={event.id}>
                                        <div><span>ROUND {event.round}</span><time>{formatDate(event.createdAt)}</time></div>
                                        <p>{event.message}</p>
                                    </li>
                                ))}
                            </ol>
                        </article>
                    )}
                </div>
            )}
        </main>
    );
};

export default BattleReports;
