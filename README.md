# gon-app

Gon for macOS: the website, downloads and the in-app update feed.

- **Website:** https://caalabs.github.io/gon-app/ (`index.html`, `assets/`)
- **Downloads:** [Releases](https://github.com/caalabs/gon-app/releases)
- **Update feed:** `appcast.xml`, read by the app once a day

The page is plain HTML, CSS and a little JavaScript: Gon goes down through five floors of a disk, each floor
clears into bubbles as you scroll past, and a gauge counts what went to the Trash. The figures are an example from
a developer's Mac. Everything it uses is in this repo, so the page loads nothing from other sites:

- `assets/js/motion.min.js`: [Motion](https://motion.dev) 11.11.17 (MIT), which rolls the freed number. The
  floors clear without it too.
- `assets/fonts/`: Sora, self-hosted (SIL Open Font License, `Sora-OFL.txt`).

Visitors who ask for reduced motion get the page at rest.
