import express from 'express';
// import async from 'async';
import auth from '../../middleware/auth';
import { OAuth2Client } from 'google-auth-library';
// Model
import User from '../../models/user';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import moment from 'moment';
// import Product from '../../models/product';
// import Payment from '../../models/payment';

const router = express.Router();
//=================================
//             User
//   Author: Donghyun(Dean) Kim
//=================================

// Autenticate a token and then return user's info if it's valid
// Trigger -> authenticate user's jwt on the auth(middleware) ->if it's valid return user's info and refresh token
router.get('/auth', auth, (req, res) => {
  //Token Refresh
  req.user.generateToken((err, user) => {
    if (err) return res.status(400).send(err);
    res.cookie("w_authExp", user.tokenExp);
    res
      .cookie("w_auth", user.token)
      .status(200)
      .json({
        _id: req.user._id,
        isAdmin: req.user.role === 2 ? false : true,
        isAuth: true,
        email: req.user.email,
        name: req.user.name,
        lastname: req.user.lastname,
        role: req.user.role,
        image: req.user.image,
        cart: req.user.cart,
        history: req.user.history,
      });
  });
});

// Register page
// Get a user's info and then store it
// Validation - mongo DB will return error by using model if it has some wroing validation
// Trigger -> get user's info and then store it to the DB -> reutrn success:true
router.post('/register', (req, res) => {
  const user = new User(req.body);

  user.save((err, doc) => {
    console.log(err)
    if (err) return res.json({ success: false, err });
    return res.status(200).json({
      success: true,
    });
  });
});


//Login function (Receive: email and plain password/ Return Success(boolean),usreId and cookie(token, exp))
//Trigger -> get email ans password -> comapre with using scheman method -> if it's matched, generate a token -> reutrn Success(boolean),usreId and cookie(token, exp)
router.post('/login', (req, res) => {
  console.log(req.body.email)
  User.findOne({ email: req.body.email }, (err, user) => {
    if (!user)
      return res.json({
        loginSuccess: false,
        message: 'Auth failed, email not found',
      });
    //Compare password
    user.comparePassword(req.body.password, (err, isMatch) => {
      if (!isMatch)
        return res.json({ loginSuccess: false, message: 'Wrong password' });
      //Generate Token
      user.generateToken((err, user) => {
        if (err) return res.status(400).send(err);
        res.cookie('w_authExp', user.tokenExp);
        res.cookie('w_auth', user.token).status(200).json({
          loginSuccess: true,
          userId: user._id,
        });
      });
    });
  });
});

// logout (Receive: user ID / return success(boolean))
// Trigger -> get user id -> delet token and token expire time in the DB -> return success(boolean)
router.get('/logout', auth, (req, res) => {
  User.findOneAndUpdate(
    { _id: req.user._id },
    { token: '', tokenExp: '' },
    (err, doc) => {
      if (err) return res.json({ success: false, err });
      return res.status(200).send({
        success: true,
      });
    }
  );
});

// Google login (Receive: access token / Return: User info)
// Trigger -> receive:token -> if new user, store to db and return user info or just return user info -> return userinfo
router.post('/google', async (req, res) => {
  console.log(req.body)
  const client = new OAuth2Client(process.env.LOGIN_OAUTH_CLIENT_ID)
  //verify Token
  const { token } = req.body
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.LOGIN_OAUTH_CLIENT_ID
  });

  // get user info from google
  const googleUserInfo = ticket.getPayload();

  //Search user info
  User.findOne({ email: googleUserInfo.email }, (err, user) => {
    //if user info doesn't exists
    if (!user) {
      const newUser = new User({
        name: googleUserInfo.given_name,
        email: googleUserInfo.email,
        password: googleUserInfo.sub,
        lastname: googleUserInfo.family_name,
        image: googleUserInfo.picture
      });

      newUser.save((err, doc) => {
        console.log(err)
        if (err) return res.json({ success: false, err });
        newUser.generateToken((err, user) => {
          if (err) return res.status(400).send(err);
          res.cookie("w_authExp", user.tokenExp);
          res
            .cookie("w_auth", user.token)
            .status(200)
            .json({
              loginSuccess: true, userId: user._id
            });
        });

      });
    }
    //if user info exists, just compare password(sub info)
    else {
      user.comparePassword(googleUserInfo.sub, (err, isMatch) => {
        if (!isMatch)
          return res.json({ loginSuccess: false, message: "Wrong google sub" });

        user.generateToken((err, user) => {
          if (err) return res.status(400).send(err);
          res.cookie("w_authExp", user.tokenExp);
          res
            .cookie("w_auth", user.token)
            .status(200)
            .json({
              loginSuccess: true, userId: user._id
            });
        });
      });
    }
  });
})

