"use client";

import { useEffect, useState } from "react";
import ShipCatalog from "@/components/ShipCatalog";
import FleetRoster from "@/components/FleetRoster";
import {
    commanders, createFleet, getFleetIssues, getFleetPoints,
    getReserveAllowances, getRerollCosts, rulesUrl, storageKey,
} from "@/lib/fleets.mjs";
import { getDefaultFleetId, loadFleetLibrary } from "@/lib/fleet-storage.mjs";
import { refitsUrl, reservesUrl } from "@/lib/ship-upgrades.mjs";
import "./fleet-builder.css";

const FleetCreator = () => {
    const [fleets, setFleets] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [saveStatus, setSaveStatus] = useState("");
    const [pendingDelete, setPendingDelete] = useState(false);

    useEffect(() => {
        let active = true;

        // Defer browser storage loading until after hydration.
        queueMicrotask(() => {
            if (!active) return;

            try {
                const { fleets: saved, saveError } = loadFleetLibrary(window.localStorage);
                setFleets(saved);
                setSelectedId(getDefaultFleetId(saved));
                setLoaded(true);
                setSaveStatus("Saved on this browser only");

                if (saveError) {
                    setSaveStatus("Not saved: browser storage is unavailable or full. Keep this page open and retry saving.");
                }
            } catch {
                setLoadError("Saved fleets could not be read. Your stored data has been left untouched. Check browser storage access and reload to try again.");
            }
        });

        return () => { active = false; };
    }, []);

    const fleet = fleets.find((entry) => entry.id === selectedId);

    const saveFleets = (nextFleets) => {
        setFleets(nextFleets);

        try {
            window.localStorage.setItem(storageKey, JSON.stringify({ version: 1, fleets: nextFleets }));
            setSaveStatus("Saved on this browser only");
        } catch {
            setSaveStatus("Not saved: browser storage is unavailable or full. Keep this page open and retry saving.");
        }
    };

    const updateFleet = (changes) => {
        saveFleets(fleets.map((entry) => entry.id === selectedId ? { ...entry, ...changes } : entry));
    };

    const addFleet = () => {
        const nextFleet = createFleet();
        saveFleets([...fleets, nextFleet]);
        setSelectedId(nextFleet.id);
        setPendingDelete(false);
    };

    const duplicateFleet = () => {
        const copiedShips = fleet.ships.map((ship) => ({ ...ship, id: crypto.randomUUID() }));
        const flagshipIndex = fleet.ships.findIndex((ship) => ship.id === fleet.flagshipId);
        const copy = {
            ...fleet,
            id: crypto.randomUUID(),
            name: `${fleet.name} (copy)`,
            ships: copiedShips,
            flagshipId: copiedShips[flagshipIndex]?.id || "",
        };
        saveFleets([...fleets, copy]);
        setSelectedId(copy.id);
        setPendingDelete(false);
    };

    const deleteFleet = () => {
        const remaining = fleets.filter((entry) => entry.id !== selectedId);
        saveFleets(remaining);
        setSelectedId(remaining[0]?.id || "");
        setPendingDelete(false);
    };

    const addShip = (ship) => {
        updateFleet({
            ships: [...fleet.ships, {
                id: crypto.randomUUID(),
                classId: ship.id,
                name: `${ship.name} ${fleet.ships.filter((entry) => entry.classId === ship.id).length + 1}`,
                squadron: ship.type === "Escort" ? `${ship.name} Squadron` : "",
                upgrades: [],
                torpedoResult: 0,
            }],
        });
    };

    const points = fleet ? getFleetPoints(fleet) : 0;
    const issues = fleet ? getFleetIssues(fleet) : [];

    return (
        <main className="fleet-builder">
            <header className="page-heading">
                <div>
                    <p className="eyebrow">Imperial Navy / Space Marines</p>
                    <h1>Fleet builder</h1>
                    <p className="subtitle">Assemble your fleet. Keep your muster roll close.</p>
                </div>
                <span className="demo-badge">FIRST EDITION</span>
            </header>
            <p className="builder-reference">
                Based on the <a href={rulesUrl} target="_blank" rel="noreferrer">Battlefleet Gothic: Remastered fleet list ↗</a>.
                {" "}Includes ship options, <a href={refitsUrl} target="_blank" rel="noreferrer">ordnance refits</a>, and
                {" "}<a href={reservesUrl} target="_blank" rel="noreferrer">Bastion / Armageddon reserves</a>.
                {" "}<a href="https://battlefleet-game.org/fleet-lists/space-marines/" target="_blank" rel="noreferrer">Space Marine ships ↗</a> include base configurations; Codex, Crusade and Dominion eligibility and optional refits require manual review.
                {" "}Bakka, Mechanicus, allies and campaign rewards are not automated.
                {" "}Saved fleets are available in the Battle Tracker; illustrative profiles are marked as demo data.
            </p>
            {loadError && <p role="alert">{loadError}</p>}
            {!loaded && !loadError && <p role="status">Loading saved fleets…</p>}
            {loaded && (
                <>
                    <section className="panel builder-library" aria-label="Saved fleets">
                        <label>
                            Your fleets · {fleets.length}
                            <select
                                value={selectedId}
                                disabled={!fleets.length}
                                onChange={(event) => {
                                    setSelectedId(event.target.value);
                                    setPendingDelete(false);
                                }}
                            >
                                {!fleets.length && <option value="">No saved fleets</option>}
                                {fleets.map((entry) => (
                                    <option key={entry.id} value={entry.id}>{entry.name || "Untitled fleet"}</option>
                                ))}
                            </select>
                        </label>
                        <button type="button" onClick={addFleet}>+ New fleet</button>
                        {fleet && <button type="button" onClick={duplicateFleet}>Duplicate</button>}
                        {fleet && <button type="button" onClick={() => setPendingDelete(true)}>Delete fleet</button>}
                    </section>
                    <div className="builder-row builder-save">
                        <p role="status">{saveStatus}</p>
                        {saveStatus.startsWith("Not saved") && (
                            <button type="button" onClick={() => saveFleets(fleets)}>Retry save</button>
                        )}
                    </div>
                    {pendingDelete && (
                        <div className="panel builder-confirm" role="alert">
                            <p>Delete “{fleet.name || "Untitled fleet"}” from this browser? This cannot be undone.</p>
                            <button type="button" onClick={deleteFleet}>Confirm deletion</button>
                            <button type="button" onClick={() => setPendingDelete(false)}>Keep fleet</button>
                        </div>
                    )}
                    {!fleet && (
                        <section className="panel builder-empty">
                            <h2>No fleets in dock</h2>
                            <p>Create a fleet to start choosing ships. Changes save automatically on this device.</p>
                            <button type="button" onClick={addFleet}>Create your first fleet</button>
                        </section>
                    )}
                    {fleet && (
                        <>
                            <section className="panel builder-settings" aria-label="Fleet details">
                                <label>
                                    Fleet name
                                    <input
                                        value={fleet.name}
                                        maxLength={100}
                                        onChange={(event) => updateFleet({ name: event.target.value })}
                                    />
                                </label>
                                <label>
                                    Points budget
                                    <input
                                        type="number"
                                        min="1"
                                        max="100000"
                                        value={fleet.limit}
                                        onChange={(event) => {
                                            const limit = Number(event.target.value);
                                            if (Number.isSafeInteger(limit) && limit > 0 && limit <= 100000) updateFleet({ limit });
                                        }}
                                    />
                                </label>
                                <div className="builder-total" aria-live="polite">
                                    <strong>{points} <small>/ {fleet.limit} pts</small></strong>
                                    <span>{Math.abs(fleet.limit - points)} {points > fleet.limit ? "over budget" : "points remaining"}</span>
                                </div>
                            </section>
                            <div className="builder-columns">
                                <ShipCatalog onAdd={addShip} />
                                <div className="builder-stack">
                                    <FleetRoster fleet={fleet} onChange={updateFleet} />
                                    <section className="panel builder-panel" aria-labelledby="command-title">
                                        <p className="eyebrow">Fleet command</p>
                                        <h2 id="command-title">Commander &amp; re-rolls</h2>
                                        <label>
                                            Commander
                                            <select
                                                value={fleet.commander}
                                                onChange={(event) => updateFleet({ commander: event.target.value, rerolls: 0, flagshipId: "" })}
                                            >
                                                {commanders.map((commander) => (
                                                    <option key={commander.id} value={commander.id}>{commander.name} · {commander.points} pts</option>
                                                ))}
                                            </select>
                                        </label>
                                        {fleet.commander !== "none" && (
                                            <>
                                                <label>
                                                    Commander’s ship
                                                    <select value={fleet.flagshipId} onChange={(event) => updateFleet({ flagshipId: event.target.value })}>
                                                        <option value="">Choose a ship</option>
                                                        {fleet.ships.map((ship, index) => (
                                                            <option key={ship.id} value={ship.id}>{index + 1}. {ship.name || "Unnamed vessel"}</option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label>
                                                    {fleet.commander === "master-of-the-fleet" ? "Fleet re-rolls" : "Extra re-rolls (one already included)"}
                                                    <select value={fleet.rerolls} onChange={(event) => updateFleet({ rerolls: Number(event.target.value) })}>
                                                        {getRerollCosts(fleet).map((cost, count) => (
                                                            <option key={count} value={count}>{count} · {cost} pts</option>
                                                        ))}
                                                    </select>
                                                </label>
                                            </>
                                        )}
                                    </section>
                                    <section className="panel builder-panel builder-checks" aria-labelledby="checks-title">
                                        <p className="eyebrow">Composition review</p>
                                        <h2 id="checks-title">{issues.length ? `${issues.length} items to review` : "Roster checks passed"}</h2>
                                        <h3>Imperial Navy reserve allowances</h3>
                                        <ul>
                                            {getReserveAllowances(fleet).map((allowance) => (
                                                <li key={allowance.type}>
                                                    {allowance.type}: {allowance.used} / {allowance.allowed} reserves · {allowance.core} core
                                                </li>
                                            ))}
                                        </ul>
                                        <ul>
                                            {issues.map((issue) => <li key={issue}>{issue}</li>)}
                                        </ul>
                                        <p>Drafts save even when incomplete. Checks cover the supported selections and upgrade conflicts. Record special torpedo rolls before play; campaign refit pricing is not supported.</p>
                                    </section>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </main>
    );
};

export default FleetCreator;
