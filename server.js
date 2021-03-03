'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const app = express();
const session = require('express-session');
const passport = require('passport');
const ObjectID = require('mongodb').ObjectID;

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
app.use(passport.initialize());
app.use(passport.session());

// Set up our express app to use session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.route('/').get((req, res) => {
    res.render('pug');
    // set path to views/pug directory and pass variables
    res.render(process.cwd() + '/views/pug/index', {title: 'Hello', message: 'Please login'});
});

// Convert object contents into a key
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Convert key into original object
passport.deserializeUser((id, done) => {
  //myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
    done(null, null);
  //});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Listening on port ' + PORT);
});
