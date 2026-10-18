const icons = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  vault: '<path d="M3 6h6l2 2h10v11H3z"/>',
  schedule: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h3m3 0h3"/>',
  summarizer: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2m-8-5 4 3-4 3z"/>',
  flashloop: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8m-8 4h5M3 6v12m18-12v12"/>',
  quiz: '<path d="M5 3h14v18H5zM8 8h5m-5 5 2 2 4-4m2 4h1"/>',
  assistant: '<path d="M4 4h16v12H9l-5 4z"/><path d="M8 9h8m-8 3h5"/>',
  focus: '<circle cx="12" cy="13" r="8"/><path d="M12 13V8m0 5 3 2M9 2h6m4 3 2-2"/>',
  analytics: '<path d="M3 20h18M6 17v-5m6 5V7m6 10V4"/>',
  pattern: '<path d="M3 20h18M6 16l5-5 4 3 5-7"/><circle cx="6" cy="16" r="1"/><circle cx="11" cy="11" r="1"/><circle cx="15" cy="14" r="1"/><circle cx="20" cy="7" r="1"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M2 12h3m14 0h3M4.9 19.1 7 17m10-10 2.1-2.1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 15.8A8 8 0 0 1 8.2 4 8 8 0 1 0 20 15.8z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9zM10 21h4"/>',
  upload: '<path d="M12 16V3m-4 4 4-4 4 4M4 16v5h16v-5"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="M5 5l14 14M19 5 5 19"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  edit: '<path d="m16 4 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4z"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  play: '<path d="m8 4 12 8-12 8z"/>',
  pause: '<path d="M7 4v16m10-16v16"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
};

const icon = (name, className = '') =>
  `<svg class="nx-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

const modules = [
  {
    id: 'vault',
    name: 'Vault',
    group: 'Study workspace',
    short: 'Course files in one place',
    detail: 'Store PDFs, syllabi, assignment sheets, lecture slides, and generated study notes.'
  },
  {
    id: 'schedule',
    name: 'SyllabusToSchedule',
    group: 'Study workspace',
    short: 'A plan from your syllabus',
    detail: 'Turn course documents and exam dates into a practical daily study schedule.'
  },
  {
    id: 'summarizer',
    name: 'One-Shot Summarizer',
    group: 'Study workspace',
    short: 'Lectures become study notes',
    detail: 'Turn long YouTube lectures into timestamped notes you can export and save in Vault.'
  },
  {
    id: 'flashloop',
    name: 'FlashLoop',
    group: 'Study workspace',
    short: 'Recall at the right time',
    detail: 'Practice generated flashcards using SM-2 spaced repetition.'
  },
  {
    id: 'quiz',
    name: 'NoteToQuiz',
    group: 'Study workspace',
    short: 'Practice from your notes',
    detail: 'Generate MCQs, short answers, and term checks from uploaded notes.'
  },
  {
    id: 'assistant',
    name: 'AI Study Assistant',
    group: 'Focus & insights',
    short: 'Answers with sources',
    detail: 'Ask questions grounded in uploaded files, with file and page citations.'
  },
  {
    id: 'focus',
    name: 'Focus Mode',
    group: 'Focus & insights',
    short: 'Study without switching',
    detail: 'Use Pomodoro sessions connected to planned tasks and daily goals.'
  },
  {
    id: 'analytics',
    name: 'Progress Analytics',
    group: 'Focus & insights',
    short: 'See what needs work',
    detail: 'Track topic mastery, study streaks, and weak areas.'
  },
  {
    id: 'pattern',
    name: 'Prof Pattern Detector',
    group: 'Focus & insights',
    short: 'Read the exam pattern',
    detail: 'Analyze past-year question repetition, topic frequency, weightage, and revision priority.'
  }
];

const navLink = (item) =>
  `<a class="nx-nav-link" href="#${item.id}" data-page="${item.id}">${icon(item.id)}<span>${item.name}</span></a>`;

const toolRow = (item) =>
  `<a class="nx-tool-row" href="#${item.id}">${icon(item.id)}<span><strong>${item.name}</strong><small>${item.short}</small></span><span class="nx-row-arrow" aria-hidden="true">↗</span></a>`;

const bookLogo = `<svg class="nx-book" viewBox="0 0 210 174" aria-hidden="true">
  <path class="nx-book-left" d="M20 30 C47 25 70 39 101 65 L101 151 C73 132 47 123 20 127 Z"/>
  <path class="nx-book-right" d="M190 30 C163 25 140 39 109 65 L109 151 C137 132 163 123 190 127 Z"/>
  <path class="nx-book-base" d="M8 52 L17 50 L17 139 C50 131 78 142 105 162 C132 142 160 131 193 139 L193 50 L202 52 L202 153 C165 142 134 150 105 170 C76 150 45 142 8 153 Z"/>
  <path class="nx-book-shade" d="M47 41 L47 115 C63 117 78 125 92 136 L92 75 C76 58 62 47 47 41 Z"/>
  <g class="nx-flip-page"><path class="nx-book-page" d="M4 53 C24 30 47 17 89 8 L89 81 C52 88 27 101 4 116 Z" transform="translate(101 0)"/></g>
