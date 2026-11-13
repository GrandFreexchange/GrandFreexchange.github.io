// Builds /assets/tailwind.css, the prebuilt stylesheet that replaced the in-browser Tailwind script.
// Rebuild with `npm run build:css` after adding Tailwind classes to any page or script, then bump
// the tailwind.css?v= number on every page (and in build.js / build-calculators.js).
// The config is Tailwind's default on purpose, so the output matches what the CDN script generated.
module.exports = {
    content: [
        './*.html',
        './items/*.html',
        './guides/*.html',
        './calculators/*.html',
        './hardcore/*.html',
        './assets/*.js',
        './build.js',
        './build-calculators.js',
    ],
    theme: { extend: {} },
    plugins: [],
};
