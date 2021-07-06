import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_PRIVATE_KEY,
});

export const uploadS3 = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET,
    region: 'us-west-1',
    // To distinguish the names of duplicate files.
    key(req, file, cb) {
      const ext = path.extname(file.originalname);
      const basename = path.basename(file.originalname, ext);
      cb(null, basename + new Date().valueOf() + ext);
    },
  }),
  // File size 100mb
  limits: { fileSize: 100 * 1024 * 1024 },
});

export const deleteImg = async (req, res, next) => {
  // Extract the image name
  let imgName = req.body.img.split('/').pop();

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: imgName,
  };
  s3.deleteObject(params, (err, data) => {
    if (err) {
      console.log('Image delete error');
      console.log(err);
      return res.status(403).send(err);
    } else {
      console.log('Delete success');
    }
  });
  next();
};
