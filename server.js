'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const app = express();
const session = require('express-session');
const passport = require('passport');
const ObjectID = require('mongodb').ObjectID;
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');

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
            message: 'Please login',
            showLogin: true,
            showRegistration: true
        });
    });

    // Authenticate on route /login
    app.route('/login').post(passport.authenticate('local', 
        { failureRedirect: '/' }), (req, res) => {
            res.redirect('/profile');
    });

    // If authentication middleware passes, redirect user to /profile
    // If authentication was successful, the user object will be saved in req.user
    app.route('/profile').get(ensureAuthenticated, (req, res) => {
        res.render(process.cwd() + '/views/pug/profile', { username: req.user.username });
    });

    // Unauthenticate user
    app.route('/logout').get((req, res) => {
        req.logout();
        res.redirect('/');
    });
    
    // Allow a new user on our site to register an account
    app.route('/register').post(
        (req, res, next) => {
            // Implement saving a hash
            const hash = bcrypt.hashSync(req.body.password, 12);
            // Check if user exists already
            myDataBase.findOne({ username: req.body.username }, (err, user) => {
                if (err) {
                    next(err);
                } else if (user) {
                    res.redirect('/');
                } else {
                    myDataBase.insertOne({
                        username: req.body.username,
                        password: hash
                    },
                        (err, doc) => {
                            if (err) {
                                res.redirect('/');
                            } else {
                                // The inserted document is held within
                                // the ops property of the doc
                                next(null, doc.ops[0]);
                            }
                        }
                    );
                }
            });
        },
        passport.authenticate('local', { failureRedirect: '/' }), (req, res, next) => {
            res.redirect('/profile');
        }
    );

    // Handle missing pages (404)
    app.use((req, res, next) => {
        res.status(404).type('text').send('Not Found');
    });

    // Convert object contents into a key
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    // Convert key into original object
    passport.deserializeUser((id, done) => {
        myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
            if (err) return console.error(`myDataBase.findOne error: ${err}`);
            done(null, doc);
        });
    });

    // Define process to use when we try to authenticate someone locally
    passport.use(new LocalStrategy(
        (username, password, done) => {
            myDataBase.findOne({ username: username }, (err, user) => {
                console.log('User '+ username +' attempted to log in.');
                if (err) { return done(err); }
                if (!user) { return done(null, false); }
                // if (password !== user.password) { return done(null, false); }
                if (!bcrypt.compareSync(password, user.password)) {
                    return done(null, false);
                }
                return done(null, user);
            });
        }
    ));
}).catch(e => {
    app.route('/').get((req, res) => {
        res.render('pug', { title: e, message: 'Unable to login' });
    });
});

// Middleware to check if a user is authenticated
// Prevents users going to /profile whether they authenticated or not
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Listening on port ' + PORT);
});
