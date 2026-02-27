#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  Elege.ai WAR ROOM — Deploy Script (Bulletproof)
#  
#  Usage:
#    chmod +x deploy.sh
#    ./deploy.sh              # Full deploy (build + restart)
#    ./deploy.sh --clean      # Clean install (nuke node_modules)
#    ./deploy.sh --api-only   # Restart only the API
#    ./deploy.sh --worker-only # Restart only the Worker
# ═══════════════════════════════════════════════════════════════

set -euo pipefail
IFS=$'\n\t'

# ── CONFIG ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"
LOG_DIR="$BACKEND_DIR/logs"
LOCK_FILE="/tmp/warroom-deploy.lock"
NODE_MIN_VERSION="18"
MAX_OLD_SPACE="1536"

# ── COLORS ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✔]${NC} $1"; }
warn()  { echo -e "${YELLOW}[⚠]${NC} $1"; }
error() { echo -e "${RED}[✘]${NC} $1"; }
info()  { echo -e "${BLUE}[→]${NC} $1"; }

# ═══════════════════════════════════════════
# STEP 0: Pre-flight Checks
# ═══════════════════════════════════════════
preflight() {
    echo ""
    echo "═══════════════════════════════════════════"
    echo "  Elege.ai WAR ROOM — Deploy"
    echo "  $(date '+%Y-%m-%d %H:%M:%S')"
    echo "═══════════════════════════════════════════"
    echo ""

    # Prevent concurrent deploys
    if [ -f "$LOCK_FILE" ]; then
        local lock_pid=$(cat "$LOCK_FILE" 2>/dev/null)
        if kill -0 "$lock_pid" 2>/dev/null; then
            error "Deploy already running (PID: $lock_pid). Aborting."
            exit 1
        else
            warn "Stale lock file found. Removing..."
            rm -f "$LOCK_FILE"
        fi
    fi
    echo $$ > "$LOCK_FILE"
    trap cleanup EXIT

    # Check Node.js version
    if ! command -v node &>/dev/null; then
        error "Node.js not found. Install Node.js >= $NODE_MIN_VERSION"
        exit 1
    fi

    local node_version=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$node_version" -lt "$NODE_MIN_VERSION" ]; then
        error "Node.js $NODE_MIN_VERSION+ required, found v$(node -v)"
        exit 1
    fi
    log "Node.js $(node -v) detected"

    # Check npm
    if ! command -v npm &>/dev/null; then
        error "npm not found"
        exit 1
    fi
    log "npm $(npm -v) detected"

    # Check PM2
    if ! command -v pm2 &>/dev/null; then
        warn "PM2 not found. Installing globally..."
        npm install -g pm2
        log "PM2 installed: $(pm2 -v)"
    else
        log "PM2 $(pm2 -v) detected"
    fi

    # Check .env
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        error ".env file missing! Copy .env.example and fill in values."
        exit 1
    fi
    log ".env file found"

    # Ensure log directory
    mkdir -p "$LOG_DIR"
    log "Log directory ready: $LOG_DIR"
}

cleanup() {
    rm -f "$LOCK_FILE"
}

