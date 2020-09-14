import express, { NextFunction } from 'express';
import http from 'http';
import sockets from 'socket.io';
import jwt from 'jsonwebtoken';
import auth from '../routes/auth';
import errorLogger from '../middleware/logger';
import mongoDBConnection from '../config/mongoDB';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotEnv from 'dotenv';
import authMiddlware from '../middleware/auth';
import * as config from 'config';
import user from '../routes/user';
import chat from '../routes/chat';
import ErrorResponse from '../shared/errorResponse';
// import session from 'express-session';

// Environemt Config
dotEnv.config();

const { jwtPrivateKey, origin, expressSession } = config as any;

const app = express();
const server = http.createServer(app);
const io = sockets(server);

// const sessionConfig:any = {
//   secret: expressSession,
//   resave: false,
//   saveUninitialized: false,
//   cookie : {
//     sameSite: 'none',
//     secure: true
//   }
// };

// app.set('trust proxy', 1); // trust first proxy

// Express session
// app.use(session(sessionConfig))


// Calling mongodb conncection method
mongoDBConnection()

const port = process.env.PORT || 3000;

// 3rd party cors module
app.use(cors({
  origin,
  credentials:true,
}));

// Read Cookies
app.use(cookieParser());

// parse application/json
app.use(bodyParser.json());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// Authenticating middlware
// ------------- Important -------------------------------------------------------
if(!jwtPrivateKey){
  console.error('FATAL ERROR: jwtPrivateKey is not defined');
  process.exit(1);
};

// Validate JWT Token on every request
app.use('/api/v1', authMiddlware);
// ------------------------------------------------------------------------------

// Auth Routes
app.use('/api/auth', auth);

// Users Routes 
app.use('/api/v1/user', user);

// Chat Routes 
app.use('/api/v1/chat', chat);

// Root Router 
app.get('/', (req, res) => {
  res.send('App is running...');
});

// Error logger
app.use(errorLogger);

// Socket Authentication
io.use((socket: any, next: NextFunction) => {
    if (socket.handshake.query && socket.handshake.query.token){
      jwt.verify(socket.handshake.query.token, jwtPrivateKey, (err: any, decoded: any) => {
        if (err) return next(new ErrorResponse('Authentication error', 401));
        socket.decoded = decoded;
        next();
      });
    }
    else {
      next(new ErrorResponse('Authentication error', 401));
    }    
})

export {server, io, port};