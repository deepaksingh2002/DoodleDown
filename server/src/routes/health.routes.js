import express from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = express.Router();

router.get('/', healthController.getHealth);

export default router;
