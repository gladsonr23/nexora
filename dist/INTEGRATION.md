# Integrating Vault, SyllabusToSchedule, and NoteToQuiz into Nexora

These three files are self-contained and were built directly against your
real `index.html` / `app.js` / `styles.css` — same `--nx-*` CSS variables,
same `icon()`/`toast()` helpers, same hash router. Nothing in your existing
files is required to change except the two small edits below.

## 0. Start the API server

The three modules talk to a small Express + SQLite + Gemini backend that's
shipped separately (`nexora-api/`). From that folder:

```bash
cp .env.example .env      # then add your GEMINI_API_KEY
npm install
npm start                 # runs on http://localhost:4000
```

It's stateless from the dashboard's point of view — just a JSON API. CORS is
already enabled so the static dashboard can call it from a different origin
(e.g. opened via `file://`, or served by a separate dev server / Live Server
on a different port).

## 1. Copy these files next to your existing `dist/` files

```
dist/
  modules-shared.js
  modules-vault.js
  modules-schedule.js
  modules-quiz.js
  modules.css
  (your existing index.html, app.js, styles.css, favicon.svg, ...)
```

## 2. Edit `index.html`

Add the stylesheet, right after your existing one:

```html
<link rel="stylesheet" href="./styles.css">
<link rel="stylesheet" href="./modules.css">
```

Add the module scripts, right after `app.js`'s `<script>` tag (order matters —
`modules-shared.js` must load before the other three, and all four must load
after `app.js` since they reuse its `icon()`/`toast()` helpers):

```html
<script src="./app.js" defer></script>
<script>window.NEXORA_API_BASE = window.NEXORA_API_BASE || 'http://localhost:4000';</script>
<script src="./modules-shared.js" defer></script>
<script src="./modules-vault.js" defer></script>
<script src="./modules-schedule.js" defer></script>
<script src="./modules-quiz.js" defer></script>
```

(Change `NEXORA_API_BASE` if you deploy the API somewhere other than
`localhost:4000`.)

## 3. Edit `app.js` — replace one function

Your `navigate()` function currently always fills the generic "Feature in
development" placeholder for every module route. Replace it with the version
below, which does the same thing for the six modules that aren't built yet,
but hands off to the live module for `vault`, `schedule`, and `quiz`:

```js
const NEXORA_LIVE_MODULES = { vault: 'NexoraVault', schedule: 'NexoraSchedule', quiz: 'NexoraQuiz' };
const NEXORA_PLACEHOLDER_HTML = `<span class="nx-placeholder-rule"></span><h2>Workspace coming together</h2><p id="nx-module-detail"></p><a class="nx-secondary-button" href="#overview">Back to overview ${icon('arrow')}</a>`;

function navigate() {
  const id = location.hash.slice(1) || 'overview';
  const module = modules.find(m => m.id === id);
  const title = id === 'overview' ? 'Overview' : module?.name || (id === 'settings' ? 'Settings' : 'Overview');
  const actual = id === 'overview' || module || id === 'settings' ? id : 'overview';
  $('#nx-overview').hidden = actual !== 'overview';
  $('#nx-module').hidden = actual === 'overview' || actual === 'settings';
  $('#nx-settings').hidden = actual !== 'settings';
  $('#nx-breadcrumb-page').textContent = title;
  document.title = `Nexora — ${title}`;
  $$('.nx-nav-link').forEach(link => {
    const selected = link.dataset.page === actual;
    link.classList.toggle('nx-active', selected);
    if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  if (module) {
    $('#nx-module-group').textContent = module.group || 'Workspace';
    $('#nx-module-title').textContent = title;
    $('#nx-module-description').textContent = module.short || 'Choose how Nexora works for you.';
    const placeholder = $('.nx-module-placeholder');
    const liveKey = NEXORA_LIVE_MODULES[actual];
    const statusPill = $('#nx-module .nx-status-pill');
    if (liveKey && window[liveKey]) {
      if (statusPill) statusPill.textContent = 'Live';
      window[liveKey].mount(placeholder);
    } else {
      if (statusPill) statusPill.textContent = 'Feature in development';
      placeholder.innerHTML = NEXORA_PLACEHOLDER_HTML;
      $('#nx-module-detail').textContent = module.detail || 'Settings will be available as the team builds the full application.';
    }
  }
  closeNav();
  window.scrollTo({top:0,behavior:'auto'});
}
```

That's the only function that changes. Everything else — sidebar, theme
toggle, focus timer, sample overview tasks, settings — is untouched.

