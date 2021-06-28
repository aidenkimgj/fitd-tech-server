import express from 'express';
const router = express.Router();
import moment from 'moment';
import '@babel/polyfill';
import { isNullOrUndefined } from 'util';
import auth from '../../middleware/auth';
import { uploadS3, deleteImg } from '../../middleware/aws';

// Model
import Content from '../../models/content';
import User from '../../models/user';
import Category from '../../models/category';

//========================================
//         Content Apis
// Author: Aiden Kim, Donghyun(Dean) Kim
//========================================

/*
 *
 * @route   POST   api/content/image
 * @desc    upload image
 * @access  Private
 *
 */

router.post('/image', uploadS3.array('upload', 5), async (req, res, next) => {
  try {
    console.log(req.files.map(v => v.location));
    res.json({ uploaded: true, url: req.files.map(v => v.location) });
  } catch (e) {
    console.error(e);
    res.json({ uploaded: false, url: null });
  }
});

/*
 *
 * @route    POST   api/content/deleteimg
 * @desc     delete image in the aws S3
 * @access   Private
 *
 */

router.post('/deleteimg', deleteImg, async (req, res) => {
  try {
    res.json({ deleted: true });
  } catch (e) {
    console.error(e);
    res.json({ deleted: false });
  }
});

/*
 * @route     POST   api/content/
 * @desc      Create a content
 * @access    Private
 *
 */

router.post('/', auth, uploadS3.none(), async (req, res, next) => {
  try {
    const { path, title, description, price, fileUrl, creator, category } =
      req.body;

    const newContent = await Content.create({
      path,
      title,
      description,
      price,
      fileUrl,
      creator: req.user.id,
      date: moment().format('MM-DD-YYYY hh:mm:ss'),
    });

    // find category from database
    const existedCategory = await Category.findOne({
      categoryName: category,
    });

    console.log(existedCategory, 'Find Result category');
    // the category does not exist in the database.
    if (isNullOrUndefined(existedCategory)) {
      // create new category
      const newCategory = await Category.create({
        categoryName: category,
      });
      // insert data into database
      await Content.findByIdAndUpdate(newContent._id, {
        // $push is that it can put addition value in the exist array
        $push: { category: newCategory._id },
      });
      await Category.findByIdAndUpdate(newCategory._id, {
        $push: { contents: newContent._id },
      });
      await User.findByIdAndUpdate(req.user.id, {
        $push: { contents: newContent._id },
      });

      // the category exist in the database
    } else {
      await Content.findByIdAndUpdate(newContent._id, {
        // For the content model, the category was found in a particular content model, so $push was not used.
        category: existedCategory._id,
      });
      await Category.findByIdAndUpdate(existedCategory._id, {
        $push: { contents: newContent._id },
      });
      await User.findByIdAndUpdate(req.user.id, {
        $push: { contents: newContent._id },
      });
    }
    return res.redirect(`/api/content/${newContent._id}`);
  } catch (e) {
    console.error(e);
  }
});

/*
 * @route     GET   api/content/:id
 * @desc      content detail
 * @access    Public
 *
 */

router.get('/:id', async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id)
      .populate('creator', 'name') // first value is path and second value is select
      .populate({ path: 'category', select: 'categoryName' });
    // .exec();
    content.views += 1;
    content.save();
    console.log(content);
    res.json(content);
  } catch (e) {
    console.error(e);
    next(e);
  }
});

export default router;
