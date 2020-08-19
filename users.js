const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const config = require('./config');

const dbURI = config.db.uri;
const Schema = mongoose.Schema;

const userSchema = new Schema({
	username: {type: String, required: true},
	email: {type: String, required: true},
	password: {type: String, required: true}
},{
	timestamps: true
});

const User = mongoose.model('User', userSchema);

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true}).then(function(result){
	console.log('connected to database');
});

// sessionStore
const sessionStore = new MongoStore({
	mongooseConnection: mongoose.connection,
	collection: 'sessions'
});

function AddUser(username, email, password, callback)
{
	const user = new User({
		username: username,
		email: email,
		password: password
	});

	user.save().then(function(res){
		console.log('added user ' + username);
		callback({ success: true, result: res });
		
	}).catch(function(err){
		console.log('error adding user ' + username);
		console.log(err)
		callback({ success: false, result: err });
	});
}

function GetUserByID(id, callback)
{
	User.findById(id).then(function(result){
		if(result.length == 0){	
			callback(null);
		}
		else{
			callback(result[0]);
		}
	});
}

function GetUserByName(username, callback)
{
	User.find({username: username}).then(function(result){
		if(result.length == 0){	
			callback(null);
		}
		else{
			callback(result[0]);
		}
	});
}

function GetUserByEmail(email, callback)
{
	User.find({email: email}).then(function(result){
		if(result.length == 0){	
			callback(null);
		}
		else{
			callback(result[0]);
		}
	});
}

module.exports = {
	sessionStore,
	AddUser,
	GetUserByID,
	GetUserByName,
	GetUserByEmail
};