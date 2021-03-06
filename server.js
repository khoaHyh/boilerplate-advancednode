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
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session); // Latest version breaks app
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });
const onAuthorize = require('./utilities/onAuthorize');

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

// Set up our express app to use session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false },
    key: 'express.sid',
    store: store
}));

app.use(passport.initialize());
app.use(passport.session());

// Parse and decode the cookie that contains the passport session then deserialize
// to obtain user object
io.use(
    passportSocketIo.authorize({
        cookieParser: cookieParser,
        key: 'express.sid',
        secret: process.env.SESSION_SECRET,
        store: store,
        success: onAuthorize.success,
        fail: onAuthorize.fail 
    })
);


// Connect to our db and start listening for requests
myDB(async client => {
    const myDataBase = await client.db('database').collection('users');

//    app.route('/api/test').get(async (req, res) => {
//        let { username } = req.query;
//
//        let found = await myDataBase.findOne({ username: username });
//        if (!found) {
//            console.log(`!found: ${found.username}`);
//            return res.json({ username: found.username });
//        } else {
//            console.log(found);
//            return res.json({ username: found.username });
//        }
//    });

    routes(app, myDataBase);
    auth(app, myDataBase);
   
    // Keep track of users
    let currentUsers = 0;
    // Listen for connections to our server
    io.on('connection', socket => {
        ++currentUsers;
        io.emit('user', {
            name: socket.request.user.username,
            currentUsers,
            connected: true
        });
        // Listen to the socket for the event 'chat message' and emit an event to
        // all sockets some data once the event is received
        socket.on('chat message', (message) => {
            io.emit('chat message', { name: socket.request.user.username, message });
        });
        console.log('user ' + socket.request.user.username + ' connected');
        // Listen for disconnections from our server
        socket.on('disconnect', () => {
            --currentUsers;
            io.emit('user', {
                name: socket.request.user.username,
                currentUsers,
                connected: false
            });
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
