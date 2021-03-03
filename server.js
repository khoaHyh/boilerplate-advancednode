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

// Connect to our db and start listening for requests
myDB(async client => {
    const myDataBase = await client.db('database').collection('users');

    // Be sure to change the title
    app.route('/').get((req, res) => {
    //Change the response to render the Pug template
        res.render('pug', {
            title: 'Connected to Database',
            message: 'Please login'
        });
    });

    // Convert object contents into a key
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    // Convert key into original object
    passport.deserializeUser((id, done) => {
        myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
            done(null, null);
        });
    });
}).catch(e => {
    app.route('/').get((req, res) => {
        res.render('pug', { title: e, message: 'Unable to login' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Listening on port ' + PORT);
});
