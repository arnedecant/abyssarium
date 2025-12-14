#!/usr/bin/env bash

URL="file:///home/pi/abyssarium/apps/web/dist/index.html"

# Optional: wait for X session if using a desktop environment
sleep 5

chromium-browser \
  --kiosk \
  --incognito \
  --noerrdialogs \
  --disable-infobars \
  --check-for-update-interval=31536000 \
  "$URL"

