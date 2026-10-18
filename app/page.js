"use client";

import { useState } from "react";
import Link from "next/link";

const weapons = [
    ["Port weapons battery", "Battery", "30 cm", 6, "Left"],
    ["Starboard weapons battery", "Battery", "30 cm", 6, "Right"],
    ["Port lance battery", "Lance", "30 cm", 2, "Left"],
    ["Starboard lance battery", "Lance", "30 cm", 2, "Right"],
    ["Prow torpedoes", "Torpedo", "30 cm", 6, "Front"],
];

const weaponMarkers = {
    Battery: "⊞",
    Lance: "✧",
    Torpedo: "↑",
};

const getHullStatus = (hull) => {
    if (hull === 0) {
        return "Hull depleted";
    }

    if (hull < 8) {
        return "Hull damaged";
    }

    return "Battle ready";
};

const ShipDiagram = () => {
    return (
        <svg
            viewBox="0 0 620 250"
            role="img"
            aria-label="Illustrative side profile of an Imperial cruiser"
        >
            <defs>
                <pattern
                    id="grid"
                    width="28"
                    height="28"
                    patternUnits="userSpaceOnUse"
                >
                    <path
                        d="M28 0H0V28"
                        fill="none"
                        stroke="#344238"
                        strokeWidth=".5"
                    />
                </pattern>
                <linearGradient
                    id="metal"
                    x2="0"
                    y2="1"
                >
                    <stop stopColor="#899a8b" />
                    <stop
                        offset="1"
                        stopColor="#34483f"
                    />
                </linearGradient>
            </defs>
            <rect
                width="620"
                height="250"
                fill="url(#grid)"
            />
            <g
                stroke="#667b6a"
                fill="none"
                opacity=".5"
            >
                <path
                    d="M30 126H590M310 15V235"
                    strokeDasharray="4 7"
                />
                <circle
                    cx="310"
                    cy="126"
                    r="94"
                />
                <circle
                    cx="310"
                    cy="126"
                    r="110"
                    strokeDasharray="2 8"
                />
            </g>
            <g
                fill="url(#metal)"
                stroke="#a6b199"
                strokeWidth="1.3"
                strokeLinejoin="round"
            >
                <path d="M91 109 128 97 185 97 199 83 393 83 415 99 474 99 531 119 559 134 517 153 439 155 414 170 180 170 157 156 112 156 91 145Z" />
                <path d="M166 103H429V146H166ZM213 83V64H235V83M251 83V49H275V83M291 83V58H314V83M335 83V68H358V83M262 49V26M252 39H272M196 151H403L391 182H216ZM113 106H141V151H113ZM85 114H111V143H85M71 119H85V138H71M433 104 485 111 519 134 479 145 433 146Z" />
                {Array.from({ length: 9 }, (_, i) => (
                    <path
                        key={i}
                        d={`M${185 + i * 25} 108h13v29h-13z`}
                    />
                ))}
                <path d="M226 63 224 49 233 38 241 49 239 63M295 58 294 43 302 34 310 43 309 58M345 68V53L351 44 357 53V68" />
            </g>
            <g
                fill="#adbcab"
                fontSize="9"
                fontFamily="monospace"
            >
                <text
                    x="25"
                    y="25"
                >
                    PROFILE // LN–048
                </text>
                <text
                    x="425"
                    y="225"
                >
                    IMPERIAL NAVY
                </text>
                <text
                    x="25"
                    y="225"
                >
                    SCHEMATIC · NOT TO SCALE
                </text>
            </g>
        </svg>
    );
};

const Tracker = ({ label, value, max, onChange, tone = "" }) => {
    return (
        <div className={`tracker ${tone}`}>
            <div className="tracker-heading">
                <span>{label}</span>
                <strong>
                    {value}
                    <small> / {max}</small>
                </strong>
            </div>
            <div className="tracker-controls">
                <button
                    aria-label={`Decrease ${label}`}
                    disabled={!value}
                    onClick={() => onChange(value - 1)}
                >
                    −
                </button>
                <div
                    className="segments"
                    aria-hidden="true"
                >
                    {Array.from({ length: max }, (_, i) => (
                        <span
                            key={i}
                            className={i < value ? "filled" : ""}
                        />
                    ))}
                </div>
                <button
                    aria-label={`Increase ${label}`}
                    disabled={value === max}
                    onClick={() => onChange(value + 1)}
                >
                    +
                </button>
            </div>
        </div>
    );
};

