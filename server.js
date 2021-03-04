'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const app = express();
const session = require('express-session');
const passport = require('passport');
const routes = require('./routes');
const auth = require('./auth');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

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

    routes(app, myDataBase);
    auth(app, myDataBase);

    // Keep track of users
    let currentUsers = 0;
    // Listen for connections to our server
    io.on('connection', socket => {
        ++currentUsers;
        io.emit('user count', currentUsers);
        console.log('A user has connected');

        // Listen for disconnections from our server
        socket.on('disconnect', () => {
            --currentUsers;
            io.emit('user count', currentUsers);
            console.log('A user has disconnected');
        });
    });
}).catch(e => {
    app.route('/').get((req, res) => {
        res.render('pug', { title: e, message: 'Unable to login' });
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log('Listening on port ' + PORT);
});
