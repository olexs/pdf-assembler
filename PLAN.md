# ImageMagick Bundling Implementation Plan

## Implementation Status

**Status**: 🚧 **IN PROGRESS** - Code complete, ready for binary download testing

### Completed Work

- ✅ **Phase 1**: Directory structure created with `.gitattributes` for binary handling
- ✅ **Phase 2**: `src/binaryPaths.ts` utility created, `preprocessor.ts` and `pdfGenerator.ts` updated
- ✅ **Phase 3**: `package.json` Electron Forge configuration updated with extraResource and asar.unpack
- ✅ **Phase 4**: CI/CD workflow updated to use bundled binaries (no external installation)
- ✅ **Phase 5**: Renovate configured via regex comments in download scripts (`regexManagers:dockerfileVersions` preset)
- ✅ **Phase 6**: Documentation updated (README.md, CLAUDE.md, resources/bin/README.md)
- ✅ **Download Scripts**: Created platform-specific scripts:
  - `download-binaries-win32.sh` - Downloads from ImageMagick GitHub releases
  - `download-binaries-darwin.sh` - Downloads from Homebrew bottles (universal binaries)
- ✅ **Quality**: Linting passed, all 83 unit tests passed

### Known Issues

None currently. Homebrew bottles provide properly built universal binaries with correct dylib paths.

---

## Architecture Overview

### Binary Sources

**Windows**
- Source: ImageMagick GitHub Releases
- Format: Portable `.7z` archive (Q16-HDRI x64)
- URL: `https://github.com/ImageMagick/ImageMagick/releases/download/{version}/{filename}`
- Current version: `7.1.2-7`

**macOS**
- Source: Homebrew Bottles (GitHub Container Registry - ghcr.io)
- Format: Universal binary `.tar.gz` (arm64 + x86_64)
- Download method: `brew fetch imagemagick` (handles authentication automatically)
- Current version: `7.1.2-7` (properly versioned, matches official releases)

### Key Decisions

1. **ImageMagick Only**: Removed Ghostscript as a separate binary - ImageMagick includes built-in Ghostscript delegates for PDF processing
2. **Download Scripts**: Version tracking via Renovate regex comments in bash scripts:
   ```bash
   # renovate: datasource=github-releases depName=ImageMagick/ImageMagick
   IMAGEMAGICK_VERSION="7.1.2-7"
   ```
3. **Renovate Integration**: Uses standard `regexManagers:dockerfileVersions` preset to automatically detect version updates
4. **No versions.json**: Eliminated separate tracking file - versions live in download scripts

### Directory Structure

```
resources/
└── bin/
    ├── download-binaries-darwin.sh    # Script to download macOS binaries
    ├── download-binaries-win32.sh     # Script to download Windows binaries
    ├── README.md                       # Binary download and update instructions
    ├── darwin/                         # macOS binaries (created by script)
    │   ├── magick                     # ImageMagick binary
    │   ├── lib/                       # Shared libraries (.dylib) - needs fixing
    │   └── config/                    # ImageMagick configuration files
    └── win32/                         # Windows binaries (created by script)
        ├── magick.exe                 # ImageMagick binary
        ├── *.dll                      # ImageMagick dependencies
        └── config/                    # ImageMagick configuration files
```

---

## Implementation Details

### Code Changes

**`src/binaryPaths.ts`**
- `getMagickBinaryPath()`: Returns platform-specific path to magick binary (dev vs production)
- `getMagickEnv()`: Configures `MAGICK_HOME` and `MAGICK_CONFIGURE_PATH` environment variables

**`src/preprocessor.ts`** (line 51-53)
- Uses `getMagickBinaryPath()` for PDF splitting
- Passes `getMagickEnv()` to exec()

**`src/pdfGenerator.ts`** (line 91-100)
- Uses `getMagickBinaryPath()` for image transformations
- Passes `getMagickEnv()` to exec()

### Build Configuration

**`package.json`** (lines 26-31)
```json
{
  "extraResource": ["resources/bin"],
  "asar": {
    "unpack": "resources/bin/**/*"
  }
}
```
- Binaries are unpacked from asar to preserve execute permissions
- Total size per platform: ~60-80MB (Windows), ~40-50MB (macOS)

### CI/CD Changes

**`.github/workflows/main.yml`**
- Removed ImageMagick/Ghostscript installation steps for both Windows and macOS
- Comment added: `# NOTE: No ImageMagick/Ghostscript installation - using bundled binaries from resources/bin/`
- CI now uses bundled binaries for all testing

---

## Next Steps

### 1. Test Binary Downloads

```bash
# Download Windows binaries
./resources/bin/download-binaries-win32.sh

# Download macOS binaries
./resources/bin/download-binaries-darwin.sh
```

### 2. Test Development Build

```bash
npm start
# Test PDF splitting and image processing
```

### 3. Test Packaging

```bash
npm run package
# Verify binaries are in out/.../resources/bin/
```

### 4. Run E2E Tests

```bash
npm run e2e
# May need to regenerate baselines if ImageMagick version produces different output
```

---

## Platform-Specific Considerations

### Windows
- ✅ Portable build includes all DLLs
- ✅ No permission issues
- ✅ Direct download from GitHub releases

### macOS
- ✅ Universal binaries (native arm64 + x86_64)
- ✅ Properly versioned via Homebrew
- ✅ Dylib paths are correct (no fixing needed)
- ⚠️ May need to handle Gatekeeper/notarization for app signing
- ✅ Execute permissions preserved by Electron Forge unpacking

---

## Testing Checklist

- [ ] Download scripts work on both platforms
- [ ] Binaries have correct permissions (macOS)
- [ ] Development build works (`npm start`)
- [ ] Packaging works (`npm run package`)
- [ ] E2E tests pass (`npm run e2e`)
- [ ] App works without system ImageMagick
- [ ] PDF splitting functionality works
- [ ] Image transformations work
- [ ] Fax optimization mode works
- [ ] All file formats supported (JPG, PNG, BMP, PDF, TIFF)

---

## References

- ImageMagick releases: https://github.com/ImageMagick/ImageMagick/releases
- ImageMagick archive: https://imagemagick.org/archive/binaries/
- Renovate regex managers: https://docs.renovatebot.com/modules/manager/regex/
- Electron Forge packaging: https://www.electronforge.io/config/makers
