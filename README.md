# HBS Exam Paper Generator — v3.0

A React + Vite app for generating formatted exam papers as `.docx` files for HBS College of Nursing Islamabad.

## Project Structure

```
hbs-exam-generator/
├── index.html                      # Vite entry HTML
├── vite.config.js                  # Vite config (React plugin)
├── package.json
└── src/
    ├── main.jsx                    # ReactDOM.createRoot entry point
    ├── App.jsx                     # Root component — owns all state
    ├── styles/
    │   └── index.css               # Global CSS (tokens, layout, components)
    ├── components/
    │   ├── AppHeader.jsx           # Top navigation bar
    │   ├── PaperHeaderForm.jsx     # Institution / session / marks / time fields
    │   ├── InstructionsCard.jsx    # Editable list of exam instructions
    │   ├── MCQSettingsCard.jsx     # MCQ marks-note setting
    │   ├── SubjectiveSettingsCard.jsx  # Section marks, per-Q marks, attempt word
    │   ├── QInput.jsx              # Paste / upload .txt for questions
    │   └── ParsedPreview.jsx       # Live preview of parsed questions
    └── utils/
        ├── parsers.js              # parseMCQs() and parseSubjective()
        └── generateDocx.js         # Builds the Word document and triggers download
```

## Quick Start

**Requirements:** Node.js 18+

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Then open http://localhost:5173 in your browser.

```bash
# Build for production
npm run build

# Preview the production build locally
npm run preview
```

## How to Use

1. **Fill in the Paper Header** (left panel) — institution, session, subject, marks, time, date.
2. **Edit Instructions** — add/remove/edit the instructions printed on the exam paper.
3. **Configure MCQ Settings** — set the marks note text.
4. **Configure Subjective Settings** — set section marks, per-question marks, and how many questions to attempt.
5. **Paste MCQs** (right panel) — use the numbered format shown in the placeholder, or upload a `.txt` file.
6. **Paste Subjective Questions** — numbered list, one per paragraph.
7. **Click Generate** — a `.docx` file will download immediately.

### MCQ Format

```
1. Which of the following is NOT an objective of MCH services?
a) Reducing maternal and child mortality.
b) Promoting best possible health conditions for infants.
c) Increasing the family size without spacing.
d) Advising parents to limit family size with adequate spacing.

2. Next question here...
```

### Subjective Format

```
1. Explain the meaning, philosophy, and importance of Family Planning.

2. Describe the role of CHN/LHV in Family Planning at community level.
```

## Dependencies

| Package     | Purpose                          |
|-------------|----------------------------------|
| `react`     | UI framework                     |
| `react-dom` | DOM rendering                    |
| `docx`      | Build `.docx` files in the browser |
| `file-saver`| Trigger file download            |
| `vite`      | Dev server & build tool          |
