# Parthajit Das — Portfolio

A static, responsive portfolio with project details, a photo gallery, and a Firebase-backed content editor. The site uses browser-native HTML, CSS, and JavaScript modules; there is no bundler or runtime server in this project.

## Run locally

Use a local HTTP server so JavaScript modules and Firebase work correctly. From the project root:

```sh
python -m http.server 8000
```

Open `http://localhost:8000`. The home page, project pages, and gallery read public content from Firestore. The editor is at `http://localhost:8000/admin.html` and uses Firebase Authentication.

The site loads Firebase's browser SDK from `gstatic.com`, so an internet connection is required for dynamic content and the admin editor. Static page structure and local assets can still be inspected without Firebase access.

## Firebase setup and security

`js/firebase.js` holds the Firebase web configuration shared by all pages. Firebase web API keys identify a client project and are expected to be visible in a static website; they are not administrator credentials. Do not add service account keys, private keys, passwords, or other server credentials to this repository.

The admin page's sign-in state only controls its interface. Firestore Security Rules must independently restrict writes and message access to the intended administrator UID. Public users need read access to published portfolio collections and narrowly validated message creation. Enable Firebase App Check and configure abuse controls for public contact submissions. Set the production hostname in Firebase Authentication's authorized domains and use HTTPS.

Before deployment, review the rules in the Firebase console or repository hosting configuration. They are external to this source archive and cannot be verified here. In particular, an `allow write: if request.auth != null` rule is not sufficient: it would grant write access to every signed-in user.

No `.env` file is used in this browser-only setup. If the Firebase project changes, update the shared configuration in `js/firebase.js`.

## Architecture

- `index.html`, `project.html`, `galleria.html`, and `admin.html` are the page entry points.
- `script.js`, `project.js`, `gallery.js`, and `admin.js` contain page behavior.
- `js/firebase.js` initializes Firebase once per page and exports the shared services.
- `js/safe-content.js` centralizes text escaping, allowed external URLs, document IDs, and asset paths.
- `js/theme.js` keeps the theme toggle and preference consistent across pages.
- `js/reveal.js` adds small on-scroll transitions while respecting reduced-motion preferences.
- `style.css` defines the shared responsive visual system; `admin.css` contains editor-specific layout rules.
- `favicon.svg` provides the portfolio’s PD browser-tab mark.
- `assets/` holds the original résumé, certificates, education, project, and gallery files.

## Technical audit and changes

- Replaced the original purple/blue cyber dashboard styling, ornamental effects, and animated typing with a research-led editorial visual system and responsive page layouts.
- Refined project cards and detail pages, balanced the education image sizes, rebuilt the contact links as a labeled icon list, widened the Galleria event photo layout, and added subtle entrance/scroll motion with a reduced-motion fallback.
- Kept the existing portfolio sections, Firebase collections, project details, certificate previews, gallery browsing, contact messages, and authenticated content editor.
- Centralized duplicate Firebase initialization and shared rendering/security helpers.
- Escaped Firestore text before rendering; restricted external links to HTTP(S), project and certificate previews to file names, gallery photos to `assets/gallery/`, and inline admin actions to safe Firestore document IDs.
- Added independent loading, empty, and unavailable states for public database content, plus accessible contact form success/failure feedback.
- Added labels, keyboard-operable photo previews, focus states, reduced-motion support, page titles/descriptions, social preview metadata, and a non-indexed editor page.
- Removed third-party font and icon downloads; the design uses system fonts and text marks.
- Updated the Pages workflow to publish only website files instead of the repository archive and documentation.

## Verification

This project has no package manifest, build command, lint script, or automated test suite. JavaScript syntax was checked for all eight modules; all four HTML pages and both stylesheets passed structural checks; a local HTTP server returned 200 for the four pages and eleven stylesheet/module/favicon URLs; and a source scan found no private keys or hardcoded passwords. A build command does not exist for this static site.

Live Firestore reads and writes, administrator authorization, message persistence, hosting rules, and production deployment were not verified because they require Firebase project access. Browser-level layout and live interaction review were also unavailable in this pass. Do not treat the Firebase UI as a security boundary; enforce authorization in Firestore Rules.

## Deploy

Publish the static site root over HTTPS using GitHub Pages or another static host. The GitHub Pages workflow assembles the site from its HTML, CSS, JavaScript, and `assets/` files; it does not publish the source ZIP or this README. Configure Firebase's authorized domain and Firestore rules before enabling admin edits or public messages. No database migration is required: existing collection names and content fields remain in use.
