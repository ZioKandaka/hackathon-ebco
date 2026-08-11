#!/usr/bin/env bash
#
# Deploys backend (NestJS) and frontend (Vue/Vite) to Cloud Run, backed by
# a Cloud SQL for PostgreSQL instance.
#
# Prerequisites:
#   - gcloud CLI installed and authenticated (`gcloud auth login`)
#   - Billing enabled on the target project
#   - A filled-in .env.deploy (copy .env.deploy.example -> .env.deploy)
#
# Usage:
#   ./deploy.sh              # full deploy (creates SQL instance if missing)
#   ./deploy.sh backend      # only build+deploy the backend
#   ./deploy.sh frontend     # only build+deploy the frontend

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env.deploy"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy .env.deploy.example to $ENV_FILE and fill in real values." >&2
  exit 1
fi

# Parsed line-by-line (not `source`d) so values with shell-special characters
# (passwords/secrets containing &, >, {, ^, etc.) are read literally instead
# of being interpreted as shell syntax.
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
  if [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
    export "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
  fi
done < "$ENV_FILE"

required_vars=(PROJECT_ID REGION SQL_INSTANCE_NAME DB_NAME DB_USERNAME DB_PASSWORD JWT_SECRET GOOGLE_MAPS_API_KEY BACKEND_SERVICE FRONTEND_SERVICE AR_REPO)
for v in "${required_vars[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    echo "Missing required var: $v (set it in $ENV_FILE)" >&2
    exit 1
  fi
done

JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-1d}"
SQL_TIER="${SQL_TIER:-db-f1-micro}"
SQL_DB_VERSION="${SQL_DB_VERSION:-POSTGRES_15}"

TARGET="${1:-all}"

AR_HOST="${REGION}-docker.pkg.dev"
BACKEND_IMAGE="${AR_HOST}/${PROJECT_ID}/${AR_REPO}/backend:$(git rev-parse --short HEAD 2>/dev/null || date +%s)"
FRONTEND_IMAGE="${AR_HOST}/${PROJECT_ID}/${AR_REPO}/frontend:$(git rev-parse --short HEAD 2>/dev/null || date +%s)"
INSTANCE_CONNECTION_NAME="${PROJECT_ID}:${REGION}:${SQL_INSTANCE_NAME}"

log() { echo -e "\n>> $*"; }

log "Setting active project to ${PROJECT_ID}"
gcloud config set project "$PROJECT_ID" >/dev/null

log "Enabling required APIs (skips ones already on)"
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  sql-component.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  bigquery.googleapis.com \
  aiplatform.googleapis.com \
  --project "$PROJECT_ID"

log "Ensuring Artifact Registry repo '${AR_REPO}' exists"
if ! gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$AR_REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Location Intelligence Platform images"
fi

# Resolve runtime service account (default compute SA if not set)
if [[ -z "${RUNTIME_SERVICE_ACCOUNT:-}" ]]; then
  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
  RUNTIME_SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
fi
log "Runtime service account: ${RUNTIME_SERVICE_ACCOUNT}"

