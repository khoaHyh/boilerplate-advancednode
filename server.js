'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const app = express();

// Implement a Root-Level Request Logger Middleware
app.use((req, res, next) => {
    console.log(req.method + " " + req.path + " - " + req.ip);
    next();
});

// template engine lets us use static template files in our app
app.set('view engine', 'pug');

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.route('/').get((req, res) => {
    // set path to views/pug directory and pass variables
    res.render(process.cwd() + '/views/pug/index', {title: 'Hello', message: 'Please login'});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Listening on port ' + PORT);
});
