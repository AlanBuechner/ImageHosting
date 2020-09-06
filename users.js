const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const fs = require('fs');
const config = require('./config');

const dbURI = config.db.uri;
const Schema = mongoose.Schema;

const fileSchema = new Schema({
	name: {type: String, required: true, unique: true},
	tags: {type: Array, required: false}
});

const tagSchema = new Schema({
	name: {type: String, required: true, unique: true},
	files: {type: Array, required: false}
});

const userSchema = new Schema({
	username: {type: String, required: true, unique: true},
	email: {type: String, required: true, unique: true},
	password: {type: String, required: true},
	tags: {type:Array, required: false, ref: 'Tag'},
	files: {type: Array, required: false, ref: 'File'}
},{
	timestamps: true
});

const File = mongoose.model('File', fileSchema);
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

async function AddImageToTag(userID, filename, tag)
{
	found = (await GetAllTagsFromImage(userID, filename)).find(e => e == tag);
	if(!found){
		// update tags array
		User.findById(userID).then(async function(result)
		{
			// find tag
			var foundTag = result.tags.find(element => element.name == tag);
			// add tag if dosent exist
			if(!foundTag){
				foundTag = {name: tag, files: []};
				result.tags.push(foundTag);
			}

			result.save(function(err){
				if(err){
					console.log(err);
				}
				else{
					// update tags file array
					User.updateOne({_id: userID, "tags.name": tag}, {$push: {'tags.$.files': filename}}, function(err){
						if(err){
							console.log(err);
						}
					});
				}
			});
		});

		// update files array
		User.findById(userID).then(async function(result)
		{
			// find file
			var foundFile = result.files.find(element => element.name == filename);
			// add file if dosent exist
			if(!foundFile){
				foundFile = {name: filename, tags:[]};
				result.files.push(foundFile);
			}

			result.save(function(err){
				if(err){
					console.log(err);
				}
				else{
					User.updateOne({_id: userID, "files.name": filename}, {$push: {'files.$.tags': tag}}, function(err){
						if(err){
							console.log(err);
						}
					});
				}
			});
		});
	}
}

async function RemoveImageFromTag(userID, filename, tag)
{
		// remove image from tag
		User.updateOne({
			_id: userID,
			"tags.name": tag
		},{
			"$pullAll": { "tags.$.files" : [filename] }
		}, function(err){
			if(err){
				console.log(err);
			}
		});
	
		// remove tag from image
		User.updateOne({
			_id: userID,
			"files.name": filename
		},{
			"$pullAll": { "files.$.tags" : [tag] }
		}, function(err){
			if(err){
				console.log(err);
			}
		});
}

async function RemoveImage(userID, filename)
{
	// remove image from files array
	User.updateOne({
		_id: userID,
	},{
		"$pull": { "files": { name: filename } }
	}, function(err){
		if(err){
			console.log(err);
		}
	});

	// remove image from all tags

	const tags = await GetTags(userID);

	tags.forEach(function(tag){
		User.updateOne({
			_id: userID,
			"tags.name": tag
		},{
			"$pullAll": { "tags.$.files" : [filename] }
		}, function(err){
			if(err){
				console.log(err);
			}
		});
	});
}

async function GetTags(userID)
{
	var toReturn = [];
	await User.findById(userID).then(async function(result){
		result.tags.forEach(element => toReturn.push(element.name));
	});
	return toReturn;
}

async function GetAllImagesFromTag(userID, tag)
{
	var toReturn = {};
	await User.findById(userID).then(async function(result){
		const foundTag = await result.tags.find(element => element.name == tag);
		if(foundTag){
			toReturn = foundTag.files
		}
	});
	return toReturn;
}

async function GetAllTagsFromImage(userID, filename)
{
	var toReturn = [];
	await User.findById(userID).then(async function(result){
		const foundFile = result.files.find(element => element.name == filename);
		if(foundFile){
			toReturn = foundFile.tags;
		}
	});
	return toReturn;
}

module.exports = {
	sessionStore,
	AddUser,
	GetUserByID,
	GetUserByName,
	GetUserByEmail,
	AddImageToTag,
	RemoveImageFromTag,
	RemoveImage,
	GetTags,
	GetAllImagesFromTag,
	GetAllTagsFromImage
};