</svg>`;

const DOCK_ANIMATION_KEY = 'nexora-dock-animation';
let dockAnimationEnabled = true;
try {
  dockAnimationEnabled = localStorage.getItem(DOCK_ANIMATION_KEY) !== 'off';
} catch (_) {}
document.documentElement.classList.toggle('nx-dock-motion-off', !dockAnimationEnabled);

document.body.innerHTML = `
  <a class="nx-skip-link" href="#nx-main">Skip to main content</a>

  <div class="nx-shell">

    <aside class="nx-sidebar" id="nx-sidebar" aria-label="Main navigation">

      <div class="nx-sidebar-top">
        <a class="nx-brand" href="#overview" aria-label="Nexora overview">
          ${bookLogo}
          <span translate="no">Nexora</span>
        </a>

        <button
          class="nx-icon-button nx-close-nav"
          id="nx-close-nav"
          type="button"
          aria-label="Close navigation"
        >
          ${icon('close')}
        </button>
      </div>

      <div class="nx-sidebar-scroll">
        <nav aria-label="Nexora pages">

          <div class="nx-nav-group">
            <p class="nx-nav-label">Workspace</p>

            <a
              class="nx-nav-link"
              href="#overview"
              data-page="overview"
            >
              ${icon('overview')}
              <span>Overview</span>
            </a>
          </div>

          <div class="nx-nav-group">
            <p class="nx-nav-label">Study workspace</p>
            ${modules
              .filter(m => m.group === 'Study workspace')
              .map(navLink)
              .join('')}
          </div>

          <div class="nx-nav-group">
            <p class="nx-nav-label">Focus & insights</p>
            ${modules
              .filter(m => m.group === 'Focus & insights')
              .map(navLink)
              .join('')}
          </div>

        </nav>
      </div>

      <div class="nx-sidebar-bottom">

        <a
          class="nx-nav-link"
          href="#settings"
          data-page="settings"
        >
          ${icon('settings')}
          <span>Settings</span>
        </a>

        <button
          class="nx-theme-control"
          id="nx-theme-control"
          type="button"
          aria-label="Dark mode"
        >
          <span class="nx-theme-copy">
            <strong>Appearance</strong>
            <small id="nx-theme-label">Light mode</small>
          </span>

          <span class="nx-theme-art" aria-hidden="true">
            <img
              class="nx-theme-day"
              src="./assets/theme-light.png"
              alt=""
              width="375"
              height="130"
            >

            <img
              class="nx-theme-night"
              src="./assets/theme-dark.png"
              alt=""
              width="375"
              height="130"
            >
          </span>
        </button>

        <div class="nx-profile">
          <span class="nx-avatar" id="nx-avatar" aria-hidden="true">?</span>

          <span>
            <strong id="nx-profile-name">Student</strong>
            <small>Student workspace</small>
          </span>
        </div>

      </div>

    </aside>

    <div class="nx-scrim" id="nx-scrim" hidden></div>

    <div class="nx-main-column">

      <header class="nx-topbar">

        <div class="nx-topbar-start">

          <button
            class="nx-icon-button nx-menu"
            id="nx-menu"
            type="button"
            aria-label="Open navigation"
            aria-controls="nx-sidebar"
            aria-expanded="false"
          >
            ${icon('menu')}
          </button>

          <a
            class="nx-compact-brand"
            href="#overview"
            aria-label="Nexora overview"
          >
            ${bookLogo}
          </a>

          <span class="nx-breadcrumb">
            Workspace
            <span>/</span>
            <strong id="nx-breadcrumb-page">Overview</strong>
          </span>

        </div>

        <div class="nx-topbar-actions">

          <button
            class="nx-icon-button"
            id="nx-notifications"
            type="button"
            aria-label="Notifications"
          >
            ${icon('bell')}
          </button>

          <button
            class="nx-primary-button"
            id="nx-upload"
            type="button"
          >
            ${icon('upload')}
            <span>Upload material</span>
          </button>

        </div>

      </header>

      <main id="nx-main" tabindex="-1">

        <section
          id="nx-overview"
          class="nx-overview"
          aria-labelledby="nx-page-title"
        >

          <div class="nx-intro">

            <div>
              <div class="nx-date-row">
                <svg class="nx-date-mark" viewBox="0 0 100 100" aria-hidden="true">
                  <path d="M51 2 58 35 79 13 69 42 98 29 75 51 100 54 74 61 94 81 65 68 68 98 52 74 37 100 40 69 12 87 33 59 1 51 33 44 12 18 42 35Z" fill="currentColor"/>
                </svg>
                <p class="nx-eyebrow" id="nx-date"></p>
              </div>

              <h1 class="nx-greeting" id="nx-page-title">
                <span id="nx-greeting-text">Welcome to Nexora</span>
                <button class="nx-greeting-edit" id="nx-greeting-edit" type="button" aria-label="Edit your display name" title="Edit your display name">
                  ${icon('edit')}
                </button>
              </h1>

              <p>
                Pick up where you left off and make time for what matters today.
              </p>
            </div>

            <span class="nx-sample-badge">
              Sample workspace
            </span>

          </div>

          <div class="nx-priority-grid">

            <section
              class="nx-plan"
              aria-labelledby="nx-plan-title"
            >

              <div class="nx-section-head">

                <div>
                  <p class="nx-kicker">Plan for today</p>
                  <h2 id="nx-plan-title">
                    Three things to move forward
                  </h2>
                </div>

                <a class="nx-text-link" href="#schedule">
                  Open planner ${icon('arrow')}
                </a>

              </div>

              <div class="nx-plan-list">

                <div class="nx-plan-row">
                  <span class="nx-plan-task-root" data-task-root="0"></span>

                  <span class="nx-plan-time">
                    4:30 PM
                  </span>
                </div>

                <div class="nx-plan-row">
                  <span class="nx-plan-task-root" data-task-root="1"></span>

                  <span class="nx-plan-time">
                    6:00 PM
                  </span>
                </div>

                <div class="nx-plan-row">
                  <span class="nx-plan-task-root" data-task-root="2"></span>

                  <span class="nx-plan-time">
                    8:00 PM
                  </span>
                </div>

              </div>

              <div class="nx-plan-foot">
                <span id="nx-task-progress" aria-live="polite">
                  0 of 3 completed
                </span>

                <span>
                  Exam preparation · this week
                </span>
              </div>

            </section>

            <section
              class="nx-focus-panel"
              aria-labelledby="nx-focus-title"
            >

              <p class="nx-kicker">
                Focus mode
              </p>

              <h2 id="nx-focus-title">
                A clear 25 minutes.
              </h2>

              <p>
                Work through your next study task without switching context.
              </p>

              <output class="nx-clock" id="nx-clock">
                25:00
              </output>

              <div class="nx-focus-actions">

                <button
                  class="nx-focus-start"
                  id="nx-focus-start"
                  type="button"
                >
                  ${icon('play')}
                  <span>Start session</span>
                </button>

                <button
                  class="nx-focus-reset"
                  id="nx-focus-reset"
                  type="button"
                  hidden
                >
                  Reset
                </button>

              </div>

              <div class="nx-focus-linked">
                <span>Linked task</span>
                <strong>Review design patterns notes</strong>
              </div>

            </section>

          </div>

          <section
            class="nx-metrics"
            id="nx-metrics"
            aria-label="Sample study snapshot"
          >
            <a class="nx-metric nx-glare-hover" href="#focus" aria-label="Open Focus Mode">
              <span>Focus time</span>
              <strong>2h 40m</strong>
              <small>This week · sample</small>
            </a>

            <a class="nx-metric nx-glare-hover" href="#schedule" aria-label="Open SyllabusToSchedule">
              <span>Tasks due</span>
              <strong id="nx-metric-tasks">3</strong>
              <small>Today · sample</small>
            </a>

            <a class="nx-metric nx-glare-hover" href="#flashloop" aria-label="Open FlashLoop">
              <span>Cards to revise</span>
              <strong>18</strong>
              <small>FlashLoop · sample</small>
            </a>

            <a class="nx-metric nx-glare-hover" href="#vault" aria-label="Open Vault">
              <span>Materials saved</span>
              <strong>24</strong>
              <small>Vault · sample</small>
            </a>

            <a class="nx-metric nx-glare-hover" href="#analytics" aria-label="Open Progress Analytics">
              <span>Study streak</span>
              <strong>12 days</strong>
              <small>Sample activity</small>
            </a>
          </section>

          <section
            class="nx-tools"
            aria-labelledby="nx-tools-title"
          >

            <div class="nx-section-head">

              <div>
                <p class="nx-kicker">
                  Explore Nexora
                </p>

                <h2 id="nx-tools-title">
                  Your learning tools
                </h2>
              </div>

              <p class="nx-section-note">
                Nine tools, one study workflow.
              </p>

            </div>

            <div class="nx-tool-groups">

              <div class="nx-tool-group">
                <div class="nx-group-heading">
                  <span>01</span>
                  <h3>Organize & plan</h3>
                </div>

                ${modules.slice(0, 3).map(toolRow).join('')}
              </div>

              <div class="nx-tool-group">
                <div class="nx-group-heading">
                  <span>02</span>
                  <h3>Learn & practice</h3>
                </div>

                ${modules.slice(3, 6).map(toolRow).join('')}
              </div>

              <div class="nx-tool-group">
                <div class="nx-group-heading">
                  <span>03</span>
                  <h3>Focus & improve</h3>
                </div>

                ${modules.slice(6, 9).map(toolRow).join('')}
              </div>

            </div>

          </section>

        </section>

        <section
          id="nx-module"
          class="nx-module-view"
          aria-labelledby="nx-module-title"
          hidden
        >

          <p
            class="nx-eyebrow"
            id="nx-module-group"
          ></p>

          <div class="nx-module-title-row">

            <h1 id="nx-module-title"></h1>

            <span class="nx-status-pill">
              Feature in development
            </span>

          </div>

          <p
            class="nx-module-description"
            id="nx-module-description"
          ></p>

          <div class="nx-module-placeholder">
            <span class="nx-placeholder-rule"></span>

            <h2>Workspace coming together</h2>

            <p id="nx-module-detail"></p>

            <a
              class="nx-secondary-button"
              href="#overview"
            >
              Back to overview ${icon('arrow')}
            </a>
          </div>

        </section>

        <section
          id="nx-settings"
          class="nx-module-view"
          aria-labelledby="nx-settings-title"
          hidden
        >

          <p class="nx-eyebrow">
            Workspace preferences
          </p>

          <h1 id="nx-settings-title">
            Settings
          </h1>

          <p class="nx-module-description">
            Make this study space yours.
          </p>

          <div class="nx-module-placeholder nx-settings-card">

            <span class="nx-placeholder-rule"></span>

            <h2>Your profile</h2>

            <p>
              Your account name is used by default. You can set a personal display name for this browser.
            </p>

            <div class="nx-settings-row">

              <span>
                <small>Display name</small>

                <strong id="nx-settings-name">
                  Student
                </strong>
                <small class="nx-settings-email-label">Signed-in email</small>
                <strong class="nx-settings-email" id="nx-settings-email">
                  Not signed in
                </strong>
              </span>

              <button
                class="nx-secondary-button"
                id="nx-edit-name"
                type="button"
              >
                Edit name
              </button>

            </div>

            <label class="nx-settings-preference" for="nx-dock-animation-control">
              <span class="nx-settings-preference-copy">
                <strong>Dock tab animation</strong>
                <small>Animate the Progress Analytics tabs as you move across them.</small>
              </span>
              <input class="nx-settings-switch" id="nx-dock-animation-control" type="checkbox" role="switch">
            </label>

            <div class="nx-settings-companion">
              <span>
                <strong>Study Companion</strong>
                <small>Choose a name and avatar only when you want to personalize it.</small>
              </span>
              <button class="nx-secondary-button" id="nx-settings-customize-companion" type="button">Customize</button>
            </div>

          </div>

        </section>

      </main>

    </div>

  </div>

  <dialog
    class="nx-name-dialog"
    id="nx-name-dialog"
    aria-labelledby="nx-name-title"
    aria-describedby="nx-name-description"
  >

    <form
      id="nx-name-form"
      novalidate
    >

      <span class="nx-placeholder-rule"></span>

      <p class="nx-kicker">
        Nexora workspace
      </p>

      <h2 id="nx-name-title">
        Welcome to Nexora
      </h2>

      <p id="nx-name-description">
        What should we call you? Your name will appear on your dashboard
        and stay in this browser.
      </p>

      <label for="nx-name-input">
        Your name
      </label>

      <input
        id="nx-name-input"
        name="display-name"
        type="text"
        autocomplete="name"
        maxlength="40"
        aria-describedby="nx-name-error"
        required
      >

      <p
        class="nx-field-error"
        id="nx-name-error"
        role="alert"
        hidden
      >
        Please enter your name.
      </p>

      <div class="nx-dialog-actions">

        <button
          class="nx-secondary-button"
          id="nx-name-cancel"
          type="button"
          hidden
        >
          Cancel
        </button>

        <button
          class="nx-primary-button"
          id="nx-name-submit"
          type="submit"
        >
          Continue to dashboard
        </button>

      </div>

    </form>

  </dialog>

  <button class="nx-companion-launcher is-unpersonalized" id="nx-companion-launcher" type="button" aria-label="Study Companion. Drag to move; click to open." aria-haspopup="dialog" aria-expanded="false" aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight">
    <span class="nx-companion-launcher-face" id="nx-companion-launcher-face" hidden></span>
    <span class="nx-companion-launcher-label"><span>Study</span><span>Companion</span></span>
  </button>

  <dialog class="nx-companion-dialog" id="nx-companion-dialog" aria-labelledby="nx-companion-title" aria-describedby="nx-companion-description">
    <div class="nx-companion-head">
      <div>
        <p class="nx-kicker">Nexora companion</p>
        <h2 id="nx-companion-title">Make it yours</h2>
      </div>
      <button class="nx-companion-close" id="nx-companion-close" type="button" aria-label="Close avatar customizer">×</button>
    </div>
    <p class="nx-companion-description" id="nx-companion-description">Choose a look for your study companion. You can skip this and change it any time.</p>

    <div class="nx-companion-preview-wrap">
      <div class="nx-companion-preview" id="nx-companion-preview" role="img" aria-label="Avatar preview">
        <span class="nx-companion-empty">${icon('user')}</span>
        <div class="nx-companion-avatar-rendered" id="nx-companion-preview-image"></div>
      </div>
      <label class="nx-companion-nickname-label" for="nx-companion-nickname">Companion nickname <span>optional</span></label>
      <input class="nx-companion-nickname" id="nx-companion-nickname" type="text" maxlength="20" autocomplete="off" placeholder="e.g. Nova">
      <span class="nx-companion-preview-caption">Press Enter to save your name and avatar.</span>
    </div>

    <fieldset class="nx-companion-fieldset">
      <legend>Character</legend>
      <div class="nx-companion-genders" role="group" aria-label="Avatar character">
        <button type="button" data-companion-gender="male" aria-pressed="false">Male</button>
        <button type="button" data-companion-gender="female" aria-pressed="true">Female</button>
      </div>
    </fieldset>

    <section class="nx-companion-section" aria-labelledby="nx-companion-face-heading">
      <h3 id="nx-companion-face-heading">Face &amp; hair</h3>
      <div class="nx-companion-options">
        <label>Skin tone
          <select id="nx-companion-skin">
            <option>Light</option><option>Pale</option><option>Tanned</option><option>Yellow</option><option>LightBrown</option><option>Brown</option><option>DarkBrown</option><option>Black</option>
          </select>
        </label>
        <label>Hair style
          <select id="nx-companion-hair"></select>
        </label>
        <label>Hair color
          <select id="nx-companion-hair-color">
            <option>Auburn</option><option>Black</option><option>Blonde</option><option>BlondeGolden</option><option>Brown</option><option>BrownDark</option><option>PastelPink</option><option>Blue</option><option>Platinum</option><option>Red</option><option>SilverGray</option>
          </select>
        </label>
        <label>Eyes
          <select id="nx-companion-eyes">
            <option>Default</option><option>Close</option><option>Cry</option><option>Dizzy</option><option>EyeRoll</option><option>Happy</option><option>Hearts</option><option>Side</option><option>Squint</option><option>Surprised</option><option>Wink</option><option>WinkWacky</option>
          </select>
        </label>
        <label>Expression
          <select id="nx-companion-expression">
            <option>Smile</option><option>Default</option><option>Concerned</option><option>Disbelief</option><option>Eating</option><option>Grimace</option><option>Sad</option><option>ScreamOpen</option><option>Serious</option><option>Tongue</option><option>Twinkle</option>
          </select>
        </label>
        <label>Glasses
          <select id="nx-companion-glasses">
            <option>Blank</option><option>Kurt</option><option>Prescription01</option><option>Prescription02</option><option>Round</option><option>Sunglasses</option><option>Wayfarers</option>
          </select>
        </label>
      </div>
    </section>

    <section class="nx-companion-section" aria-labelledby="nx-companion-style-heading">
      <h3 id="nx-companion-style-heading">Style</h3>
      <div class="nx-companion-options">
        <label>Backdrop
          <select id="nx-companion-backdrop">
            <option>Circle</option><option>Diamond</option><option>NoBackdrop</option>
          </select>
        </label>
        <label>Backdrop color
          <select id="nx-companion-backdrop-color">
            <option>PastelBlue</option><option>Blue01</option><option>Blue02</option><option>Blue03</option><option>Gray01</option><option>Gray02</option><option>Heather</option><option>PastelGreen</option><option>PastelOrange</option><option>PastelRed</option><option>PastelYellow</option><option>Pink</option><option>White</option>
          </select>
        </label>
        <label>Outfit
          <select id="nx-companion-clothes">
            <option>BlazerShirt</option><option>BlazerSweater</option><option>CollarSweater</option><option>GraphicShirt</option><option>Hoodie</option><option>Overall</option><option>ShirtCrewNeck</option><option>ShirtScoopNeck</option><option>ShirtVNeck</option>
          </select>
        </label>
        <label>Outfit color
          <select id="nx-companion-outfit-color">
            <option>PastelBlue</option><option>Blue01</option><option>Blue02</option><option>Blue03</option><option>Gray01</option><option>Gray02</option><option>Heather</option><option>PastelGreen</option><option>PastelOrange</option><option>PastelRed</option><option>PastelYellow</option><option>Pink</option><option>White</option><option>Black</option><option>Red</option>
          </select>
        </label>
      </div>
    </section>

    <div class="nx-companion-actions">
      <button class="nx-secondary-button" id="nx-companion-randomize" type="button">⟳ Randomize</button>
      <span class="nx-companion-action-spacer"></span>
      <button class="nx-text-button" id="nx-companion-skip" type="button">Not now</button>
      <button class="nx-primary-button" id="nx-companion-save" type="button">Save avatar</button>
    </div>
  </dialog>

  <aside class="nx-companion-chat" id="nx-companion-chat" role="dialog" aria-modal="false" aria-labelledby="nx-chat-title" hidden>
    <header class="nx-companion-chat-head">
      <div class="nx-chat-avatar" id="nx-chat-avatar-art" aria-hidden="true"></div>
      <div class="nx-chat-identity"><p class="nx-kicker">Study companion</p><h2 id="nx-chat-title">Study Companion</h2><small id="nx-chat-source-status">No session sources</small></div>
      <button class="nx-companion-close" id="nx-chat-close" type="button" aria-label="Close study companion">×</button>
    </header>
    <div class="nx-chat-tools"><span>Answers grounded in your Vault</span><a href="#settings">Manage in Settings</a></div>
    <div class="nx-chat-messages" id="nx-chat-messages" aria-live="polite"><p class="nx-chat-welcome">Hi, I’m your study companion. Ask me about the PDFs and notes in your Vault.</p></div>
    <div class="nx-chat-suggestions" id="nx-chat-suggestions"><button type="button" data-chat-prompt="Summarize the key ideas in my study materials">Summarize my materials</button><button type="button" data-chat-route="#quiz">Create a quiz</button><button type="button" data-chat-prompt="Analyze recurring exam patterns in my study materials">Analyze exam patterns</button></div>
    <form class="nx-chat-form" id="nx-chat-form"><label class="nx-sr-only" for="nx-chat-input">Ask about your study materials</label><textarea id="nx-chat-input" rows="2" maxlength="3000" placeholder="Ask about your study materials…" required></textarea><button class="nx-primary-button" type="submit">Send</button></form>
    <p class="nx-chat-disclaimer">Nexora answers from your Vault materials. Check the cited sources for important details.</p>
  </aside>

  <div
    class="nx-toast"
    id="nx-toast"
    role="status"
    aria-live="polite"
    hidden
  ></div>
