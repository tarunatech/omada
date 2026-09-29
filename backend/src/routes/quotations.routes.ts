import { Router } from 'express';
import { getQuotations, createQuotation, updateQuotation, deleteQuotation, updateQuotationStatus, getPublicQuotation } from '../controllers';
import { auth } from '../middleware/auth';

const router = Router();

// Public route to view quotation
router.get('/public/:id', getPublicQuotation);

router.use(auth);

router.get('/', getQuotations);
router.post('/', createQuotation);
router.put('/:id', updateQuotation);
router.delete('/:id', deleteQuotation);
router.patch('/:id/status', updateQuotationStatus);

export default router;
