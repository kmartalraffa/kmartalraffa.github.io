```markdown
What to add to enable Light/Dark theme (mobile-friendly)

1) Add the CSS file:
   - Path: /assets/css/theme.css
   - Purpose: define color variables for light and dark, and provide smooth transitions.

2) Add the JS file:
   - Path: /assets/js/theme-toggle.js
   - Purpose: detect saved preference or system preference (prefers-color-scheme), listen for changes, inject a small toggle button on mobile, persist choice in localStorage, and update meta[name="theme-color"].

3) Edit your HTML (likely index.html):
   - In <head> add:
     <meta name="theme-color" content="#ffffff">
     <link rel="stylesheet" href="/assets/css/theme.css">
     <script src="/assets/js/theme-toggle.js" defer></script>
   - If your site has a header/nav where you'd prefer the toggle, you can remove the injected button and place a button with id="theme-toggle" instead.

Notes:
- By default the site follows the user's system preference. If the user taps the toggle, their choice is saved and overrides system changes.
- meta[name="theme-color"] is updated to match the page background so mobile browsers (Android Chrome, etc.) color the status bar appropriately.
- The button is small and fixed at bottom-right on mobile; adjust styles in theme.css to fit your layout.
```
