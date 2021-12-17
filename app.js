const express = require('express');
const session = require('express-session');
const multer = require('multer');
const ffmpeg  = require('ffmpeg');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const users = require('./users');
const config = require('./config');

function hash(text)
{
	return crypto.createHash('sha256').update(text).digest('hex');
}

const redirectLogin = function(req, res, next)
{
	if(!req.session.userId){
		res.redirect('/login');
	}
	else{
		next();
	}
}

const canAccess = function(req, res, next)
{
	if(req.path.includes(req.session.userId.toString())){
		next();
	}
}

function isVideo(filename)
{
	const filetypes = /mp4/;
	const extname = filetypes.test(path.extname(filename).toLowerCase());
	return extname;
}

const storage = multer.diskStorage({
	destination: function(req, file, cb){
		cb(null, './users/'+req.session.userId+'/');
	},
	filename: function(req, file, cb){
		cb(null, file.fieldname+'-'+Date.now()+path.extname(file.originalname));
	}
});

function checkFileType(file, cb){
	const filetypes = /jpeg|jpg|jfif|png|gif|mp4/;
	const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

	const mimetype = filetypes.test(file.mimetype);

	if(extname && mimetype){
		return cb(null, true);
	}
	else{
		cb('Error: Imgaes and Videos Only', false);
	}
}

const upload = multer({
	storage: storage,
	fileFilter: function(req, file, cb){
		checkFileType(file, cb);
	}
}).array('image');


// ------------------------- create application ------------------------- //

// create express app
const app = express();

// register view engine
app.set('view engine', 'ejs');

app.listen(config.port);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// sessions
app.use(session({
	name: config.session.name,
	secret: config.session.secret,
	resave: false,
	saveUninitialized: false,
	store: users.sessionStore,
	cookie: {
		maxAge: config.session.timeout
	}
}));

app.use(function(req, res, next){
	const { userId } = req.session;
	if(userId){
		users.GetUserByID(userId, function(result){
			res.locals.user = result;
		})
	}
	next();
});

// set statics
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));
app.use('/public', express.static('public'));
app.use('/images', redirectLogin, canAccess, express.static("users"));

// ------------------------- end create application ------------------------- //

// evaluates the expression into a list of images
async function EvaluateExpression(userID, expression)
{
	return (await users.GetTagImagesFromName(userID, expression));
}


// ------------------------- get info ------------------------- //

// get the list of files
app.get('/files', redirectLogin, async function(req, res){
	const userID = await req.session.userId;
	const expression = await req.query['expression'];
	const response = await EvaluateExpression(userID, expression);
	res.send({files: response, userID: userID});
});

app.get('/imageName', redirectLogin, async function(req, res){
	const userID = await req.session.userId;
	const imageID = await req.query['imageID'];
	const response = await users.GetImageNameFromID(userID, imageID);
	res.send({name: response, userID: userID});
});

app.get('/imageTagNames', redirectLogin, async function(req, res){
	const userID = await req.session.userId;
	const imageID = await req.query['imageID'];
	if(imageID != null){
		const imageTags = await users.GetImageTagsFromID(userID, imageID);
		const response = await users.GetTagNamesFromIDs(userID, imageTags);
		res.send({tags:response, userID: userID});
	}else{
		res.send({tags: [], userID: userID})
	}
});

// ------------------------- end get info ------------------------- //


// ------------------------- pages ------------------------- //

// login page
app.get('/login', function(req, res){
	params = { "title" : config.look.title, "error" : "" };
	if(req.query['error']){
		params['error'] = req.query['error'];
	}
	res.render('login', params);
});

// register page
app.get('/register', function(req, res){
	params = { "title" : config.look.title, "error" : "" };
	if(req.query['error']){
		params['error'] = req.query['error'];
	}
	res.render('register', params);
});

// home page
app.get('/', redirectLogin, function(req, res){
	res.render('index', {"title" : config.look.title, "active" : "home"});
});

// gallery page
app.get('/gallery', redirectLogin, async function(req, res){
	const active = req.query['active'] ? req.query['active'] : '';
	res.render('gallery', {title: config.look.title, active: active, userID: req.session.userId, files: []});
});

// browseTags page
app.get('/browseTags', redirectLogin, async function(req, res){
	res.render('browseTags', {"title" : config.look.title, "active" : "browseTags", "userID": req.session.userId, "tags" : await users.GetTags(req.session.userId)});
});

// upload page
app.get('/upload', redirectLogin, function(req, res){
	res.render('upload', {"title" : config.look.title, "active" : "upload"});
});


// account page
app.get('/account', redirectLogin, function(req, res){
	res.render('account', {"title": config.look.title, "active": "account"});
});

// ------------------------- end pages ------------------------- //




// ------------------------- images and tags ------------------------- //

