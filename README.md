# Olex's PDF Assembler

This tool allows to merge multiple images or PDF files into a single multi-page PDF, optionally pre-processing the images for quick transfer via fax.

Image manipulation is done using bundled ImageMagick and Ghostscript binaries - no external installation required!

## How to use

Build and install in a location of your choosing.

`npm run make`

### Windows - SendTo

Create a shortcut to the generated .exe file and place it in the SendTo folder (`C:\Users\<Username>\AppData\Roaming\Microsoft\Windows\SendTo` or just enter `sendto` into the Windows Explorer address bar). Select one or more image and/or PDF files, and use the right-click menu -> Send to -> your new shortcut to run the application.

## Built with

- Electron Forge
- Typescript
- ImageMagick (bundled with Ghostscript delegates)
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

## Bundled Dependencies

ImageMagick binaries are bundled with the application for both Windows and macOS. This eliminates the need for users to install ImageMagick separately. ImageMagick includes built-in Ghostscript delegates for PDF processing.

Binary versions are tracked using Renovate regex comments in download scripts at `resources/bin/download-binaries-*.sh`. Updates are automatically detected and PRs created. For more information about downloading and managing binaries, see `resources/bin/README.md`.

## Open TODOs

- [x] Create and add app icon
- [x] Bundle ImageMagick for macOS and Windows to avoid external dependency
- [ ] Post-install hook handler on Windows for Squirrel to add "SendTo" shortcut and close the app
