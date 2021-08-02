const {Pool, Client} = require('pg');
const UUID = require('uuid-int');
const session = require('express-session');
const pgSessionStore = require('connect-pg-simple')(session);
const fs = require('fs');
const config = require('./config');

function userUUID(){
	return UUID(0).uuid();
}

function imageUUID(){
	return Date.now();
}

function tagUUID(){
	return Date.now();
}

// ------------------------- create connectiont to database ------------------------- //
const sessionPool = new Pool({
	connectionString: config.db.uri
});

const sessionStore = new pgSessionStore({
	pool: sessionPool
});

const db = new Client({
	connectionString: config.db.uri
});

db.connect()
.then(async ()=>{
	console.log("connected to postgresql");
}).catch(e=>{
	console.log("faild to connect to postgresql");
	console.log(e)
});


async function query(sql, values){
	return (await db.query(sql, values)).rows;
}

// ------------------------- end create connectiont to database ------------------------- //




// ------------------------- get and add user ------------------------- //
// function to add a user to the database
async function AddUser(username, email, password, callback)
{
	let uuid = userUUID();
	let sql = "insert into Users (id, username, password, email) values($1, $2, $3, $4)";
	db.query(sql, [uuid, username, password, email], async function(err){
		if(err){ 
			callback({success: false});
			console.log(err);
			return;
		}

		await db.query("create table Tags" + uuid + "(id bigint not null, name varchar(255) not null, images bigint[] not null, primary key(id))"); // add a tages table
		await db.query("create table Images" + uuid + "(id bigint not null, name varchar(255) not null, tags bigint[] not null, primary key(id))"); // add a images table

		// create a folder for the user
		fs.mkdir("users/"+uuid, function(err){
			if(err) console.log(err);
			else console.log("created folder \"users/"+uuid+"\"");
		});

		callback({success: true});
	});
}

async function DeleteUser(userID)
{
	// remove user from users table
	query("delete from Users where id = '"+userID+"'");

	// remove users image table
	query("drop table Images"+userID);

	// remove users tag table
	query("drop table Tags"+userID);

	// delete users folder

	fs.rmdir("users/"+userID, {recursive: true}, err => {
		if(err) console.log(err);
	});
}

async function GetUser(condition, value)
{
	let sql = "select * from Users where "+condition+" = '"+value+"'";
	let result = await query(sql);

	if(result.length == 0)
		return null;
	else
		return result[0];
}

// get the user by the id
async function GetUserByID(id)
{
	return await GetUser("id", id);
}

// get the user by there user name
async function GetUserByName(username)
{
	return await GetUser("username", username);
}

// get the user by there email
async function GetUserByEmail(email)
{
	return await GetUser("email", email);
}

// ------------------------- end get and add user ------------------------- //




// ------------------------- images and tags ------------------------- //

// checks if a tag exists
async function TagExists(userID, name)
{
	let result = await query("select id from Tags"+userID+" where name = '"+name+"'");
	return result.length != 0;
}

// checks if a image exists
async function ImageExists(userID, name)
{
	let result = await query("select id from Images"+userID+" where name = '"+name+"'");
	return result.length != 0;
}

// checks if a image exists
async function ImageExistsFromID(userID, imageID)
{
	let result = await query("select id from Images"+userID+" where id = '"+imageID+"'");
	return result.length != 0;
}

// gets a list of tags 
async function GetTags(userID)
{
	let tags = [];
	let result = await query("select name from Tags"+userID);
	for(let i = 0; i < result.length; i++){
		tags.push(result[i].name);
	}
	return tags;
}

// create a new tag or return the id of one that exists
async function CreateTag(userID, name)
{
	let id = -1;
	// add the tag if it dosent exitst
	if(!(await TagExists(userID, name))){
		// create a id for the new tag
		id = tagUUID();
		await query("insert into Tags"+userID+" values($1, $2, $3)", [id, name, []]); // add new tag to tags
	}
	else{
		// get the id for the tag
		id = (await query("select id from Tags"+userID+" where name = '"+name+"'"))[0].id;
	}
	return id;
}

async function CreateImage(userID, name)
{
	let id = -1;
	// add the image if it dosent exitst
	if(!(await ImageExists(userID, name))){
		console.log("createing image " + name);
		// create a id for the new tag
		id = imageUUID();
		await query("insert into Images"+userID+" values($1, $2, $3)", [id, name, []]); // add new image to images
	}
	else{
		// get the id for the tag
		id = (await query("select id from Images"+userID+" where name = '"+name+"'"))[0].id;
	}
	return id;
}

// removes an image
async function RemoveImage(userID, imageID)
{
	// get all the tags for the image
	let tagIDs = await GetImageTagsFromID(userID, imageID);
	let tags = await GetTagNamesFromIDs(userID, tagIDs);

	// remove image from the images array
	query("delete from Images"+userID+" where id = '"+imageID+"'");

	// remove the image from all the tags images array
	for(let i = 0; i < (await tags).length; i++){
		await RemoveImageTagRelation(userID, imageID, tags[i]);
	}
}

// ---------------------------- get tag info from name ----------------------------

// get the tag from the name
async function GetTagFromName(userID, name){
	return (await query("select * from Tags"+userID+" where name = '"+name+"'"))[0];
}

