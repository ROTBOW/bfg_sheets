This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Fleet builder

Visit `/fleet-creator` to create, rename, duplicate and delete fleets. Edits save
automatically in this browser's local storage under `bfg-sheets.fleets.v1`.
Fleets do not sync between devices, and clearing browser data removes them.
On first use, a “Demo fleet” starts with the Lunar-class cruisers His Will and
Steadfast. Existing saved fleets are preserved; new fleets start empty.

Each fleet saves a `selectedFaction` (Imperial Navy, Space Marines or Adeptus Mechanicus), editable
through **Selected Faction**. This controls faction composition checks without
restricting which ships can be added. New fleets default to Imperial Navy.
Older saves without this field infer Space Marines if they contain any Marine
ships, otherwise Imperial Navy, preserving the previous commander-check behavior.
The inferred choice is stored on the next edit; changing faction preserves ships,
upgrades and commander selections. Ship-specific checks still follow each ship.

The builder uses the selections from the
[Remastered Imperial Navy Gothic Sector fleet list](https://battlefleet-game.org/fleet-lists/imperial-navy/#segmentum-obscurus-gothic-sector-fleet-list),
checked October 18, 2026. It includes point totals, commanders and re-rolls,
ship support ratios, the cruiser cap, and named escort squadrons. Use the same
squadron name to group escorts, including mixed classes. Incomplete drafts can
be saved. Expand a vessel's **Upgrades & refits** to configure class options,
power rams, special torpedo rolls, torpedo bombers and orbital mines. Costs and
conflicts are checked, including squadron requirements for Cobra detection gear.
Special torpedoes use one-off game pricing; record a physical D6 result rather
than choosing a torpedo type freely. Each option links to its rule source.

Ten additional reserve classes are available from the Bastion and Armageddon
lists. The selector marks their source and can filter core ships or reserves.
Reserve allowances use core ships only, group all cruiser types together, and
keep battleships and escorts separate. Composition checks also cover the Bastion
grand-cruiser and rare light-cruiser restrictions. Source lists are fixed for
these entries (Endeavour, Endurance and Defiant use the Bastion list).

Existing version-1 saves remain compatible; missing upgrade fields mean base
configuration. Bakka, allies, campaign rewards/pricing and alternate
primary fleet lists are not supported yet.

The battle tracker's top-left fleet selector reads this same saved library and
selects Demo fleet by default (or the first saved fleet if it was removed).
Hull, shields, orders and notes stay separate per vessel and fleet while the
tracker is open; they reset on reload. The original eight profiles retain their
illustrative base statistics; the additional profiles contain sourced base
statistics and linked rule summaries. All 34 Imperial Navy images have matching
profiles. Purchased options are listed but do not modify base statistics.
See `public/ships/README.md` for the profile schema and provenance.

Ship assets are grouped by faction: JSONs in `public/ships/imperial-navy/`,
images and attribution in `public/ship-images/imperial-navy/`, and imports in
`lib/factions/imperial-navy/profiles.js`. The shared ship template stays at
`public/ships/ship-template.json`.

Run fleet calculation and saved-data validation checks with
`node --test tests/*.test.mjs`.

## Adeptus Mechanicus

All 18 entries from the [Remastered Mechanicus fleet list](https://battlefleet-game.org/fleet-lists/adeptus-mechanicus/)
are available in the builder and battle tracker, including Omnissiah’s Victory,
three other battleships, seven cruisers and seven escorts. Profiles were checked
October 18, 2026 against the linked hull pages. Faction costs, capital-ship extra
turrets and full-cruiser dorsal lances are included in their base statistics.
The Ark uses its own published equipment without an extra turret or random Gift.
Carrier profiles exclude assault boats. Existing Navy demo profiles are unchanged.

Mechanicus IDs are faction-prefixed and save in the existing version-1 format.
Archmagos commanders and their paid re-rolls, battleship support, Ark flagship
requirements and escort turret consistency are checked. Mixed-fleet reserve and
ally eligibility still require review against the linked rules.

Purchasable weapon exchanges, battery range, prow armour, escort turrets and
ordnance options contribute to fleet totals and appear in the tracker’s upgrade
list. As with existing factions, purchased refits do not change the displayed
base statistics. Roll Gifts and Quest for Knowledge at the table, record outcomes
in battle notes and apply their effects manually. Notes reset on page reload.

Mechanicus JSONs and the image manifest live under their respective
`adeptus-mechanicus` folders. Shared hulls reuse existing Navy/Marine illustrations;
the Ark has its own downloaded image. All images retain source attribution.

## Development

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
