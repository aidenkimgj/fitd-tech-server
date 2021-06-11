import express from 'express';
import cors from 'cors';
import config from './config/index';
import mongoose from 'mongoose';
import hpp from 'hpp';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import cookieParser from 'cookie-parser';

// Routes
import userRoutes from './routes/api/user.js';
// import contentRoutes from './routes/api/content.js';

const app = express();
app.use(cookieParser())
const { MONGO_URI } = config;
app.use(hpp());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true, preFlightContinue: true }));
app.use(morgan('dev'));
app.use(express.json());

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log('MongoDB connected!'))
  .catch(err => {
    throw err;
  });

// Use routes
app.use('/api/user', userRoutes);

export default app;
