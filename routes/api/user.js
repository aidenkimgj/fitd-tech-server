import express from 'express';
// import async from 'async';
import auth from '../../middleware/auth';
import { OAuth2Client } from 'google-auth-library';
// Model
import User from '../../models/user';
// import Product from '../../models/product';
// import Payment from '../../models/payment';

const router = express.Router();
//=================================
//             User
//=================================

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
        isAdmin: req.user.role === 0 ? false : true,
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

router.post('/login', (req, res) => {
  console.log(req.body.email)
  User.findOne({ email: req.body.email }, (err, user) => {
    if (!user)
      return res.json({
        loginSuccess: false,
        message: 'Auth failed, email not found',
      });


    user.comparePassword(req.body.password, (err, isMatch) => {
      if (!isMatch)
        return res.json({ loginSuccess: false, message: 'Wrong password' });

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

//Google login 
router.post('/google', async (req, res) => {
  // console.log(req.body)
  const client = new OAuth2Client(process.env.CLIENT_ID)

  const { token } = req.body
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.CLIENT_ID
  });

  console.log(ticket.getPayload())

  const googleUserInfo = ticket.getPayload();

  User.findOne({ email: googleUserInfo.email }, (err, user) => {
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

router.post('/forgot', async (req, res) => {
  User.findOne(
    { email: req.body.email },
    (err, user) => {
      if (!user)
        return res.json({
          success: false,
          message: "Email doesn't exist, Please try again."
        });

      const oAuth2Client = new google.auth.OAuth2(process.env.FORGOT_EMAIL_CLIENT_ID, process.env.FORGOT_EMAIL_SECRET, process.env.FORGOT_REDIRECT_URI)
      oAuth2Client.setCredentials({ refresh_token: process.env.FORGOT_EMAIL_REFRESH_TOKEN })

      // Generate Token to access the page to reset password
      const token = crypto.randomBytes(20).toString('hex');

      user.tokenExp = (moment().add(1, 'hour').valueOf()); //expired time 1 hour
      user.token = token;

      user.save(function (err, user) {
        if (err) return res.status(400).json({ success: false, err })

        async function sendMail() {
          try {
            const accessToken = await oAuth2Client.getAccessToken();
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              port: 465,
              secure: true, // true for 465, false for other ports
              auth: {
                type: "OAuth2",
                user: process.env.FORGOT_EMAIL_ID,
                clientId: process.env.FORGOT_EMAIL_CLIENT_ID,
                clientSecret: process.env.FORGOT_EMAIL_SECRET,
                refreshToken: process.env.FORGOT_EMAIL_REFRESH_TOKEN,
                accessToken: accessToken
              }
            });

            const mailOptions = {
              from: process.env.FORGOT_EMAIL_ID,
              to: user.email,
              subject: 'Password search authentication code transmission',
              text: 'This is the authentication code to find the password!',
              html:
                `<p>Hello ${user.name}</p>` +
                `<p>Please click the URL to reset your password.<p>` +
                `<a href='${process.env.DOMAIN}/resetpw/${token}/${user.email}'>Click here to reset Your Password</a><br/>` +
                `If you don't request this, please contac us` +
                `<h4> Dean's Canada Shop</h4>`
            };

            const result = transporter.sendMail(mailOptions);
            return result;
          } catch {
            res.status(400).json({ success: false, message: 'Fail to Send Mail' });
          }
        }
        sendMail()
          .then(result => {
            if (result)
              return res.json({ success: true });
            else res.status(400).json({ success: false, message: 'Fail to Send Mail' });
          })
      })
    })
})

router.post('/resetpw', auth, async (req, res) => {
  let user = req.user;
  user.password = req.body.password;
  user.save(function (err, user) {
    if (err) res.status(400).json({ error: true })
    res.status(200).json({ success: true, user: user })
  })
})

// router.post('/addToCart', auth, (req, res) => {
//   //먼저  User Collection에 해당 유저의 정보를 가져오기
//   User.findOne({ _id: req.user._id }, (err, userInfo) => {
//     // 가져온 정보에서 카트에다 넣으려 하는 상품이 이미 들어 있는지 확인
//     // To avoid error for method findOneAndUpdate
//     let duplicate = false;
//     userInfo.cart.forEach(item => {
//       if (item.id === req.body.productId) {
//         duplicate = true;
//       }
//     });

//     //상품이 이미 있을때
//     if (duplicate) {
//       User.findOneAndUpdate(
//         { _id: req.user._id, 'cart.id': req.body.productId },
//         // Get User through user._id and then get card.id <- it should be in"" from User
//         { $inc: { 'cart.$.quantity': 1 } }, // update
//         { new: true }, // To get updated user, if it's not, give false
//         (err, userInfo) => {
//           if (err) return res.status(200).json({ success: false, err });
//           res.status(200).send(userInfo.cart);
//         }
//       );
//     }
//     //상품이 이미 있지 않을때
//     else {
//       User.findOneAndUpdate(
//         { _id: req.user._id },
//         {
//           $push: {
//             cart: {
//               id: req.body.productId,
//               quantity: 1,
//               date: Date.now(),
//             },
//           },
//         },
//         { new: true },
//         (err, userInfo) => {
//           if (err) return res.status(400).json({ success: false, err });
//           res.status(200).send(userInfo.cart);
//         }
//       );
//     }
//   });
// });

// router.get('/removeFromCart', auth, (req, res) => {
//   //먼저 cart안에 내가 지우려고 한 상품을 지워주기
//   User.findOneAndUpdate(
//     { _id: req.user._id },
//     {
//       //넣을땐 push, 지울땐 pull
//       $pull: { cart: { id: req.query.id } },
//     },
//     { new: true },
//     (err, userInfo) => {
//       let cart = userInfo.cart;
//       let array = cart.map(item => {
//         return item.id;
//       });

//       //product collection에서  현재 남아있는 상품들의 정보를 가져오기

//       //productIds = ['5e8961794be6d81ce2b94752', '5e8960d721e2ca1cb3e30de4'] 이런식으로 바꿔주기
//       Product.find({ _id: { $in: array } })
//         .populate('writer')
//         .exec((err, productInfo) => {
//           return res.status(200).json({
//             productInfo,
//             cart,
//           });
//         });
//     }
//   );
// });

// router.post('/successBuy', auth, (req, res) => {
//   //1. User Collection 안에  History 필드 안에  간단한 결제 정보 넣어주기
//   let history = [];
//   let transactionData = {};

//   req.body.cartDetail.forEach(item => {
//     history.push({
//       dateOfPurchase: Date.now(),
//       name: item.title,
//       id: item._id,
//       price: item.price,
//       quantity: item.quantity,
//       paymentId: req.body.paymentData.paymentID,
//     });
//   });

//   //2. Payment Collection 안에  자세한 결제 정보들 넣어주기
//   transactionData.user = {
//     id: req.user._id,
//     name: req.user.name,
//     email: req.user.email,
//   };

//   transactionData.data = req.body.paymentData;
//   transactionData.product = history;

//   //history 정보 저장
//   User.findOneAndUpdate(
//     { _id: req.user._id },
//     { $push: { history: history }, $set: { cart: [] } },
//     { new: true },
//     (err, user) => {
//       if (err) return res.json({ success: false, err });

//       //payment에다가  transactionData정보 저장
//       const payment = new Payment(transactionData);
//       payment.save((err, doc) => {
//         if (err) return res.json({ success: false, err });

//         //3. Product Collection 안에 있는 sold 필드 정보 업데이트 시켜주기

//         //상품 당 몇개의 quantity를 샀는지

//         let products = [];
//         doc.product.forEach(item => {
//           products.push({ id: item.id, quantity: item.quantity });
//         });

//         //
//         async.eachSeries(
//           products,
//           (item, callback) => {
//             Product.update(
//               { _id: item.id },
//               {
//                 $inc: {
//                   sold: item.quantity,
//                 },
//               },
//               { new: false },
//               callback
//             );
//           },
//           err => {
//             if (err) return res.status(400).json({ success: false, err });
//             res.status(200).json({
//               success: true,
//               cart: user.cart,
//               cartDetail: [],
//             });
//           }
//         );
//       });
//     }
//   );
// });

export default router;
