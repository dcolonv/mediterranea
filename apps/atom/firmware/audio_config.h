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

/** Conversation id. Generated at boot, so a reboot starts a new conversation. */
#define ATOM_SESSION_HEADER "X-Session-Id"

/** Stop recording at this point even if the person is still talking. */
#define ATOM_MAX_SECONDS 30

/**
 * Shorter than this is not a question — the server rejects it anyway.
 */
#define ATOM_MIN_SECONDS 0.3f

// ── Capture ──────────────────────────────────────────────────────────────────

/** Samples per mic request (32 ms). Three are in flight: 3 KB. */
#define ATOM_CAPTURE_SAMPLES 512

/**
 * The capture ring: the last 1.5 s of audio (48 KB). The mic task writes into
 * it continuously, so audio keeps accumulating while Wi-Fi connects, the HTTPS
 * handshake runs (about a second) or the network stalls — and the moments
 * before a wake word are still there to send.
 */
#define ATOM_RING_SAMPLES 24000

/** Samples processed and uploaded at a time (64 ms, 2 KB per upload chunk). */
#define ATOM_FRAME_SAMPLES 1024

// ── Hands-free ───────────────────────────────────────────────────────────────

/**
 * Audio from before the wake word fired that is sent with the question. The
 * detector fires a moment after the name ends, so without this "Hola Olivia,
 * ¿qué citas hay mañana?" said in one breath would lose its first syllables.
 */
#define ATOM_PREROLL_MS 500

/** Silence after speech that ends the question. */
#define ATOM_END_SILENCE_MS 1000

/** After the wake word, give up quietly if nothing is said for this long. */
#define ATOM_NO_SPEECH_MS 4000

/**
 * After an answer, keep listening this long for a follow-up question without
 * the wake word. 0 turns follow-ups off. Anything said in this window is sent,
 * so keep it short in a room where people talk among themselves.
 */
#define ATOM_FOLLOW_UP_MS 6000

/** Audio before speech started that a follow-up keeps, to catch its onset. */
#define ATOM_ONSET_MS 300

/**
 * Speech detection by loudness. A frame is speech when its RMS is above both
 * SPEECH_FACTOR x the room's noise floor (learnt continuously while quiet) and
 * MIN_SPEECH_RMS. Run `pnpm monitor:atom` and watch the "rms/floor" line to
 * tune for the room.
 */
#define ATOM_SPEECH_FACTOR 3.0f
#define ATOM_MIN_SPEECH_RMS 250.0f

/**
 * Button: hold this long or more and it's push-to-talk (release to send).
 * A shorter tap starts a hands-free question, same as the wake word — and
 * during an answer, stops it.
 */
#define ATOM_PTT_HOLD_MS 600

/**
 * Reply playback: a ring of 3 buffers of 2048 samples (128 ms each, 12 KB).
 * M5Unified queues at most two buffers per channel, so the third can be filled
 * while the other two play. All three are filled before playback starts, which
 * gives ~0.4 s of cushion against Wi-Fi jitter.
 */
#define ATOM_PLAY_SAMPLES 2048
#define ATOM_PLAY_BUFFERS 3

/** Speaker volume, 0-255. */
#define ATOM_VOLUME 200
