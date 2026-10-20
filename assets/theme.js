// Light/dark theme shared by every page. Loaded in <head> without defer so the saved theme is set
// before the page paints (no flash of the wrong theme). Any button with data-theme-toggle switches it,
// and a "themechange" event on document lets pages (like the dashboard chart) restyle themselves.
(function () {
    var root = document.documentElement;

    function savedTheme() {
        try {
            return localStorage.getItem('theme') === 'light' ? 'light' : 'dark';
        } catch (e) {
            return 'dark';
        }
    }

    function labelButtons(theme) {
        var buttons = document.querySelectorAll('[data-theme-toggle]');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
            buttons[i].setAttribute('title', theme === 'light' ? 'Dark theme' : 'Light theme');
        }
    }

    function setTheme(theme) {
        root.setAttribute('data-theme', theme);
        try {
            localStorage.setItem('theme', theme);
        } catch (e) { }
        labelButtons(theme);
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
    }

    root.setAttribute('data-theme', savedTheme());

    document.addEventListener('DOMContentLoaded', function () {
        labelButtons(root.getAttribute('data-theme'));
        document.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('[data-theme-toggle]')) {
                setTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
            }
        });
    });

    window.osrsTheme = { set: setTheme };
})();
