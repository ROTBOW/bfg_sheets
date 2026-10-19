const SpecialRules = ({ rules = [], isDemo = false, source }) => {
    return (
        <section className="reference-card" aria-labelledby="special-rules-heading">
            <h2 id="special-rules-heading">Special rules</h2>
            {rules.length > 0 ? (
                rules.map((rule, index) => (
                    <div key={`${rule.name}-${index}`}>
                        <h3>{rule.name}</h3>
                        <p>{rule.description}</p>
                    </div>
                ))
            ) : (
                <p className="special-rules-empty">
                    No special rules recorded for this ship.
                </p>
            )}
            {isDemo && (
                <>
                    <hr />
                    <p className="demo-note">
                        Demo profile · Statistics and rules are not verified game rules.
                    </p>
                </>
            )}
            {source && (
                <p>
                    Base statistics and rule summaries from the{" "}
                    <a href={source.url} target="_blank" rel="noreferrer">ship profile ↗</a>.
                    {source.factionUrl && (
                        <>
                            {" "}<a href={source.factionUrl} target="_blank" rel="noreferrer">Faction rules ↗</a>.
                        </>
                    )}
                </p>
            )}
        </section>
    );
};

export default SpecialRules;
