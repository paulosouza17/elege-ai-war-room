#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  Elege.ai WAR ROOM — VPS Setup Script (Ubuntu 22.04 / 24.04 LTS)
#
#  Usage:
#    chmod +x setup-vps.sh
#    sudo ./setup-vps.sh --domain warroom.example.com
#    sudo ./setup-vps.sh --domain warroom.example.com --skip-ssl
#    sudo ./setup-vps.sh --domain warroom.example.com --no-frontend
#    sudo ./setup-vps.sh --help
#
#  This script will:
#    1. Update system packages
#    2. Create swap file (2GB)
#    3. Install Node.js 20 LTS
#    4. Install Redis Server
#    5. Install Nginx
#    6. Install PM2 globally
#    7. Configure UFW firewall
#    8. Create deploy user
#    9. Setup project directory (/opt/warroom)
#   10. Install dependencies & build
#   11. Configure Nginx reverse proxy
#   12. Setup SSL with Certbot (optional)
#   13. Start services with PM2
#   14. Configure PM2 startup (survive reboots)
# ═══════════════════════════════════════════════════════════════════════════

set -euo pipefail
IFS=$'\n\t'

# ══════════════════════════════════
#  CONFIG
# ══════════════════════════════════
DOMAIN=""
SKIP_SSL=false
NO_FRONTEND=false
DEPLOY_USER="deploy"
INSTALL_DIR="/opt/warroom"
SWAP_SIZE="2G"
NODE_VERSION="20"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${GREEN}[✔]${NC} $1"; }
warn()    { echo -e "${YELLOW}[⚠]${NC} $1"; }
error()   { echo -e "${RED}[✘]${NC} $1"; }
info()    { echo -e "${BLUE}[→]${NC} $1"; }
section() { echo -e "\n${CYAN}${BOLD}═══ $1 ═══${NC}\n"; }

# ══════════════════════════════════
#  PARSE ARGS
# ══════════════════════════════════
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --domain)
                DOMAIN="$2"
                shift 2
                ;;
            --skip-ssl)
                SKIP_SSL=true
                shift
                ;;
            --no-frontend)
                NO_FRONTEND=true
                shift
                ;;
            --help|-h)
                echo ""
                echo "Elege.ai WAR ROOM — VPS Setup"
                echo ""
                echo "Usage: sudo ./setup-vps.sh --domain YOUR_DOMAIN [options]"
                echo ""
                echo "Options:"
                echo "  --domain DOMAIN    Domain name (required for Nginx/SSL)"
                echo "  --skip-ssl         Skip Certbot SSL setup"
                echo "  --no-frontend      Skip frontend build (backend only)"
                echo "  --help             Show this help"
                echo ""
                exit 0
                ;;
            *)
                error "Unknown argument: $1"
                exit 1
                ;;
        esac
    done

    if [[ -z "$DOMAIN" ]]; then
        warn "No --domain provided. Nginx will use server IP."
        DOMAIN="_"
    fi
}

# ══════════════════════════════════
#  PREFLIGHT
# ══════════════════════════════════
preflight() {
    section "PREFLIGHT CHECKS"

    # Must be root
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi

    # Must be Ubuntu
    if ! grep -qi "ubuntu" /etc/os-release 2>/dev/null; then
        warn "This script is designed for Ubuntu 22.04/24.04 LTS."
        warn "Other distros may work but are not guaranteed."
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    local ubuntu_version
    ubuntu_version=$(grep VERSION_ID /etc/os-release | cut -d'"' -f2 2>/dev/null || echo "unknown")
    log "OS: Ubuntu $ubuntu_version"
    log "Install dir: $INSTALL_DIR"
    log "Domain: $DOMAIN"
    log "SSL: $([ "$SKIP_SSL" = true ] && echo 'skipped' || echo 'enabled')"
    log "Frontend: $([ "$NO_FRONTEND" = true ] && echo 'skipped' || echo 'enabled')"
}

