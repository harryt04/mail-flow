const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("mailflow-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;

/** Inline, blocking script so the manual theme override applies before first paint (no FOUC). */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
