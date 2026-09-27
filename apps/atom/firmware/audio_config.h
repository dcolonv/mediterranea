#pragma once

/**
 * Audio + endpoint contract with the server.
 *
 * These mirror ATOM_AUDIO in packages/shared/src/constants/index.ts. The
 * firmware is C++ and cannot import that file, so the duplication is
 * deliberate — change one, change the other. The server validates what it
 * receives and rejects a mismatch rather than transcribing garbage.
 */

#define ATOM_SAMPLE_RATE 16000
#define ATOM_CHANNELS 1
#define ATOM_BITS_PER_SAMPLE 16

#define ATOM_ENDPOINT_PATH "/api/atom/speech"
#define ATOM_TOKEN_HEADER "X-Device-Token"

/** Stop recording at this point even if the button is still held. */
#define ATOM_MAX_SECONDS 30

/**
 * Samples per streamed chunk. 4096 samples = 8 KB = 256 ms.
 *
 * Two of these are statically allocated (16 KB). Kept small on purpose: there
 * is no PSRAM and only ~300 KB of RAM, of which Wi-Fi and TLS take 40-50 KB.
 * Buffering a whole clip instead would cap recording at 3-4 seconds.
 */
#define ATOM_CHUNK_SAMPLES 4096
