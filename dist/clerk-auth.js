/**
 * clerk-auth.js — Clerk (Google sign-in + sessions) for the Nexora frontend.
 *
 * Responsibilities:
 *   1. Load Clerk's browser SDK.
 *   2. Provide the current session token to NexoraShared.api()/authFetch().
 *   3. Make the existing sidebar profile block a sign-in / account entry point.
 *   4. Automatically open the Clerk Sign In popup when Nexora starts
 *      and the user is not signed in.
 *   5. Re-mount the open module when the user signs in or out.
 *
 * Exposes window.NexoraAuth.
 */

(function () {
  const PUBLISHABLE_KEY =
    String(window.NEXORA_CLERK_PUBLISHABLE_KEY || '').trim();

  const CLERK_JS = '@clerk/clerk-js@6';
  const CLERK_UI = '@clerk/ui@1';
  const READY_TIMEOUT_MS = 10000;

  const LIVE_MODULES = {
    vault: 'NexoraVault',
    schedule: 'NexoraSchedule',
    quiz: 'NexoraQuiz'
  };

  const isConfigured =
    /^pk_(test|live)_/.test(PUBLISHABLE_KEY) &&
    !/REPLACE/i.test(PUBLISHABLE_KEY);

  let clerk = null;
  let lastUserId = null;

  // Prevent the automatic sign-in popup from being opened repeatedly.
  let autoSignInAttempted = false;

  function openRequiredSignIn(c, { highlightAction = false } = {}) {
    c.openSignIn({
      appearance: {
        elements: {
          modalCloseButton: 'nx-hide-modal-close',
          ...(highlightAction
            ? {
                formButtonPrimary: 'nx-auth-beam',
                socialButtonsBlockButton: 'nx-auth-beam'
              }
            : {})
        }
      }
    });
  }

  function loadScript(src, attributes) {
    return new Promise((resolve, reject) => {
      const el = document.createElement('script');

      el.src = src;
      el.async = true;
      el.crossOrigin = 'anonymous';

      Object.entries(attributes || {}).forEach(([k, v]) => {
        el.setAttribute(k, v);
      });

      el.onload = resolve;
      el.onerror = () =>
        reject(new Error(`Failed to load ${src}`));

      document.head.appendChild(el);
    });
  }

  // The Frontend API domain is embedded in the publishable key.
  function frontendApiDomain(key) {
    return atob(key.split('_')[2]).slice(0, -1);
  }

  // ------------------------------------------------------------
  // Clerk initialization
  // ------------------------------------------------------------

  const ready = (async () => {
    if (!isConfigured) {
      console.warn(
        '[Nexora auth] window.NEXORA_CLERK_PUBLISHABLE_KEY is not set in index.html — sign-in is disabled.'
      );
      return null;
    }

    try {
      const domain = frontendApiDomain(PUBLISHABLE_KEY);

      await loadScript(
        `https://${domain}/npm/${CLERK_UI}/dist/ui.browser.js`
      );

      await loadScript(
        `https://${domain}/npm/${CLERK_JS}/dist/clerk.browser.js`,
        {
          'data-clerk-publishable-key': PUBLISHABLE_KEY
        }
      );

      await window.Clerk.load({
        ui: {
          ClerkUI: window.__internal_ClerkUICtor
        }
      });

      clerk = window.Clerk;

      lastUserId = clerk.user
        ? clerk.user.id
        : null;

      clerk.addListener(onClerkChange);

      renderProfile();

      // --------------------------------------------------------
      // AUTO OPEN SIGN-IN
      // --------------------------------------------------------

      if (!clerk.session && !autoSignInAttempted) {
        autoSignInAttempted = true;

        // Give the page a moment to finish rendering.
        setTimeout(() => {
          if (clerk && !clerk.session) {
            openRequiredSignIn(clerk, { highlightAction: true });
          }
        }, 300);
      }

      return clerk;
    } catch (err) {
      console.error(
        '[Nexora auth] Clerk failed to load:',
        err
      );

      return null;
    }
  })();

  /**
   * Resolves with the Clerk instance or null.
   * Never hangs the application.
   */
  function whenReady() {
    return Promise.race([
      ready,
      new Promise((resolve) =>
        setTimeout(
          () => resolve(null),
          READY_TIMEOUT_MS
        )
      )
    ]);
  }

  // ------------------------------------------------------------
  // Authentication helpers
  // ------------------------------------------------------------

  async function getToken({ skipCache = false } = {}) {
    const c = await whenReady();

    if (!c || !c.session) {
      return null;
    }

    try {
      return await c.session.getToken(
        skipCache
          ? { skipCache: true }
          : undefined
      );
    } catch (err) {
      console.warn(
        '[Nexora auth] could not get session token:',
        err
      );

      return null;
    }
  }

  const isSignedIn = () =>
    Boolean(clerk && clerk.session);

  const getUserId = () =>
    clerk && clerk.user
      ? clerk.user.id
      : null;

  const getProfileName = () => {
    if (!clerk || !clerk.user) return '';

    const user = clerk.user;
    const fullName = String(user.fullName || '').trim();
    if (fullName) return fullName;

    const composedName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (composedName) return composedName;

    const email = user.primaryEmailAddress && user.primaryEmailAddress.emailAddress;
    return email ? email.split('@')[0].replace(/[._-]+/g, ' ').trim() : '';
  };

  const getEmailAddress = () => {
    if (!clerk || !clerk.user) return '';
    return String(
      clerk.user.primaryEmailAddress &&
      clerk.user.primaryEmailAddress.emailAddress ||
      ''
    ).trim();
  };

  async function signIn() {
    const c = await whenReady();

    if (!c) {
      alert(
        'Sign-in is not available right now. Check that the Clerk publishable key is set in index.html.'
      );
      return;
    }

    openRequiredSignIn(c);
  }

  async function signOut() {
    const c = await whenReady();

    if (!c) return;

    try {
      await c.signOut({
        redirectUrl: window.location.href
      });
    } catch (err) {
      console.error(
        '[Nexora auth] sign-out failed:',
        err
      );
    }
  }

  async function openUserProfile() {
    const c = await whenReady();

    if (c) {
      c.openUserProfile();
    }
  }

  // ------------------------------------------------------------
  // React to sign-in / sign-out
  // ------------------------------------------------------------

  function onClerkChange() {
    const userId =
      clerk && clerk.user
        ? clerk.user.id
        : null;

    renderProfile();

    window.dispatchEvent(
      new CustomEvent('nexora-auth-changed', {
        detail: {
          userId
        }
      })
    );

    if (userId !== lastUserId) {
      lastUserId = userId;
      remountLiveModule();
    }
  }

  // Re-run the currently open module so it loads the
  // correct user's data.
  function remountLiveModule() {
    const key =
      LIVE_MODULES[location.hash.slice(1)];

    const mod =
      key && window[key];

    const container =
      document.querySelector(
        '.nx-module-placeholder'
      );

    if (
      mod &&
      typeof mod.mount === 'function' &&
      container
    ) {
      mod.mount(container);
    }
  }

  // ------------------------------------------------------------
  // Sidebar profile block
  // ------------------------------------------------------------

  let profileEl = null;

  function bindProfile(el) {
    profileEl = el;

    el.setAttribute('role', 'button');
    el.tabIndex = 0;
    el.style.cursor = 'pointer';

    const activate = (e) => {
      if (
        e.target.closest('[data-nx-signout]')
      ) {
        return;
      }

      if (isSignedIn()) {
        openUserProfile();
      } else {
        signIn();
      }
    };

    el.addEventListener(
      'click',
      activate
    );

    el.addEventListener(
      'keydown',
      (e) => {
        if (
          e.key === 'Enter' ||
          e.key === ' '
        ) {
          e.preventDefault();
          activate(e);
        }
      }
    );

    renderProfile();
  }

  function renderProfile() {
    if (!profileEl) return;

    const small =
      profileEl.querySelector('small');

    if (!small) return;

    if (!isConfigured) {
      return;
    }

    if (isSignedIn()) {
      const email =
        clerk.user &&
        clerk.user.primaryEmailAddress &&
        clerk.user.primaryEmailAddress.emailAddress;

      profileEl.title =
        email
          ? `Signed in as ${email}`
          : 'Account';

      small.textContent = 'Signed in · ';

      const out =
        document.createElement('button');

      out.type = 'button';
      out.textContent = 'Sign out';

      out.setAttribute(
        'data-nx-signout',
        ''
      );

      out.style.cssText =
        'background:none;border:0;padding:0;margin:0;font:inherit;color:inherit;text-decoration:underline;cursor:pointer;';

      out.addEventListener(
        'click',
        (e) => {
          e.stopPropagation();
          signOut();
        }
      );

      small.appendChild(out);
    } else {
      profileEl.title =
        'Sign in with Google';

      small.textContent =
        ready && !clerk
          ? 'Loading sign-in…'
          : 'Sign in with Google';
    }
  }

  // ------------------------------------------------------------
  // Wait for app.js to create the profile element
  // ------------------------------------------------------------

  function watchForProfile() {
    const found =
      document.querySelector(
        '.nx-profile'
      );

    if (found) {
      return bindProfile(found);
    }

    const observer =
      new MutationObserver(() => {
        const el =
          document.querySelector(
            '.nx-profile'
          );

        if (el) {
          observer.disconnect();
          bindProfile(el);
        }
      });

    observer.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true
      }
    );
  }

  watchForProfile();

  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------

  window.NexoraAuth = {
    ready,
    isConfigured,
    getToken,
    isSignedIn,
    getUserId,
    getProfileName,
    getEmailAddress,
    signIn,
    signOut,
    openUserProfile
  };
})();
