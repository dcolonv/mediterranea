#!/bin/sh
# The board, with UploadSpeed pinned.
#
# The board's UploadSpeed menu lists 1500000 first, which Arduino takes as the
# default, and uploads at that speed fail with "The chip stopped responding".
# 115200 is not optional here.
printf '%s' "m5stack:esp32:m5stack_atom:UploadSpeed=115200"
