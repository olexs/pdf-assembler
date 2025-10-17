#!/usr/bin/env bash
set -euo pipefail

# Script to download ImageMagick binaries for macOS
# Uses Homebrew bottles which provide properly versioned universal binaries (arm64 + x86_64)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${SCRIPT_DIR}/darwin"

echo "=== Downloading ImageMagick binaries for macOS ==="
echo "Target directory: ${TARGET_DIR}"

# Create target directory
mkdir -p "${TARGET_DIR}/config"

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "Error: Homebrew is not installed. Please install Homebrew first:"
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

# ============================================================================
# ImageMagick
# ============================================================================

# renovate: datasource=github-releases depName=ImageMagick/ImageMagick
IMAGEMAGICK_VERSION="7.1.2-7"

echo ""
echo "Downloading ImageMagick ${IMAGEMAGICK_VERSION} for macOS..."
echo "Using Homebrew to fetch universal binary bottle..."

# Fetch the ImageMagick bottle (downloads to Homebrew cache)
# This automatically handles ghcr.io authentication and gets the right architecture
brew fetch --force imagemagick

# Find the downloaded bottle in cache
BREW_CACHE="$(brew --cache)"
BOTTLE_FILE=$(find "${BREW_CACHE}" -name "imagemagick--${IMAGEMAGICK_VERSION}*.bottle*.tar.gz" | head -n 1)

if [ -z "${BOTTLE_FILE}" ]; then
    echo "Error: Could not find downloaded bottle in cache"
    echo "Cache location: ${BREW_CACHE}"
    echo "Looking for: imagemagick--${IMAGEMAGICK_VERSION}*.bottle*.tar.gz"
    echo ""
    echo "Available files:"
    find "${BREW_CACHE}" -name "imagemagick*" -type f | head -10
    exit 1
fi

echo "Found bottle: $(basename "${BOTTLE_FILE}")"
echo "Extracting ImageMagick..."

TEMP_DIR=$(mktemp -d)
tar -xzf "${BOTTLE_FILE}" -C "${TEMP_DIR}"

# Find and copy the magick binary
MAGICK_BIN=$(find "${TEMP_DIR}" -name "magick" -type f | head -n 1)
if [ -n "${MAGICK_BIN}" ]; then
    cp "${MAGICK_BIN}" "${TARGET_DIR}/"
    chmod +x "${TARGET_DIR}/magick"
    echo "✓ ImageMagick binary copied"
else
    echo "Error: Could not find magick binary in bottle"
    echo "Bottle contents:"
    find "${TEMP_DIR}" -type f | head -20
    exit 1
fi

# Copy configuration files
CONFIG_DIR=$(find "${TEMP_DIR}" -type d -name "ImageMagick-*" -path "*/etc/*" | head -n 1)
if [ -n "${CONFIG_DIR}" ]; then
    cp -r "${CONFIG_DIR}"/* "${TARGET_DIR}/config/" 2>/dev/null || true
    echo "✓ ImageMagick configuration copied"
fi

# Cleanup
rm -rf "${TEMP_DIR}"

# ============================================================================
# Verification
# ============================================================================

echo ""
echo "=== Verification ==="

if [ -f "${TARGET_DIR}/magick" ]; then
    echo "✓ magick binary exists"
    ls -lh "${TARGET_DIR}/magick"

    # Test binary
    echo ""
    echo "Testing binary..."
    "${TARGET_DIR}/magick" --version || {
        echo "⚠ Binary test failed - may have dylib dependencies"
        echo "Checking dependencies..."
        otool -L "${TARGET_DIR}/magick" | grep -v "^${TARGET_DIR}" || true
    }
else
    echo "✗ magick binary missing"
fi

echo ""
echo "=== Download complete ==="
echo ""
echo "Binary installed to: ${TARGET_DIR}/magick"
echo ""
echo "Next steps:"
echo "1. Run npm start to test in development"
echo "2. Run npm run package to create production build"
echo "3. Run npm run e2e to test end-to-end"
