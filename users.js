const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const fs = require('fs');
const config = require('./config');

const dbURI = config.db.uri;
const Schema = mongoose.Schema;

const tagSchema = new Schema({
	name: {type: String, required: true, unique: true},
	files: {type: Array, required: false}
});

const userSchema = new Schema({
	username: {type: String, required: true, unique: true},
	email: {type: String, required: true, unique: true},
	password: {type: String, required: true},
	tags: {type:Array, required: false, ref: 'Tag'}
},{
	timestamps: true
});

const Tag = mongoose.model('Tag', tagSchema);
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
		password: password,
	});

	user.save().then(function(res){
		console.log('added user ' + username);
		callback({ success: true, result: res });

		const path = './users/'+res._id;

		if(fs.existsSync(path)){
			fs.rmdirSync(path, {recursive: true});
		}

		fs.mkdir(path, function(err){
			if(err){
				console.log(err);
			}
		});
		
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

function AddImage(userID, filename, tag)
{
	User.findById(userID).then(async function(result)
	{
		// find tag
		var foundTag = result.tags.find(element => element.name == tag);
		// add tag if dosent exist
		if(!foundTag){
			foundTag = {name: tag, files: []}
			result.tags.push(foundTag);
		}

		await result.save(function(err){
			if(err){
				console.log(err);
			}
			else{
			}
		});

		// update tags file array
		await User.update({_id: userID, "tags.name": tag}, {$push: {'tags.$.files': filename}});
	});
}

module.exports = {
	sessionStore,
	AddUser,
	GetUserByID,
	GetUserByName,
	GetUserByEmail,
	AddImage,
};