`;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const dockAnimationControl = $('#nx-dock-animation-control');
dockAnimationControl.checked = dockAnimationEnabled;
dockAnimationControl.addEventListener('change', () => {
  dockAnimationEnabled = dockAnimationControl.checked;
  document.documentElement.classList.toggle('nx-dock-motion-off', !dockAnimationEnabled);
  if (!dockAnimationEnabled) {
    document.querySelectorAll('.nx-m3-dock-tabs .nx-m3-tab').forEach(tab => {
      tab.style.removeProperty('--dock-scale');
      tab.style.removeProperty('--dock-lift');
    });
  }
  try {
    localStorage.setItem(DOCK_ANIMATION_KEY, dockAnimationEnabled ? 'on' : 'off');
  } catch (_) {}
});

const nameDialog = $('#nx-name-dialog');
const nameInput = $('#nx-name-input');

const normalizeName = (value) =>
  value.replace(/\s+/g, ' ').trim();

let displayName = '';

function getNameStorageKey() {
  const userId =
    window.NexoraAuth &&
    typeof window.NexoraAuth.getUserId === 'function'
      ? window.NexoraAuth.getUserId()
      : null;

  if (userId) {
    return `nexora-display-name:${userId}`;
  }

  return 'nexora-display-name:guest';
}

function loadDisplayName() {
  try {
    return normalizeName(
      localStorage.getItem(getNameStorageKey()) || ''
    ).slice(0, 40);
  } catch (_) {
    return '';
  }
}

function accountDisplayName() {
  const accountName =
    window.NexoraAuth &&
    typeof window.NexoraAuth.getProfileName === 'function'
      ? window.NexoraAuth.getProfileName()
      : '';

  return normalizeName(accountName || '').slice(0, 40);
}

function accountEmailAddress() {
  const email =
    window.NexoraAuth &&
    typeof window.NexoraAuth.getEmailAddress === 'function'
      ? window.NexoraAuth.getEmailAddress()
      : '';

  return String(email || '').trim();
}

function getGreetingPeriod(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

displayName = loadDisplayName() || accountDisplayName();

function renderName() {
  const greeting = displayName
    ? `${getGreetingPeriod()}, ${displayName}`
    : `${getGreetingPeriod()}, student`;
  $('#nx-greeting-text').textContent = greeting;
  $('#nx-page-title').setAttribute('aria-label', greeting);

  $('#nx-profile-name').textContent =
    displayName || 'Student';

  $('#nx-settings-name').textContent =
    displayName || 'Student';

  $('#nx-settings-email').textContent =
    accountEmailAddress() || 'Not signed in';

  $('#nx-avatar').textContent =
    displayName
      ? Array.from(displayName)[0].toLocaleUpperCase()
      : '?';
}

/*
 * Refresh the Nexora display name whenever the Clerk
 * account changes.
 *
 * A locally customized display name takes precedence;
 * otherwise use the name on the signed-in Clerk account.
 */
function refreshClerkDisplayName() {
  displayName = loadDisplayName() || accountDisplayName();

  renderName();
}

function handleAuthChanged() {
  refreshClerkDisplayName();
}

window.addEventListener(
  'nexora-auth-changed',
  handleAuthChanged
);

function openNameDialog(edit = false) {
  nameDialog.dataset.mode = 'edit';

  $('#nx-name-title').textContent =
    edit
      ? 'Change your name'
      : 'Edit your name';

  $('#nx-name-description').textContent =
    edit
      ? 'Update the name shown in your dashboard and sidebar.'
      : 'Choose a display name for your Nexora workspace.';

  $('#nx-name-submit').textContent =
    edit
      ? 'Save name'
      : 'Save name';

  $('#nx-name-cancel').hidden =
    !edit;

  $('#nx-name-error').hidden =
    true;

  nameInput.removeAttribute(
    'aria-invalid'
  );

  nameInput.value =
    edit
      ? displayName
      : '';

  nameDialog.showModal();

  nameInput.focus();
}

function validateName() {
  const valid =
    Boolean(
      normalizeName(
        nameInput.value
      )
    );

  $('#nx-name-error').hidden =
    valid;

  if (valid) {
    nameInput.removeAttribute(
      'aria-invalid'
    );
  } else {
    nameInput.setAttribute(
      'aria-invalid',
      'true'
    );
  }

  return valid;
}

nameInput.addEventListener(
  'blur',
  () => {
    if (nameInput.value) {
      validateName();
    }
  }
);

nameInput.addEventListener(
  'input',
  () => {
    if (
      nameInput.getAttribute(
        'aria-invalid'
      ) === 'true'
    ) {
      validateName();
    }
  }
);

$('#nx-name-cancel').addEventListener(
  'click',
  () => nameDialog.close()
);

$('#nx-name-form').addEventListener(
  'submit',
  (event) => {
    event.preventDefault();

    if (!validateName()) {
      nameInput.focus();
      return;
    }

    displayName =
      normalizeName(
        nameInput.value
      ).slice(0, 40);

    let saved = true;

    try {
      localStorage.setItem(
        getNameStorageKey(),
        displayName
      );
    } catch (_) {
      saved = false;
    }

    renderName();

    nameDialog.close();

    if (!saved) {
      toast(
        'Browser storage is unavailable. Your name will last for this visit only.'
      );
    }
  }
);

$('#nx-edit-name').addEventListener(
  'click',
  () => openNameDialog(true)
);

$('#nx-greeting-edit').addEventListener(
  'click',
  () => openNameDialog(true)
);

renderName();

/*
 * IMPORTANT:
 *
 * Resolve the Clerk profile name after authentication has
 * finished loading. New users no longer see a separate
 * mandatory name prompt.
 */
if (window.NexoraAuth && window.NexoraAuth.ready) {
  window.NexoraAuth.ready.then(handleAuthChanged);
}

const companionDialog = $('#nx-companion-dialog');
const companionChat = $('#nx-companion-chat');
const companionChatHome = companionChat.parentElement;
const companionChatHomeNext = companionChat.nextSibling;
const assistantChatHistory = [];
const companionPreviewImage = $('#nx-companion-preview-image');
const companionLauncherFace = $('#nx-companion-launcher-face');
const companionLauncher = $('#nx-companion-launcher');
const companionLauncherLabel = companionLauncher.querySelector('.nx-companion-launcher-label');
const metricGlareTimers = new WeakMap();
$('#nx-metrics').addEventListener('click', (event) => {
  const metric = event.target.closest('.nx-glare-hover');
  if (!metric) return;
  metric.removeAttribute('data-glare-active');
  // Restart the click sweep even on rapid repeated clicks, without blocking the mapped link.
  void metric.offsetWidth;
  metric.setAttribute('data-glare-active', '');
  window.clearTimeout(metricGlareTimers.get(metric));
  metricGlareTimers.set(metric, window.setTimeout(() => metric.removeAttribute('data-glare-active'), 720));
});
const companionNickname = $('#nx-companion-nickname');
let companionReturnHash = '#overview';
const companionPositionKey = 'nexora-companion-launcher-position';
let companionDrag = null;
let companionSuppressClick = false;
const companionHair = $('#nx-companion-hair');
const companionClothes = $('#nx-companion-clothes');
const companionOptions = {
  skinColor: ['Light', 'Pale', 'Tanned', 'Yellow', 'Brown', 'DarkBrown', 'Black'],
  topTypeMale: ['NoHair', 'ShortHairShortFlat', 'ShortHairShortRound', 'ShortHairShortCurly', 'ShortHairDreads01', 'ShortHairDreads02', 'ShortHairShaggy', 'ShortHairFrizzle', 'ShortHairTheCaesar', 'ShortHairTheCaesarSidePart', 'ShortHairSides'],
  topTypeFemale: ['NoHair', 'LongHairBigHair', 'LongHairBob', 'LongHairBun', 'LongHairCurly', 'LongHairCurvy', 'LongHairDreads', 'LongHairFrida', 'LongHairFro', 'LongHairMiaWallace', 'LongHairNotTooLong', 'LongHairStraight', 'LongHairStraight2', 'ShortHairShortCurly', 'ShortHairShortFlat', 'ShortHairShortRound'],
  hairColor: ['Auburn', 'Black', 'Blonde', 'BlondeGolden', 'Brown', 'BrownDark', 'PastelPink', 'Blue', 'Platinum', 'Red', 'SilverGray'],
  eyeType: ['Default', 'Close', 'Cry', 'Dizzy', 'EyeRoll', 'Happy', 'Hearts', 'Side', 'Squint', 'Surprised', 'Wink', 'WinkWacky'],
  mouthType: ['Smile', 'Default', 'Concerned', 'Disbelief', 'Eating', 'Grimace', 'Sad', 'ScreamOpen', 'Serious', 'Tongue', 'Twinkle'],
  accessoriesType: ['Blank', 'Kurt', 'Prescription01', 'Prescription02', 'Round', 'Sunglasses', 'Wayfarers'],
  backdropType: ['Circle', 'Diamond', 'NoBackdrop'],
  backdropColor: ['PastelBlue', 'Blue01', 'Blue02', 'Blue03', 'Gray01', 'Gray02', 'Heather', 'PastelGreen', 'PastelOrange', 'PastelRed', 'PastelYellow', 'Pink', 'White'],
  clotheType: ['BlazerShirt', 'BlazerSweater', 'CollarSweater', 'GraphicShirt', 'Hoodie', 'Overall', 'ShirtCrewNeck', 'ShirtScoopNeck', 'ShirtVNeck'],
  clotheColor: ['PastelBlue', 'Blue01', 'Blue02', 'Blue03', 'Gray01', 'Gray02', 'Heather', 'PastelGreen', 'PastelOrange', 'PastelRed', 'PastelYellow', 'Pink', 'White', 'Black', 'Red'],
};

const companionSelects = {
  skinColor: $('#nx-companion-skin'),
  topType: companionHair,
  hairColor: $('#nx-companion-hair-color'),
  eyeType: $('#nx-companion-eyes'),
  mouthType: $('#nx-companion-expression'),
  accessoriesType: $('#nx-companion-glasses'),
  backdropType: $('#nx-companion-backdrop'),
  backdropColor: $('#nx-companion-backdrop-color'),
  clotheType: companionClothes,
  clotheColor: $('#nx-companion-outfit-color'),
};

function fillCompanionHairOptions(gender, selected = '') {
  const options = gender === 'male' ? companionOptions.topTypeMale : companionOptions.topTypeFemale;
  companionHair.replaceChildren(...options.map((option) => new Option(option.replace(/([A-Z])/g, ' $1').trim(), option)));
  if (options.includes(selected)) companionHair.value = selected;
}

function randomCompanionSeed() {
  return window.crypto && typeof window.crypto.randomUUID === 'function'
    ? window.crypto.randomUUID()
    : `companion-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

