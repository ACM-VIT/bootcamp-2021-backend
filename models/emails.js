const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//create user Schema & model
const EmailSchema = new Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true
    }
    });

const Email = mongoose.model('Email', EmailSchema);
module.exports = Email;