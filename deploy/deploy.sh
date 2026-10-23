#!/bin/sh
# Updates the running site to an image version (tag), then checks it is healthy.
#
#   ./deploy.sh <tag>      e.g. the commit SHA (what the pipeline does)
#   ./deploy.sh rollback   back to the last version that worked before the current one
#
# Run it from anywhere: it works in its own folder (/opt/wedding), next to
# docker-compose.yml, Caddyfile and .env.
set -eu
cd "$(dirname "$0")"

KEEP_BACKUPS=10
VOLUME=wedding_pb_data

CURRENT=$(sed -n 's/^IMAGE_TAG=//p' .env)
# Versions that passed their health check: the latest one and the one before it.
GOOD=$(cat .good-tag 2>/dev/null || true)
PREVIOUS_GOOD=$(cat .previous-good-tag 2>/dev/null || true)

if [ "${1:-}" = "rollback" ]; then
  # The current version works: go back one. It does not: go back to the last one that did.
  if [ "$CURRENT" = "$GOOD" ]; then TAG=$PREVIOUS_GOOD; else TAG=$GOOD; fi
  [ -n "$TAG" ] || { echo "No earlier working version recorded." >&2; exit 1; }
  echo "Rolling back to $TAG"
else
  TAG="${1:?usage: ./deploy.sh <image tag> | rollback}"
fi
OWNER=$(sed -n 's/^GHCR_OWNER=//p' .env)

# 1. Download the new images first: the site keeps running meanwhile. A
#    rollback by hand may not be logged in to the registry any more: the
#    images of earlier versions are still on the server, so that is fine.
IMAGE_TAG="$TAG" docker compose pull web pocketbase || echo "Could not download the images: using the ones on the server."
for image in wedding-web wedding-pocketbase; do
  if ! docker image inspect "ghcr.io/$OWNER/$image:$TAG" > /dev/null 2>&1; then
    echo "Image ghcr.io/$OWNER/$image:$TAG is not available: nothing was changed." >&2
    exit 1
  fi
done

# 2. Back up the database before PocketBase applies new migrations. PocketBase
#    stops for a few seconds so the copy is consistent. The photos (storage/)
#    are not copied every time: the nightly backups cover them.
mkdir -p backups
docker compose stop pocketbase
docker run --rm -v "$VOLUME":/data:ro -v "$PWD/backups":/backup alpine:3.20 \
  tar czf "/backup/pb_data-$(date +%Y%m%d-%H%M%S)-before-$TAG.tgz" -C /data --exclude=./storage --exclude=./backups .
# Keep the most recent ones only.
ls -1t backups/pb_data-*.tgz | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm --

# 3. Start the new version (its tag is kept in .env for manual `docker compose` commands).
if grep -q '^IMAGE_TAG=' .env; then
  sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$TAG/" .env
else
  echo "IMAGE_TAG=$TAG" >> .env
fi
docker compose up -d --remove-orphans

# 4. Both services must report healthy (their images have health checks).
health() { docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q "$1")" 2>/dev/null || echo missing; }
for _ in $(seq 1 45); do
  if [ "$(health web)" = healthy ] && [ "$(health pocketbase)" = healthy ]; then
    # Remember the working versions, for rollback.
    if [ "$TAG" != "$GOOD" ]; then
      [ -n "$GOOD" ] && echo "$GOOD" > .previous-good-tag
      echo "$TAG" > .good-tag
    fi
    docker image prune -f > /dev/null
    echo "Deployed $TAG."
    exit 0
  fi
  sleep 2
done

docker compose logs --tail=60 web pocketbase
echo "Deploy of $TAG is NOT healthy. Roll back with: ./deploy.sh rollback" >&2
echo "(the database copy taken before it is in backups/)" >&2
exit 1
