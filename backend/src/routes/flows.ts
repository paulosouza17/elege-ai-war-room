import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// GET /api/v1/flows - List all flows
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('flows')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        console.error('Error fetching flows:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/v1/flows/:id - Get a specific flow
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('flows')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        console.error('Error fetching flow:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/v1/flows - Create a new flow
router.post('/', async (req, res) => {
    try {
        const { name, description, nodes, edges } = req.body;

        const { data, error } = await supabase
            .from('flows')
            .insert({ name, description, nodes, edges })
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error: any) {
        console.error('Error creating flow:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// PUT /api/v1/flows/:id - Update a flow
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, nodes, edges } = req.body;

        const updateData: any = { updated_at: new Date() };
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (nodes) updateData.nodes = nodes;
        if (edges) updateData.edges = edges;

        const { data, error } = await supabase
            .from('flows')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        console.error('Error updating flow:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/v1/flows/:id - Delete a flow
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('flows')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Flow deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting flow:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export const flowsRouter = router;
