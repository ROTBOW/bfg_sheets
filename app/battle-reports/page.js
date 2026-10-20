export const metadata = {
    title: "Battle Reports | BFG Sheets",
    description: "Review reports from your Battlefleet Gothic battles.",
};

/**
 * Provides the initial route shell for future battle-report features.
 *
 * @returns {import("react").ReactNode} Empty battle reports page.
 */
const BattleReports = () => {
    return (
        <main className="battle-reports-page" aria-label="Battle reports">
            <div className="page-heading">
                <div>
                    <p className="eyebrow">BATTLE ARCHIVE</p>
                    <h1>Battle reports</h1>
                    STILL WIP, kisses ok bye
                </div>
            </div>
        </main>
    );
};

export default BattleReports;
