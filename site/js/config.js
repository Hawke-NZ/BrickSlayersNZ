/* ==========================================================
   BRICK SLAYERS NZ: SITE SETTINGS
   This is the only file you should ever need to edit.
   See README.md for the Instagram set-up steps.
   ========================================================== */
window.BRICKSLAYERS = {

  // Shown in the contact section and used by the quote form.
  email: 'brickslayersnz@gmail.com',

  // Leave blank to hide phone links. e.g. '021 123 4567'
  phone: '',

  // Instagram account name (no @). Used for all the "Follow" links.
  instagram: 'brick_slayersnz',

  // ---- Instagram auto-updating gallery ----
  // Paste ONE feed URL here and the gallery updates itself every time
  // someone visits the site (and every few minutes while they stay).
  // Works with: a Behold.so JSON feed URL, your own Cloudflare Worker
  // (see worker/instagram-worker.js), or any URL returning Instagram
  // Graph API "media" JSON. Leave blank to show the stand-in wall art.
  feed: {
    url: '',
    maxPosts: 12,
    refreshMinutes: 10
  },

  // Optional manual fallback: a JSON file of posts (see gallery.json).
  // Used when no feed URL is set, or the feed is down and nothing is cached.
  localFeed: 'gallery.json',

  // Optional: paste a Formspree / Web3Forms / similar endpoint here and the
  // quote form will POST there instead of opening the visitor's email app.
  formEndpoint: ''
};
