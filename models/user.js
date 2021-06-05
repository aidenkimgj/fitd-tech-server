const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const moment = require("moment");

const userSchema = mongoose.Schema({
	name: {
		type: String,
		maxlength: 50
	},
	email: {
		type: String,
		trim: true,
		unique: 1
	},
	password: {
		type: String,
		minglength: 5
	},
	lastname: {
		type: String,
		maxlength: 50
	},
	role: {
		type: Number,
		default: 0
	},
	cart: {
		type: Array,
		default: []
	},
	history: {
		type: Array,
		default: []
	},
	image: String,
	token: {
		type: String,
	},
	tokenExp: {
		type: Number
	},
	recentlyViewed: {
		type: Array,
		default: []
	}
})


userSchema.pre('save', next => {
	let user = this;

	if (user.isModified('password')) {
		// console.log('password changed')
		bcrypt.genSalt(saltRounds, (err, salt) => {
			if (err) return next(err);

			bcrypt.hash(user.password, salt, (err, hash) => {
				if (err) return next(err);
				user.password = hash
				next()
			})
		})
	} else {
		next()
	}
});

userSchema.methods.comparePassword = (plainPassword, cb) => {
	bcrypt.compare(plainPassword, this.password, (err, isMatch) => {
		if (err) return cb(err);
		cb(null, isMatch)
	})
}

userSchema.methods.generateToken = cb => {
	let user = this;
	let token = jwt.sign(user._id.toHexString(), 'secret')
	let oneHour = moment().add(1, 'hour').valueOf();

	user.tokenExp = oneHour;
	user.token = token;
	user.save((err, user) => {
		if (err) return cb(err)
		cb(null, user);
	})
}

userSchema.statics.findByToken = (token, cb) => {
	let user = this;

	jwt.verify(token, 'secret', (err, decode) => {
		user.findOne({ "_id": decode, "token": token }, (err, user) => {
			if (err) return cb(err);
			cb(null, user);
		})
	})
}

const User = mongoose.model('User', userSchema);

module.exports = { User }