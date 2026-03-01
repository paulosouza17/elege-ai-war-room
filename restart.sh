#!/bin/bash
# ══════════════════════════════════════════════════════
# Elege.AI War Room — Restart Completo
# ══════════════════════════════════════════════════════

BASE="$(cd "$(dirname "$0")" && pwd)"

echo "🔴 Matando processos antigos..."

# Matar backend (porta 3000)
lsof -ti:3000 | xargs kill -9 2>/dev/null
# Matar frontend (porta 5173)
lsof -ti:5173 | xargs kill -9 2>/dev/null
# Matar qualquer processo node residual do projeto
pkill -f "tsx.*server" 2>/dev/null
pkill -f "vite" 2>/dev/null

sleep 1
echo "✅ Processos antigos encerrados"

# ──────────────────────────────────────────────────────
echo ""
echo "🧹 Limpando caches..."

# Backend
rm -rf "$BASE/backend/node_modules/.cache" 2>/dev/null
rm -rf "$BASE/backend/dist" 2>/dev/null

# Frontend
rm -rf "$BASE/web/node_modules/.cache" 2>/dev/null
rm -rf "$BASE/web/node_modules/.vite" 2>/dev/null
rm -rf "$BASE/web/dist" 2>/dev/null

echo "✅ Caches limpos"

# ──────────────────────────────────────────────────────
echo ""
echo "🔧 Instalando dependências (se necessário)..."

cd "$BASE/backend" && npm install --silent
cd "$BASE/web" && npm install --silent

# ──────────────────────────────────────────────────────
echo ""
echo "🚀 Iniciando Backend (porta 3000)..."
cd "$BASE/backend" && npx tsx src/server.ts &
BACKEND_PID=$!
echo "   PID: $BACKEND_PID"

sleep 3

echo ""
echo "🌐 Iniciando Frontend (porta 5173)..."
cd "$BASE/web" && npm run dev &
FRONTEND_PID=$!
echo "   PID: $FRONTEND_PID"

# ──────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════"
echo "✅ Sistema rodando!"
echo "   Backend:  http://localhost:3000"
echo "   Frontend: http://localhost:5173"
echo ""
echo "   Para parar: kill $BACKEND_PID $FRONTEND_PID"
echo "══════════════════════════════════════════════════"

wait
