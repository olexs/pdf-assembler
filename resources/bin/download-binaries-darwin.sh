#!/usr/bin/env bash
set -euo pipefail

# Script to download ImageMagick binaries for macOS
# Note: ImageMagick does not publish pre-built macOS binaries on GitHub releases
# This script downloads from the official imagemagick.org archive instead

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${SCRIPT_DIR}/darwin"

echo "=== Downloading ImageMagick binaries for macOS ==="
echo "Target directory: ${TARGET_DIR}"

# Create target directory
mkdir -p "${TARGET_DIR}/config"

# ============================================================================
# ImageMagick
# ============================================================================

# renovate: datasource=github-releases depName=ImageMagick/ImageMagick
IMAGEMAGICK_VERSION="7.1.2-7"

echo ""
echo "Downloading ImageMagick ${IMAGEMAGICK_VERSION} for macOS..."

# Download from official imagemagick.org archive
# Note: These are x86_64 binaries that run on both Intel and Apple Silicon via Rosetta
IMAGEMAGICK_URL="https://imagemagick.org/archive/binaries/ImageMagick-x86_64-apple-darwin20.1.0.tar.gz"

TEMP_FILE=$(mktemp -u).tar.gz

echo "Downloading from: ${IMAGEMAGICK_URL}"
if command -v curl &> /dev/null; then
    curl -L -o "${TEMP_FILE}" "${IMAGEMAGICK_URL}"
elif command -v wget &> /dev/null; then
    wget -O "${TEMP_FILE}" "${IMAGEMAGICK_URL}"
else
    echo "Error: Neither curl nor wget is available"
    exit 1
fi

echo "Extracting ImageMagick..."
TEMP_DIR=$(mktemp -d)
tar -xzf "${TEMP_FILE}" -C "${TEMP_DIR}"

# Find and copy the magick binary
MAGICK_BIN=$(find "${TEMP_DIR}" -name "magick" -type f | head -n 1)
if [ -n "${MAGICK_BIN}" ]; then
    cp "${MAGICK_BIN}" "${TARGET_DIR}/"
    chmod +x "${TARGET_DIR}/magick"
    echo "✓ ImageMagick binary copied"
else
    echo "Error: Could not find magick binary"
    exit 1
fi

# Copy configuration files
for config_dir in "${TEMP_DIR}"/*/etc/ImageMagick-*; do
    if [ -d "${config_dir}" ]; then
        cp -r "${config_dir}"/* "${TARGET_DIR}/config/" 2>/dev/null || true
        echo "✓ ImageMagick configuration copied"
        break
    fi
done

# Cleanup
rm -f "${TEMP_FILE}"
rm -rf "${TEMP_DIR}"

# ============================================================================
# Verification
# ============================================================================

echo ""
echo "=== Verification ==="

if [ -f "${TARGET_DIR}/magick" ]; then
    echo "✓ magick binary exists"
    ls -lh "${TARGET_DIR}/magick"
    "${TARGET_DIR}/magick" --version
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
