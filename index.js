const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const winston = require('winston');
require('dotenv').config();

const Email = require('./models/emails');

const app = express();

mongoose.connect(process.env.MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});
mongoose.Promise = global.Promise;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.printf((info) => `${info.message}`),
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, 'error.log'),
      level: 'info',
    }),
  ],
});

app.post('/rsvp', (req, res) => {
  if (!req.body.captcha) {
    logger.error(`Captcha wasn't supplied in body`);
    res.json({ success: false, msg: 'Capctha is not checked' });
  }
  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body.captcha}`;
  request(verifyUrl, (err, response, body) => {
    if (err) {
      logger.error(`Error During Captcha: ${err}`);
    }
    body = JSON.parse(body);
    if (!body.success && body.success === undefined) {
      return res.json({ success: false, msg: 'captcha verification failed' });
    }
    if (body.score < 0.5) {
      return res.json({
        success: false,
        msg: 'you might be a bot, sorry!',
      });
    }
    try {
      const email = req.body.email?.toString();
      logger.info(`Adding email to db, Email: ${email}`);
      await Email.create({
        email,
      });     
    } catch (e) {
      res.status(500).send(e);
      logger.error(`Error adding Email to db: ${e}`);
    }
  });
});

app.listen(process.env.PORT, () => {
  console.log(`Server Started on port ${process.env.PORT}`);
});
