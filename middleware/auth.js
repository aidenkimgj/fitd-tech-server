import User from '../models/user';

const auth = (req, res, next) => {
  console.log(req.headers)
  //If front end server send cookies
  // let token = req.cookies.w_auth;
  // let token_expire = req.cookies.w_authExp;

  // or not
  // let token = req.headers.w_auth;

  let token;
  let type;

  if (req.body.token) {
    token = req.body.token;
    type = 'random'
  }
  else if (req.cookies.w_auth) {
    token = req.cookies.w_auth;
    type = 'jwt';
  }


  const data = {
    token: token,
    type: type
  }

  User.findByToken(token, (err, user) => {
    if (err) throw err;
    if (!user)
      return res.json({
        isAuth: false,
        error: true,
      });
    req.token = token;
    req.user = user;
    next();
  });
};

export default auth;
