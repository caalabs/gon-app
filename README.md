# gon-app

Gon for macOS: the website, downloads and the in-app update feed.

- **Website:** https://caalabs.github.io/gon-app/ (`index.html`, `assets/`)
- **Downloads:** [Releases](https://github.com/caalabs/gon-app/releases)
- **Update feed:** `appcast.xml`, read by the app once a day

The page is plain HTML and CSS. The app windows on it are drawn in HTML, not screenshots, with figures from a
developer's Mac. Scroll motion comes from [Motion](https://motion.dev) 11.11.17 (MIT), kept in
`assets/js/motion.min.js` so the page loads nothing from other sites. Visitors who ask for reduced motion get the
page without it.

Review aids (no effect on visitors): `?nomotion` shows the page at rest, `?shot` fixes the heights that use
viewport units for full-page screenshots, and `?step=0|1|2` holds "How it works" on one step.
