"use client";

import { useEffect, useMemo, useState } from "react";
import {
    createConnectionTest,
    joinConnectionTest,
    leaveConnectionTest,
    sendConnectionTestSignal,
    subscribeToConnectionTest,
    subscribeToFirebaseConnection,
} from "@/firebase/connection-test";
import "./connect.css";

/**
 * Produces a readable identifier without weakening the full invite URL.
 *
 * @param {string} roomId Full secure room identifier.
 * @returns {string} Grouped room ID for manual entry.
 */
const formatRoomId = (roomId) => (
    roomId.match(/.{1,4}/g)?.join("-").toUpperCase() || roomId
);

/**
 * Removes visual separators and rejects malformed connection-test identifiers.
 *
 * @param {string} value User-entered room ID.
 * @returns {string} Normalized 32-character lowercase hexadecimal ID.
 */
const normalizeRoomId = (value) => {
    const roomId = value.replaceAll("-", "").trim().toLowerCase();
    return /^[a-f0-9]{32}$/.test(roomId) ? roomId : "";
};

/**
 * Displays the temporary two-machine Firebase connectivity test.
 *
 * @returns {import("react").ReactNode} Connect page UI.
 */
const Connect = () => {
    const [displayName, setDisplayName] = useState("Admiral");
    const [roomInput, setRoomInput] = useState("");
    const [roomId, setRoomId] = useState("");
    const [currentUid, setCurrentUid] = useState("");
    const [room, setRoom] = useState(null);
    const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
    const [isWorking, setIsWorking] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [copyMessage, setCopyMessage] = useState("");

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const inviteRoomId = normalizeRoomId(searchParams.get("room") || "");
        const updateInviteField = window.requestAnimationFrame(() => {
            if (inviteRoomId) {
                setRoomInput(formatRoomId(inviteRoomId));
            }
        });
        let unsubscribe;

        try {
            unsubscribe = subscribeToFirebaseConnection(setIsFirebaseConnected);
        } catch (error) {
            window.requestAnimationFrame(() => setErrorMessage(error.message));
        }

        return () => {
            window.cancelAnimationFrame(updateInviteField);
            unsubscribe?.();
        };
    }, []);

    useEffect(() => {
        if (!roomId) {
            return undefined;
        }

        return subscribeToConnectionTest(
            roomId,
            (nextRoom) => {
                setRoom(nextRoom);

                if (!nextRoom) {
                    setErrorMessage("The host ended this connection test.");
                    setRoomId("");
                    setCurrentUid("");
                }
            },
            (error) => setErrorMessage(error.message),
        );
    }, [roomId]);

    const participants = useMemo(() => Object.entries(room?.participants || {}), [room]);
    const inviteUrl = roomId && typeof window !== "undefined"
        ? `${window.location.origin}/connect?room=${roomId}`
        : "";
    const isHost = room?.hostUid === currentUid;
    const otherParticipant = participants.find(([uid]) => uid !== currentUid)?.[1];
    const latestSignalSender = room?.participants?.[room?.signal?.sentBy]?.displayName;

    /** Creates a new connection-test room for this browser. */
    const hostTest = async () => {
        setIsWorking(true);
        setErrorMessage("");

        try {
            const result = await createConnectionTest(displayName);
            setRoomId(result.roomId);
            setCurrentUid(result.user.uid);
            setRoomInput(formatRoomId(result.roomId));
            window.history.replaceState(null, "", `/connect?room=${result.roomId}`);
        } catch (error) {
            setErrorMessage(error.message);
        } finally {
            setIsWorking(false);
        }
    };

    /** Joins the room currently entered in the connection-code field. */
    const joinTest = async () => {
        const normalizedRoomId = normalizeRoomId(roomInput);

        if (!normalizedRoomId) {
            setErrorMessage("Enter the complete room ID from the host machine.");
            return;
        }

        setIsWorking(true);
        setErrorMessage("");

        try {
            const result = await joinConnectionTest(normalizedRoomId, displayName);
            setRoomId(result.roomId);
            setCurrentUid(result.user.uid);
            window.history.replaceState(null, "", `/connect?room=${result.roomId}`);
        } catch (error) {
            setErrorMessage(error.message);
        } finally {
            setIsWorking(false);
        }
    };

    /** Copies the full capability link used by the second machine. */
    const copyInvite = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopyMessage("Invite link copied.");
        } catch {
            setCopyMessage("Copy failed. Select the link below manually.");
        }
    };

    /** Leaves the test and lets the host remove its temporary database record. */
    const leaveTest = async () => {
        setIsWorking(true);
        setErrorMessage("");

        try {
            await leaveConnectionTest(roomId);
            setRoom(null);
            setRoomId("");
            setCurrentUid("");
            window.history.replaceState(null, "", "/connect");
        } catch (error) {
            setErrorMessage(error.message);
        } finally {
            setIsWorking(false);
        }
    };

    /** Sends a realtime pulse that should appear on both machines. */
    const sendSignal = async () => {
        setIsWorking(true);
        setErrorMessage("");

        try {
            await sendConnectionTestSignal(roomId);
        } catch (error) {
            setErrorMessage(error.message);
        } finally {
            setIsWorking(false);
        }
    };

    return (
        <main className="connect-page" aria-label="Connect">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">REALTIME LINK TEST</p>
                    <h1>Connect two machines</h1>
                    <p className="subtitle">
                        Create a temporary room, join it from another device, then send a live signal both ways.
                    </p>
                </div>
            </div>

            <div className="connect-status" role="status">
                <span className={isFirebaseConnected ? "status-light online" : "status-light"} />
                Firebase {isFirebaseConnected ? "connected" : "offline"}
            </div>

            {errorMessage && (
                <p className="connect-error" role="alert">{errorMessage}</p>
            )}

            {!roomId ? (
                <div className="connect-grid">
                    <section className="panel connect-panel">
                        <p className="eyebrow">MACHINE IDENTITY</p>
                        <h2>Your test name</h2>
                        <label>
                            Display name
                            <input
                                value={displayName}
                                maxLength={32}
                                onChange={(event) => setDisplayName(event.target.value)}
                            />
                        </label>
                    </section>

                    <section className="panel connect-panel">
                        <p className="eyebrow">MACHINE ONE</p>
                        <h2>Host a test</h2>
                        <p>Create a temporary room and share its invite with the second machine.</p>
                        <button type="button" disabled={isWorking} onClick={hostTest}>
                            {isWorking ? "Connecting…" : "Create connection test"}
                        </button>
                    </section>

                    <section className="panel connect-panel">
                        <p className="eyebrow">MACHINE TWO</p>
                        <h2>Join a test</h2>
                        <label>
                            Room ID
                            <input
                                value={roomInput}
                                placeholder="0000-0000-0000-0000-0000-0000-0000-0000"
                                spellCheck="false"
                                autoCapitalize="characters"
                                onChange={(event) => setRoomInput(event.target.value)}
                            />
                        </label>
                        <button type="button" disabled={isWorking} onClick={joinTest}>
                            {isWorking ? "Connecting…" : "Join connection test"}
                        </button>
                    </section>
                </div>
            ) : (
                <section className="panel connection-room">
                    <div className="connection-room-heading">
                        <div>
                            <p className="eyebrow">ROOM ID</p>
                            <h2>{formatRoomId(roomId)}</h2>
                        </div>
                        <span className="connection-role">{isHost ? "HOST" : "GUEST"}</span>
                    </div>

                    {isHost && (
                        <div className="invite-box">
                            <label htmlFor="connection-invite">Invite link</label>
                            <div>
                                <input id="connection-invite" readOnly value={inviteUrl} />
                                <button type="button" onClick={copyInvite}>Copy</button>
                            </div>
                            {copyMessage && <small role="status">{copyMessage}</small>}
                        </div>
                    )}

                    <div className="participant-grid">
                        {participants.map(([uid, participant]) => (
                            <article className="participant-card" key={uid}>
                                <span className={participant.connected ? "status-light online" : "status-light"} />
                                <div>
                                    <strong>{participant.displayName}</strong>
                                    <small>{participant.role} · {uid === currentUid ? "this machine" : "remote machine"}</small>
                                </div>
                            </article>
                        ))}
                        {participants.length < 2 && (
                            <article className="participant-card waiting">
                                <span className="status-light" />
                                <div>
                                    <strong>Waiting for machine two</strong>
                                    <small>Open the invite link on another device.</small>
                                </div>
                            </article>
                        )}
                    </div>

                    <div className="signal-test">
                        <div>
                            <p className="eyebrow">BIDIRECTIONAL TEST</p>
                            <strong>
                                {room?.signal
                                    ? `Latest signal: ${latestSignalSender || "participant"}`
                                    : "No signal sent yet"}
                            </strong>
                            <small>
                                {otherParticipant
                                    ? `${otherParticipant.displayName} is in the room. Send a signal from each machine.`
                                    : "The signal control activates when the second machine appears."}
                            </small>
                        </div>
                        <button
                            type="button"
                            disabled={isWorking || !otherParticipant}
                            onClick={sendSignal}
                        >
                            Send test signal
                        </button>
                    </div>

                    <button
                        type="button"
                        className="leave-button"
                        disabled={isWorking}
                        onClick={leaveTest}
                    >
                        {isHost ? "End and delete test" : "Leave test"}
                    </button>
                </section>
            )}
        </main>
    );
};

export default Connect;