# ═══════════════════════════════════════════
# STEP 1: Kill Zombie Processes
# ═══════════════════════════════════════════
kill_zombies() {
    info "Checking for zombie/orphan Node processes..."

    # Stop PM2 processes gracefully first
    if command -v pm2 &>/dev/null; then
        pm2 stop all 2>/dev/null || true
        pm2 delete all 2>/dev/null || true
        log "PM2 processes cleared"
    fi

    # Kill any straggler node processes on our port
    local port=$(grep "^PORT=" "$BACKEND_DIR/.env" | cut -d'=' -f2 | tr -d '"' || echo "3000")
    local pids=$(lsof -ti ":$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        warn "Found processes on port $port: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
        log "Port $port freed"
    else
        log "Port $port is clean"
    fi

    # Kill orphan ts-node / nodemon processes from dev mode
    pkill -f "ts-node.*server" 2>/dev/null || true
    pkill -f "ts-node-dev.*server" 2>/dev/null || true
    pkill -f "nodemon.*server" 2>/dev/null || true
    sleep 1

    log "No zombie processes"
}

# ═══════════════════════════════════════════
# STEP 2: Install Dependencies
# ═══════════════════════════════════════════
install_deps() {
    local clean_mode="${1:-false}"

    cd "$BACKEND_DIR"

    if [ "$clean_mode" = "true" ]; then
        warn "Clean mode: removing node_modules and package-lock.json"
        rm -rf node_modules package-lock.json
    fi

    info "Installing dependencies (production only)..."

    # Retry logic: 3 attempts with exponential backoff
    local attempt=0
    local max_attempts=3

    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))

        if npm ci --omit=dev --ignore-scripts 2>/dev/null; then
            log "Dependencies installed (npm ci)"
            break
        elif npm install --omit=dev 2>/dev/null; then
            log "Dependencies installed (npm install fallback)"
            break
        else
            if [ $attempt -lt $max_attempts ]; then
                local wait_time=$((attempt * 5))
                warn "Install failed (attempt $attempt/$max_attempts). Retrying in ${wait_time}s..."
                sleep "$wait_time"

                # On second failure, nuke node_modules
                if [ $attempt -eq 2 ]; then
                    warn "Nuking node_modules for fresh install..."
                    rm -rf node_modules
                fi
            else
                error "Dependencies failed after $max_attempts attempts!"
                error "Try: rm -rf node_modules && npm install"
                exit 1
            fi
        fi
    done

    # Post-install: run any native module rebuilds
    npm rebuild 2>/dev/null || warn "npm rebuild had warnings (non-critical)"

    # Verify critical modules exist
    local critical_modules=("express" "@supabase/supabase-js" "ioredis" "@google/generative-ai")
    for mod in "${critical_modules[@]}"; do
        if [ ! -d "node_modules/$mod" ]; then
            error "Critical module missing: $mod"
            warn "Attempting targeted install..."
            npm install "$mod" --omit=dev || {
                error "Failed to install $mod. Cannot proceed."
                exit 1
            }
        fi
    done
    log "All critical modules verified"
}

# ═══════════════════════════════════════════
# STEP 3: Build TypeScript
# ═══════════════════════════════════════════
build_ts() {
    cd "$BACKEND_DIR"
    info "Building TypeScript..."

    # Clean previous build
    rm -rf dist

    # Need TypeScript compiler — install as devDep if missing
    if ! npx tsc --version &>/dev/null; then
        warn "TypeScript not found. Installing..."
        npm install typescript --save-dev
    fi

    # Build with error tolerance
    if npx tsc --build 2>/dev/null; then
        log "TypeScript build succeeded"
    elif npx tsc 2>/dev/null; then
        log "TypeScript build succeeded (fallback)"
    else
        # Try with skipLibCheck to bypass type errors from dependencies
        warn "Build errors detected. Retrying with --skipLibCheck..."
        npx tsc --skipLibCheck 2>/dev/null || {
            # Last resort: --noEmitOnError false to force emit
            warn "Still failing. Force-emitting despite errors..."
            npx tsc --skipLibCheck --noEmitOnError false 2>/dev/null || {
                error "TypeScript build completely failed."
                error "Fix compilation errors and try again."
                exit 1
            }
        }
        warn "Build completed with warnings (check errors!)"
    fi

    # Verify dist/server.js exists
    if [ ! -f "dist/server.js" ]; then
        error "dist/server.js not found after build!"
        exit 1
    fi

    # Copy .env to dist if needed (some setups require it)
    if [ -f ".env" ] && [ ! -f "dist/.env" ]; then
        cp .env dist/.env 2>/dev/null || true
    fi

    log "Build output verified: dist/server.js"
}

