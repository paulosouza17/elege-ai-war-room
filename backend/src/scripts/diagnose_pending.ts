import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function diagnose() {
    console.log('═══════════════════════════════════════════');
    console.log('  DIAGNÓSTICO DE FLUXOS PENDENTES');
    console.log('═══════════════════════════════════════════\n');

    // 1. Check flow_executions with status 'pending' or 'running'
    const { data: pending, error: e1 } = await supabase
        .from('flow_executions')
        .select('*')
        .in('status', ['pending', 'running', 'queued'])
        .order('created_at', { ascending: false })
        .limit(20);

    if (e1) { console.error('Error querying flow_executions:', e1.message); return; }

    console.log(`[1] EXECUÇÕES PENDENTES/RUNNING: ${pending?.length || 0}`);
    if (pending?.length) {
        for (const exec of pending) {
            const age = Math.round((Date.now() - new Date(exec.created_at).getTime()) / 60000);
            console.log(`  - ID: ${exec.id.substring(0, 8)}... | Status: ${exec.status} | Idade: ${age}min | Flow: ${exec.flow_id?.substring(0, 8)}... | Error: ${exec.error || 'nenhum'}`);
        }
    }

    // 2. Check scheduled_tasks
    const { data: scheduled } = await supabase
        .from('scheduled_tasks')
        .select('id, flow_id, status, next_run, last_run, schedule, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    console.log(`\n[2] TAREFAS AGENDADAS: ${scheduled?.length || 0}`);
    if (scheduled?.length) {
        for (const task of scheduled) {
            console.log(`  - ID: ${task.id.substring(0, 8)}... | Status: ${task.status} | Schedule: ${task.schedule} | Next: ${task.next_run || 'N/A'} | Last: ${task.last_run || 'nunca'}`);
        }
    }

    // 3. Check activation_files with 'pending' or 'processing'
    const { data: files } = await supabase
        .from('activation_files')
        .select('id, original_name, status, created_at, activation_id')
        .in('status', ['pending', 'processing', 'uploading'])
        .order('created_at', { ascending: false })
        .limit(20);

    console.log(`\n[3] ARQUIVOS PENDENTES: ${files?.length || 0}`);
    if (files?.length) {
        for (const f of files) {
            const age = Math.round((Date.now() - new Date(f.created_at).getTime()) / 60000);
            console.log(`  - ${f.original_name} | Status: ${f.status} | Idade: ${age}min | Activation: ${f.activation_id?.substring(0, 8)}...`);
        }
    }

    // 4. Check for old running executions (stuck > 30min)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60000).toISOString();
    const { data: stuck } = await supabase
        .from('flow_executions')
        .select('id, flow_id, status, created_at, updated_at')
        .eq('status', 'running')
        .lt('created_at', thirtyMinAgo);

    console.log(`\n[4] EXECUÇÕES TRAVADAS (running > 30min): ${stuck?.length || 0}`);
    if (stuck?.length) {
        for (const s of stuck) {
            const age = Math.round((Date.now() - new Date(s.created_at).getTime()) / 60000);
            console.log(`  - ID: ${s.id.substring(0, 8)}... | Running há ${age}min`);
        }
    }

    // 5. Check Redis queue depth (BullMQ)
    console.log('\n[5] REDIS/BULLMQ:');
    try {
        const Redis = require('ioredis');
        const redis = new Redis(process.env.REDIS_URL, { connectTimeout: 5000 });

        const waiting = await redis.llen('bull:flow-execution:wait') || 0;
        const active = await redis.llen('bull:flow-execution:active') || 0;
        const delayed = await redis.zcard('bull:flow-execution:delayed') || 0;
        const failed = await redis.zcard('bull:flow-execution:failed') || 0;

        console.log(`  Waiting: ${waiting} | Active: ${active} | Delayed: ${delayed} | Failed: ${failed}`);

        // Check for stalled jobs
        const stalled = await redis.llen('bull:flow-execution:stalled') || 0;
        if (stalled > 0) console.log(`  ⚠ STALLED JOBS: ${stalled}`);

        await redis.quit();
    } catch (err: any) {
        console.log(`  Redis check failed: ${err.message}`);
    }

    // 6. Recent errors
    const { data: errored } = await supabase
        .from('flow_executions')
        .select('*')
        .eq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log(`\n[6] ÚLTIMOS ERROS: ${errored?.length || 0}`);
    if (errored?.length) {
        for (const e of errored) {
            const age = Math.round((Date.now() - new Date(e.created_at).getTime()) / 60000);
            console.log(`  - ${age}min atrás | ${(e.error || '').substring(0, 120)}`);
        }
    }

    console.log('\n═══════════════════════════════════════════');
}

diagnose();
