# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm start` - Launch development version with hot reload
- `npm run package` - Package the application (required before running E2E tests)
- `npm run make` - Create distributable packages (DMG/exe)
- `npm test` - Run Jest unit tests
- `npm run e2e` - Run Playwright end-to-end tests (requires app to be packaged first)
- `npm run lint` - ESLint code quality checks

## Architecture Overview

### Electron Application Structure

This is a dual-process Electron application with **node integration enabled** (required for file system operations):

- **Main Process** (`src/index.ts`): Creates BrowserWindow, handles IPC for file dialogs, manages temporary directories, supports command-line file input
- **Renderer Process** (`src/renderer.ts`): UI logic, file processing pipeline, PDF generation, user interactions

### Core Processing Pipeline

1. **Input Processing** (`src/preprocessor.ts`): Handles JPG, PNG, BMP, PDF, TIFF files. PDFs are split into individual pages using ImageMagick
2. **Image Editing**: CropperJS integration for crop/rotate/scale transformations 
3. **PDF Generation** (`src/pdfGenerator.ts`): Uses PDFKit to assemble final PDF with intelligent page layout and EXIF orientation handling

### Key Dependencies

- **ImageMagick**: External dependency (not bundled) - required for PDF splitting and image processing. Commands generated in `src/magickCommands.ts`
- **PDFKit**: PDF generation with A4/US Letter support, margin calculations, fax optimization
- **CropperJS**: Image editing UI with transformation data converted to ImageMagick commands
- **SortableJS**: Drag-and-drop reordering of input files
- **i18next**: Internationalization (English/German) with HTML attribute-based translations

### Build System

- **Electron Forge** with Webpack plugin
- **Webpack configs**: Separate for main/renderer processes with special handling for PDFKit fonts and unicode data
- **Node integration enabled**: Allows direct file system access in renderer
- **Hot reload disabled**: For stability during development

### CI/CD

- **Platforms**: Windows and macOS builds run on every push/PR to master
- **Dependencies**: Both platforms install ImageMagick and Ghostscript via package managers (choco/brew)
- **Build pipeline**: Lint → Unit tests → Package → E2E tests → Make installer
- **Artifacts**: Installers (.exe/.dmg) and test results uploaded for each build
- **Release process**: Currently being reworked (scheduled/manual releases via semantic-release)

### Testing

- **Jest**: Unit tests for core logic (sorting algorithms, i18n completeness)
- **Playwright**: E2E tests with PDF output comparison using ImageMagick
  - Tests generate actual PDFs and compare against baseline PDFs
  - Supports multi-page PDF comparison (compares each page individually)
  - Baseline PDFs stored in `e2e-tests/main.spec.ts-snapshots/`
  - **IMPORTANT**: Each test must call `ensureCleanState()` to prevent localStorage poisoning between test runs
- **Testing requirement**: Run `npm run package` before E2E tests to generate app bundle

#### E2E Test Baseline Management

**CRITICAL**: Never regenerate baselines for existing tests unless features have explicitly changed.

When adding new E2E tests:
1. **Add the test** with proper `ensureCleanState()` call
2. **Generate baseline for new test ONLY**: `UPDATE_SNAPSHOTS=true npx playwright test --grep "new test name"`
3. **Verify existing tests still pass**: `npx playwright test --grep-invert "new test name"`
4. **Commit only the new baseline PDF** - do not commit changes to existing baselines

When modifying existing features:
- Only regenerate baselines affected by the feature change
- Document why baselines changed in the commit message
- Verify unrelated tests still pass with their original baselines

Common mistakes to avoid:
- Running `UPDATE_SNAPSHOTS=true npm run e2e` regenerates ALL baselines - only do this if intentional
- Forgetting `ensureCleanState()` causes tests to use localStorage state from previous runs
- Committing baseline changes without verifying existing tests pass first

### Pre-Commit Checklist

Before committing changes, ALWAYS run the following commands in order to ensure code quality:

1. **Lint**: `npm run lint` - Fix all ESLint errors
2. **Unit Tests**: `npm test` - Ensure all Jest tests pass
3. **Package**: `npm run package` - Build the application
4. **E2E Tests**: `npm run e2e` - Verify all Playwright tests pass

If any of these fail, fix the issues before committing. This ensures the codebase remains stable and all changes are properly tested.

### State Management

- InputFile array as primary data structure containing file paths, crop/rotation state, and metadata
- localStorage for user preferences persistence  
- Real-time preview regeneration on file changes

### IPC Communication

Event channels between main and renderer:
- `saveDialogTriggered` - Open save dialog
- `addDialogTriggered` - Open file selection dialog  
- `exitAfterSavingTriggered` - Close app after save

### Release Process

Uses semantic-release with hybrid strategy:
- `feat:` commits → weekly scheduled releases (Mondays 9 AM UTC)
- Manual releases via GitHub Actions workflow
- Renovate handles dependency updates with conventional commit format

### File Processing Notes

- Natural sorting algorithm handles PDF page numbering (file.pdf-0, file.pdf-1)
- EXIF orientation automatically handled during processing
- Fax mode applies grayscale and threshold filters
- Full-page images (near A4/Letter aspect ratio) omit margins automatically
- Temporary directories created/cleaned for multi-page PDF processing