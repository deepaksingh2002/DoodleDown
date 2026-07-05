import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import wordService from '../services/word.service.js';

const getCategories = asyncHandler(async (req, res) => {
  const categories = await wordService.getCategories();
  return new ApiResponse(200, { categories }).send(res);
});

export { getCategories };
