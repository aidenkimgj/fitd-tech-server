import moment from 'moment';
import mongoose from 'mongoose';

const contentSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
    index: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    default: 0,
  },
  fileUrl: {
    type: String,
    default: [],
  },
  sold: {
    type: Number,
    maxlength: 100,
    default: 0,
  },
  sort: {
    type: Number,
    default: 1,
  },
  rating: {
    type: Number,
    default: 0,
  },
  views: {
    type: Number,
    default: -2,
  },
  date: {
    type: String,
    default: moment().format('MM-DD-YYYY hh:mm:ss'),
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
  ],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
});

const Content = mongoose.model('Content', contentSchema);

export default Content;