# ══════════════════════════════════
#  1. SYSTEM UPDATE
# ══════════════════════════════════
system_update() {
    section "1/14 — SYSTEM UPDATE"

    export DEBIAN_FRONTEND=noninteractive

    apt-get update -qq
    apt-get upgrade -y -qq
    apt-get install -y -qq \
        curl \
        wget \
        git \
        build-essential \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        unzip \
        htop \
        jq \
        lsof \
        tree

    log "System packages updated and essentials installed"
}

# ══════════════════════════════════
#  2. SWAP FILE
# ══════════════════════════════════
setup_swap() {
    section "2/14 — SWAP FILE"

    if swapon --show | grep -q "partition\|file"; then
        log "Swap already exists ($(free -h | awk '/Swap/{print $2}')). Skipping."
        return 0
    fi

    info "Creating ${SWAP_SIZE} swap file..."
    fallocate -l "$SWAP_SIZE" /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile

    # Persist across reboots
    if ! grep -q "swapfile" /etc/fstab; then
        echo "/swapfile none swap sw 0 0" >> /etc/fstab
    fi

    # Optimize swappiness for server
    sysctl vm.swappiness=10
    if ! grep -q "vm.swappiness" /etc/sysctl.conf; then
        echo "vm.swappiness=10" >> /etc/sysctl.conf
    fi

    log "Swap created: $(swapon --show | awk 'NR==2{print $3}')"
}

# ══════════════════════════════════
#  3. NODE.JS 20 LTS
# ══════════════════════════════════
install_node() {
    section "3/14 — NODE.JS ${NODE_VERSION} LTS"

    if command -v node &>/dev/null; then
        local current_version
        current_version=$(node -v | sed 's/v//' | cut -d. -f1)
        if [[ "$current_version" -ge "$NODE_VERSION" ]]; then
            log "Node.js $(node -v) already installed. Skipping."
            return 0
        fi
        warn "Node.js v$(node -v) found, upgrading to v${NODE_VERSION}..."
    fi

    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y -qq nodejs

    # Verify
    log "Node.js $(node -v) installed"
    log "npm $(npm -v) installed"
}

# ══════════════════════════════════
#  4. REDIS SERVER
# ══════════════════════════════════
install_redis() {
    section "4/14 — REDIS SERVER"

    if command -v redis-server &>/dev/null; then
        log "Redis already installed ($(redis-server --version | awk '{print $3}')). Skipping install."
    else
        apt-get install -y -qq redis-server
    fi

    # Configure Redis
    local redis_conf="/etc/redis/redis.conf"
    if [[ -f "$redis_conf" ]]; then
        # Bind to localhost only
        sed -i 's/^bind .*/bind 127.0.0.1 ::1/' "$redis_conf"
        # Enable supervised systemd
        sed -i 's/^supervised .*/supervised systemd/' "$redis_conf"
        # Set max memory
        if ! grep -q "^maxmemory " "$redis_conf"; then
            echo "maxmemory 512mb" >> "$redis_conf"
            echo "maxmemory-policy allkeys-lru" >> "$redis_conf"
        fi
    fi

    systemctl enable redis-server
    systemctl restart redis-server

    # Verify
    if redis-cli ping | grep -q "PONG"; then
        log "Redis: PONG ✓"
    else
        error "Redis not responding!"
        exit 1
    fi
}

# ══════════════════════════════════
#  5. NGINX
# ══════════════════════════════════
install_nginx() {
    section "5/14 — NGINX"

    if command -v nginx &>/dev/null; then
        log "Nginx already installed ($(nginx -v 2>&1 | awk -F/ '{print $2}')). Skipping install."
    else
        apt-get install -y -qq nginx
    fi

    systemctl enable nginx

    # Remove default site
    rm -f /etc/nginx/sites-enabled/default

    log "Nginx installed and enabled"
}

# ══════════════════════════════════
#  6. PM2
# ══════════════════════════════════
install_pm2() {
    section "6/14 — PM2 PROCESS MANAGER"

    if command -v pm2 &>/dev/null; then
        log "PM2 already installed ($(pm2 -v)). Skipping."
    else
        npm install -g pm2
        log "PM2 $(pm2 -v) installed"
    fi
}