function companionStorageKey() {
  const userId = window.NexoraAuth && window.NexoraAuth.getUserId
    ? window.NexoraAuth.getUserId()
    : null;
  return `nexora-companion-avatar:${userId || 'guest'}`;
}

function loadCompanionAvatar() {
  try {
    const saved = JSON.parse(localStorage.getItem(companionStorageKey()) || 'null');
    if (!saved || !['male', 'female'].includes(saved.gender)) return null;
    if (typeof saved.nickname === 'string' && saved.nickname.trim().toLowerCase() === 'kattu') {
      localStorage.removeItem(companionStorageKey());
      return null;
    }
    const oldSkin = { '614335': 'DarkBrown', 'ae5d29': 'Tanned', 'd08b5b': 'Brown', 'edb98a': 'Light', 'ffdbb4': 'Pale' };
    const oldOutfit = { d97757: 'PastelOrange', '416b66': 'Blue03', '45556f': 'Blue02', '9079a8': 'Heather', d2a24f: 'PastelYellow' };
    const oldClothes = { hoodie: 'Hoodie', blazerAndSweater: 'BlazerSweater', shirtCrewNeck: 'ShirtCrewNeck', collarAndSweater: 'CollarSweater' };
    const oldHair = saved.gender === 'male'
      ? { short: 'ShortHairShortFlat', curly: 'ShortHairShortCurly', long: 'LongHairNotTooLong', random: 'ShortHairShortRound' }
      : { short: 'LongHairBob', curly: 'LongHairCurly', long: 'LongHairMiaWallace', random: 'LongHairBigHair' };
    const topTypes = saved.gender === 'male' ? companionOptions.topTypeMale : companionOptions.topTypeFemale;
    const nickname = typeof saved.nickname === 'string' && saved.nickname.trim() && saved.nickname.trim().toLowerCase() !== 'kattu'
      ? saved.nickname.trim().slice(0, 20)
      : 'Study Companion';
    if (saved.nickname !== nickname) {
      localStorage.setItem(companionStorageKey(), JSON.stringify({ ...saved, nickname }));
    }
    return {
      gender: saved.gender,
      skinColor: companionOptions.skinColor.includes(saved.skinColor) ? saved.skinColor : (oldSkin[saved.skin] || 'Light'),
      topType: topTypes.includes(saved.topType) ? saved.topType : (oldHair[saved.hair] || (saved.gender === 'male' ? 'ShortHairShortFlat' : 'LongHairMiaWallace')),
      hairColor: companionOptions.hairColor.includes(saved.hairColor) ? saved.hairColor : 'BrownDark',
      eyeType: companionOptions.eyeType.includes(saved.eyeType) ? saved.eyeType : 'Default',
      mouthType: companionOptions.mouthType.includes(saved.mouthType) ? saved.mouthType : 'Smile',
      accessoriesType: companionOptions.accessoriesType.includes(saved.accessoriesType) ? saved.accessoriesType : 'Blank',
      backdropType: companionOptions.backdropType.includes(saved.backdropType) ? saved.backdropType : 'Circle',
      backdropColor: companionOptions.backdropColor.includes(saved.backdropColor) ? saved.backdropColor : 'PastelBlue',
      clotheType: companionOptions.clotheType.includes(saved.clotheType) ? saved.clotheType : (oldClothes[saved.clothes] || 'Hoodie'),
      clotheColor: companionOptions.clotheColor.includes(saved.clotheColor) ? saved.clotheColor : (oldOutfit[saved.outfit] || 'PastelBlue'),
      nickname,
      seed: String(saved.seed || randomCompanionSeed())
    };
  } catch (_) {
    return null;
  }
}

