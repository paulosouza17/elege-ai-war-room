#!/bin/bash
# ══════════════════════════════════════════════════════
# Elege.AI War Room — Restart Completo (PM2 + Vite Build)
# ══════════════════════════════════════════════════════

BASE="$(cd "$(dirname "$0")" && pwd)"

echo "🔴 Parando processos antigos..."

# Para PM2 se estiver rodando
pm2 delete warroom-backend 2>/dev/null

# Matar frontend dev server (porta 5173) se estiver rodando
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Matar processos residuais na porta 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null

sleep 1
echo "✅ Processos antigos encerrados"

# ──────────────────────────────────────────────────────
echo ""
echo "🧹 Limpando caches..."

rm -rf "$BASE/backend/node_modules/.cache" 2>/dev/null
rm -rf "$BASE/backend/dist" 2>/dev/null
rm -rf "$BASE/web/node_modules/.cache" 2>/dev/null
rm -rf "$BASE/web/node_modules/.vite" 2>/dev/null

echo "✅ Caches limpos"

# ──────────────────────────────────────────────────────
echo ""
echo "🔧 Instalando dependências..."

cd "$BASE/backend" && npm install --silent
cd "$BASE/web" && npm install --silent

# ──────────────────────────────────────────────────────
echo ""
echo "🏗️  Build de produção do frontend..."

cd "$BASE/web" && npm run build

if [ ! -d "$BASE/web/dist" ]; then
    echo "❌ Build falhou! Diretório dist não encontrado."
    exit 1
fi
echo "✅ Frontend build concluído ($(du -sh "$BASE/web/dist" | cut -f1))"

# ──────────────────────────────────────────────────────
echo ""
echo "🚀 Iniciando Backend via PM2..."

cd "$BASE"
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "🔄 Recarregando Nginx..."
nginx -t 2>/dev/null && systemctl reload nginx 2>/dev/null && echo "✅ Nginx recarregado" || echo "⚠️  Nginx não recarregado (verifique manualmente)"

# ──────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════"
echo "✅ Sistema rodando!"
echo "   Backend:  PM2 (warroom-backend) → http://localhost:3000"
echo "   Frontend: Nginx servindo /opt/warroom/web/dist"
echo ""
echo "   Comandos úteis:"
echo "     pm2 logs warroom-backend    — Ver logs"
echo "     pm2 restart warroom-backend — Reiniciar backend"
echo "     pm2 status                  — Status dos processos"
echo "══════════════════════════════════════════════════"
