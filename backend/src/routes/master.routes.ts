import { Router } from 'express';
import * as masterController from '../controllers/master.controller';
import { auth, adminAuth } from '../middleware/auth';

const router = Router();

// Companies
router.get('/companies', auth, masterController.getMasterCompanies);
router.post('/companies', adminAuth, masterController.createMasterCompany);
router.put('/companies/:id', adminAuth, masterController.updateMasterCompany);
router.delete('/companies/:id', adminAuth, masterController.deleteMasterCompany);

// Products
router.get('/products', auth, masterController.getMasterProducts);
router.post('/products', adminAuth, masterController.createMasterProduct);
router.put('/products/:id', adminAuth, masterController.updateMasterProduct);
router.delete('/products/:id', adminAuth, masterController.deleteMasterProduct);

export default router;