function createDefaultCompanion() {
  return { gender: 'female', skinColor: 'Light', topType: 'LongHairMiaWallace', hairColor: 'BrownDark', eyeType: 'Default', mouthType: 'Smile', accessoriesType: 'Blank', backdropType: 'Circle', backdropColor: 'PastelBlue', clotheType: 'BlazerSweater', clotheColor: 'Heather', nickname: 'Study Companion', seed: randomCompanionSeed() };
}

let savedCompanionAvatar = loadCompanionAvatar();
let companionDraft = null;

function renderCompanionImage(config, element) {
  if (config && window.NexoraAvatar) {
    const { gender, seed, nickname, ...avatarOptions } = config;
    element.classList.add('has-avatar');
    window.NexoraAvatar.render(element, avatarOptions);
  }
}

function renderCompanionLauncher() {
  const existingAvatar = companionLauncherFace.querySelector('.nx-companion-avatar-rendered');
  if (existingAvatar && window.NexoraAvatar) window.NexoraAvatar.unmount(existingAvatar);
  companionLauncherFace.replaceChildren();
  const nickname = savedCompanionAvatar?.nickname?.trim() || 'Study Companion';
  if (savedCompanionAvatar) {
    companionLauncherLabel.textContent = nickname;
    companionLauncher.classList.remove('is-unpersonalized');
    companionLauncherFace.hidden = false;
    const avatar = document.createElement('div');
    avatar.className = 'nx-companion-avatar-rendered';
    avatar.setAttribute('aria-hidden', 'true');
    companionLauncherFace.append(avatar);
    renderCompanionImage(savedCompanionAvatar, avatar);
    companionLauncher.setAttribute('aria-label', `Edit ${nickname}, your study companion`);
  } else {
    companionLauncherLabel.replaceChildren(...['Study', 'Companion'].map((word) => {
      const line = document.createElement('span');
      line.textContent = word;
      return line;
    }));
    companionLauncher.classList.add('is-unpersonalized');
    companionLauncherFace.hidden = true;
    companionLauncher.setAttribute('aria-label', 'Study Companion. Drag to move; click to open.');
  }
  $('#nx-chat-title').textContent = nickname;
  const chatAvatar = $('#nx-chat-avatar-art');
  const oldChatAvatar = chatAvatar.querySelector('.nx-companion-avatar-rendered');
  if (oldChatAvatar && window.NexoraAvatar) window.NexoraAvatar.unmount(oldChatAvatar);
  chatAvatar.replaceChildren();
  chatAvatar.hidden = !savedCompanionAvatar;
  const chatAvatarGraphic = document.createElement('div');
  chatAvatarGraphic.className = 'nx-companion-avatar-rendered';
  chatAvatarGraphic.setAttribute('aria-hidden', 'true');
  chatAvatar.append(chatAvatarGraphic);
  renderCompanionImage(savedCompanionAvatar, chatAvatarGraphic);
}

function setCompanionGender(gender) {
  companionDraft.gender = gender;
  const hairOptions = gender === 'male' ? companionOptions.topTypeMale : companionOptions.topTypeFemale;
  if (!hairOptions.includes(companionDraft.topType)) companionDraft.topType = gender === 'male' ? 'ShortHairShortFlat' : 'LongHairMiaWallace';
  $$('[data-companion-gender]').forEach((button) => {
    const selected = button.dataset.companionGender === gender;
    button.setAttribute('aria-pressed', String(selected));
  });
  fillCompanionHairOptions(gender, companionDraft.topType);
  renderCompanionImage(companionDraft, companionPreviewImage);
}

function syncCompanionOptions() {
  if (!companionDraft) return;
  Object.entries(companionSelects).forEach(([key, select]) => { companionDraft[key] = select.value; });
  renderCompanionImage(companionDraft, companionPreviewImage);
}

function openCompanionCustomizer() {
  companionDraft = savedCompanionAvatar
    ? { ...savedCompanionAvatar }
    : createDefaultCompanion();
  companionNickname.value = companionDraft.nickname || '';
  setCompanionGender(companionDraft.gender);
  Object.entries(companionSelects).forEach(([key, select]) => { select.value = companionDraft[key]; });
  syncCompanionOptions();
  companionDialog.showModal();
  $('#nx-companion-launcher').setAttribute('aria-expanded', 'true');
}

