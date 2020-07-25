const cors = require('cors');
const express = require('express');
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const {
    signup,
    login,
    addUserDetails,
    userProfile,
} = require('./routes/users');
const firebaseAuth = require('./utils/firebaseAuth');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post('/users/signup', signup);
app.post('/users/login', login);
app.post('/users/user', firebaseAuth, addUserDetails);
app.get('/users/profile', firebaseAuth, userProfile);

exports.api = functions.https.onRequest(app);
