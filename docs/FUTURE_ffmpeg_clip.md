# FFmpeg Video Clipping — Implementação Futura

## Objetivo
Permitir cortar trechos de vídeo no backend antes do download, sem armazenar a mídia cortada.

## Requisitos
- `ffmpeg` instalado no servidor (`sudo apt install -y ffmpeg`)
- O frontend já envia `?start=75&end=120` (segundos) na URL de download

## Como ativar

### 1. `server.ts` — substituir o endpoint `/api/elege/assets/:postId/:assetId`

```typescript
app.get('/api/elege/assets/:postId/:assetId', async (req, res) => {
    const { postId, assetId } = req.params;
    const startSec = req.query.start ? Number(req.query.start) : null;
    const endSec = req.query.end ? Number(req.query.end) : null;
    const wantClip = (startSec !== null && !isNaN(startSec)) || (endSec !== null && !isNaN(endSec));

    try {
        const { data: ds } = await createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        ).from('data_sources').select('credentials').eq('type', 'elegeai').limit(1).single();

        const token = ds?.credentials?.api_token || process.env.ELEGEAI_API_TOKEN || '';
        const baseUrl = ds?.credentials?.base_url || 'http://10.144.103.1:3001';
        const downloadUrl = `${baseUrl}/api/posts/${postId}/assets/${assetId}/download`;
        const upstream = await fetch(downloadUrl, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!upstream.ok) {
            return res.status(upstream.status).json({ error: 'Asset not found' });
        }

        // Sem corte = passthrough direto
        if (!wantClip) {
            const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
            const contentLength = upstream.headers.get('content-length');
            res.setHeader('Content-Type', contentType);
            if (contentLength) res.setHeader('Content-Length', contentLength);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            const reader = upstream.body?.getReader();
            if (!reader) return res.status(500).json({ error: 'No body' });
            while (true) {
                const { done, value } = await reader.read();
                if (done) { res.end(); return; }
                res.write(value);
            }
        }

        // === FFmpeg: download → temp → clip → stream → delete ===
        const os = await import('os');
        const fs = await import('fs');
        const path = await import('path');
        const { spawn } = await import('child_process');
        const crypto = await import('crypto');

        const tmpFile = path.join(os.tmpdir(), `elege_clip_${crypto.randomUUID()}.mp4`);

        try {
            // Baixar vídeo completo para temp
            const fileStream = fs.createWriteStream(tmpFile);
            const reader = upstream.body?.getReader();
            if (!reader) return res.status(500).json({ error: 'No body' });

            await new Promise<void>((resolve, reject) => {
                const write = async () => {
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) { fileStream.end(); resolve(); return; }
                            if (!fileStream.write(value)) {
                                await new Promise<void>(r => fileStream.once('drain', r));
                            }
                        }
                    } catch (e) { reject(e); }
                };
                fileStream.on('error', reject);
                write();
            });

            // FFmpeg args
            const ffArgs: string[] = [];
            if (startSec !== null && !isNaN(startSec)) ffArgs.push('-ss', String(startSec));
            ffArgs.push('-i', tmpFile);
            if (endSec !== null && !isNaN(endSec)) ffArgs.push('-to', String(endSec - (startSec || 0)));
            ffArgs.push('-c:v', 'libx264', '-c:a', 'aac',
                '-movflags', 'frag_keyframe+empty_moov+faststart',
                '-f', 'mp4', 'pipe:1');

            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="clip_${postId}_${assetId}.mp4"`);

            const ffmpeg = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
            ffmpeg.stdout.pipe(res);

            let stderrLog = '';
            ffmpeg.stderr.on('data', (chunk: Buffer) => { stderrLog += chunk.toString(); });

            ffmpeg.on('close', (code: number) => {
                fs.unlink(tmpFile, () => {}); // Deletar temp imediatamente
                if (code !== 0) {
                    console.error(`[ElegeProxy] FFmpeg code ${code}:\n${stderrLog.slice(-500)}`);
                    if (!res.headersSent) res.status(500).json({ error: 'FFmpeg failed' });
                }
            });

            ffmpeg.on('error', (err: Error) => {
                fs.unlink(tmpFile, () => {});
                if (!res.headersSent) res.status(500).json({ error: 'FFmpeg not available' });
            });

        } catch (clipErr: any) {
            const fs2 = await import('fs');
            fs2.unlink(tmpFile, () => {});
            throw clipErr;
        }

    } catch (error: any) {
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
});
```

### 2. Frontend — já pronto
O `IntelligenceFeed.tsx` já envia `?start=X&end=Y` no download:
- Clicar na bolinha da timeline → seta `clipStart`
- Botão muda para "Baixar Corte" quando há timing
- Download URL inclui `?start=75&end=120`

### 3. Checklist de deploy
- [ ] Instalar ffmpeg: `sudo apt install -y ffmpeg`
- [ ] Substituir endpoint em `server.ts` com código acima
- [ ] Reiniciar backend
- [ ] Testar: baixar vídeo com corte definido
