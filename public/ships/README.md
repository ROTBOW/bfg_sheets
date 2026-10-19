# Ship profiles

Profiles are grouped by faction slug. Use lowercase, hyphenated folder names.
The shared `ship-template.json` stays here as a blank authoring template.

```text
public/
    ships/
        ship-template.json
        imperial-navy/
            lunar-class-cruiser.json
    ship-images/
        imperial-navy/
            lunar-class-cruiser.png
            manifest.json
            README.md
lib/
    factions/
        imperial-navy/
            profiles.js
    battle-profiles.js
```

There is one profile JSON per Imperial Navy image in the
[image manifest](../ship-images/imperial-navy/manifest.json). Bakka variants
have distinct filenames and IDs. Image filenames in the manifest are relative
to its faction folder; profile `image.src` values are public URLs such as
`/ship-images/imperial-navy/lunar-class-cruiser.png`.

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
- `stats.reactiveHullSave`: Necrons only. A string such as `"4+"` for Cairn,
  `"5+"` for Scythe/Shroud, or `"6+"` for Jackal/Dirge. Keep `stats.shields`
  at `0`; the main page and fleet menu display this value as Saves.
  Omit this field for other factions.
- `weapons`: numeric `rangeCm` for a single range. For range bands or mixed
  attack-craft speeds, `rangeCm` is null and `rangeLabel` is the display value,
  including units. `strengthUnit` distinguishes launch-bay squadrons.
- `specialRules`: short named summaries of inherent rules.
- `options`: class-specific optional changes, with signed point adjustments.
  These describe options; selecting a profile does not apply them.
- `points`: base cost, or null for the scenario-dependent Transport.
- `demoVessel`: optional illustrative vessel identity on the original profiles.

Imperial Navy imports live in `lib/factions/imperial-navy/profiles.js` and are
combined by `lib/battle-profiles.js`. Only classes allowed
by the existing fleet-builder catalog can be selected in a saved fleet;
adding a profile does not expand fleet-list eligibility. Purchased upgrades
remain managed by `lib/ship-upgrades.mjs` and do not alter base battle statistics.

## Adding another faction

The `adeptus-mechanicus` profiles use verified source hull statistics with the
Mechanicus fleet costs and mandatory equipment applied. They reuse shared hull
images where appropriate; their manifest records the actual public asset paths.
Gifts and purchased upgrades are separate from base profiles. Omnissiah’s Victory
already includes its fixed Gifts and turret strength. Its profile is not modified
by the generic capital-ship turret increase.

1. Create matching folders under `public/ships/<faction>/` and
   `public/ship-images/<faction>/`.
2. Copy the shared template into the profile folder and populate its fields.
   Follow its `_notes` for faction-specific fields, then remove `_notes` and
   any fields that do not apply. These notes are authoring metadata, not rules
   displayed in the app.
   Keep image attribution and dimensions in that faction's manifest and README.
3. Register profiles in `lib/factions/<faction>/profiles.js`, then include that
   registry in `lib/battle-profiles.js`. Registry keys must be unique across
   factions; use faction-prefixed keys for new classes that share names.
4. Add fleet eligibility and upgrade rules separately before exposing new
   classes in the fleet builder. Extend the profile tests for the new faction.

Existing Imperial Navy class IDs and profile IDs are unchanged, preserving
local-storage fleets. Moving assets does not require a fleet-data migration.
