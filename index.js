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

mongoose.connect(process.env.MONGO, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
mongoose.Promise = global.Promise;

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.printf(info => `${info.message}`),
    transports: [
      new winston.transports.File({
        filename: path.join(__dirname, 'error.log'),
        level: 'info'
      })
    ]
  });

app.get('/confirmation/:token', async (req, res) => {
    try {
        console.log(req.params.token);
        const data = jwt.verify(req.params.token, process.env.JWTSECRET);
        logger.info(`Data during confirmation: ${JSON.stringify(data)}`);
        const email = data.email;
        await Email.create({
            email
        })
        res.json({"msg":"Email Successfully Added"});
    } catch (e) {
        res.send('error');
        logger.error(e);
    }
});

app.post('/rsvp', (req, res) => {
    try {
        const email = req.body.email?.toString();
        logger.info(`Email sent through body: ${email}`);

        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            },
            //to enable localhost for now
            tls: {
                rejectUnauthorized: false
            }
        });


        jwt.sign({ email: email }, process.env.JWTSECRET, { expiresIn: '1d' }, (err, token) => {
            if (!err) {
                res.json({
                    token: token
                });
                let mailOptions = {
                    from: '"ACM-VIT Summer Bootcamp" <your@email.com>', // sender address
                    to: email, // list of receivers
                    subject: 'Email Confirmation', // Subject line
                    html: `Follow this link to confirm your email <br>
                    <a href="http://localhost:3000/confirmation/${token}">Click here to Verify Email</a>`, // plain text body
                };
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        logger.error(`Error in sending mail: ${error}`);
                    }
                    logger.info(`Message sent: ${info.messageId}`);
                });
            }
        });
    } catch (e) {
        res.status(500).send(e);
        logger.error(e);
    }
})

app.listen(process.env.PORT, () => {
    console.log(`Server Started on port ${process.env.PORT}`);
}) 