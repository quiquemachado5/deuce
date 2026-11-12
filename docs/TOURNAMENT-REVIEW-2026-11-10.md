# Tournament refinement and draw repair — 10 November 2026

Local work only. No commit, push or production deployment in this iteration.

## Interface

- Hero groups an enlarged, contrast-safe logo with the title, inline edition year and category. Archive range sits above the compact circuit/edition selector.
- Roland Garros uses orange/green, Wimbledon purple/green, US Open blue/yellow and Australia blue/white. Shared scorecards inherit tournament colours without changing their layout.
- The final uses a full photograph with the shared scoreboard overlaid, plus documented games/duration and a match link. Repeated editorial subtitles were removed.
- History and pressure statistics have distinct surfaces. Edition covers lead into a compact year ledger; mobile uses a horizontal cover strip and horizontal decade bars.
- Player directory actions use neutral grey. Shared scorecards show tournament marks. Unknown event marks use an explicitly identified official circuit fallback; this does **not** certify that every historical event has its own official logo.
- Replaced the weak Mallorca and Gstaad venue images with court photography. Other images were retained; this is not a complete photographic recuration.

## Data and durable evidence

Generation `eaa7d60c7586e6bcc42f`: 145,543 published completed matches, 236 lists and 14 browser partitions. ATP and WTA remain separate identities and calculations.

Paris 2026 is certified against the official 56-player draw with eight first-round byes: 55 contests = 52 completed matches, two retirements and one walkover. All 52 completed matches retain 20 official statistical entries and integer duration in minutes. Official scores and statistics preserve provider match IDs and player orientation.

Sources:

- https://www.rolexparismasters.com/en/draws/
- https://app-rpm.cdn.prismic.io/app-rpm/m8v7BlcUsPwhkD2l_Tableausimplemessieurs-30octobre.pdf

Raw source HTML, SHA-256, retrieval metadata and draw provenance are retained in `data/archive/references/`. The normalized reference is `lib/verified-paris-2026.json`.

Downloaded complete 2023–2026 ATP and WTA cohorts, preserving pagination, totals and resumable checkpoints. Main-draw rows with a null qualifying flag are retained unless independently classified as qualifying; the provider's false-only query had incorrectly omitted three Paris main-draw contests.

Publication merging now accepts fresher verified corrections without dropping newer published identities, richer unchanged-result statistics or point tapes. Official measurements are reattached after compact projections. Older checkouts cannot overwrite newer revisions.

Reviewed historical best-of-three exceptions recover previously rejected results without changing scores. Rule sources are stored alongside the exceptions in `lib/historical-formats.ts`. Rules version v21 records this semantic change; stale statistical evidence is not preserved solely to retain an obsolete record list.

## Remaining integrity work

The audit still identifies **256 confirmed incomplete editions**, **1,056 unresolved result rows**, and **2,764 editions whose complete draw size has not been certified**. A missing certification is distinct from a confirmed missing match. These counts remain exposed through Coverage; no scores were fabricated or issues suppressed.

The provider-detail repair phase accepted ten corrections and rejected 190 incomplete responses. Daily attempted-ID checkpoints prevent spending the same day's quota on identical failures. API usage at the last check: 553 used, 447 remaining from the credential's actual 1,000-call daily plan. Do not assume the account has 10,000 calls.

## Verification

- Dataset verification passed for the generation above.
- 41 focused data/publication/format tests passed, including stale-revision rejection and reviewed-statistics projection regression coverage.
- TypeScript check passed. Changed source lint and whitespace checks passed.
- Desktop/mobile visual inspection covers the hero, selector, final overlay and responsive scorecard layout. This is a local review, not a production release certification.
