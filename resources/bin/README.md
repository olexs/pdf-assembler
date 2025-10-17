# Bundled Binaries

This directory contains bundled ImageMagick binaries for distribution with the PDF Assembler application.

## Directory Structure

```
bin/
├── download-binaries-darwin.sh   # Script to download macOS binaries
├── download-binaries-win32.sh    # Script to download Windows binaries
├── darwin/                        # macOS binaries (created by script)
│   ├── magick                    # ImageMagick binary
│   └── config/                   # ImageMagick configuration files
└── win32/                        # Windows binaries (created by script)
    ├── magick.exe                # ImageMagick binary
    ├── *.dll                     # ImageMagick dependencies
    └── config/                   # ImageMagick configuration files
```

## Quick Start

**To download binaries for your platform:**

```bash
# For macOS
./resources/bin/download-binaries-darwin.sh

# For Windows (run in Git Bash, WSL, or MSYS2)
./resources/bin/download-binaries-win32.sh
```

These scripts will automatically:
- Download the latest ImageMagick binaries
- Extract them to the correct directory
- Set proper permissions (macOS)
- Verify the installation

## Binary Sources

### Windows
- Source: **ImageMagick GitHub Releases**
- Format: Portable `.7z` archive (Q16-HDRI x64)
- Downloads from: `https://github.com/ImageMagick/ImageMagick/releases`

### macOS
- Source: **Homebrew Bottles (via ghcr.io)**
- Format: Universal binary `.tar.gz` (arm64 + x86_64)
- Downloads via: `brew fetch imagemagick` (handles ghcr.io authentication automatically)
- Note: Properly versioned, matches GitHub releases, supports both Apple Silicon and Intel

## Version Management

Binary versions are tracked using Renovate regex comments in the download scripts:

```bash
# renovate: datasource=github-releases depName=ImageMagick/ImageMagick
IMAGEMAGICK_VERSION="7.1.2-7"
```

Renovate will automatically detect updates and create PRs. To update manually:

1. Edit the version in the appropriate download script
2. Run the download script
3. Test the application
4. Commit the changes

## Manual Download (Alternative)

If you prefer to download binaries manually:

### Windows
1. Visit https://github.com/ImageMagick/ImageMagick/releases
2. Download `ImageMagick-*-portable-Q16-HDRI-x64.7z`
3. Extract with 7-Zip
4. Copy `magick.exe` and all `.dll` files to `win32/`
5. Copy configuration files to `win32/config/`

### macOS
1. Ensure Homebrew is installed: `brew --version`
2. Run: `brew fetch --force imagemagick`
3. Find bottle in cache: `brew --cache`
4. Extract the bottle tar.gz
5. Copy the `magick` binary to `darwin/`
6. Set permissions: `chmod +x darwin/magick`
7. Copy configuration files to `darwin/config/`

**Note:** The download script automates all these steps

## Testing

After downloading binaries:

1. Test binary: `./resources/bin/darwin/magick --version` (or `win32/magick.exe --version`)
2. Run development build: `npm start`
3. Test PDF splitting and image processing
4. Package the app: `npm run package`
5. Run E2E tests: `npm run e2e`

## Notes

- Binaries are unpacked from asar to preserve execute permissions
- Windows build is ~60-80MB, macOS build is ~40-50MB
- These binaries eliminate the need for users to install ImageMagick separately
- ImageMagick includes built-in Ghostscript delegates for PDF processing
