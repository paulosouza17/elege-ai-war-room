/**
 * Backfill elege_person_id into existing intelligence_feed items
 * 
 * Resolves entity names from detected_entities / per_entity_analysis
 * against the Elege API to get numeric person IDs for photos.
 * Updates classification_metadata with per_entity_analysis including elege_person_id.
 */
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || ''
);

const ELEGE_BASE_URL = (process.env.ELEGE_BASE_URL || 'http://app.elege.ai:3001') + '/api';
const ELEGE_TOKEN = process.env.ELEGEAI_API_TOKEN || '';

// Strip diacritics for accent-insensitive comparison
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Cache person lookups: name -> Elege person ID
const personCache: Record<string, number | null> = {};

async function lookupPersonId(name: string): Promise<number | null> {
    if (personCache.hasOwnProperty(name)) return personCache[name];

    const parts = name.trim().split(/\s+/);
    const nameNorm = norm(name);
    const STOP_WORDS = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'junior', 'filho', 'neto', 'neta', 'sobrinho']);
    // Significant parts for matching (skip short prepositions/suffixes)
    const sigParts = nameNorm.split(/\s+/).filter(p => p.length > 2 && !STOP_WORDS.has(p));

    // Build search terms to try, ordered by specificity:
    // 1. Full name (best for unique people)
    // 2. Each significant name part individually (catches aliases like "Lula", "Ratinho")
    const searchTerms: string[] = [name]; // full name first
    for (const part of parts) {
        const pNorm = norm(part);
        if (pNorm.length > 2 && !STOP_WORDS.has(pNorm) && !searchTerms.some(t => norm(t) === pNorm)) {
            searchTerms.push(part);
        }
    }

    for (const searchTerm of searchTerms) {
        let people: any[];
        try {
            const url = `${ELEGE_BASE_URL}/people?q=${encodeURIComponent(searchTerm)}`;
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${ELEGE_TOKEN}`, 'Accept': 'application/json' },
                timeout: 15000,
            });
            people = Array.isArray(response.data) ? response.data : (response.data.people || []);
        } catch { continue; }

        if (people.length === 0) continue;

        // 1. Exact match (accent-insensitive) on full name or alias
        const exact = people.find((p: any) =>
            norm(p.name || '') === nameNorm ||
            norm(p.alias || '') === nameNorm
        );
        if (exact) {
            personCache[name] = exact.id;
            return exact.id;
        }

        // 2. Score-based: count how many SIGNIFICANT name parts appear in each candidate
        let bestScore = 0;
        let bestPerson: any = null;
        for (const p of people) {
            const candidate = norm(p.name || '') + ' ' + norm(p.alias || '');
            let score = 0;
            for (const sp of sigParts) {
                if (candidate.includes(sp)) score++;
            }
            if (score > bestScore) { bestScore = score; bestPerson = p; }
        }

        // Require at least 2 significant parts matching (or all for 1-2 part names)
        const minRequired = Math.min(2, sigParts.length);
        if (bestPerson && bestScore >= minRequired) {
            personCache[name] = bestPerson.id;
            return bestPerson.id;
        }
    }

    console.warn(`  ⚠ No match for "${name}"`);
    personCache[name] = null;
    return null;
}

async function main() {
    console.log('🔍 Finding feed items to backfill...\n');

    const { data: items, error } = await supabase
        .from('intelligence_feed')
        .select('id, classification_metadata')
        .not('classification_metadata', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500);

    if (error) { console.error('Failed:', error.message); process.exit(1); }

    // Find items that have entity data to process
    const needsUpdate = (items || []).filter(item => {
        const cm = item.classification_metadata || {};
        // Must have some entity source to work with
        const de = cm.detected_entities || [];
        return de.length > 0 || cm.person_name || (cm.per_entity_analysis || []).length > 0;
    });

    console.log(`Found ${needsUpdate.length} items to update.\n`);

    let updated = 0, skipped = 0;

    for (const item of needsUpdate) {
        const cm = item.classification_metadata || {};

        // Collect all entity names from all sources
        const entityNames: string[] = [];
        // 1. From detected_entities (could be names or UUIDs)
        for (const de of (cm.detected_entities || [])) {
            if (typeof de === 'string' && !de.match(/^[0-9a-f]{8}-/) && de.length > 2) {
                entityNames.push(de);
            }
        }
        // 2. From per_entity_analysis entity_name
        for (const ea of (cm.per_entity_analysis || [])) {
            if (ea.entity_name && !entityNames.includes(ea.entity_name)) {
                entityNames.push(ea.entity_name);
            }
        }
        // 3. From person_name
        if (cm.person_name && !entityNames.includes(cm.person_name)) {
            entityNames.push(cm.person_name);
        }

        if (entityNames.length === 0) { skipped++; continue; }

        // Look up each entity name
        const newPerEntityAnalysis: any[] = [];
        let firstElegePersonId: number | null = null;

        for (const name of entityNames) {
            const elegeId = await lookupPersonId(name);
            if (elegeId) {
                console.log(`  ✅ "${name}" → ID ${elegeId}`);
            }
            if (!firstElegePersonId && elegeId) firstElegePersonId = elegeId;

            // Find existing per_entity_analysis entry for this entity
            const existingEa = (cm.per_entity_analysis || []).find((ea: any) =>
                ea.entity_name === name || ea.entity === name
            );

            newPerEntityAnalysis.push({
                entity_name: name,
                entity_id: existingEa?.entity_id || null,
                elege_person_id: elegeId,
                sentiment: existingEa?.sentiment || 'neutral',
                context: existingEa?.context || '',
                tone: existingEa?.tone || 'neutro',
            });
        }

        // Update classification_metadata
        const updatedCm = {
            ...cm,
            elege_person_id: firstElegePersonId,
            per_entity_analysis: newPerEntityAnalysis,
        };

        const { error: updateError } = await supabase
            .from('intelligence_feed')
            .update({ classification_metadata: updatedCm })
            .eq('id', item.id);

        if (updateError) {
            console.error(`  ❌ Failed ${item.id.substring(0, 8)}: ${updateError.message}`);
        } else {
            updated++;
        }
    }

    // Print cache
    console.log('\n📋 Person ID Cache:');
    for (const [name, id] of Object.entries(personCache)) {
        console.log(`  ${name} → ${id || 'NOT FOUND'}`);
    }

    console.log(`\n✅ Done! Updated: ${updated}, Skipped: ${skipped}, Total: ${needsUpdate.length}`);
}

main().catch(console.error);
