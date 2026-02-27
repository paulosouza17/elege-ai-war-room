# 🚀 Elege.ai WAR ROOM — Guia de Deploy

## Requisitos Mínimos da VPS

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| vCPU | 2 | 4 |
| RAM | 2 GB | 4 GB |
| Disco | 20 GB SSD | 40 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Rede | Porta 22, 80, 443 | IPv4 fixo |

---

## Opção 1: Instalação Automática (Recomendado)

### 1. Acesse a VPS e envie o projeto

```bash
# Na sua máquina local, envie o projeto:
scp -r ./sistema root@SEU_IP:/tmp/warroom-src

# Ou clone do Git (se tiver repositório):
ssh root@SEU_IP
git clone git@github.com:seu-org/war-room.git /tmp/warroom-src
```

### 2. Execute o instalador

```bash
ssh root@SEU_IP

cd /tmp/warroom-src
chmod +x setup-vps.sh

# Com domínio + SSL
sudo ./setup-vps.sh --domain warroom.seudominio.com

# Sem SSL (para testar antes de configurar DNS)
sudo ./setup-vps.sh --domain warroom.seudominio.com --skip-ssl

# Apenas backend (sem frontend)
sudo ./setup-vps.sh --domain warroom.seudominio.com --no-frontend
```

### 3. Configure as variáveis de ambiente

```bash
# Backend — OBRIGATÓRIO
nano /opt/warroom/backend/.env

# Frontend
nano /opt/warroom/web/.env
```

**Variáveis obrigatórias do backend:**

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_KEY` | Service Role Key (permite bypass de RLS) |
| `REDIS_URL` | URL do Redis (default: `redis://localhost:6379`) |
| `INGESTION_API_KEY` | Chave para API de ingestão (auto-gerada pelo script) |

**Variáveis obrigatórias do frontend:**

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase (mesma do backend) |
| `VITE_SUPABASE_ANON_KEY` | Anon Key (chave pública, **não** a service key) |
| `VITE_BACKEND_URL` | URL do backend (`https://seudominio.com`) |
| `VITE_API_URL` | Mesma URL do backend |

### 4. Rebuild após editar .env

```bash
cd /opt/warroom/backend
bash deploy.sh

# Se editou o .env do frontend, rebuild:
cd /opt/warroom/web
npm run build
sudo systemctl reload nginx
```

---

## Opção 2: Docker Compose

### 1. Instale o Docker

```bash
curl -fsSL https://get.docker.com | bash
```

### 2. Configure os .env

```bash
cp backend/.env.example backend/.env
cp web/.env.example web/.env
nano backend/.env
nano web/.env
```

### 3. Suba tudo

```bash
docker compose up -d --build
```

### Comandos úteis

```bash
docker compose logs -f          # Logs em tempo real
docker compose logs backend     # Logs só do backend
docker compose restart backend  # Reiniciar backend
docker compose down             # Parar tudo
docker compose up -d --build    # Rebuild + reiniciar
```

---

## SSL com Certbot

### Pré-requisitos
1. Domínio apontando para o IP da VPS (registro A no DNS)
2. Portas 80 e 443 abertas

### Gerar certificado

```bash
sudo certbot --nginx -d seudominio.com
```

### Renovação automática

```bash
# Testar renovação
sudo certbot renew --dry-run

# O timer do systemd renova automaticamente
sudo systemctl status certbot.timer
```

---

## Atualização do Sistema

### Via script (recomendado)

```bash
cd /opt/warroom

# Pull novas alterações (se usa Git)
git pull origin main

# Deploy do backend
cd backend && bash deploy.sh

# Rebuild do frontend (se houve mudanças)
cd ../web && npm run build
sudo systemctl reload nginx
```

### Manual

```bash
cd /opt/warroom/backend

# Instalar deps
npm ci

# Build
npx tsc --skipLibCheck

# Restart
pm2 restart all
```

---

## Monitoramento

```bash
# Status dos processos
pm2 status

# Logs (todos)
pm2 logs

# Logs específicos  
pm2 logs warroom-api
pm2 logs warroom-worker

# Monitor em tempo real (CPU, MEM)
pm2 monit

# Status dos serviços
sudo systemctl status redis nginx
```

---

## Troubleshooting

### API não responde

```bash
# 1. Check se o processo está rodando
pm2 status

# 2. Check logs de erro
pm2 logs warroom-api --err --lines 50

# 3. Check se a porta está ocupada
lsof -i :3000

# 4. Restart forçado
pm2 delete all
cd /opt/warroom/backend && bash deploy.sh
```

### Redis não conecta

```bash
# Check status
sudo systemctl status redis-server

# Testar
redis-cli ping

# Reiniciar
sudo systemctl restart redis-server
```

### Nginx retorna 502

```bash
# Backend não está rodando? Check PM2:
pm2 status

# Config com erro? Testar:
sudo nginx -t

# Verificar logs:
sudo tail -20 /var/log/nginx/warroom_error.log
```

### Frontend não atualiza

```bash
cd /opt/warroom/web

# Rebuild
npm run build

# Limpar cache do Nginx
sudo systemctl reload nginx

# Hard refresh no browser: Ctrl+Shift+R
```

---

## Backup

### Dados (Supabase gerencia o banco, mas crie backups dos .env)

```bash
# Backup das configurações
cp /opt/warroom/backend/.env /opt/warroom/backend/.env.backup.$(date +%F)
cp /opt/warroom/web/.env /opt/warroom/web/.env.backup.$(date +%F)
```

### PM2 processes

```bash
pm2 save
```

---

## Estrutura em Produção

```
/opt/warroom/
├── backend/
│   ├── dist/              # JS compilado (gerado pelo build)
│   ├── node_modules/      # Dependências de produção
│   ├── ecosystem.config.js
│   ├── deploy.sh
│   ├── .env               # ⚠️ NÃO COMITAR
│   └── logs/
│       ├── api-out.log
│       ├── api-error.log
│       ├── worker-out.log
│       └── worker-error.log
├── web/
│   ├── dist/              # Frontend estático (servido pelo Nginx)
│   └── .env               # ⚠️ NÃO COMITAR
├── nginx/
│   └── warroom.conf       # Template da config Nginx
├── migrations/            # SQL migrations
├── setup-vps.sh           # Instalador (já executado)
├── docker-compose.yml     # Alternativa Docker
└── DEPLOY.md              # Este arquivo
```
