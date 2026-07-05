import express from 'express';
import { getCategories } from '../controllers/words.controller.js';

const router = express.Router();

router.get('/categories', wordsController.getCategories);

export default router;
