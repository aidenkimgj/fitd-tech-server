const imageUpload = async (req, res, next) => {
  console.log(`req.body.uploadFile`, req.body.uploadFile);
  const base64 = req.body.uploadFile.file;
  // You can either "yarn add aws-sdk" or "npm i aws-sdk"
  const AWS = require('aws-sdk');

  // Configure AWS with your access and secret key.
  const { AWS_KEY, AWS_PRIVATE_KEY, S3_BUCKET1, S3_BUCKET2 } = process.env;

  // Configure AWS to use promise
  AWS.config.setPromisesDependency(require('bluebird'));
  AWS.config.update({
    accessKeyId: AWS_KEY,
    secretAccessKey: AWS_PRIVATE_KEY,
    region: 'us-west-1',
  });

  // Create an s3 instance
  const s3 = new AWS.S3();

  // Ensure that you POST a base64 data to your server.
  // Let's assume the variable "base64" is one.
  const base64Data = new Buffer.from(
    base64.replace(/^data:image\/\w+;base64,/, ''),
    'base64'
  );

  // Getting the file type, ie: jpeg, png or gif
  const type = base64.split(';')[0].split('/')[1];

  const userId = 1;

  const Bucket = req.body.title ? S3_BUCKET1 : S3_BUCKET2;

  const params = {
    Bucket,
    Key: `${userId}.${type}`, // type is not required
    Body: base64Data,
    ACL: 'public-read',
    ContentEncoding: 'base64', // required
    ContentType: `image/${type}`, // required. Notice the back ticks
  };

  // The upload() is used instead of putObject() as we'd need the location url and assign that to our user profile/database
  // see: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
  let location = '';
  let key = '';
  try {
    const { Location, Key } = await s3.upload(params).promise();
    location = Location;
    key = Key;
  } catch (error) {
    console.log(error);
  }

  // Save the Location (url) to your database and Key if needs be.
  // As good developers, we should return the url and let other function do the saving to database etc
  console.log(location, key);

  req.location = location;
  next();

  // To delete, see: https://gist.github.com/SylarRuby/b3b1430ca633bc5ffec29bbcdac2bd52
};

module.exports = imageUpload;
