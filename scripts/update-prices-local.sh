#!/bin/zsh

cd /Users/kevincurry/Code/port-royal-sounder || exit 1

node scripts/import-events.js
node scripts/build-newsletter.js

# Only queue the newsletter send on Mondays.
if [ "$(date +%u)" = "1" ]; then
  node scripts/send-newsletter.js
fi

node scripts/build-prices.js
