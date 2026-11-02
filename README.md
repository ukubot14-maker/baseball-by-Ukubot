# Baseball by Ukubot

A self-contained browser baseball batting game built with HTML, CSS, Canvas 2D and JavaScript. No backend, build step, package manager or server is required.

## Play locally
Open `index.html` in a modern browser.

## Publish with GitHub Pages
1. Create a repository (for example, `baseball-by-ukubot`).
2. Upload the contents of this folder so `index.html` is at the repository root.
3. In **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. Open the Pages URL GitHub provides.

## Game rules
- A regulation game is **9 innings**, with a top and bottom half in each inning.
- The user pitches during the top half and bats during the bottom half.
- Three outs end a half-inning and automatically switch sides.
- Tied games continue into extra innings. The bottom of the ninth is skipped when the home team is already ahead after the top half.

## Controls
- **Space**, click/tap the game view, or the **SWING** button to swing.
- **TAKE PITCH** lets the pitch pass.
- Use the pitch-read bar and watch the ball approach the plate.

## Notes
- The game is designed to work offline after the page and files are loaded. Google Fonts are optional; system fonts are used as fallbacks.
- This is an original, 2D canvas interpretation of a broadcast-style batter's-eye baseball view. It is not affiliated with or a copy of Baseball 9.
- "For Austin" appears as small stadium easter eggs.
