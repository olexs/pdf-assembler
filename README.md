# Olex's PDF Assembler

This tool allows to merge multiple images or PDF files into a single multi-page PDF, optionally pre-processing the images for quick transfer via fax.

Image manipulation is done using ImageMagick, "magick convert" needs to be available on the PATH for this tool to work.

## How to use

Build and install in a location of your choosing.

`npm run make`

### Windows - SendTo

Create a shortcut to the generated .exe file and place it in the SendTo folder (`C:\Users\<Username>\AppData\Roaming\Microsoft\Windows\SendTo` or just enter `sendto` into the Windows Explorer address bar). Select one or more image and/or PDF files, and use the right-click menu -> Send to -> your new shortcut to run the application.

## Built with

- Electron Forge
- Typescript
- ImageMagick
- PDFkit
- Bootstrap and Bootstrap-Icons
- Jest

## Release Process

This project uses [semantic-release](https://semantic-release.gitbook.io/) for automated version management and release generation. The release strategy follows a hybrid approach:

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

- `fix:` - Bug fixes (triggers patch release)
- `feat:` - New features (triggers minor release)
- `feat!:` or `BREAKING CHANGE:` - Breaking changes (triggers major release)

### Release Triggers

**Scheduled Releases (weekly on Mondays at 9 AM UTC):**
- `feat:` commits are batched and released weekly
- Provides predictable feature releases for users
- Renovate dependency updates are included in these releases
- Only runs if there are unreleased commits (semantic-release handles this automatically)

**Manual Releases:**
- Use GitHub Actions "Manual Release" workflow
- Choose patch/minor/major release type
- Useful for breaking changes that need manual approval

### Renovate Integration

Renovate is configured to:
- Auto-merge patch/minor dev dependency updates
- Group related dependencies (electron-forge, eslint)
- Use conventional commit messages for production dependencies
- Trigger appropriate releases when merged:
  - Dev dependency updates → no release (automerged)
  - Production dependency patches → patch release (weekly)
  - Production dependency minors → minor release (weekly)
  - Production dependency majors → requires manual review

### Release Assets

Each release automatically includes:
- Windows installer (.exe)
- macOS installer (.dmg) - when macOS builds are enabled
- Auto-generated changelog from commit messages
- GitHub release with proper semantic version

## Open TODOs

- [ ] Rework e2e tests to use PDF diffing instead of screenshots
  - using diff-pdf or similar
  - make sure tests run locally and on CI (install the diff tool as part of setup)
- [ ] Add more e2e tests for core functions (file adding, reordering, cropping, rotating, saving, fax optimization)
- [ ] Re-enable macOS builds
- [ ] Create and add app icon
- [ ] Bundle ImageMagick for macOS and Windows to avoid external dependency
- [ ] Post-install hook handler on Windows for Squirrel to add "SendTo" shortcut and close the app