// fogot (Receive: email / Return: success(boolean) and err message) 
// receive: email, user want to find -> search the email and if it exists, return and send email with token (1hour validation)or not, send err with err message
router.post('/forgot', async (req, res) => {
  // find user by using email
  User.findOne(
    { email: req.body.email },
    (err, user) => {
      if (!user)
        return res.json({
          success: false,
          message: "Email doesn't exist, Please try again."
        });
      //if email exists, request refreshToken to access google OAuth   
      const oAuth2Client = new google.auth.OAuth2(
        process.env.FORGOT_OAUTH_EMAIL_CLIENT_ID,
        process.env.FORGOT_OAUTH_EMAIL_SECRET,
        process.env.FORGOT_OAUTH_REDIRECT_URI)
      oAuth2Client.setCredentials({ refresh_token: process.env.FORGOT_OAUTH_EMAIL_REFRESH_TOKEN })

      // Generate Token to access the page to reset password
      const token = crypto.randomBytes(20).toString('hex');

      user.tokenExp = (moment().add(1, 'hour').valueOf()); //expired time 1 hour
      user.token = token;

      //store token to the DB
      user.save(function (err, user) {
        if (err) return res.status(400).json({ success: false, err })

        async function sendMail() {
          try {
            //generate access token from google
            const accessToken = await oAuth2Client.getAccessToken();
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              port: 465,
              secure: true, // true for 465, false for other ports
              auth: {
                type: "OAuth2",
                user: process.env.WEBSITE_EMAIL_ADDRESS,
                clientId: process.env.FORGOT_OAUTH_EMAIL_CLIENT_ID,
                clientSecret: process.env.FORGOT_OAUTH_EMAIL_SECRET,
                refreshToken: process.env.FORGOT_OAUTH_EMAIL_REFRESH_TOKEN,
                accessToken: accessToken
              }
            });
            //Main contents
            const mailOptions = {
              from: process.env.WEBSITE_EMAIL_ADDRESS,
              to: user.email,
              subject: 'Password search authentication code transmission',
              text: 'This is the authentication code to find the password!',
              html:
                `<p>Hello ${user.name}</p>` +
                `<p>Please click the URL to reset your password.<p>` +
                `<a href='${process.env.DOMAIN}/resetpw/${token}/${user.email}'>Click here to reset Your Password</a><br/>` +
                `If you don't request this, please contact us` +
                `<h4> FITD Tech</h4>`
            };

            const result = transporter.sendMail(mailOptions);
            return result;
          } catch {
            res.status(400).json({ success: false, message: 'Fail to Send Mail' });
          }
        }
        //Executution
        sendMail()
          .then(result => {
            if (result)
              return res.json({ success: true });
            else res.status(400).json({ success: false, message: 'Fail to Send Mail' });
          })
      })
    })
})

// Check token and then reset password / receive: token and email, send: success:true
router.post('/resetpw', auth, async (req, res) => {
  let user = req.user;
  user.password = req.body.password;
  user.save(function (err, user) {
    if (err) res.status(400).json({ error: true })
    res.status(200).json({ success: true, user: user })
  })
})


export default router;
