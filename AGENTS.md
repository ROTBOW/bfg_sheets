## Project context

### Reference and attribution

- The Battlefleet Gothic: Remastered Imperial Navy fleet list is a major help in the creation of this site: https://battlefleet-game.org/fleet-lists/imperial-navy/
- Keep this reference available for future ship-profile work
- Necron profiles and their faction-specific critical table use https://battlefleet-game.org/fleet-lists/necrons/ and its linked ship profiles (checked 2026-10-19).

This site automates tedious bookkeeping in the Battlefleet Gothic tabletop game. Prioritize clear ship information and fast interactions during play. The first page is a ship stat page using clearly labeled dummy data; sample statistics are not verified game rules.

Here’s the portable code style prompt, without the Next.js-specific instructions:

````markdown
# Coding style preferences

## Write for a human maintainer

- Prioritize code that is easy to read, understand, and edit over compactness or cleverness. Do not minify handwritten code or stylesheets.
- Use the surrounding code as the first style reference. Match its naming, indentation, quote style, and component organization. Follow established formatter settings.
- Give each logical step its own line. Use blank lines between setup, loops, conditionals, and returns so the flow is easy to scan.
- Use descriptive names such as `manga`, `chapter`, and `isSelected`, rather than shortening them to `m`, `ch`, or `s` just to save space. Short loop counters such as `i` and `idx` are fine.
- Keep related code in focused components and named helpers. Preserve existing component boundaries instead of combining a page into one large replacement component.
- Explicit loops and helper functions are welcome. Do not replace them with dense chains or inline callbacks merely to shorten code. A readable `.map()` is also fine when it fits the surrounding code.
- Short, obvious callbacks and ternaries are fine. Expand multi-step handlers and complicated conditions into blocks or named helpers.
- Explain intent or a non-obvious constraint with a short comment. Avoid verbose comments that only repeat what the code already says.
- Improve the code you touch without reformatting unrelated files. Follow the existing readable style without copying incidental bugs or accessibility issues.

## JSX: show the structure

Use parentheses around multiline JSX. Put nested elements on separate lines,
indent children, and put each prop on its own line when an element has several
props or expressions. A simple element can remain on one line.

For React code without an established convention, prefer four-space indentation,
arrow-function components, and the default export at the bottom.

Preferred:

```jsx
const genTiles = () => {
    let tiles = [];

    for (let idx = 0; idx < mangas.length; idx++) {
        const manga = mangas[idx];
        const isSelected = idx === curPage;

        tiles.push(
            <li key={manga.id}>
                <button
                    type="button"
                    onClick={() => setCurPage(idx)}
                    aria-label={`Show ${getENTitle(manga)}`}
                    aria-pressed={isSelected}
                    className={isSelected ? 'scale-105' : 'scale-100'}
                >
                    <Image
                        src={getCoverUrl(manga)}
                        width={720}
                        height={1280}
                        alt={`${getENTitle(manga)} cover`}
                        className="w-full h-full object-cover"
                    />
                </button>
            </li>
        );
    }

    return tiles;
};
```

Avoid compressing the same structure like this:

```jsx
const genTiles = () => mangas.map((m, i) => <li key={m.id}><button onClick={() => setCurPage(i)}><Image src={getCoverUrl(m)} width={720} height={1280} alt="cover" /></button></li>);
```

## State and handlers: keep the steps visible

Preferred:

```jsx
const updateLangs = (code) => {
    setLangs(oldData => {
        if (oldData.includes(code)) {
            return oldData.filter(lang => lang !== code);
        }

        return [...oldData, code];
    });
};
```

An obvious single action can stay inline:

```jsx
onClick={() => setShowLetter(state => !state)}
```

Several actions should have a readable handler:

```jsx
const closePreferences = () => {
    setShowPreferences(false);
    setRefresh(value => value + 1);
    preferencesButton.current?.focus();
};
```

## Styles: keep them editable

Keep Tailwind when it is already the project's styling approach. Static utility
lists can stay in a `className` string; use a clearly named variable when
conditional classes become difficult to follow. Do not introduce a new styling
system just for a small refinement.

When writing CSS, use one selector block and one declaration per line. Separate
rules with blank lines and indent media queries. Never pack a stylesheet into
one long line.

```css
.cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 300ms ease-out;
}

.selectedCover {
    transform: scale(1.05);
}

@media (prefers-reduced-motion: reduce) {
    .cover {
        transition: none;
    }
}
```

## Refine before replacing

When asked to refresh or polish an existing feature, make focused improvements
to what is already there. Preserve its identity, component boundaries, and
liked interactions unless a broader redesign is requested. A visual refresh
is not implicit permission for an architectural rewrite.

Apply these principles to the language and framework in use. The React examples
illustrate the preferred readability; they are not a requirement to use React.
````

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