function closeCompanionCustomizer() {
  companionDialog.close();
  $('#nx-companion-launcher').setAttribute('aria-expanded', 'false');
}

function openCompanionChat() {
  clearTimeout(companionChat.hideTimer);
  companionChat.hidden = false;
  $('#nx-companion-launcher').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => {
    companionChat.classList.add('is-open');
    $('#nx-chat-input').focus();
  });
}

function refreshAssistantSourceStatus() {
  const status = $('#nx-chat-source-status');
  const api = window.NexoraShared?.api;
  if (!api) {
    status.textContent = 'Assistant service unavailable';
    return;
  }
  status.textContent = 'Checking Vault…';
  api('/api/materials')
    .then((materials) => {
      const count = Array.isArray(materials) ? materials.length : 0;
      status.textContent = count ? `${count} Vault source${count === 1 ? '' : 's'}` : 'No Vault sources yet';
    })
    .catch(() => { status.textContent = 'Sign in to load Vault sources'; });
}

function closeCompanionChat(restoreRoute = false) {
  companionChat.classList.remove('is-open');
  $('#nx-companion-launcher').setAttribute('aria-expanded', 'false');
  clearTimeout(companionChat.hideTimer);
  companionChat.hideTimer = window.setTimeout(() => { companionChat.hidden = true; }, 220);
  if (restoreRoute && location.hash === '#assistant') {
    const destination = companionReturnHash || '#overview';
    companionReturnHash = '#overview';
    location.hash = destination;
  }
}

function enterCompanionAssistant() {
  if (location.hash === '#assistant') {
    navigate();
    return;
  }
  companionReturnHash = location.hash || '#overview';
  location.hash = '#assistant';
}

$('#nx-companion-launcher').addEventListener('click', openCompanionChat);
document.addEventListener('pointerdown', (event) => {
  if (!companionChat.classList.contains('is-open')) return;
  if (event.target.closest('#nx-companion-chat, #nx-companion-launcher')) return;
  closeCompanionChat(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && companionChat.classList.contains('is-open')) closeCompanionChat(false);
});
$('#nx-companion-close').addEventListener('click', closeCompanionCustomizer);
$('#nx-companion-skip').addEventListener('click', closeCompanionCustomizer);
$('#nx-chat-close').addEventListener('click', () => closeCompanionChat(true));
$('#nx-settings-customize-companion').addEventListener('click', openCompanionCustomizer);
$('#nx-chat-input').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  $('#nx-chat-form').requestSubmit();
});
$('#nx-chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('#nx-chat-input');
  const question = input.value.trim();
  if (!question || input.disabled) return;
  const messages = $('#nx-chat-messages');
  const userMessage = document.createElement('p');
  userMessage.className = 'nx-chat-user-message';
  userMessage.textContent = question;
  const assistantMessage = document.createElement('div');
  assistantMessage.className = 'nx-chat-welcome nx-chat-answer';
  assistantMessage.setAttribute('aria-busy', 'true');
  const requestStartedAt = performance.now();
  const thought = window.NexoraThoughtLine.create({
    label: 'Thinking…',
    doneLabel: 'Thought for',
    glyph: 'sparkle',
    steps: ['Reading your question', 'Searching your Vault materials'],
    showTimer: true,
    collapsible: true,
    collapseOnSettle: true,
  });
  assistantMessage.append(thought.element);
  messages.append(userMessage, assistantMessage);
  input.value = '';
  input.disabled = true;
  $('#nx-chat-form button[type="submit"]').disabled = true;
  messages.scrollTop = messages.scrollHeight;
  const history = assistantChatHistory.slice(-8);
  const api = window.NexoraShared?.api;
  const request = api
    ? api('/api/assistant/chat', { method: 'POST', body: JSON.stringify({ question, history }) })
    : Promise.reject(new Error('Assistant service is unavailable.'));
  request.then((result) => {
    assistantMessage.removeAttribute('aria-busy');
    assistantMessage.replaceChildren();
    const answer = document.createElement('p');
    answer.className = 'nx-chat-answer-copy';
    answer.textContent = result.answer;
    assistantMessage.append(answer);
    assistantChatHistory.push({ role: 'user', content: question }, { role: 'assistant', content: result.answer });
    assistantChatHistory.splice(0, Math.max(0, assistantChatHistory.length - 12));
    const citations = document.createElement('small');
    citations.className = 'nx-chat-citations';
    citations.textContent = result.sources.map((source) => `[${source.number}] ${source.filename}`).join(' · ');
    assistantMessage.append(citations);
    thought.setSteps(['Reading your question', 'Searching your Vault materials', 'Preparing a cited answer']);
    thought.setWorking(false);
    assistantMessage.append(thought.element);
    $('#nx-chat-source-status').textContent = `${result.sources.length} study source${result.sources.length === 1 ? '' : 's'}`;
  }).catch((error) => {
    thought.setWorking(false);
    assistantMessage.removeAttribute('aria-busy');
    assistantMessage.replaceChildren();
    const errorText = document.createElement('p');
    errorText.className = 'nx-chat-answer-copy';
    errorText.textContent = error.message || 'I couldn’t answer just now. Please try again.';
    assistantMessage.append(errorText);
    assistantMessage.classList.add('is-error');
    const failed = window.NexoraLatticeLoader.create({ label: 'Thinking', errorLabel: 'Failed after' });
    failed.setStatus('error', thought.getElapsed() || (performance.now() - requestStartedAt) / 1000);
    assistantMessage.append(failed.element);
  }).finally(() => {
    input.disabled = false;
    $('#nx-chat-form button[type="submit"]').disabled = false;
    input.focus();
    messages.scrollTop = messages.scrollHeight;
  });
});
$('#nx-chat-suggestions').addEventListener('click', (event) => {
  const route = event.target.closest('[data-chat-route]')?.dataset.chatRoute;
  if (route) {
    closeCompanionChat();
    window.location.hash = route;
    return;
  }
  const prompt = event.target.closest('[data-chat-prompt]')?.dataset.chatPrompt;
  if (prompt) {
    $('#nx-chat-input').value = prompt;
    $('#nx-chat-form').requestSubmit();
  }
});
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  if (link.getAttribute('href') === '#assistant') {
    event.preventDefault();
    enterCompanionAssistant();
  } else if (companionChat.classList.contains('is-open')) {
    closeCompanionChat(false);
  }
});
companionDialog.addEventListener('click', (event) => {
  if (event.target === companionDialog) closeCompanionCustomizer();
});
companionDialog.addEventListener('close', () => {
  $('#nx-companion-launcher').setAttribute('aria-expanded', String(!companionChat.hidden));
});
$$('[data-companion-gender]').forEach((button) => {
  button.addEventListener('click', () => setCompanionGender(button.dataset.companionGender));
});
Object.values(companionSelects).forEach((select) => select.addEventListener('change', syncCompanionOptions));
$('#nx-companion-randomize').addEventListener('click', () => {
  const names = ['Nova', 'Milo', 'Luna', 'Arlo', 'Mira', 'Kai', 'Nila', 'Kattu'];
  const currentName = companionNickname.value.trim();
  const availableNames = names.filter((name) => name.toLowerCase() !== currentName.toLowerCase());
  companionNickname.value = availableNames[Math.floor(Math.random() * availableNames.length)] || 'Nova';
  companionDraft.nickname = companionNickname.value;
  companionDraft.seed = randomCompanionSeed();
  companionDraft.gender = Math.random() < 0.5 ? 'male' : 'female';
  const hairOptions = companionDraft.gender === 'male' ? companionOptions.topTypeMale : companionOptions.topTypeFemale;
  Object.entries(companionSelects).forEach(([key, select]) => {
    const options = key === 'topType' ? hairOptions : companionOptions[key];
    companionDraft[key] = options[Math.floor(Math.random() * options.length)];
  });
  setCompanionGender(companionDraft.gender);
  Object.entries(companionSelects).forEach(([key, select]) => { select.value = companionDraft[key]; });
  syncCompanionOptions();
});
function saveCompanionAvatar() {
  syncCompanionOptions();
  companionDraft.nickname = companionNickname.value.trim().slice(0, 20) || 'Study Companion';
  companionDraft.seed = companionDraft.seed || randomCompanionSeed();
  savedCompanionAvatar = { ...companionDraft };
  try {
    localStorage.setItem(companionStorageKey(), JSON.stringify(savedCompanionAvatar));
  } catch (_) {
    toast('Could not save the avatar in this browser.');
    return;
  }
  renderCompanionLauncher();
  closeCompanionCustomizer();
  enterCompanionAssistant();
}

$('#nx-companion-nickname').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  saveCompanionAvatar();
});
$('#nx-companion-save').addEventListener('click', saveCompanionAvatar);

