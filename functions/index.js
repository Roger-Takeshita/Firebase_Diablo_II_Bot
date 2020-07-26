const cors = require('cors');
const express = require('express');
const functions = require('firebase-functions');

const usersPath = require('./routes/users');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.use('/users', usersPath);

exports.api = functions.https.onRequest(app);
