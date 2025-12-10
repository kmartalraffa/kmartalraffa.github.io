(function(){
  const STORAGE_KEY = 'site-theme-preference'; // 'light' | 'dark'
  const metaTheme = document.querySelector('meta[name="theme-color"]');

  // Create toggle button if not already present
  let toggle = document.getElementById('theme-toggle');
  if(!toggle){
    toggle = document.createElement('button');
    toggle.id = 'theme-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label','Toggle color theme');
    // Append at end of body so it overlays site
    document.addEventListener('DOMContentLoaded', ()=>document.body.appendChild(toggle));
  }

  // Read saved preference
  const saved = localStorage.getItem(STORAGE_KEY); // may be null
  const mql = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

  // Determine current effective theme
  function getPreferredTheme(){
    if(saved === 'light' || saved === 'dark') return saved;
    if(mql) return mql.matches ? 'dark' : 'light';
    return 'light';
  }

  // Apply theme: set data-theme attribute for dark, remove for light
  function applyTheme(theme){
    if(theme === 'dark'){
      document.documentElement.setAttribute('data-theme','dark');
      toggle.textContent = '☀️'; // sun to switch back
    } else {
      document.documentElement.removeAttribute('data-theme');
      toggle.textContent = '🌙'; // moon to switch to dark
    }
    // update meta theme-color to the computed background variable
    if(metaTheme){
      // getComputedStyle on root returns CSS variables
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || (theme === 'dark' ? '#071022' : '#ffffff');
      metaTheme.setAttribute('content', bg);
    }
  }

  // Toggle handler
  function toggleHandler(){
    const current = getPreferredTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  // If user hasn't explicitely chosen, listen for system changes and auto-update
  function systemChangeHandler(e){
    const stored = localStorage.getItem(STORAGE_KEY);
    if(stored === 'light' || stored === 'dark') return; // user override - ignore system changes
    applyTheme(e.matches ? 'dark' : 'light');
  }

  // Initialize
  const init = () => {
    // make sure DOM is ready if toggle was created earlier
    if(!document.body.contains(toggle)) document.body.appendChild(toggle);

    // initial apply
    applyTheme(getPreferredTheme());

    // events
    toggle.addEventListener('click', toggleHandler);
    if(mql && typeof mql.addEventListener === 'function'){
      mql.addEventListener('change', systemChangeHandler);
    } else if (mql && typeof mql.addListener === 'function'){
      mql.addListener(systemChangeHandler); // older browsers
    }
  };

  // Run init when DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
