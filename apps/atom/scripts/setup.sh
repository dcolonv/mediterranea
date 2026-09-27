#!/bin/sh
# Install the pinned core and libraries into the shared Arduino location.
#
# Run once per machine. Versions are pinned so a build here matches the one
# verified on the device.
#
# Deliberately NOT using an arduino-cli build profile (sketch.yaml): profiles
# keep their own private copy of the platform under ~/Library/Arduino15/internal,
# which for the M5Stack core means ~5.5 GB duplicated on top of the ~5.4 GB the
# Arduino IDE already has — every ESP32 variant toolchain, none of which this
# board needs.

set -e

CORE_VERSION=3.3.9
M5UNIFIED_VERSION=0.2.23
M5GFX_VERSION=0.2.30
INDEX_URL=https://static-cdn.m5stack.com/resource/arduino/package_m5stack_index.json

echo "Installing m5stack:esp32@${CORE_VERSION}..."
arduino-cli core update-index --additional-urls "$INDEX_URL"
arduino-cli core install "m5stack:esp32@${CORE_VERSION}" --additional-urls "$INDEX_URL"

# M5GFX is a dependency of M5Unified; pinned explicitly so the pair stays known-good.
echo "Installing libraries..."
arduino-cli lib install "M5Unified@${M5UNIFIED_VERSION}" "M5GFX@${M5GFX_VERSION}"

echo "Done. Build with: pnpm fw:build"
