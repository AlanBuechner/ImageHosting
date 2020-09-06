const express = require('express');
const session = require('express-session');
const multer = require('multer');
const bodyParser = require('body-parser');
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

const storage = multer.diskStorage({
	destination: function(req, file, cb){
		cb(null, './users/'+req.session.userId+'/');
	},
	filename: function(req, file, cb){
		cb(null, file.fieldname+'-'+Date.now()+path.extname(file.originalname));
	}
});

function checkFileType(file, cb){
	const filetypes = /jpeg|jpg|png|gif/;
	const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

	const mimetype = filetypes.test(file.mimetype);

	if(extname && mimetype){
		return cb(null, true);
	}
	else{
		cb('Error: Imgaes Only', false);
	}
}

const upload = multer({
	storage: storage,
	fileFilter: function(req, file, cb){
		checkFileType(file, cb);
	}
}).single('image');

// create express app
const app = express();
const port = 3000;

// register view engine
app.set('view engine', 'ejs');

app.listen(port);

app.use(express.urlencoded({ extended: false }));

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

app.use(bodyParser.urlencoded({
	extended: true
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

async function EvaluateExpression(userID, expression)
{
	const files = await users.GetAllImagesFromTag(userID, expression);
	var response = [];
	for(i = 0; i < files.length; i++){
		tags = await users.GetAllTagsFromImage(userID, files[i]);
		await tags.splice(0,1);
		response.push({
			name: files[i],
			tags: tags
		});
	}
	return response;
}

// get the list of files
app.get('/files', redirectLogin, async function(req, res){
	const userID = await req.session.userId;
	const expression = await req.query['expression'];
	const response = await EvaluateExpression(userID, expression);
	res.send({files: response, userID: req.session.userId});
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

app.post('/upload', redirectLogin, upload, function(req, res){
	// add image to user tags
	const filename = req.file.filename;

	users.AddImageToTag(req.session.userId, filename, "all");

	res.redirect('./upload');
});

// delete images
app.delete('/removeImage', redirectLogin, function(req, res){
	const filename = req.query['filename'];
	// remove image from database
	users.RemoveImage(req.session.userId, filename);

	// delete image form files
	fs.unlink('users/'+req.session.userId+'/'+filename, function(err){
		if(err){
			console.log(err);
		}
	});

	res.send('success');
});

// add tags
app.put('/addTag', redirectLogin, function(req, res){
	users.AddImageToTag(req.session.userId, req.query['filename'], req.query['tag']);
	res.send('success');
});

// remove tags
app.delete('/removeTag', redirectLogin, function(req, res){
	users.RemoveImageFromTag(req.session.userId, req.query['filename'], req.query['tag']);
	res.send('success');
});

// login page
app.get('/login', function(req, res){
	params = { "title" : config.look.title, "error" : "" };
	if(req.query['error']){
		params['error'] = req.query['error'];
	}
	res.render('login', params);
});

app.post('/login', async function(req, res){
	// check username
	const username = req.body.username;
	const hashedPassword = await hash(req.body.password);

	users.GetUserByName(username, function(result){
		if(result == null){
			console.log('user ' + username + ' not found');
			res.redirect('/login?error=error.auth.UserNotFound');
		}
		else{
			if(result.password == hashedPassword){
				// login user
				console.log('loged in user ' + result.username);

				req.session.userId = result._id;
				res.redirect('/');
			}
			else{
				res.redirect('/login?error=error.auth.WrongPassword');
				console.log('wrong password');
			}
		}
	});
});

// logout
app.post('/logout', redirectLogin, function(req, res){
	req.session.destroy(function(err){
		if(err){
			return res.redirect('/login');
		}
		res.clearCookie(config.session.name);

		res.redirect('/login');
	});
});

// register page
app.get('/register', function(req, res){
	params = { "title" : config.look.title, "error" : "" };
	if(req.query['error']){
		params['error'] = req.query['error'];
	}
	res.render('register', params);
});

app.post('/register', function(req, res){

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
		users.GetUserByName(username, function(user){
			if(user != null)
			{
				console.log('username is taken');
				res.redirect('/register?error=error.auth.UsernameTaken');
			}
			else
			{
				// check if the email is being used
				users.GetUserByEmail(email, async function(user){
					if(user != null)
					{
						console.log('email is alredy used');
						res.redirect('/register?error=error.auth.EmailUsed');
					}
					else
					{
						// add user to the database
						users.AddUser(
							req.body.username,
							req.body.email,
							hashedPassword,
							function(result){
								if(!result.success)
								{
									res.redirect('/register?error=error.auth.CouldNotCreateUser');
								}
								else
								{
									res.redirect('/login');
								}
						});
					}
				});
			}
		});
	}
});

app.use(function(req, res){
	res.status(404).render('error404', {page: req.url});
});