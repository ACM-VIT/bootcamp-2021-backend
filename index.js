require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const { default: axios } = require('axios');
const { logger } = require('./logger');
const Email = require('./models/emails');

/**
 * Global configuration
 */
const secretKey = process.env.CAPTCHA;

const app = express();
app.use(cors());

/** database connections and configurations */
mongoose.connect(process.env.MONGO, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});
mongoose.Promise = global.Promise;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

/** route to handle email and captcha data from user */
app.post('/rsvp', async (req, res) => {
  if (!req.body.captcha) {
    logger.error(`Captcha wasn't supplied in body`);
    return res.json({ success: false, msg: 'Capctha is not checked' });
  }

  const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body.captcha}`;
  try {
    const request = await axios.get(verifyUrl);
    const { data } = request;

    if (!data.success || data.success === undefined) {
      logger.warn(`Captcha verification failed: ${JSON.stringify(data)}`);
      return res.json({ success: false, msg: 'captcha verification failed' });
    }

    if (data.score < 0.5) {
      return res.json({
        success: false,
        msg: 'you might be a bot, sorry!',
      });
    }

    const email = req.body.email?.toString();
    logger.info(`Adding email to db, Email: ${email}`);

    try {
      await Email.create({ email });
    } catch (err) {
      logger.error(`Error adding email to db: ${err}`);
      return res.json({ success: false, msg: 'email already in list' });
    }

    return res.json({ success: true, msg: 'email added' });
  } catch (e) {
    logger.error(`Captcha verification failed: ${e}`);
  }
});

app.listen(process.env.PORT, () => {
  logger.info(`Server started on port ${process.env.PORT}`);
});
