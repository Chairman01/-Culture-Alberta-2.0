# Pin card fonts

Read from disk by `app/api/pin/[slug]/route.tsx` and bundled into that
function via `outputFileTracingIncludes` in `next.config.js`. They sit here,
not in `public/`, so the font files are never served to visitors.

| File | Used for | Licence |
| --- | --- | --- |
| `Kollektif-Regular.ttf` | City label | Free for commercial use, see `KOLLEKTIF-LICENSE.txt` |
| `Anton-Regular.ttf` | CULTURE wordmark | SIL Open Font License, see `ANTON-OFL.txt` |

## Why not OPTIMorgan One

The Canva template sets CULTURE in OPTIMorgan One. That is an "OPTI" font
from Castcraft Software, a foundry that appears to have closed around 2005.
Type-design forums describe OPTI fonts as unauthorised copies of other
designers' work with no obtainable licence, and download sites mark it
personal use only. Do not add it here. Anton is a free, open-licensed
condensed face that looks close. It was picked over League Gothic, which
was lighter and narrower.