window.addEventListener('nexora-auth-changed', () => {
  savedCompanionAvatar = loadCompanionAvatar();
  renderCompanionLauncher();
});
if (window.NexoraAuth && window.NexoraAuth.ready) {
  window.NexoraAuth.ready.then(() => {
    savedCompanionAvatar = loadCompanionAvatar();
    renderCompanionLauncher();
  });
}
renderCompanionLauncher();

function clampCompanionPosition(left, top) {
  const rect = companionLauncher.getBoundingClientRect();
  return {
    left: Math.max(0, window.innerWidth - rect.width),
    top: Math.max(0, Math.min(top, window.innerHeight - rect.height)),
  };
}

function applyCompanionPosition(position) {
  const clamped = clampCompanionPosition(position.left, position.top);
  companionLauncher.style.left = `${clamped.left}px`;
  companionLauncher.style.top = `${clamped.top}px`;
  companionLauncher.style.right = 'auto';
  companionLauncher.style.bottom = 'auto';
  companionLauncher.style.transform = 'none';
  return clamped;
}

function saveCompanionPosition(position) {
  const clamped = applyCompanionPosition(position);
  try {
    localStorage.setItem(companionPositionKey, JSON.stringify(clamped));
  } catch {
    // The launcher remains movable for this page even when storage is unavailable.
  }
}

try {
  const storedCompanionPosition = JSON.parse(localStorage.getItem(companionPositionKey) || 'null');
  if (Number.isFinite(storedCompanionPosition?.top)) {
    applyCompanionPosition({ left: window.innerWidth, top: storedCompanionPosition.top });
  }
} catch {
  // Keep the default right-edge position when saved data is missing or malformed.
}

window.addEventListener('resize', () => {
  const top = Number.parseFloat(companionLauncher.style.top);
  if (Number.isFinite(top)) applyCompanionPosition({ left: window.innerWidth, top });
});

companionLauncher.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  const rect = companionLauncher.getBoundingClientRect();
  companionDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    left: rect.left,
    top: rect.top,
    moved: false,
  };
});

document.addEventListener('pointermove', (event) => {
  const specularRect = companionLauncher.getBoundingClientRect();
  const angle = Math.atan2(event.clientY - (specularRect.top + specularRect.height / 2), event.clientX - (specularRect.left + specularRect.width / 2)) * 180 / Math.PI + 90;
  companionLauncher.style.setProperty('--specular-angle', `${angle}deg`);
  if (!companionDrag || event.pointerId !== companionDrag.pointerId) return;
  const deltaX = event.clientX - companionDrag.startX;
  const deltaY = event.clientY - companionDrag.startY;
  if (!companionDrag.moved && Math.hypot(deltaX, deltaY) < 7) return;
  companionDrag.moved = true;
  companionSuppressClick = true;
  closeCompanionChat(false);
  companionLauncher.classList.add('is-dragging');
  applyCompanionPosition({ left: window.innerWidth, top: companionDrag.top + deltaY });
});

function finishCompanionDrag(event) {
  if (!companionDrag || event.pointerId !== companionDrag.pointerId) return;
  const moved = companionDrag.moved;
  if (moved) {
    const rect = companionLauncher.getBoundingClientRect();
    saveCompanionPosition({ left: window.innerWidth, top: rect.top });
  }
  companionLauncher.classList.remove('is-dragging');
  companionDrag = null;
}

document.addEventListener('pointerup', finishCompanionDrag);
document.addEventListener('pointercancel', finishCompanionDrag);
companionLauncher.addEventListener('click', (event) => {
  if (!companionSuppressClick) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  companionSuppressClick = false;
}, true);

companionLauncher.addEventListener('keydown', (event) => {
  if (!event.altKey || !event.key.startsWith('Arrow')) return;
  event.preventDefault();
  const rect = companionLauncher.getBoundingClientRect();
  const step = event.shiftKey ? 48 : 24;
  const delta = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, -step],
    ArrowDown: [0, step],
  }[event.key];
  saveCompanionPosition({ left: rect.left + delta[0], top: rect.top + delta[1] });
});

window.addEventListener('resize', () => {
  const left = Number.parseFloat(companionLauncher.style.left);
  const top = Number.parseFloat(companionLauncher.style.top);
  if (Number.isFinite(left) && Number.isFinite(top)) saveCompanionPosition({ left, top });
});

function renderTheme() {
  const dark =
    document.documentElement.dataset.theme === 'dark';

  document.querySelector(
    'meta[name="theme-color"]'
  ).content =
    dark
      ? '#242321'
      : '#faf9f6';

  $('#nx-theme-control').setAttribute(
    'aria-pressed',
    String(dark)
  );

  $('#nx-theme-label').textContent =
    dark
      ? 'Dark mode'
      : 'Light mode';
}

$('#nx-theme-control').addEventListener(
  'click',
  () => {
    const next =
      document.documentElement.dataset.theme === 'dark'
        ? 'light'
        : 'dark';

    const art = $('.nx-theme-art');

    clearTimeout(art.motionTimer);

    art.classList.remove(
      'nx-to-dark',
      'nx-to-light'
    );

    if (
      !matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches
    ) {
      art.classList.add(
        next === 'dark'
          ? 'nx-to-dark'
          : 'nx-to-light'
      );

      art.motionTimer =
        setTimeout(
          () => {
            art.classList.remove(
              'nx-to-dark',
              'nx-to-light'
            );
          },
          720
        );
    }

    document.documentElement.dataset.theme =
      next;

    try {
      localStorage.setItem(
        'nexora-theme',
        next
      );
    } catch (_) {}

    renderTheme();
  }
);


// Restore saved theme when the page loads
try {
  const savedTheme =
    localStorage.getItem(
      'nexora-theme'
    );

  if (
    savedTheme === 'dark' ||
    savedTheme === 'light'
  ) {
    document.documentElement.dataset.theme =
      savedTheme;
  }
} catch (_) {}

renderTheme();

const dateFormatter =
  new Intl.DateTimeFormat(
    'en-IN',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }
  );

function renderDate() {
  $('#nx-date').textContent = dateFormatter.format(new Date());
  renderName();
}

renderDate();
window.setInterval(renderDate, 60 * 1000);

function closeNav() {
  $('#nx-sidebar').classList.remove(
    'nx-open'
  );

  $('#nx-scrim').hidden = true;

  $('#nx-menu').setAttribute(
    'aria-expanded',
    'false'
  );

  document.body.classList.remove(
    'nx-drawer-open'
  );

  $('.nx-main-column').inert =
    false;
}

$('#nx-menu').addEventListener(
  'click',
  () => {
    $('#nx-sidebar').classList.add(
      'nx-open'
    );

    $('#nx-scrim').hidden = false;

    $('#nx-menu').setAttribute(
      'aria-expanded',
      'true'
    );

    document.body.classList.add(
      'nx-drawer-open'
    );

    $('.nx-main-column').inert =
      true;

    $('#nx-close-nav').focus();
  }
);

$('#nx-close-nav').addEventListener(
  'click',
  () => {
    closeNav();
    $('#nx-menu').focus();
  }
);

$('#nx-scrim').addEventListener(
  'click',
  closeNav
);

$$('.nx-sidebar .nx-nav-link').forEach(
  (link) => {
    link.addEventListener(
      'click',
      closeNav
    );
  }
);

document.addEventListener(
  'keydown',
  (e) => {
    if (
      e.key === 'Escape' &&
      $('#nx-sidebar').classList.contains(
        'nx-open'
      )
    ) {
      closeNav();
      $('#nx-menu').focus();
    }
  }
);

/*
 * Live modules.
 */
const NEXORA_LIVE_MODULES = {
  vault: 'NexoraVault',
  schedule: 'NexoraSchedule',
  quiz: 'NexoraQuiz'
};

const NEXORA_PLACEHOLDER_HTML =
  `<span class="nx-placeholder-rule"></span>
   <h2>Workspace coming together</h2>
   <p id="nx-module-detail"></p>
   <a class="nx-secondary-button" href="#overview">
     Back to overview ${icon('arrow')}
   </a>`;

let mountedLiveModule = null;

function getLiveModule(id) {
  const key =
    NEXORA_LIVE_MODULES[id];

  if (!key) {
    return null;
  }

  const moduleObject =
    window[key];

  if (
    moduleObject &&
    typeof moduleObject.mount === 'function'
  ) {
    return moduleObject;
  }

  return null;
}

