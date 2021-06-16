import mongoose from 'mongoose';
import moment from 'moment';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const saltRounds = 10;

//=================================
//         User Model
// Author: Aiden Kim, Donghyun(Dean) Kim
//=================================
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
  // role: 0 - General User, 1 - Coach, 2 - Admin
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

//=================================
//   User Model Schema Function
//   Author: Donghyun(Dean) Kim
//=================================

// To check whether password is modeified or not, if password is chaged, password will be encrypted  
// Trigger -> check whether password was changed or not -> if it's modified encrypt and return next() or just return next()
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

// compare the password, user typed in with password in the db  (parameters: Plain Password /Return: user boolean isMatch)
// Trigger -> get plain password -> decrypt and compare -> return isMath(boolean)
userSchema.methods.comparePassword = function (plainPassword, cb) {
  bcrypt.compare(plainPassword, this.password, (err, isMatch) => {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};


//Generate Jeson Web Token (exp: 1hour) (Return: user info callback)
// Trigger -> just generate jwt token and store to the DB -> reutrn call back with user info
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

// Authenticate Token by using (parameters:token /Return: user info)
// jwt: jwt.verify
// random(Forgot password): compare a token with the token in the db (This token was stored when user type in a email in on the page of forgot password)
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
