import { Router } from 'express';
import { ingestData } from '../controllers/ingestion';

const router = Router();

router.post('/', ingestData);

export default router;
