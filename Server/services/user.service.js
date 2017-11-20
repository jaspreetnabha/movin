var config = require('config.json');
var _ = require('lodash');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var Q = require('q');
var mongo = require('mongoskin');
var mongoose = require('mongoose');
var connString = 'mongodb://listituser:listitpwd@ds015720.mlab.com:15720/listit';
// var con = 'mongodb://jaspreetnabha:Passw0rd!@movin-shard-00-00-tlpv6.mongodb.net:27017,movin-shard-00-01-tlpv6.mongodb.net:27017,movin-shard-00-02-tlpv6.mongodb.net:27017/test?ssl=true&replicaSet=movin-shard-0&authSource=admin';
mongoose.connect(connString, {useMongoClient: true});
var schema = mongoose.Schema;

var db = mongoose.connection;

var userSchema = new schema({
    name: {
        type: String
    },
    hash: {
        type: String
    },
    password: {
        type: String
    }
});

var User = mongoose.model('User', userSchema);
 
var service = {};
 
service.authenticate = authenticate;
service.getAll = getAll;
service.getById = getById;
service.create = create;
service.update = update;
service.delete = _delete;
 
module.exports = service;
 
function authenticate(username, password) {
    var deferred = Q.defer();
 
    User.findOne({ username: username }, function (err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);

        if (user && bcrypt.compareSync(password, user.hash)) {
            // authentication successful
            deferred.resolve({
                _id: user._id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                token: jwt.sign({ sub: user._id }, config.secret)
            });
        } else {
            // authentication failed
            deferred.resolve();
        }
    });
 
    return deferred.promise;
}
 
function getAll() {
    var deferred = Q.defer();
 
    User.find().toArray(function (err, users) {
        if (err) deferred.reject(err.name + ': ' + err.message);
 
        // return users (without hashed passwords)
        users = _.map(users, function (user) {
            return _.omit(user, 'hash');
        });
 
        deferred.resolve(users);
    });
 
    return deferred.promise;
}
 
function getById(_id) {
    var deferred = Q.defer();
 
    User.findById(_id, function (err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);
 
        if (user) {
            // return user (without hashed password)
            deferred.resolve(_.omit(user, 'hash'));
        } else {
            // user not found
            deferred.resolve();
        }
    });
 
    return deferred.promise;
}
 
function create(userParam) {
    var deferred = Q.defer();

    console.log(userParam);
 
    // validation
    User.findOne(
        { username: userParam.username },
        function (err, user) {
            if (err) deferred.reject(err.name + ': ' + err.message);
 
            if (user) {
                // username already exists
                deferred.reject('Username "' + userParam.username + '" is already taken');
            } else {
                console.log('inside create user');
                createUser();
            }
        });
 
    function createUser() {
        // set user object to userParam without the cleartext password
        var user = _.omit(userParam, 'password');
 
        // add hashed password to user object
        console.log(userParam);
        console.log(userParam.password);
        //user.hash = bcrypt.hashSync(userParam.password, 10);
        
        // users.insert(
        //     user,
        //     function (err, doc) {
        //         if (err) deferred.reject(err.name + ': ' + err.message);
 
        //         deferred.resolve();
        //     });

        var newUser = new User({
            name: userParam.username,
            hash: bcrypt.hashSync(userParam.password, 10)
        });

        newUser.save(function (err, doc) {
                     if (err) deferred.reject(err.name + ': ' + err.message);
     
                     deferred.resolve();
                 });
    }
 
    return deferred.promise;
}
 
function update(_id, userParam) {
    var deferred = Q.defer();
 
    // validation
    User.findById(_id, function (err, user) {
        if (err) deferred.reject(err.name + ': ' + err.message);
 
        if (user.username !== userParam.username) {
            // username has changed so check if the new username is already taken
            users.findOne(
                { username: userParam.username },
                function (err, user) {
                    if (err) deferred.reject(err.name + ': ' + err.message);
 
                    if (user) {
                        // username already exists
                        deferred.reject('Username "' + req.body.username + '" is already taken')
                    } else {
                        updateUser();
                    }
                });
        } else {
            updateUser();
        }
    });
 
    function updateUser() {
        // fields to update
        var set = {
            firstName: userParam.firstName,
            lastName: userParam.lastName,
            username: userParam.username,
        };
 
        // update password if it was entered
        if (userParam.password) {
            set.hash = bcrypt.hashSync(userParam.password, 10);
        }
 
        users.update(
            { _id: mongo.helper.toObjectID(_id) },
            { $set: set },
            function (err, doc) {
                if (err) deferred.reject(err.name + ': ' + err.message);
 
                deferred.resolve();
            });
    }
 
    return deferred.promise;
}
 
function _delete(_id) {
    var deferred = Q.defer();
 
    User.remove(
        { _id: mongo.helper.toObjectID(_id) },
        function (err) {
            if (err) deferred.reject(err.name + ': ' + err.message);
 
            deferred.resolve();
        });
 
    return deferred.promise;
}