const Home = () => {
    const [hull, setHull] = useState(8);
    const [shields, setShields] = useState(2);
    const [order, setOrder] = useState("No special orders");
    const [notes, setNotes] = useState("");
    const [message, setMessage] = useState("");

    const hullStatus = getHullStatus(hull);

    const resetBattleTrackers = () => {
        setHull(8);
        setShields(2);
        setOrder("No special orders");
        setMessage("Trackers reset. Captain’s notes retained.");
    };

    return (
        <>
            <header className="topbar">
                <Link
                    href="/"
                    className="brand"
                >
                    <span className="brand-mark">✦</span>
                    <span>
                        BFG Sheets<small>BATTLEFLEET GOTHIC COMPANION</small>
                    </span>
                </Link>
                <span className="topbar-label">SHIP COMMAND</span>
                <span className="demo-badge">DEMO DATA</span>
            </header>
            <main>
                <div className="breadcrumb">
                    Imperial Navy <span>/</span> Cruiser <span>/</span> Ship
                    profile
                </div>
                <div className="page-heading">
                    <div>
                        <p className="eyebrow">VESSEL RECORD · IN–048</p>
                        <h1>His Will</h1>
                        <p className="subtitle">
                            Lunar-class cruiser <span>·</span> Imperial Navy
                        </p>
                    </div>
                    <button
                        className="secondary-button"
                        onClick={() => window.print()}
                    >
                        ↗ &nbsp; Print ship sheet
                    </button>
                </div>
                <div className="main-grid">
                    <div>
                        <section className="panel vessel">
                            <div className="panel-heading">
                                <span className="eyebrow">LUNAR CLASS</span>
                                <span className="registry">
                                    BATTLELINE CRUISER
                                </span>
                            </div>
                            <ShipDiagram />
                            <div className="vessel-caption">
                                <em>
                                    A steadfast presence in the line of battle.
                                </em>
                                <span>
                                    <strong>180</strong> POINTS
                                </span>
                            </div>
                        </section>
                        <section
                            className="stat-strip"
                            aria-label="Ship characteristics"
                        >
                            {[
                                ["Type", "Cruiser"],
                                ["Speed", "20", "cm"],
                                ["Turns", "45", "°"],
                                ["Shields", "2"],
                                ["Armour", "6+ / 5+"],
                                ["Turrets", "2"],
                            ].map(([label, value, unit]) => (
                                <div key={label}>
                                    <span>{label}</span>
                                    <strong>
                                        {value}
                                        <small>{unit}</small>
                                    </strong>
                                </div>
                            ))}
                        </section>
                        <section className="panel armament">
                            <div className="panel-heading">
                                <h2>
                                    <span className="section-number">01</span>
                                    Armament
                                </h2>
                                <span className="registry">
                                    5 WEAPON SYSTEMS
                                </span>
                            </div>
                            <div className="table-scroll">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Weapon system</th>
                                            <th>Range / speed</th>
                                            <th>Strength</th>
                                            <th>Fire arc</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {weapons.map(
                                            ([
                                                name,
                                                type,
                                                range,
                                                strength,
                                                arc,
                                            ]) => (
                                                <tr key={name}>
                                                    <td>
                                                        <span
                                                            className="weapon-marker"
                                                            aria-hidden="true"
                                                        >
                                                            {
                                                                weaponMarkers[
                                                                    type
                                                                ]
                                                            }
                                                        </span>
                                                        {name}
                                                        <small>{type}</small>
                                                    </td>
                                                    <td>{range}</td>
                                                    <td className="strength">
                                                        {strength}
                                                    </td>
                                                    <td>
                                                        <span className="arc">
                                                            {arc}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="panel-footnote">
                                Base profile shown. Battle trackers do not
                                modify weapon values yet.
                            </div>
                        </section>
                        <section className="panel notes">
                            <div className="panel-heading">
                                <h2>
                                    <span className="section-number">02</span>
                                    <label htmlFor="notes">
                                        Captain’s notes
                                    </label>
                                </h2>
                                <span className="registry">SESSION ONLY</span>
                            </div>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(event) =>
                                    setNotes(event.target.value)
                                }
                                placeholder="Record critical damage, objectives, or a particularly heroic manoeuvre…"
                            />
                        </section>
                    </div>
                    <aside>
                        <section className="panel battle">
                            <div className="panel-heading">
                                <h2>Battle status</h2>
                                <span className="live-dot" />
                            </div>
                            <div
                                role="status"
                                className={`status-banner ${hull < 8 ? "damaged" : ""}`}
                            >
                                ◇ &nbsp; {hullStatus}
                            </div>
                            <Tracker
                                label="Hull integrity"
                                value={hull}
                                max={8}
                                onChange={setHull}
                            />
                            <Tracker
                                label="Active shields"
                                value={shields}
                                max={2}
                                onChange={setShields}
                                tone="shield"
                            />
                            <div className="leadership">
                                <span>
                                    Leadership<small>Assigned demo value</small>
                                </span>
                                <strong>8</strong>
                            </div>
                            <div className="order-control">
                                <label htmlFor="order">Special orders</label>
                                <select
                                    id="order"
                                    value={order}
                                    onChange={(event) =>
                                        setOrder(event.target.value)
                                    }
                                >
                                    {[
                                        "No special orders",
                                        "All ahead full",
                                        "Come to new heading",
                                        "Burn retros",
                                        "Lock on",
                                        "Reload ordnance",
                                        "Brace for impact",
                                    ].map((specialOrder) => (
                                        <option key={specialOrder}>
                                            {specialOrder}
                                        </option>
                                    ))}
                                </select>
                                <p>
                                    Record the current order after resolving it
                                    at the table.
                                </p>
                            </div>
                            <button
                                className="reset-button"
                                onClick={resetBattleTrackers}
                            >
                                ↺ &nbsp; Reset battle trackers
                            </button>
                            {message && (
                                <p
                                    role="status"
                                    className="reset-message"
                                >
                                    {message}
                                </p>
                            )}
                        </section>
                        <section className="reference-card">
                            <p className="eyebrow">OFFICER’S BRIEFING</p>
                            <h3>Built for the tabletop.</h3>
                            <p>
                                Keep your ship’s profile close and your
                                bookkeeping light. Adjust hull and shields as
                                the battle unfolds.
                            </p>
                            <hr />
                            <p className="demo-note">
                                Prototype · All statistics are illustrative.
                                Changes last until you refresh this page.
                            </p>
                        </section>
                    </aside>
                </div>
                <footer>
                    <span>VOID LEDGER &nbsp; / &nbsp; IMPERIAL NAVY</span>
                    <span>Unofficial tabletop companion · Demo profile</span>
                </footer>
            </main>
        </>
    );
};

export default Home;
