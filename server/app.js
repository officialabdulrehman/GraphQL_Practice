const path = require('path');
const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const {graphqlHTTP} = require('express-graphql');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const isAuth = require('./middleware/is-auth');
require('dotenv').config()
const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, Math.round(Math.random() * 1E9 ) + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(express.json()); // application/json
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'OPTIONS, GET, POST, PUT, PATCH, DELETE'
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if(req.method === 'OPTIONS')
    return res.sendStatus(200)
  next();
});

app.use(isAuth)

app.put('/post-image', (req, res, next) => {
  if(!isAuth){
    const error = new Error('Unauthorized, access denied')
    error.code = 401
    throw error
  }
  if(!req.file) 
    return res.status(200).json({ message: 'No file provided'})

  if(req.body.oldPath)
    clearImage(req.body.oldPath)

  return res.status(201).json({ message: 'File Stored', filePath: req.file.path })
})

app.use('/graphql', graphqlHTTP({
  schema: graphqlSchema,
  rootValue: graphqlResolver,
  graphiql: true,
  formatError(err) {
    if(!err.originalError){
      return err
    }
    const { message, originalError: {data, code} } = err
    return {
      message: message || 'Oops, something went wrong',
      status: code || 500,
      data
    }
  }
}))

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(
    process.env.MONGODB_URI.toString()
  )
  .then(result => {
    app.listen(8080);
  })
  .catch(err => console.log(err));


const clearImage = filePath => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, err => console.log(err));
};
  