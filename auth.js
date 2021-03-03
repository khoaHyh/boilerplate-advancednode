const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const ObjectID = require('mongodb').ObjectID;

const auth = (app, myDatabase) => {
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
}

module.exports = auth
