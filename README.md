# Baseball by Ukubot

**The ballpark is yours.** An original, browser-based arcade baseball game by Ukubot Studios.

## What's included

- A branded title screen with Play Ball and Training Mode entry points
- First-person pitching view from the mound
- Pointer/touch aiming and timed pitch release
- Fastball, changeup, and slider selection
- Timing-based batting, balls, strikes, outs, base runners, and scorekeeping
- Nine-inning exhibition game flow with extra innings when tied
- Responsive layout for desktop, tablet, and mobile
- Built-in coach tips and How to Play panel
- No build step, framework, account, or server required

## Play locally

Open `index.html` in a modern browser. For the most reliable local preview, run a static server from this folder:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Publish with GitHub Pages

1. Create or open the GitHub repository for the game.
2. Upload the **contents** of this folder so `index.html` is at the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)` folder, then save.
6. Wait for the Pages deployment to finish. Your public game URL will be shown in the Pages settings.

Keep the `web/` and `assets/` folders beside `index.html`; the game references them using relative paths and is designed for GitHub Pages project sites.

## Controls

### Pitching

- Tap **PITCH** or press **Space** to begin the windup.
- Move the pointer or drag a finger over the field to aim.
- Tap **PITCH** or press **Space** again to release.
- Tap **CHANGE PITCH** to cycle pitch types.

### Batting

- Tap **SWING** or press **Space** as the ball approaches.
- Tap **TAKE PITCH** to let the pitch pass.

## Project structure

```text
Baseball-by-Ukubot/
├── index.html
├── game.json
├── manifest.webmanifest
├── README.md
├── LICENSE
├── CHANGELOG.md
├── robots.txt
├── assets/
│   └── favicon.svg
└── web/
    ├── game.js
    └── style.css
```

## Credits

Created by **Ukubot Studios**. Baseball by Ukubot is an original fan-made arcade game project and is not affiliated with or endorsed by Major League Baseball or any professional baseball league.

## License

Released under the MIT License. See [LICENSE](LICENSE).
