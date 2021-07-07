const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
require('dotenv').config();

const Email = require('./models/emails');

const app = express();

mongoose.connect(process.env.MONGO, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });
mongoose.Promise = global.Promise;

// parse application/x-www-form-urlencoded aka your HTML <form> tag stuff
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json aka whatever you send as a json object
app.use(bodyParser.json())

app.get('/confirmation/:token', async (req, res) => {
    try {
        console.log(req.params.token);
        const data = jwt.verify(req.params.token, process.env.JWTSECRET);
        console.log(data);
        const email = data.email;
        await Email.create({
            email
        })
        res.send("Success!");
    } catch (e) {
        res.send('error');
        console.log(e);
    }
});

app.post('/rsvp', (req, res) => {
    if (!req.body.captcha) {
        console.log("err");
        return res.json({ "success": false, "msg": "Capctha is not checked" });

    } else {
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body.captcha}`;
        request(verifyUrl, (err, response, body) => {
            if (err) { console.log(err); }
            body = JSON.parse(body);
            if (!body.success && body.success === undefined) {
                return res.json({ "success": false, "msg": "captcha verification failed" });
            }
            else if (body.score < 0.5) {
                return res.json({ "success": false, "msg": "you might be a bot, sorry!", "score": body.score });
            }
            try {
                const email = req.body.email?.toString();
                console.log(email);

                let transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true,
                    auth: {
                        user: process.env.EMAIL,
                        pass: process.env.PASSWORD
                    },
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
                            from: '"ACM-VIT Summer Bootcamp" <your@email.com>',
                            to: email,
                            subject: 'Email Confirmation',
                            text: `Token: ${token}`,
                            //html: output // html body
                        };
                        transporter.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                return console.log(error);
                            }
                            console.log('Message sent: %s', info.messageId);
                        });
                    }
                });
            } catch (e) {
                res.status(500).send(e);
                console.log(e)
            }

        })
    }
})

app.listen(process.env.PORT, () => {
    console.log(`Server Started on port ${process.env.PORT}`)
})