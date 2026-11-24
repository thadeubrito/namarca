#!/bin/sh
# Run from any directory. Dependencies must already be installed; never npm ci.
# Only this run's exclusive network/containers are removed. No ports or data volumes.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DEPS=${DIRECT_UPLOAD_TEST_DEPS_VOLUME:-namarca_node_modules}
RUN="direct-upload-test-$(date +%s)-$$"
NETWORK="$RUN-network"
DB="$RUN-db"
S3="$RUN-s3"
TEST="$RUN-runner"
created_network=0
created_db=0
created_s3=0
created_test=0
cleanup() {
  if [ "$created_test" = 1 ]; then docker rm -f "$TEST" >/dev/null 2>&1 || true; fi
  if [ "$created_s3" = 1 ]; then docker rm -f "$S3" >/dev/null 2>&1 || true; fi
  if [ "$created_db" = 1 ]; then docker rm -f "$DB" >/dev/null 2>&1 || true; fi
  if [ "$created_network" = 1 ]; then docker network rm "$NETWORK" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT HUP INT TERM
docker volume inspect "$DEPS" >/dev/null
# Read-only probe only, no installs and no source .env access.
docker run --rm --network none -v "$DEPS:/deps:ro" node:24.11.1-bookworm-slim node -e 'for(const p of ["tsx","@aws-sdk/s3-request-presigner"])require("node:fs").accessSync("/deps/"+p+"/package.json")' >/dev/null
for resource in "$DB" "$S3" "$TEST"; do
  if docker container inspect "$resource" >/dev/null 2>&1; then printf '%s\n' 'Exclusive container name collision; aborting.' >&2; exit 1; fi
done
if docker network inspect "$NETWORK" >/dev/null 2>&1; then printf '%s\n' 'Exclusive network name collision; aborting.' >&2; exit 1; fi
docker network create --internal "$NETWORK" >/dev/null
created_network=1
docker run -d --name "$DB" --network "$NETWORK" --network-alias direct-upload-test-db \
  --tmpfs /var/lib/postgresql/data:rw,size=512m \
  -e POSTGRES_USER=direct_upload_test -e POSTGRES_PASSWORD=synthetic-disposable-password \
  -e POSTGRES_DB=namarca_direct_upload_test postgres:17.6-bookworm >/dev/null
created_db=1
docker run -d --name "$S3" --network "$NETWORK" --network-alias direct-upload-test-s3 \
  --tmpfs /data:rw,size=512m --tmpfs /tmp:rw,size=32m \
  --entrypoint /bin/sh chrislusf/seaweedfs:4.48 -ec '
    printf "%s" '\''{"identities":[{"name":"direct-upload-test","credentials":[{"accessKey":"synthetic-test-key","secretKey":"synthetic-test-secret"}],"actions":["Admin","Read","Write","List","Tagging"]}]}'\'' > /tmp/s3.json
    exec weed mini -dir=/data -ip=direct-upload-test-s3 -ip.bind=0.0.0.0 -s3.port=9000 -s3.config=/tmp/s3.json -bucket=direct-upload-test -master.telemetry=false -webdav=false -admin.ui=false -s3.port.iceberg=0 -s3.port.lance=0
  ' >/dev/null
created_s3=1
n=0
until docker exec "$DB" pg_isready -U direct_upload_test -d namarca_direct_upload_test >/dev/null 2>&1; do
  n=$((n+1)); [ "$n" -lt 60 ] || exit 1; sleep 1
done
n=0
until docker exec "$S3" sh -c 'curl -fsS --aws-sigv4 "aws:amz:us-east-1:s3" --user "synthetic-test-key:synthetic-test-secret" http://localhost:9000/direct-upload-test >/dev/null' >/dev/null 2>&1; do
  n=$((n+1)); [ "$n" -lt 90 ] || exit 1; sleep 1
done
printf '%s\n' "Resources: $DB $S3 $TEST $NETWORK; persistent temporary volumes: none."
created_test=1
docker run --rm --name "$TEST" --network "$NETWORK" \
  -v "$ROOT:/source:ro" -v "$DEPS:/app/node_modules:ro" --tmpfs /app:rw,size=1g -w /app \
  -e DIRECT_UPLOAD_TEST_DISPOSABLE=true -e NODE_ENV=development -e NEXT_TELEMETRY_DISABLED=1 \
  -e DATABASE_URL=postgresql://direct_upload_test:synthetic-disposable-password@direct-upload-test-db:5432/namarca_direct_upload_test \
  -e BETTER_AUTH_URL=http://direct-upload-test-app:3000 -e ADMIN_EMAIL=direct-upload-test@namarca.test \
  -e BETTER_AUTH_SECRET=synthetic-direct-upload-test-only-not-production \
  -e S3_ENDPOINT=http://direct-upload-test-s3:9000 -e S3_UPLOAD_ENDPOINT=http://direct-upload-test-s3:9000 \
  -e S3_REGION=us-east-1 -e S3_BUCKET=direct-upload-test \
  -e S3_ACCESS_KEY_ID=synthetic-test-key -e S3_SECRET_ACCESS_KEY=synthetic-test-secret \
  -e PIXGO_MODE=mock -e PIXGO_API_KEY=synthetic -e PIXGO_WEBHOOK_SECRET=synthetic-direct-upload-webhook-secret \
  node:24.11.1-bookworm-slim sh -ec '
    node -e '\''const fs=require("node:fs");fs.cpSync("/source","/app",{recursive:true,filter:p=>!p.slice(8).split("/").some(n=>["node_modules",".git",".next","dist","campaign-runtime"].includes(n)||n.startsWith(".env"))})'\''
    npm run db:migrate
    node_modules/.bin/tsx scripts/test-direct-upload.ts
  '