// get the tag id from the name
async function GetTagIDFromName(userID, name){
	return (await query("select id from Tags"+userID+" where name = '"+name+"'"))[0].id;
}

// get the images from the name
async function GetTagImagesFromName(userID, name){
	let result = (await query("select images from Tags"+userID+" where name = '"+name+"'"))[0];
	return result == null? [] : result.images;
}

// ---------------------------- get tag info from id ----------------------------

// get the tag from the id
async function GetTagFromID(userID, tagID){
	return (await query("select * from Tags"+userID+" where id = '"+tagID+"'"))[0];
}

// get the name from the id
async function GetTagNameFromID(userID, tagID){
	return (await query("select name from Tags"+userID+" where id = '"+tagID+"'"))[0].name;
}

async function GetTagNamesFromIDs(userID, tagIDs){
	let tags = [];
	let result = await query("select name from Tags"+userID+" where id in ("+tagIDs.join(",")+")");
	for(let i = 0; i < result.length; i++){
		tags.push(result[i].name);
	}
	return tags;
}

// get the images from the id
async function GetTagImagesFromID(userID, tagID){
	return (await query("select images from Tags"+userID+" where id = '"+tagID+"'"))[0].images;
}

// ---------------------------- get image info from id ----------------------------

// get the image from the id
async function GetImageFromID(userID, imageID){
	return (await query("select * from Images"+userID+" where id = '"+imageID+"'"))[0];
}

// get the name from the id
async function GetImageNameFromID(userID, imageID){
	return (await query("select name from Images"+userID+" where id = '"+imageID+"'"))[0].name;
}

// get the tags from the id
async function GetImageTagsFromID(userID, imageID){
	let result = (await query("select tags from Images"+userID+" where id = '"+imageID+"'"))[0];
	return result == null ? [] : result.tags;
}



// addes a image tag relation
async function AddImageTagRelation(userID, imageID, tag)
{
	// create a id for the image
	let tagID = await CreateTag(userID, tag);

	// add the tag to the image
	query("update Images"+userID+" set tags = array_append(tags, "+tagID+") where id = '"+imageID+"'");

	// add the image to the tag
	query("update Tags"+userID+" set images = array_append(images, "+imageID+") where id = '"+tagID+"'");
}

// addes a image tag relation
async function AddImageTagsRelation(userID, imageID, tags)
{
	// get list of ids for the tags
	let tagIDs = [];
	for(let i = 0; i < tags.length; i++){
		tagIDs.push(await(CreateTag(userID, tags[i])));
	}

	// add the tag to the image
	query("update Images"+userID+" set tags = array_cat(tags, array["+tagIDs.join(",")+"]) where id = '"+imageID+"'");

	// add the image to the tag
	query("update Tags"+userID+" set images = array_append(images, "+imageID+") where id in ("+tagIDs.join(",")+")");
}

// addes a image tag relation
async function AddImageTagRelations(userID, imageIDs, tags)
{
	// get list of ids for the tags
	let tagIDs = [];
	for(let i = 0; i < tags.length; i++){
		tagIDs.push(await(CreateTag(userID, tags[i])));
	}

	// add the tag to the image
	query("update Images"+userID+" set tags = array_cat(tags, array["+tagIDs.join(",")+"]) where id in ("+imageIDs.join(",")+")");

	// add the image to the tag
	query("update Tags"+userID+" set images = array_cat(images, array["+imageIDs.join(",")+"]) where id in ("+tagIDs.join(",")+")");
}

// removes an image from a tag
async function RemoveImageTagRelation(userID, imageID, tag)
{
	// get the tag id
	tagID = await GetTagIDFromName(userID, tag);

	// remove the tag from the image
	// check if the image existes
	if(ImageExistsFromID(userID, imageID)){
		// get the tags from the image
		let tags = await GetImageTagsFromID(userID, imageID);

		// remove the tag from the array
		let index = tags.indexOf(tagID);
		if (index > -1){
			tags.splice(index, 1);
			query("update Images"+userID+" set tags = '{"+tags.join(',')+"}' where id = '"+imageID+"'");
		}
	}


	// remove the image from the tag
	let images = await GetTagImagesFromID(userID, tagID);
	index = images.indexOf(imageID);
	if(index > -1){
		images.splice(index, 1);
		query("update Tags"+userID+" set images = '{"+images.join(',')+"}' where id = '"+tagID+"'");
	}

}

// ------------------------- end images and tags ------------------------- //


module.exports = {
	// session
	sessionStore,
	// user
	AddUser,
	DeleteUser,
	GetUserByID,
	GetUserByName,
	GetUserByEmail,
	// tags
	TagExists,
	ImageExists,
	GetTags,
	CreateTag,
	CreateImage,
	// tag info from id
	GetTagFromID,
	GetTagNameFromID,
	GetTagImagesFromID,
	RemoveImage,
	// tag info from name
	GetTagFromName,
	GetTagIDFromName,
	GetTagImagesFromName,
	// image info from id
	GetImageFromID,
	GetImageNameFromID,
	GetTagNamesFromIDs,
	GetImageTagsFromID,

	AddImageTagRelation,
	AddImageTagsRelation,
	AddImageTagRelations,
	RemoveImageTagRelation,

};