if [[ "$TARGET" == "all" || "$TARGET" == "backend" ]]; then
  log "Ensuring Cloud SQL instance '${SQL_INSTANCE_NAME}' exists (this can take several minutes on first create)"
  if ! gcloud sql instances describe "$SQL_INSTANCE_NAME" >/dev/null 2>&1; then
    gcloud sql instances create "$SQL_INSTANCE_NAME" \
      --database-version="$SQL_DB_VERSION" \
      --tier="$SQL_TIER" \
      --region="$REGION"
  fi

  log "Ensuring database '${DB_NAME}' exists"
  if ! gcloud sql databases describe "$DB_NAME" --instance="$SQL_INSTANCE_NAME" >/dev/null 2>&1; then
    gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE_NAME"
  fi

  log "Ensuring DB user '${DB_USERNAME}' exists"
  if ! gcloud sql users list --instance="$SQL_INSTANCE_NAME" --format='value(name)' | grep -qx "$DB_USERNAME"; then
    gcloud sql users create "$DB_USERNAME" --instance="$SQL_INSTANCE_NAME" --password="$DB_PASSWORD"
  else
    gcloud sql users set-password "$DB_USERNAME" --instance="$SQL_INSTANCE_NAME" --password="$DB_PASSWORD"
  fi

  log "Granting IAM roles to runtime service account"
  for role in roles/cloudsql.client roles/bigquery.jobUser roles/bigquery.dataViewer roles/aiplatform.user; do
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="serviceAccount:${RUNTIME_SERVICE_ACCOUNT}" \
      --role="$role" \
      --condition=None >/dev/null
  done

  log "Building backend image via Cloud Build: ${BACKEND_IMAGE}"
  gcloud builds submit backend/ --tag "$BACKEND_IMAGE"

  log "Deploying backend to Cloud Run: ${BACKEND_SERVICE}"
  gcloud run deploy "$BACKEND_SERVICE" \
    --image="$BACKEND_IMAGE" \
    --region="$REGION" \
    --platform=managed \
    --service-account="$RUNTIME_SERVICE_ACCOUNT" \
    --add-cloudsql-instances="$INSTANCE_CONNECTION_NAME" \
    --set-env-vars="^##^NODE_ENV=production##DB_HOST=/cloudsql/${INSTANCE_CONNECTION_NAME}##DB_PORT=5432##DB_NAME=${DB_NAME}##DB_USERNAME=${DB_USERNAME}##DB_PASSWORD=${DB_PASSWORD}##JWT_SECRET=${JWT_SECRET}##JWT_EXPIRES_IN=${JWT_EXPIRES_IN}##GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}##GOOGLE_CLOUD_PROJECT=${PROJECT_ID}" \
    --allow-unauthenticated

  BACKEND_URL="$(gcloud run services describe "$BACKEND_SERVICE" --region="$REGION" --format='value(status.url)')"
  log "Backend deployed: ${BACKEND_URL}"
fi

if [[ "$TARGET" == "all" || "$TARGET" == "frontend" ]]; then
  if [[ -z "${BACKEND_URL:-}" ]]; then
    BACKEND_URL="$(gcloud run services describe "$BACKEND_SERVICE" --region="$REGION" --format='value(status.url)' 2>/dev/null || true)"
    if [[ -z "$BACKEND_URL" ]]; then
      echo "Backend service '${BACKEND_SERVICE}' isn't deployed yet. Run './deploy.sh backend' first." >&2
      exit 1
    fi
  fi

  log "Building frontend image via Cloud Build: ${FRONTEND_IMAGE}"
  gcloud builds submit frontend/ \
    --config=frontend/cloudbuild.yaml \
    --substitutions="_API_BASE_URL=${BACKEND_URL}/api/v1,_MAPS_KEY=${GOOGLE_MAPS_API_KEY},_IMAGE=${FRONTEND_IMAGE}"

  log "Deploying frontend to Cloud Run: ${FRONTEND_SERVICE}"
  gcloud run deploy "$FRONTEND_SERVICE" \
    --image="$FRONTEND_IMAGE" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated

  FRONTEND_URL="$(gcloud run services describe "$FRONTEND_SERVICE" --region="$REGION" --format='value(status.url)')"
  log "Frontend deployed: ${FRONTEND_URL}"

  log "Pointing backend's FRONTEND_URL env var at the frontend"
  gcloud run services update "$BACKEND_SERVICE" \
    --region="$REGION" \
    --update-env-vars="FRONTEND_URL=${FRONTEND_URL}" >/dev/null
fi

log "Done."
echo "Backend:  ${BACKEND_URL:-<not deployed this run>}"
echo "Frontend: ${FRONTEND_URL:-<not deployed this run>}"
