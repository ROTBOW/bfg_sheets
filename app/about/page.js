import Link from "next/link";

export const metadata = {
    title: "About | BFG Sheets",
    description: "About BFG Sheets, a companion for Battlefleet Gothic fleet building and battle bookkeeping.",
};

const About = () => {
    return (
        <main className="about-page">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">BATTLEFLEET GOTHIC COMPANION</p>
                    <h1>About BFG Sheets</h1>
                    <p className="subtitle">Less bookkeeping. More time commanding your fleet.</p>
                </div>
            </div>
            <section className="panel about-section">
                <h2>Built for the tabletop</h2>
                <p>
                    BFG Sheets keeps fleet building, ship information, and battle
                    tracking close at hand. Assemble your fleet, check a vessel’s
                    profile, and track hull, shields, special orders, and critical
                    damage as the battle unfolds.
                </p>
                <p>
                    This is a companion to your game rules. Check the linked
                    sources for full rules and exceptions
                </p>
            </section>
            <section className="panel about-section">
                <h2>Reference &amp; thanks</h2>
                <p>
                    The{" "}
                    <a
                        className="rules-link"
                        href="https://battlefleet-game.org/fleet-lists/imperial-navy/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Battlefleet Gothic: Remastered Imperial Navy fleet list ↗
                    </a>{" "}
                    has been a major help in creating this site and remains a
                    reference for ship-profile work. Many thanks to its creators
                    and contributors.
                </p>
            </section>
            <section className="panel about-section">
                <h2>Disclaimer</h2>
                <p>
                    BFG Sheets is completely unofficial and is in no way endorsed
                    by Games Workshop Limited.
                </p>
                <p>
                    Games Workshop, Warhammer, Warhammer 40,000, Battlefleet Gothic,
                    and all associated logos, illustrations, images, names,
                    creatures, races, vehicles, locations, weapons, characters,
                    and their distinctive likenesses are trademarks and/or
                    copyrighted works of Games Workshop Limited, variably
                    registered around the world. Used without permission. No
                    challenge to their status is intended. All rights reserved to
                    their respective owners.
                </p>
                <p>
                    All other images, miniatures, and trademarks belong to their
                    respective owners. Used without permission. No challenge to
                    their status is intended. All rights reserved to their
                    respective owners.
                </p>
            </section>
            <Link className="secondary-button" href="/">
                Back to battle tracker
            </Link>
        </main>
    );
};

export default About;
