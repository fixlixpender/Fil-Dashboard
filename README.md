# Fil-Dashboard

Full-width projects dashboard as a web app.

- Create projects (folders)
- Todo list per project
- Countdown timer (set / start-pause / reset + presets + beep)
- 4 soft-gradient themes: Black, Orange, Blue, Green
- localStorage persistence (`projectDashboard.v1`)

## Run

Open `index.html` directly, or:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Files

- `index.html` — UI
- `styles.css` — themes + full-width layout
- `app.js` — projects, todos, timer, storage