// upload an image
app.post('/upload', redirectLogin, upload, async function(req, res){
	// add image to user tags
	const userID = req.session.userId;
	
	let imageIDs = [];
	for(let i = 0; i < req.files.length; i++){
		const fileName = await req.files[i].filename;
		const path = req.files[i].path;
		if(isVideo(fileName) && false)
		{
			const thumbnailName = fileName.substring(0, fileName.length-3);
			const conf = {
				start_time				: 0,		// Start time to recording
				duration_time			: 1,		// Duration of recording
				frame_rate				: 1,		// Number of the frames to capture in one second
				size					: null,		// Dimension each frame
				number					: 1,		// Total frame to capture
				every_n_frames			: null,		// Frame to capture every N frames
				every_n_seconds			: null,		// Frame to capture every N seconds
				every_n_percentage		: null,		// Frame to capture every N percentage range
				keep_pixel_aspect_ratio	: true,		// Mantain the original pixel video aspect ratio
				keep_aspect_ratio		: true,		// Mantain the original aspect ratio
				padding_color			: 'black',	// Padding color
				file_name				: thumbnailName,		// File name
			};

			try{
				let proc = await new ffmpeg(path);
				proc.fnExtractFrameToJPG("users/"+userID. conf);
			}
			catch(e){
				console.log(e.code);
				console.log(e.msg);
			}
		}
		
		imageIDs.push(await users.CreateImage(userID, fileName));

	}

	let tags = ["all"];
	if(req.body["tags"])
		tags = tags.concat(req.body.tags);

	if(imageIDs.length != 0)
	{
		users.AddImageTagRelations(userID, imageIDs, tags);
		res.send('success');
	}
});

// delete images
app.delete('/removeImage', redirectLogin, async function(req, res){
	const userID = await req.session.userId;
	const imageID = req.query['imageID'];
	let filename = await users.GetImageNameFromID(userID, imageID);
	// remove image from database
	users.RemoveImage(userID, imageID);

	// delete image form files
	fs.unlink('users/'+userID+'/'+filename, function(err){
		if(err){
			console.log(err);
		}
	});

	res.send('success');
});



// add tags
app.put('/addTag', redirectLogin, function(req, res){
	users.AddImageTagRelation(req.session.userId, req.query['imageID'], req.query['tag']);
	res.send('success');
});

// remove tags
app.delete('/removeTag', redirectLogin, async function(req, res){
	const userID = await req.session.userId;
	const imageID = req.query['imageID'];
	const tag = req.query['tag'];
	if(tag != "all"){
		users.RemoveImageTagRelation(userID, imageID, tag);
		res.send('success');
	}
	else{
		res.send('cant remove tag "all".');
	}
});

// ------------------------- end images and tags ------------------------- //




// ------------------------- user auth ------------------------- //

// login
app.post('/login', async function(req, res){
	// check username
	const username = req.body.username;
	const hashedPassword = hash(req.body.password);

	let user = await users.GetUserByName(username);
	if(user == null){
		console.log('user ' + username + ' not found');
		res.redirect('/login?error=error.auth.UserNotFound');
	}
	else{
		if(user.password == hashedPassword){
			// login user
			console.log('loged in user ' + user.username);

			req.session.userId = user.id;
			res.redirect('/');
		}
		else{
			res.redirect('/login?error=error.auth.WrongPassword');
			console.log('wrong password');
		}
	}
});

// logout
function logout(req, res){
	req.session.destroy(function(err){
		if(err){
			return res.redirect('/login');
		}
		res.clearCookie(config.session.name);

		res.redirect('/login');
	});
}
app.post('/logout', redirectLogin, logout);

// register
app.post('/register', async function(req, res){

	const username = req.body.username;
	const email = req.body.email;
	const password = req.body.password;
	const confpassword = req.body.confpassword;
	const hashedPassword = hash(password);

	// check that password and confpassword match
	if(password != confpassword){
		console.log('passwords dont match');
		res.redirect('/register?error=error.auth.PasswordsDontMatch');
	}
	else
	{
		// check if the username is alredy used
		let user = await users.GetUserByName(username);
		if(user != null)
		{
			console.log('username is taken');
			res.redirect('/register?error=error.auth.UsernameTaken');
			return;
		}

		// check if the email is being used
		user = await users.GetUserByEmail(email);
		if(user != null)
		{
			console.log('email is alredy used');
			res.redirect('/register?error=error.auth.EmailUsed');
			return;
		}

		// add user to the database
		users.AddUser(
			req.body.username,
			req.body.email,
			hashedPassword,
			function(result){
				if(!result.success)
					res.redirect('/register?error=error.auth.CouldNotCreateUser');
				else
					res.redirect('/login');
		});
	}
});

app.delete('/deleteUser', redirectLogin, async function(req, res){
	const userID = await req.session.userId;
	console.log("deleting user "+userID);
	users.DeleteUser(userID);
	logout(req, res);
});

// ------------------------- end user auth ------------------------- //

app.use(function(req, res){
	res.status(404).render('error404', {page: req.url});
});