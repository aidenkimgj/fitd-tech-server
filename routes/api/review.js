import express from 'express';
const router = express.Router();

// Model
import Content from '../../models/content';
import Review from '../../models/review';

//========================================
//         Review Api
// Author: Aiden Kim, Donghyun(Dean) Kim
//========================================

/*
 * @route     GET   api/review/:path/reviews
 * @desc      Get All reviews
 * @access    Public
 *
 */
router.get('/:id/reviews', async (req, res) => {
  try {
    const review = await Content.findById({ path: req.params.id }).populate(
      'reviews'
    );

    console.log(review, 'review load');
    res.json(review);
  } catch (e) {
    console.error(e);
  }
});

/*
 * @route     POST   api/review/:path/review
 * @desc      Create a review
 * @access    Private
 *
 */
router.post('/:id/review', async (req, res, next) => {
  console.log(req, 'comments');

  const { review, rating, userId, userName, id } = req.body;

  const newReview = await Review.create({
    review,
    rating,
    creator: userId,
    creatorName: userName,
    content: id,
    date: moment().format('MM-DD-YYYY hh:mm:ss'),
  });

  console.log(newReview, 'newReview');

  try {
    await Content.findByIdAndUpdate(id, {
      $push: {
        reviews: newReview._id,
      },
    });
    // Find users and update them on what review they wrote on what content.
    await User.findByIdAndUpdate(userId, {
      $push: {
        comments: {
          content_id: id,
          review_id: newReview._id,
        },
      },
    });
    res.json(newReview);
  } catch (e) {
    console.error(e);
    next(e);
  }
});

export default router;
