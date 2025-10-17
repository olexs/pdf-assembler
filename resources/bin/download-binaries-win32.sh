#!/usr/bin/env bash
set -euo pipefail

# Script to download ImageMagick binaries for Windows
# This script downloads portable 7z archives from imagemagick.org
# Can be run on Windows (Git Bash, WSL, MSYS2) or any Unix system with 7z installed

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${SCRIPT_DIR}/win32"

echo "=== Downloading ImageMagick binaries for Windows ==="
echo "Target directory: ${TARGET_DIR}"

# Create target directory
mkdir -p "${TARGET_DIR}/config"

# Check for 7z
if ! command -v 7z &> /dev/null && ! command -v 7za &> /dev/null; then
    echo "Error: 7z is not installed. Please install p7zip:"
    echo "  Windows: choco install 7zip"
    echo "  macOS: brew install p7zip"
    echo "  Linux: apt-get install p7zip-full"
    exit 1
fi

# Use 7z or 7za depending on what's available
SEVENZ_CMD="7z"
if ! command -v 7z &> /dev/null; then
    SEVENZ_CMD="7za"
fi

# ============================================================================
# ImageMagick
# ============================================================================

# renovate: datasource=github-releases depName=ImageMagick/ImageMagick
IMAGEMAGICK_VERSION="7.1.2-7"

echo ""
echo "Downloading ImageMagick ${IMAGEMAGICK_VERSION} for Windows from GitHub..."

# Download portable Q16-HDRI x64 build (best quality, supports HDR)
IMAGEMAGICK_FILENAME="ImageMagick-${IMAGEMAGICK_VERSION}-portable-Q16-HDRI-x64.7z"
IMAGEMAGICK_URL="https://github.com/ImageMagick/ImageMagick/releases/download/${IMAGEMAGICK_VERSION}/${IMAGEMAGICK_FILENAME}"

TEMP_FILE=$(mktemp -u).7z

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
${SEVENZ_CMD} x "${TEMP_FILE}" -o"${TEMP_DIR}" -y > /dev/null

# Copy magick.exe and all DLLs
if [ -f "${TEMP_DIR}/magick.exe" ]; then
    cp "${TEMP_DIR}/magick.exe" "${TARGET_DIR}/"
    echo "✓ magick.exe copied"
else
    echo "Error: Could not find magick.exe"
    exit 1
fi

# Copy all DLL files
find "${TEMP_DIR}" -name "*.dll" -exec cp {} "${TARGET_DIR}/" \;
echo "✓ DLL files copied"

# Copy configuration files if they exist
if [ -d "${TEMP_DIR}" ]; then
    # Look for config files in various possible locations
    for config_file in colors.xml delegates.xml log.xml magic.xml mime.xml policy.xml quantization-table.xml thresholds.xml type.xml type-ghostscript.xml; do
        if [ -f "${TEMP_DIR}/${config_file}" ]; then
            cp "${TEMP_DIR}/${config_file}" "${TARGET_DIR}/config/"
        fi
    done
    echo "✓ Configuration files copied"
fi

# Cleanup
rm -f "${TEMP_FILE}"
rm -rf "${TEMP_DIR}"

# ============================================================================
# Verification
# ============================================================================

echo ""
echo "=== Verification ==="

if [ -f "${TARGET_DIR}/magick.exe" ]; then
    echo "✓ magick.exe exists"
    ls -lh "${TARGET_DIR}/magick.exe"
else
    echo "✗ magick.exe missing"
fi

DLL_COUNT=$(find "${TARGET_DIR}" -name "*.dll" | wc -l)
echo "✓ Found ${DLL_COUNT} DLL files"

echo ""
echo "=== Download complete ==="
echo ""
echo "Binary installed to: ${TARGET_DIR}/magick.exe"
echo ""
echo "Next steps:"
echo "1. Run npm start to test in development"
echo "2. Run npm run package to create production build"
echo "3. Run npm run e2e to test end-to-end"
