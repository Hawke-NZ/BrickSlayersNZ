# Brick Slayers NZ website

A plain static website (HTML, CSS, JavaScript). No build step, no framework, no database, nothing to install. Everything, including fonts and the physics engine, is inside this folder, so it works on any host.

## Look at it on your computer

Double-click `index.html`. Everything works except the live Instagram feed, because browsers block that on files opened from disk. To test the feed locally, open a terminal in this folder and run `python3 -m http.server 8000`, then visit http://localhost:8000.

## Put it on the internet

Upload the whole folder (not just index.html) to any static host. Easiest free options:

- **Cloudflare Pages** or **Netlify**: create a free account, choose "upload / drag and drop your site folder", done. Both give you a free web address and let you connect a custom domain later.
- **GitHub Pages**, or any normal web host (cPanel / FTP): upload the folder contents so `index.html` sits at the top level.

The `_headers` file is picked up automatically by Cloudflare Pages and Netlify (basic security headers). Other hosts ignore it, which is fine.

## The one file you edit: `js/config.js`

| Setting | What it does |
|---|---|
| `email` | Contact email, used across the page and by the quote form. |
| `phone` | Leave blank and no phone number appears. Add one (e.g. `'021 123 4567'`) and a "Call" button and phone line appear automatically. |
| `instagram` | Account name without the @. |
| `feed.url` | The Instagram feed address (see below). |
| `feed.maxPosts` | How many posts to show (default 12). |
| `feed.refreshMinutes` | How often an open page re-checks for new posts. |
| `formEndpoint` | Optional. See "Quote form" below. |

## Auto-updating Instagram gallery

Instagram doesn't offer a free public feed that any website can just read, so something has to sit in the middle. The site is built to accept any of these. Until one is set up, the gallery shows brick-bond pattern artwork as a stand-in, so it never looks broken or empty.

**Option A: a feed service (easiest, recommended).** Services like Behold (behold.so) connect to the Instagram account once and give you a web address that returns the latest posts as JSON. Roughly:

1. The person who owns @brick_slayersnz signs up to the service and connects the Instagram account. (Instagram normally requires it to be a Business or Creator account for this. That's a free setting switch in the Instagram app.)
2. Create a feed and copy its JSON feed URL.
3. Paste it into `feed.url` in `js/config.js` and upload the file again.

From then on, new Instagram posts appear on the site by themselves. Free-plan limits (number of posts, refresh speed) depend on the service, so check their current pricing page.

**Option B: your own Cloudflare Worker (no third party).** `worker/instagram-worker.js` is a small script that reads the Instagram API with your own access token, hides the token from visitors, caches results, and refreshes the token automatically. It needs a Meta developer app and a Cloudflare account. Setup notes are at the top of the file. Paste the Worker's address into `feed.url`.

**Option C: manual.** Edit `gallery.json` and add posts by hand (image path, caption, link). Used only when `feed.url` is blank, or if the feed is down and the visitor has no cached copy.

Behind the scenes: the site remembers the last good feed in each visitor's browser, so a short Instagram outage doesn't empty the gallery. Clicking a photo opens a viewer with the caption and a link to the post on Instagram.

**Honest status:** the feed code has been tested against realistic sample data in the Behold format and the Instagram API format, but not against the live @brick_slayersnz account (no access to it). Run through Option A once after launch and check the gallery fills with real posts.

## Quote form

By default, "Send it" opens the visitor's email app with the message pre-filled to `brickslayersnz@gmail.com`, and offers a "copy message" button in case they have no email app set up. That needs no server. If you want quotes to land straight in the inbox without the visitor's email app, sign up to a form service (Formspree, Web3Forms, etc.), and paste its endpoint URL into `formEndpoint`. If it ever fails, the form falls back to the email method automatically.

## Things to check before launch

These were written without any facts from the business, so please confirm or edit them in `index.html`:

- **Services** (the six "FILE" cards): brick and block walls, retaining walls, feature walls and letterboxes, fireplaces and chimneys, BBQs and pizza ovens, repairs and repointing.
- **Suburb list** in the second scrolling banner ("Coverage zone").
- **Wording:** all jokes, the "Kevin" mascot, and the rules list are invented. Nothing claims years of experience, licences, insurance or prices.
- **Sharing image and address:** in `index.html`, change `og:image` to the full web address of `img/og.png` once the site has a domain (e.g. `https://yourdomain.co.nz/img/og.png`), so links look right when shared on Facebook, iMessage and so on. Optionally add a `<link rel="canonical" ...>` too.
- Add a phone number in `config.js` if wanted.

## Effects, and things worth knowing

- Everything that moves is driven by `js/jiggle.js` (a small spring-physics engine) and `js/pit.js` (real rigid-body physics via matter-js, included in `js/`).
- Visitors who have "reduce motion" switched on in their device settings get a still version: same look, no jiggling, no boot screen, no falling bricks. Sound effects are off unless a visitor switches them on. Nothing on the page flashes rapidly.
- Easter eggs: the red DO NOT PRESS button, and the Konami code (up, up, down, down, left, right, left, right, B, A).
- The intercept-style boot screen plays once per visit and can be skipped by clicking or pressing any key.

## Folder map

```
index.html          the page (copy is edited here)
css/style.css       all styling
js/config.js        settings, the file you edit
js/jiggle.js        spring physics for the page
js/effects.js       cursor tail, splats, marquees, sound
js/pit.js           the brick pit
js/gallery.js       Instagram gallery + photo viewer
js/main.js          nav, headline, string board, form, panic button
js/matter.min.js    matter-js 0.20.0 (MIT licence, included)
fonts/              Bungee, Anton, Permanent Marker, Space Mono
img/                logo, favicon, sharing image
worker/             optional Cloudflare Worker for the Instagram API
gallery.json        optional manual gallery
```

## Credits

Physics: matter-js (MIT). Fonts: Bungee, Anton and Space Mono (SIL Open Font License), Permanent Marker (Apache 2.0), all via Google Fonts / Fontsource and self-hosted here. Logo, mascot and all artwork are original and drawn in code.