# ══════════════════════════════════
#  7. UFW FIREWALL
# ══════════════════════════════════
setup_firewall() {
    section "7/14 — UFW FIREWALL"

    if ! command -v ufw &>/dev/null; then
        apt-get install -y -qq ufw
    fi

    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH (critical — don't lock yourself out!)
    ufw allow 22/tcp comment "SSH"

    # Allow HTTP + HTTPS
    ufw allow 80/tcp comment "HTTP"
    ufw allow 443/tcp comment "HTTPS"

    # Enable (non-interactive)
    echo "y" | ufw enable

    log "Firewall rules:"
    ufw status numbered

    warn "Port 3000 is NOT exposed externally (Nginx proxies it)"
}

# ══════════════════════════════════
#  8. DEPLOY USER
# ══════════════════════════════════
create_deploy_user() {
    section "8/14 — DEPLOY USER"

    if id "$DEPLOY_USER" &>/dev/null; then
        log "User '$DEPLOY_USER' already exists. Skipping."
    else
        adduser --system --group --home /home/$DEPLOY_USER --shell /bin/bash "$DEPLOY_USER"
        log "User '$DEPLOY_USER' created"
    fi

    # Add to sudo group (for pm2 startup)
    usermod -aG sudo "$DEPLOY_USER" 2>/dev/null || true

    # Allow pm2 without password
    if [[ ! -f /etc/sudoers.d/deploy-pm2 ]]; then
        echo "$DEPLOY_USER ALL=(ALL) NOPASSWD: /usr/bin/env, /usr/local/bin/pm2" > /etc/sudoers.d/deploy-pm2
        chmod 440 /etc/sudoers.d/deploy-pm2
    fi

    log "Deploy user configured"
}

# ══════════════════════════════════
#  9. PROJECT DIRECTORY
# ══════════════════════════════════
setup_project_dir() {
    section "9/14 — PROJECT DIRECTORY"

    mkdir -p "$INSTALL_DIR"

    # Copy project files (we're running from the repo)
    if [[ -d "$REPO_DIR/backend" ]]; then
        info "Copying project files to $INSTALL_DIR..."

        # Use rsync if available, fall back to cp
        if command -v rsync &>/dev/null; then
            rsync -a --exclude='node_modules' --exclude='.git' --exclude='dist' \
                  --exclude='.env' --exclude='antigravity-kit-main' \
                  "$REPO_DIR/" "$INSTALL_DIR/"
        else
            cp -r "$REPO_DIR/backend" "$INSTALL_DIR/"
            cp -r "$REPO_DIR/web" "$INSTALL_DIR/"
            cp -r "$REPO_DIR/migrations" "$INSTALL_DIR/" 2>/dev/null || true
            cp "$REPO_DIR/package.json" "$INSTALL_DIR/" 2>/dev/null || true
            cp "$REPO_DIR/package-lock.json" "$INSTALL_DIR/" 2>/dev/null || true
        fi

        # Ensure nginx config is at the expected flat location
        if [[ -f "$SCRIPT_DIR/nginx/warroom.conf" ]]; then
            mkdir -p "$INSTALL_DIR/nginx"
            cp "$SCRIPT_DIR/nginx/warroom.conf" "$INSTALL_DIR/nginx/warroom.conf"
        fi

        log "Project files copied to $INSTALL_DIR"
    else
        warn "No backend/ directory found in $REPO_DIR."
        warn "You need to manually clone/copy the project to $INSTALL_DIR"
    fi

    # Create log directories
    mkdir -p "$INSTALL_DIR/backend/logs"

    # Set ownership
    chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$INSTALL_DIR"

    log "Project directory ready: $INSTALL_DIR"
}

# ══════════════════════════════════
#  10. ENV FILES
# ══════════════════════════════════
setup_env_files() {
    section "10/14 — ENVIRONMENT FILES"

    # Backend .env
    if [[ ! -f "$INSTALL_DIR/backend/.env" ]]; then
        if [[ -f "$INSTALL_DIR/backend/.env.example" ]]; then
            cp "$INSTALL_DIR/backend/.env.example" "$INSTALL_DIR/backend/.env"
            warn "Created backend/.env from template. ⚠️  EDIT IT NOW:"
            warn "  nano $INSTALL_DIR/backend/.env"
        else
            error "No .env.example found! Create backend/.env manually."
        fi
    else
        log "backend/.env already exists"
    fi

    # Frontend .env
    if [[ "$NO_FRONTEND" = false ]]; then
        if [[ ! -f "$INSTALL_DIR/web/.env" ]]; then
            if [[ -f "$INSTALL_DIR/web/.env.example" ]]; then
                cp "$INSTALL_DIR/web/.env.example" "$INSTALL_DIR/web/.env"

                # If we have a domain, auto-fill backend URL
                if [[ "$DOMAIN" != "_" ]]; then
                    sed -i "s|VITE_BACKEND_URL=.*|VITE_BACKEND_URL=https://$DOMAIN|" "$INSTALL_DIR/web/.env"
                    sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN|" "$INSTALL_DIR/web/.env"
                fi

                warn "Created web/.env from template. ⚠️  EDIT IT:"
                warn "  nano $INSTALL_DIR/web/.env"
            fi
        else
            log "web/.env already exists"
        fi
    fi

    # Generate INGESTION_API_KEY if still default
    local backend_env="$INSTALL_DIR/backend/.env"
    if grep -q "change-me-to-a-random-string" "$backend_env" 2>/dev/null; then
        local new_key
        new_key=$(openssl rand -hex 32)
        sed -i "s/change-me-to-a-random-string/$new_key/" "$backend_env"
        log "Auto-generated INGESTION_API_KEY"
    fi

    log "Environment files ready"
}

# ══════════════════════════════════
#  11. INSTALL DEPENDENCIES & BUILD
# ══════════════════════════════════
install_and_build() {
    section "11/14 — INSTALL DEPENDENCIES & BUILD"

    # Backend
    info "Installing backend dependencies..."
    cd "$INSTALL_DIR/backend"

    # Install ALL deps (need devDeps for tsc build)
    sudo -u "$DEPLOY_USER" npm ci 2>/dev/null || sudo -u "$DEPLOY_USER" npm install
    log "Backend dependencies installed"

    info "Building TypeScript..."
    sudo -u "$DEPLOY_USER" npx tsc --skipLibCheck 2>/dev/null || \
    sudo -u "$DEPLOY_USER" npx tsc --skipLibCheck --noEmitOnError false 2>/dev/null || {
        error "TypeScript build failed!"
        exit 1
    }

    # Remove devDeps after build
    sudo -u "$DEPLOY_USER" npm prune --omit=dev 2>/dev/null || true
    log "Backend built successfully"

    # Verify dist
    if [[ ! -f "$INSTALL_DIR/backend/dist/server.js" ]]; then
        error "dist/server.js not found after build!"
        exit 1
    fi
    log "dist/server.js verified ✓"

    # Frontend
    if [[ "$NO_FRONTEND" = false ]]; then
        info "Installing frontend dependencies..."
        cd "$INSTALL_DIR/web"
        # Remove lockfile to avoid cross-platform optional dep issues (macOS vs Linux)
        rm -f "$INSTALL_DIR/web/package-lock.json"
        sudo -u "$DEPLOY_USER" npm install
        log "Frontend dependencies installed"

        info "Building frontend (Vite)..."
        sudo -u "$DEPLOY_USER" npm run build
        log "Frontend built successfully"

        if [[ ! -d "$INSTALL_DIR/web/dist" ]]; then
            error "web/dist not found after build!"
            exit 1
        fi
        log "web/dist verified ✓ ($(du -sh "$INSTALL_DIR/web/dist" | awk '{print $1}'))"
    fi
}

# ══════════════════════════════════
#  12. NGINX CONFIGURATION
# ══════════════════════════════════
configure_nginx() {
    section "12/14 — NGINX CONFIGURATION"

    local nginx_conf="/etc/nginx/sites-available/warroom"

    # Check both flat (/opt/warroom/nginx/) and nested (/opt/warroom/install/nginx/) locations
    local nginx_template=""
    if [[ -f "$INSTALL_DIR/nginx/warroom.conf" ]]; then
        nginx_template="$INSTALL_DIR/nginx/warroom.conf"
    elif [[ -f "$INSTALL_DIR/install/nginx/warroom.conf" ]]; then
        nginx_template="$INSTALL_DIR/install/nginx/warroom.conf"
    fi

    if [[ -n "$nginx_template" ]]; then
        # Copy template and replace domain placeholder
        cp "$nginx_template" "$nginx_conf"

        if [[ "$DOMAIN" != "_" ]]; then
            sed -i "s/YOUR_DOMAIN\.com/$DOMAIN/g" "$nginx_conf"
            log "Domain set to: $DOMAIN"
        else
            # Simple config without domain (IP-based access)
            cat > "$nginx_conf" << 'NGINX_SIMPLE'
upstream warroom_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    root /opt/warroom/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    location /api/ {
        proxy_pass http://warroom_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    location = /api/v1/health {
        proxy_pass http://warroom_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }

    client_max_body_size 50M;
}
NGINX_SIMPLE
            log "Using IP-based Nginx config (no domain)"
        fi
    else
        warn "nginx/warroom.conf not found. Using inline simple config."
    fi

    # Enable site
    ln -sf "$nginx_conf" /etc/nginx/sites-enabled/warroom

    # Test config
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        log "Nginx configured and reloaded ✓"
    else
        error "Nginx config test failed!"
        nginx -t
        exit 1
    fi
}

# ══════════════════════════════════
#  13. SSL (CERTBOT)
# ══════════════════════════════════
setup_ssl() {
    section "13/14 — SSL CERTIFICATE"

    if [[ "$SKIP_SSL" = true ]]; then
        warn "SSL setup skipped (--skip-ssl)"
        return 0
    fi

    if [[ "$DOMAIN" = "_" ]]; then
        warn "No domain provided. SSL requires a domain."
        warn "Run later: sudo certbot --nginx -d YOUR_DOMAIN.com"
        return 0
    fi

    # Install Certbot
    if ! command -v certbot &>/dev/null; then
        apt-get install -y -qq certbot python3-certbot-nginx
    fi

    info "Requesting SSL certificate for $DOMAIN..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
            --email "admin@$DOMAIN" --redirect 2>/dev/null || {
        warn "Certbot failed. This usually means:"
        warn "  1. DNS for $DOMAIN doesn't point to this server yet"
        warn "  2. Port 80 is blocked"
        warn ""
        warn "Run manually after DNS is configured:"
        warn "  sudo certbot --nginx -d $DOMAIN"
        return 0
    }

    # Auto-renewal timer
    systemctl enable certbot.timer 2>/dev/null || true

    log "SSL certificate installed ✓"
    log "Auto-renewal enabled"
}

# ══════════════════════════════════
#  14. START SERVICES
# ══════════════════════════════════
start_services() {
    section "14/14 — START SERVICES"

    cd "$INSTALL_DIR/backend"

    # Start with PM2 as deploy user
    info "Starting API and Worker with PM2..."
    sudo -u "$DEPLOY_USER" pm2 start ecosystem.config.js --env production

    # Wait for startup
    sleep 5

    # Health check
    local port
    port=$(grep "^PORT=" "$INSTALL_DIR/backend/.env" | cut -d'=' -f2 | tr -d '"' || echo "3000")

    if curl -sf "http://localhost:$port/api/v1/health" -o /dev/null 2>/dev/null; then
        log "API health check: OK ✓"
    elif curl -sf "http://localhost:$port/" -o /dev/null 2>/dev/null; then
        log "API root check: OK ✓"
    else
        warn "API not responding yet. It may still be booting."
    fi

    # PM2 startup (survive reboots)
    info "Configuring PM2 startup..."
    local startup_cmd
    startup_cmd=$(sudo -u "$DEPLOY_USER" pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/$DEPLOY_USER" 2>/dev/null | grep "sudo" | head -1)
    if [[ -n "$startup_cmd" ]]; then
        eval "$startup_cmd" 2>/dev/null || true
    fi
    sudo -u "$DEPLOY_USER" pm2 save --force

    log "PM2 startup configured (survives reboots)"
}

# ══════════════════════════════════
#  SUMMARY
# ══════════════════════════════════
print_summary() {
    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                         ║"
    echo "║   🚀  Elege.ai WAR ROOM — INSTALAÇÃO COMPLETA          ║"
    echo "║                                                         ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    echo -e "${GREEN}Serviços ativos:${NC}"
    echo "  • Node.js $(node -v)"
    echo "  • Redis   $(redis-server --version 2>/dev/null | awk '{print $3}' || echo 'installed')"
    echo "  • Nginx   $(nginx -v 2>&1 | awk -F/ '{print $2}' || echo 'installed')"
    echo "  • PM2     $(pm2 -v 2>/dev/null || echo 'installed')"
    echo ""

    if [[ "$DOMAIN" != "_" ]]; then
        local url="https://$DOMAIN"
        [[ "$SKIP_SSL" = true ]] && url="http://$DOMAIN"
        echo -e "${GREEN}URL:${NC}       $url"
    else
        echo -e "${GREEN}URL:${NC}       http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
    fi

    echo -e "${GREEN}API:${NC}       http://localhost:3000/api/v1/health"
    echo -e "${GREEN}Diretório:${NC} $INSTALL_DIR"
    echo ""

    echo -e "${YELLOW}⚠️  AÇÕES PENDENTES:${NC}"
    echo ""
    echo "  1. Editar variáveis de ambiente:"
    echo "     nano $INSTALL_DIR/backend/.env"
    if [[ "$NO_FRONTEND" = false ]]; then
        echo "     nano $INSTALL_DIR/web/.env"
    fi
    echo ""
    echo "  2. Após editar .env, rebuild e restart:"
    echo "     cd $INSTALL_DIR/backend && bash deploy.sh"
    echo ""

    if [[ "$SKIP_SSL" = true ]] && [[ "$DOMAIN" != "_" ]]; then
        echo "  3. Configurar SSL:"
        echo "     sudo certbot --nginx -d $DOMAIN"
        echo ""
    fi

    echo -e "${BLUE}Comandos úteis:${NC}"
    echo "  pm2 status               # Ver processos"
    echo "  pm2 logs                 # Ver logs"
    echo "  pm2 monit                # Monitor em tempo real"
    echo "  pm2 restart all          # Reiniciar tudo"
    echo "  cd $INSTALL_DIR/backend && bash deploy.sh  # Deploy completo"
    echo ""
    echo "  systemctl status redis   # Status do Redis"
    echo "  systemctl status nginx   # Status do Nginx"
    echo "  nginx -t                 # Testar config Nginx"
    echo ""
}

# ══════════════════════════════════
#  MAIN
# ══════════════════════════════════
main() {
    parse_args "$@"

    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "═══════════════════════════════════════════════════════════"
    echo "  Elege.ai WAR ROOM — VPS Setup"
    echo "  $(date '+%Y-%m-%d %H:%M:%S')"
    echo "═══════════════════════════════════════════════════════════"
    echo -e "${NC}"

    preflight
    system_update
    setup_swap
    install_node
    install_redis
    install_nginx
    install_pm2
    setup_firewall
    create_deploy_user
    setup_project_dir
    setup_env_files
    install_and_build
    configure_nginx
    setup_ssl
    start_services
    print_summary

    log "Setup complete! 🎉"
}

main "$@"