function mountLiveModuleWhenReady(
  actual,
  placeholder
) {
  const maxAttempts = 100;
  let attempts = 0;

  function attempt() {
    const liveModule =
      getLiveModule(actual);

    const currentRoute =
      location.hash.slice(1) ||
      'overview';

    if (
      currentRoute !== actual
    ) {
      return;
    }

    if (liveModule) {
      mountedLiveModule =
        actual;

      const statusPill =
        $('#nx-module .nx-status-pill');

      if (statusPill) {
        statusPill.textContent =
          'Live';
      }

      liveModule.mount(
        placeholder
      );

      return;
    }

    attempts++;

    if (attempts < maxAttempts) {
      setTimeout(
        attempt,
        25
      );
    } else {
      const statusPill =
        $('#nx-module .nx-status-pill');

      if (statusPill) {
        statusPill.textContent =
          'Feature in development';
      }

      placeholder.innerHTML =
        NEXORA_PLACEHOLDER_HTML;

      const detail =
        $('#nx-module-detail');

      const module =
        modules.find(
          (m) => m.id === actual
        );

      if (detail) {
        detail.textContent =
          module?.detail ||
          'Settings will be available as the team builds the full application.';
      }
    }
  }

  attempt();
}

function navigate() {
  const id =
    location.hash.slice(1) ||
    'overview';

  const module =
    modules.find(
      (m) => m.id === id
    );

  const title =
    id === 'overview'
      ? 'Overview'
      : module?.name ||
        (id === 'settings'
          ? 'Settings'
          : 'Overview');

  const actual =
    id === 'overview' ||
    module ||
    id === 'settings'
      ? id
      : 'overview';
  const registeredPage = window.NexoraPages?.[actual];
  const isCompanionFeature = ['flashloop', 'focus', 'analytics'].includes(actual);
  Object.entries(window.NexoraPages || {}).forEach(
    ([pageId, page]) => {
      page.el.hidden = pageId !== actual;
    }
  );

  if (
    actual !== 'assistant' &&
    companionChat.classList.contains('is-open')
  ) {
    closeCompanionChat(false);
  }

  $('#nx-overview').hidden =
    actual !== 'overview';

  $('#nx-module').hidden =
    actual === 'overview' ||
    actual === 'settings' ||
    isCompanionFeature ||
    Boolean(registeredPage);

  $('#nx-settings').hidden =
    actual !== 'settings';

  $('#nx-breadcrumb-page').textContent =
    title;

  document.title =
    `Nexora — ${title}`;

  $$('.nx-nav-link').forEach(
    (link) => {
      const selected =
        link.dataset.page === actual;

      link.classList.toggle(
        'nx-active',
        selected
      );

      if (selected) {
        link.setAttribute(
          'aria-current',
          'page'
        );
      } else {
        link.removeAttribute(
          'aria-current'
        );
      }
    }
  );

  if (actual === 'assistant') {
    mountedLiveModule = null;
    $('#nx-module-group').textContent = 'Focus & insights';
    $('#nx-module-title').textContent = 'AI Study Assistant';
    $('#nx-module-description').textContent = 'Ask questions about your study materials and get answers with source citations.';
    $('#nx-module').classList.add('nx-assistant-active');
    $('#nx-module .nx-status-pill').textContent = 'Study companion';
    const assistantHost = $('.nx-module-placeholder');
    assistantHost.classList.add('nx-assistant-host');
    assistantHost.replaceChildren(companionChat);
    companionChat.classList.add('nx-chat-page');
    companionChat.setAttribute('role', 'region');
    companionChat.removeAttribute('aria-modal');
    companionLauncher.hidden = true;
    openCompanionChat();
    refreshAssistantSourceStatus();
    closeNav();
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }

  if (companionChat.classList.contains('nx-chat-page')) {
    $('#nx-module').classList.remove('nx-assistant-active');
    companionChat.classList.remove('nx-chat-page', 'is-open');
    companionChat.hidden = true;
    companionChat.setAttribute('role', 'dialog');
    companionChat.setAttribute('aria-modal', 'false');
    companionLauncher.hidden = false;
    $('.nx-module-placeholder')?.classList.remove('nx-assistant-host');
    if (companionChatHomeNext?.parentElement === companionChatHome) {
      companionChatHome.insertBefore(companionChat, companionChatHomeNext);
    } else {
      companionChatHome.append(companionChat);
    }
  }

  if (actual === 'overview') {
    mountedLiveModule =
      null;

    closeNav();

    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });

    return;
  }

  if (actual === 'settings') {
    mountedLiveModule =
      null;

    closeNav();

    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });

    return;
  }

  if (module && !isCompanionFeature && !registeredPage) {
    $('#nx-module-group').textContent =
      module.group ||
      'Workspace';

    $('#nx-module-title').textContent =
      title;

    $('#nx-module-description').textContent =
      module.short ||
      'Choose how Nexora works for you.';

    const placeholder =
      $('.nx-module-placeholder');

    const liveModule =
      getLiveModule(actual);

    if (
      mountedLiveModule === actual &&
      liveModule
    ) {
      const statusPill =
        $('#nx-module .nx-status-pill');

      if (statusPill) {
        statusPill.textContent =
          'Live';
      }
    } else if (liveModule) {
      mountedLiveModule =
        actual;

      const statusPill =
        $('#nx-module .nx-status-pill');

      if (statusPill) {
        statusPill.textContent =
          'Live';
      }

      liveModule.mount(
        placeholder
      );

    } else {
      mountLiveModuleWhenReady(
        actual,
        placeholder
      );
    }
  }

  if (
    registeredPage &&
    typeof registeredPage.onShow === 'function'
  ) {
    registeredPage.onShow();
  }

  closeNav();

  window.scrollTo({
    top: 0,
    behavior: 'auto'
  });
}

window.addEventListener(
  'hashchange',
  () => {
    navigate();

    $('#nx-main').focus({
      preventScroll: true
    });
  }
);

if (
  location.hash &&
  NEXORA_LIVE_MODULES[
    location.hash.slice(1)
  ]
) {
  mountLiveModuleWhenReady(
    location.hash.slice(1),
    $('.nx-module-placeholder')
  );
}

navigate();

function toast(message) {
  const el =
    $('#nx-toast');

  el.textContent =
    message;

  el.hidden =
    false;

  clearTimeout(
    toast.timer
  );

  toast.timer =
    setTimeout(
      () => {
        el.hidden = true;
      },
      3600
    );
}

$('#nx-upload').addEventListener(
  'click',
  () => {
    if (
      location.hash === '#vault' &&
      window.NexoraVault
    ) {
      document
        .querySelector(
          '#nxv-file-input'
        )
        ?.click();

      return;
    }

    location.hash =
      '#vault';
  }
);

$('#nx-notifications').addEventListener(
  'click',
  () => {
    toast(
      'No notifications in this sample workspace.'
    );
  }
);

const taskDefinitions = [
  { label: 'Review design patterns notes', supportingText: 'Advanced Programming Practices · 45 min' },
  { label: 'Practice Unit 3 questions', supportingText: 'Advanced Programming Practices · 30 min' },
  { label: 'Revise 18 flashcards', supportingText: 'FlashLoop · 20 min' },
];
const taskRoots = $$('[data-task-root]');

let savedTasks = [];

try {
  savedTasks =
    JSON.parse(
      localStorage.getItem(
        'nexora-sample-tasks'
      ) || '[]'
    );
} catch (_) {}

const taskStates = taskDefinitions.map((_, index) => Boolean(savedTasks[index]));

taskRoots.forEach((root, index) => {
  const task = taskDefinitions[index];
  if (!task || !window.NexoraSpringCheck) return;
  window.NexoraSpringCheck.mount(root, {
    ...task,
    defaultChecked: taskStates[index],
    boxSize: 22,
    boxRadius: 5,
    fontSize: 13,
    onChange: (checked) => {
      taskStates[index] = checked;
      try {
        localStorage.setItem('nexora-sample-tasks', JSON.stringify(taskStates));
      } catch (_) {}
      renderTasks();
    },
  });
});

function renderTasks() {
  const completed = taskStates.filter(Boolean).length;

  $('#nx-task-progress').textContent =
    `${completed} of ${taskStates.length} completed`;

  $('#nx-metric-tasks').textContent =
    String(taskStates.length - completed);

  window.dispatchEvent(
    new CustomEvent('nexora:plan-updated')
  );
}

renderTasks();

// ============================================================
// Clerk profile button
// ============================================================

document.addEventListener(
  'click',
  (event) => {
    if (
      event.target.closest(
        '[data-nx-signout]'
      )
    ) {
      return;
    }

    const profile =
      event.target.closest(
        '.nx-profile'
      );

    if (!profile) return;

    if (window.NexoraAuth) {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (
        window.NexoraAuth.isSignedIn()
      ) {
        window.NexoraAuth.openUserProfile();
      } else {
        window.NexoraAuth.signIn();
      }
    }
  },
  true
);

document.addEventListener(
  'keydown',
  (event) => {
    if (
      event.key !== 'Enter' &&
      event.key !== ' '
    ) {
      return;
    }

    const profile =
      event.target.closest(
        '.nx-profile'
      );

    if (!profile) return;

    if (window.NexoraAuth) {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (
        window.NexoraAuth.isSignedIn()
      ) {
        window.NexoraAuth.openUserProfile();
      } else {
        window.NexoraAuth.signIn();
      }
    }
  },
  true
);
