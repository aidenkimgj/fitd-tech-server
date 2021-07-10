import express from 'express';
const router = express.Router();

import Content from '../../models/content';
import NewCoach from '../../models/newCoach';

//========================================
//         Search Api
// Author: Aiden Kim, Donghyun(Dean) Kim
//========================================

/*
 * @route    GET api/search/content:searchTerm
 * @desc     search name retrive
 * @access   Public
 *
 */
router.get('/content/:searchTerm', async (req, res, next) => {
  try {
    const result = await Content.find({
      title: {
        $regex: req.params.searchTerm,
        $options: 'i',
      },
    });
    console.log(result, 'Search result');
    res.json(result);
  } catch (e) {
    console.error(e);
    next(e);
  }
});

/*
 * @route    GET api/search/content:searchTerm
 * @desc     search name retrive
 * @access   Public
 *
 */
router.get('/coach/:searchTerm', async (req, res, next) => {
  try {
    const result = await NewCoach.find({
      expertiseArea: {
        $regex: req.params.searchTerm,
        $options: 'i',
      },
    });
    console.log(result, 'Search result');
    res.json(result);
  } catch (e) {
    console.error(e);
    next(e);
  }
});

export default router;
