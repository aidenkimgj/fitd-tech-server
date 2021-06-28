import express from 'express';
const router = express.Router();

// Model
import Content from '../../models/content';
import Review from '../../models/review';

//========================================
//         Review Api
// Author: Aiden Kim, Donghyun(Dean) Kim
//========================================

// Comments route
/*
 * @route     GET   api/post/:path/reviews
 * @desc      Get All reviews
 * @access    Public
 *
 */
router.get('/:path/reviews', async (req, res) => {
  try {
    const review = await Content.findOne({ path: req.params.path }).populate(
      'reviews'
    );

    console.log(review, 'review load');
    res.json(review);
  } catch (e) {
    console.error(e);
  }
});

/*
 * @route     POST   api/post/:path/review
 * @desc      Create a review
 * @access    Private
 *
 */
router.post('/:path/review', async (req, res, next) => {
  console.log(req, 'comments');
  const newReview = await Review.create({
    review: req.body.review,
    rating: req.body.rating,
    creator: req.body.userId,
    creatorName: req.body.userName,
    content: req.body.id,
    date: moment().format('MM-DD-YYYY hh:mm:ss'),
  });
  console.log(newReview, 'newReview');

  try {
    await Content.findByIdAndUpdate(req.body.id, {
      $push: {
        reviews: newReview._id,
      },
    });
    // Find users and update them on what review they wrote on what content.
    await User.findByIdAndUpdate(req.body.userId, {
      $push: {
        comments: {
          content_id: req.body.id,
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
