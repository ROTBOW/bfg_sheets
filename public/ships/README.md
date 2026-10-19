# Ship profiles

There is one profile JSON per Imperial Navy image in
[`../ship images/manifest.json`](../ship%20images/manifest.json). Bakka variants
have distinct filenames and IDs. `ship-template.json` is a blank authoring template.

The original eight profiles retain their illustrative statistics and
`isDemo: true` flag. Their image metadata now points to the downloaded assets.
The other 26 profiles use base statistics from their linked source pages,
accessed October 18, 2026. They include source metadata and concise summaries
of special rules and class options. These summaries do not replace the source rules.

## Fields

- `image`: public URL, intrinsic width and height, and source profile URL.
- `source`: provenance for newly transcribed statistics; image provenance alone
  does not mean an existing demo profile's statistics have been verified.
- `stats`: base hull, movement, shields, armour and turrets.
- `weapons`: numeric `rangeCm` for a single range. For range bands or mixed
  attack-craft speeds, `rangeCm` is null and `rangeLabel` is the display value,
  including units. `strengthUnit` distinguishes launch-bay squadrons.
- `specialRules`: short named summaries of inherent rules.
- `options`: class-specific optional changes, with signed point adjustments.
  These describe options; selecting a profile does not apply them.
- `points`: base cost, or null for the scenario-dependent Transport.
- `demoVessel`: optional illustrative vessel identity on the original profiles.

All profiles are registered in `lib/battle-profiles.js`. Only classes allowed
by the existing fleet-builder catalog can be selected in a saved fleet;
adding a profile does not expand fleet-list eligibility. Purchased upgrades
remain managed by `lib/ship-upgrades.mjs` and do not alter base battle statistics.
