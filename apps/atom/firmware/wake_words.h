#pragma once

/**
 * Which wake words the device listens for.
 *
 * Models are generated into src/models/ with scripts/embed-model.py; see the
 * "Wake word" section of the README for training "Hola Olivia" / "Hi Olivia".
 * Until those exist, the stock "Okay Nabu" model stands in so the whole
 * hands-free flow can be used and tuned now.
 */

#include "src/models/okay_nabu.h"

static const WakeWordModel* const WAKE_WORD_MODELS[] = {&okay_nabu_model};
static constexpr size_t WAKE_WORD_MODEL_COUNT = sizeof(WAKE_WORD_MODELS) / sizeof(WAKE_WORD_MODELS[0]);

/** For the serial log. */
#define WAKE_WORD_NAMES "Okay Nabu"