## 4. Optional: make the top-bar "Upload material" button smarter

Right now clicking it always does `location.hash = '#vault'` plus a toast.
Once Vault is live you may want it to also trigger the file picker when
you're already on the Vault page:

```js
$('#nx-upload').addEventListener('click', () => {
  if (location.hash === '#vault' && window.NexoraVault) {
    document.querySelector('#nxv-file-input')?.click();
  } else {
    location.hash = '#vault';
  }
});
```

This replaces the existing single-line listener for `#nx-upload`. Not
required — the current behavior (navigate to Vault) still works fine either
way.

## How the three modules talk to each other

- **Vault is the source of truth.** Every material lives in one `materials`
  table. SyllabusToSchedule and NoteToQuiz only ever reference a material by
  its `materialId` — they never re-parse or re-store a PDF themselves.
- Clicking **Generate Quiz** or **Create Study Plan** on a Vault row stores
  the material's ID in `sessionStorage` (`nexora-active-material`) and
  changes the hash. The target module reads and clears that value on mount,
  preselecting the right material in its dropdown. If you navigate there
  directly instead, the dropdown just defaults to the first material.
- **Tasks are one shared table**, written by SyllabusToSchedule and readable
  by anything else (Overview, Focus Mode) via `GET /api/tasks?date=...` and
  updated via `PATCH /api/tasks/:id`. If/when you wire the sample Overview
  tasks to real data, point them at those two endpoints instead of the
  `localStorage`-backed sample checkboxes currently in `app.js`.

## 5. Browser-side OCR (new)

`ocr.js` (previously uploaded empty) is now implemented. It runs entirely
client-side:

```
PDF file --(fetch)--> PDF.js renders each page to a <canvas>
                        --(one page at a time, one reused Tesseract worker)-->
                       Tesseract.js recognizes that canvas
                        --> text accumulated as "--- PAGE N ---\n...")
                        --> POST /api/materials/:id/ocr { extractedText }
```

For the Vault's **Run OCR** button, OCR remains browser-side —
`POST /api/materials/:id/ocr` only validates the recognized text (rejecting
near-empty results with a 422) and saves it, setting
`extraction_status = 'complete'` and `indexing_status = 'ready'`.

Separately, the API uses NVIDIA Nemotron OCR for scanned pages submitted to
Prof Pattern Detector, SyllabusToSchedule, and NoteToQuiz when
`NVIDIA_API_KEY` is configured on the API server. Selectable text is extracted
without sending it to NVIDIA; only rasterized pages that need OCR are sent.
Local Tesseract remains the fallback if NVIDIA is not configured or fails.

Two CDN scripts are needed in `index.html`, loaded before `ocr.js` (already
added in the updated copy, in this exact order — `defer` preserves document
order so pdf.js/tesseract.js are guaranteed to finish loading before `ocr.js`
runs, without blocking page render):

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js" defer></script>
<script src="./modules-shared.js" defer></script>
<script src="./ocr.js" defer></script>
<script src="./modules-vault.js" defer></script>
```

`modules-vault.js`'s `runOCR()` had already been wired up (by a previous
edit) to call the OCR endpoint with no body and a comment saying the backend
would "send it to Gemini OCR" — that's been corrected to actually run
`window.NexoraOCR.run(materialId, onProgress)` client-side and use the
backend only to persist the Vault flow's final result.

`window.NexoraOCR.run(materialId, onProgress)`:
- rejects a second concurrent call for the same material (`isRunning()`)
- calls `onProgress({ stage, message, percent, page, totalPages })` for each
  stage (`loading`, `preparing`, `page`, `saving`, `done`) — the Vault row's
  "Run OCR" button text is live-updated from `message`
- throws a clear error (not a stack trace) on PDF load failure, missing
  libraries, or "no readable text was detected", and the button re-enables
  itself on any failure so the user can retry

## What's stubbed vs. real

- Real: file upload, Multer storage, page-aware PDF text extraction, SQLite
  persistence, Gemini-backed syllabus parsing and quiz generation (once a
  key is set), deterministic scheduling algorithm, quiz grading, attempt
  history, search/filter, delete, loading/error/empty states.
- Not built here (by design, per your last message): actually splicing
  `Overview`'s sample task checkboxes and metric cards over to read from
  `GET /api/tasks` and `GET /api/materials` — that's a couple of small edits
  in `app.js`'s existing `renderTasks()`/metrics code, described above, left
  for you since it touches code your teammate owns.
