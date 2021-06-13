import mongoose from 'mongoose';
import moment from 'moment';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const saltRounds = 10;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    maxlength: 50,
  },
  email: {
    type: String,
    trim: true,
    unique: 1,
  },
  password: {
    type: String,
    minglength: 5,
  },
  lastname: {
    type: String,
    maxlength: 50,
  },
  role: {
    type: Number,
    default: 0,
  },
  cart: {
    type: Array,
    default: [],
  },
  history: {
    type: Array,
    default: [],
  },
  image: String,
  token: {
    type: String,
  },
  tokenExp: {
    type: Number,
  },
  social: {
    google: {
      id: String,
      accessToken: String,
    },
  },
  recentlyViewed: {
    type: Array,
    default: [],
  },
  createAt: {
    type: Date,
    default: moment().format('MM-DD-YYYY hh:mm:ss'),
  },
  comments: [
    // For delete with a comment which it locates underneath the post
    {
      post_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post',
      },
      comment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'comment',
      },
    },
  ],
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'post',
    },
  ],
});

userSchema.pre('save', function (next) {
  let user = this;

  if (user.isModified('password')) {
    // console.log('password changed')
    bcrypt.genSalt(saltRounds, (err, salt) => {
      if (err) return next(err);

      bcrypt.hash(user.password, salt, (err, hash) => {
        if (err) return next(err);
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

userSchema.methods.comparePassword = function (plainPassword, cb) {
  bcrypt.compare(plainPassword, this.password, (err, isMatch) => {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

userSchema.methods.generateToken = function (cb) {
  let user = this;
  let oneHour = (moment().add(1, 'hour').valueOf()) / 1000; //expired time 1 hour
  let token = jwt.sign({ _id: user._id.toHexString(), exp: oneHour }, process.env.JWT_SECRET)

  user.tokenExp = oneHour;
  user.token = token;
  user.save((err, user) => {
    if (err) return cb(err);
    cb(null, user);
  });
};

userSchema.statics.findByToken = function (data, cb) {
  let user = this;
  let token = data.token;
  let type = data.type;

  if (type == 'jwt') {
    jwt.verify(token, process.env.JWT_SECRET, function (err, decode) {
      user.findOne({ "_id": decode, "token": token }, function (err, user) {
        if (err) return cb(err);
        cb(null, user);
      })
    })
  } else {

    user.findOne({ "token": token }, function (err, user) {
      if (err) return cb(err);
      if (user.tokenExp >= moment().valueOf()) {
        cb(null, user)
      }
      else {
        cb(null, null)
      }
    })
  }
}

const User = mongoose.model('User', userSchema);

export default User;
