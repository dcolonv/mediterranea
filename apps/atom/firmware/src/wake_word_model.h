#pragma once

#include <stddef.h>
#include <stdint.h>

/**
 * One microWakeWord model, as generated into src/models/ by
 * scripts/embed-model.py from its .tflite and .json manifest.
 */
struct WakeWordModel {
  const char* wakeWord;
  const uint8_t* tflite;
  /** 0-255. The window's average probability must exceed this to fire. */
  uint8_t probabilityCutoff;
  /** Inferences averaged before deciding. */
  uint8_t slidingWindowSize;
  /** From the manifest; probed up to 2x at startup, as ESPHome does. */
  size_t tensorArenaSize;
};
