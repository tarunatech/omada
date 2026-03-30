import { Router } from 'express';
import { getSalesRecords, createSalesRecord, updateSalesRecord, deleteSalesRecord } from '../controllers';
import { auth } from '../middleware/auth';

const router = Router();

router.use(auth);

router.get('/', getSalesRecords);
router.post('/', createSalesRecord);
router.put('/:id', updateSalesRecord);
router.delete('/:id', deleteSalesRecord);

export default router;