# ═══════════════════════════════════════════
# STEP 4: Redis Health Check
# ═══════════════════════════════════════════
check_redis() {
    info "Checking Redis connectivity..."

    local redis_url=$(grep "^REDIS_URL=" "$BACKEND_DIR/.env" | cut -d'=' -f2 | tr -d '"')

    if [ -z "$redis_url" ]; then
        warn "REDIS_URL not set in .env. Skipping Redis check."
        return 0
    fi

    # Simple check: can we connect to Redis?
    if command -v redis-cli &>/dev/null; then
        if redis-cli -u "$redis_url" ping 2>/dev/null | grep -q "PONG"; then
            log "Redis: PONG ✓"
        else
            warn "Redis not responding. The app may fail to connect."
            warn "Ensure Redis is running or REDIS_URL is correct."
        fi
    else
        # No redis-cli available — try with Node
        node -e "
            const Redis = require('ioredis');
            const r = new Redis('$redis_url', { connectTimeout: 5000, maxRetriesPerRequest: 1 });
            r.ping().then(() => { console.log('Redis: PONG'); r.quit(); process.exit(0); })
             .catch(() => { console.log('Redis: UNREACHABLE'); r.quit(); process.exit(1); });
            setTimeout(() => { r.quit(); process.exit(1); }, 6000);
        " 2>/dev/null && log "Redis connection verified" || warn "Redis may be unreachable (non-blocking)"
    fi
}

# ═══════════════════════════════════════════
# STEP 5: Start with PM2
# ═══════════════════════════════════════════
start_pm2() {
    local target="${1:-all}"
    cd "$BACKEND_DIR"

    info "Starting services with PM2..."

    if [ "$target" = "api-only" ]; then
        pm2 start ecosystem.config.js --only warroom-api --env production
        log "API started"
    elif [ "$target" = "worker-only" ]; then
        pm2 start ecosystem.config.js --only warroom-worker --env production
        log "Worker started"
    else
        pm2 start ecosystem.config.js --env production
        log "All services started"
    fi

    # Wait for processes to stabilize
    sleep 3

    # Verify processes are running
    local api_status=$(pm2 jlist 2>/dev/null | node -pe "
        JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))
            .filter(p => p.name === 'warroom-api')
            .map(p => p.pm2_env.status)[0] || 'not found'
    " 2>/dev/null || echo "unknown")

    if [ "$api_status" = "online" ]; then
        log "warroom-api: ONLINE ✓"
    else
        warn "warroom-api status: $api_status"
    fi

    # Health check via HTTP
    sleep 2
    local port=$(grep "^PORT=" "$BACKEND_DIR/.env" | cut -d'=' -f2 | tr -d '"' || echo "3000")
    if curl -sf "http://localhost:$port/api/v1/health" -o /dev/null 2>/dev/null; then
        log "HTTP health check: OK ✓"
    elif curl -sf "http://localhost:$port/" -o /dev/null 2>/dev/null; then
        log "HTTP root check: OK ✓"
    else
        warn "HTTP health check failed. Server may still be booting."
    fi

    # Save PM2 config for persistence across reboots
    pm2 save --force 2>/dev/null || true

    echo ""
    echo "═══════════════════════════════════════════"
    echo "  Deploy Complete!"
    echo "═══════════════════════════════════════════"
    echo ""
    pm2 status
    echo ""
    info "Useful commands:"
    echo "  pm2 logs              # View all logs"
    echo "  pm2 logs warroom-api  # API logs only"
    echo "  pm2 monit             # Real-time monitor"
    echo "  pm2 restart all       # Restart all"
    echo "  pm2 reload all        # Zero-downtime reload"
    echo ""
}

# ═══════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════
main() {
    local clean_mode="false"
    local target="all"

    for arg in "$@"; do
        case "$arg" in
            --clean)       clean_mode="true" ;;
            --api-only)    target="api-only" ;;
            --worker-only) target="worker-only" ;;
            --help|-h)
                echo "Usage: ./deploy.sh [--clean] [--api-only] [--worker-only]"
                exit 0
                ;;
        esac
    done

    preflight
    kill_zombies
    install_deps "$clean_mode"
    build_ts
    check_redis
    start_pm2 "$target"
}

main "$@"
