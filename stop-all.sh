#!/bin/bash
# =============================================
# Elege.ai War Room — Parar Todos os Serviços
# =============================================

echo "🛑 Parando todos os serviços do War Room..."
echo ""

# Parar processos do frontend (Vite/Next dev server)
echo "📦 Parando Frontend (web)..."
pkill -f "npm run dev.*web" 2>/dev/null
pkill -f "vite.*web" 2>/dev/null
pkill -f "next.*dev" 2>/dev/null

# Parar processos do backend (ts-node-dev)
echo "📦 Parando Backend API..."
pkill -f "ts-node-dev.*server.ts" 2>/dev/null
pkill -f "npm run dev.*backend" 2>/dev/null

# Parar o Flow Worker
echo "📦 Parando Flow Worker..."
pkill -f "ts-node.*flowWorker" 2>/dev/null
pkill -f "npm run start:worker" 2>/dev/null

# Parar qualquer processo Node restante do projeto
echo "📦 Parando processos restantes do projeto..."
pkill -f "node.*war-room" 2>/dev/null
pkill -f "node.*sistema/backend" 2>/dev/null
pkill -f "node.*sistema/web" 2>/dev/null

# Parar PM2 se estiver rodando
if command -v pm2 &>/dev/null; then
    echo "📦 Parando PM2..."
    pm2 stop all 2>/dev/null
fi

echo ""
echo "✅ Todos os serviços foram parados!"
echo ""

# Verificar se ainda há processos rodando nas portas comuns
for PORT in 3000 3001 3333 5173 5174 8080; do
    PID=$(lsof -ti :$PORT 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "⚠️  Porta $PORT ainda em uso (PID: $PID). Para forçar: kill -9 $PID"
    fi
done
