#!/bin/bash
# Script to capture backend logs for debugging publish node

echo "🔍 Capturando logs do backend para debug..."
echo "=========================================="
echo ""

# Find the process running on port 3000
PID=$(lsof -ti:3000 | head -1)

if [ -z "$PID" ]; then
    echo "❌ Nenhum processo encontrado na porta 3000!"
    echo "O backend está rodando?"
    exit 1
fi

echo "✅ Backend encontrado (PID: $PID)"
echo ""
echo "📋 INSTRUÇÕES:"
echo "1. Este script vai mostrar os últimos 100 logs"
echo "2. Execute um flow no navegador"
echo "3. Volte aqui e veja os novos logs"
echo "4. COPIE TODOS os logs que aparecerem"
echo ""
echo "Pressione ENTER para continuar..."
read

# Try to find log file or attach to process
echo "=========================================="
echo "LOGS DO BACKEND:"
echo "=========================================="

# Check if there's a log file in common locations
if [ -f "backend/logs/server.log" ]; then
    tail -f backend/logs/server.log
elif [ -f "backend/server.log" ]; then
    tail -f backend/server.log
else
    echo "⚠️  Não encontrei arquivo de log"
    echo ""
    echo "Por favor:"
    echo "1. Vá ao terminal onde 'npm run dev' está rodando (PID: $PID)"
    echo "2. Role para trás para ver os logs"
    echo "3. Execute um flow"
    echo "4. Procure por linhas contendo:"
    echo "   - '========================================'"
    echo "   - '[FlowService] 🔄 Processing node:'"
    echo "   - '[FlowService][processNode] CALLED'"
    echo "   - '===== PUBLISH NODE START ====='"
    echo ""
    echo "5. COPIE TODOS esses logs e me envie!"
fi
