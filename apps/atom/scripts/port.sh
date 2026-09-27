#!/bin/sh
# Print the ATOM Echo's serial port.
#
# macOS also exposes its own Bluetooth adapters as /dev/cu.*, and letting
# arduino-cli auto-detect will happily pick one of those. Matching usbserial
# only keeps it on the real device, without pinning one machine's port.
#
# Override explicitly when needed:
#   ATOM_PORT=/dev/cu.usbserial-XXXX pnpm fw:flash

set -e

if [ -n "$ATOM_PORT" ]; then
  printf '%s' "$ATOM_PORT"
  exit 0
fi

port=$(ls /dev/cu.usbserial-* 2>/dev/null | head -1)

if [ -z "$port" ]; then
  echo "No /dev/cu.usbserial-* port found." >&2
  echo "Is the ATOM plugged in with a DATA cable? Charge-only cables show no port." >&2
  echo "List what is available with: pnpm fw:ports" >&2
  exit 1
fi

printf '%s' "$port"
