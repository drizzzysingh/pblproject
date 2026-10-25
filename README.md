# SLCM Compass

**SLCM Compass** is an unofficial, browser-based student companion for attendance planning, SGPA/CGPA calculations, an illustrative shortfall-risk estimate, and deadline extraction from pasted notices.

> This is a student project prototype. It is **not connected to SLCM**, is not an official university tool, and does not request or store SLCM credentials.

## Features

- **Attendance planner:** subject-wise attendance, status labels, skip budget, recovery run, and a what-if planner for future classes.
- **Grade planner:** credit-weighted SGPA, updated CGPA, and required SGPA for a target CGPA.
- **Shortfall risk:** a transparent logistic-formula estimate with contribution terms.
- **Notice reader:** extracts supported day-first dates and optional times, classifies common topics, and sorts results by date.
- **Local persistence:** saves entered values in the current browser using `localStorage`.
- **Responsive layout:** works on desktop and narrow/mobile screens.
- **No server or external libraries:** HTML, CSS and vanilla JavaScript only.

## Project structure

```text
slcm-compass/
├── index.html   # App structure and interface
├── styles.css   # Styling and responsive layout
├── app.js       # Calculations, interactions and local storage
├── README.md    # Project documentation
└── LICENSE      # MIT license
```

## Run locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser.
3. Edit the sample figures or press **Reset demo** to restore them.

No package installation, build command, database, API key, or server is required. For a local development server, you can use VS Code's Live Server extension, but it is optional.

## GitHub Pages deployment

1. Create a new GitHub repository, for example `slcm-compass`.
2. Upload all files in this folder to the **root** of the repository.
3. Open **Settings → Pages**.
4. Under the build/deployment section, choose **Deploy from a branch**, select `main` and `/(root)`, then save.
5. Wait for GitHub Pages to publish the site. The URL will appear on the Pages settings screen.

## Important implementation notes

- The default sample figures are illustrative and should not be presented as actual student records.
- The attendance minimum defaults to 75% and is adjustable. Confirm the official requirement for your programme.
- The risk weights are manually chosen placeholders. They have **not** been trained or validated on student data; the percentage is not a reliable real-world prediction.
- The notice reader uses regular expressions and topic keywords. It will miss unsupported date formats and its output should be checked against the original official notice.
- Values are stored locally in the browser under `slcm-compass-v1`. They do not sync across devices. Clearing browser site data may remove them.
- The project intentionally does not automate login to SLCM, collect credentials, or write back to the portal.

## Formulas

Let `a` be classes attended, `t` classes held, and `T` the minimum attendance fraction.

- Attendance percentage: `100 × a / t`
- Skip budget: `floor(a / T − t)` when currently at or above the minimum
- Recovery run: `ceil((T × t − a) / (1 − T))` when below the minimum
- SGPA: `sum(credits × grade points) / sum(credits)`
- Updated CGPA: `(previous CGPA × previous credits + semester weighted grade points) / (previous credits + semester credits)`

The shortfall-risk estimate uses the placeholder logistic formula documented in the project report. It should only be used to demonstrate how the interface and explanation work.

## Suggested future work

- Add automated tests for calculation edge cases and notice formats.
- Collect anonymised data only with informed consent and appropriate approval.
- Train and calibrate a risk model before making any predictive claims.
- Evaluate date/topic extraction on a representative, labelled notice dataset.
- Add export/import for user-controlled backup files.

## License

MIT — see [`LICENSE`](LICENSE).
