const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const users = require('./users');
const config = require('./config');

function hash(text)
{
	return crypto.createHash('sha256').update(text).digest('hex');
}

// create express app
const app = express();
const port = 3000;

// register view engine
app.set('view engine', 'ejs');

app.listen(port);

// set statics
app.use('/css', express.static('css'));
app.use('/js', express.static('js'));

app.use(express.urlencoded({ extended: false }));

// sessions
app.use(session({
	name: config.session.name,
	secret: config.session.secret,
	resave: false,
	saveUninitialized: false,
	store: users.sessionStore,
	cookie: {
		maxAge: 1000 * 60 * 60
	}
}));

app.use(bodyParser.urlencoded({
	extended: true
}));

const redirectLogin = function(req, res, next)
{
	if(!req.session.userId){
		res.redirect('/login');
	}
	else{
		next();
	}
}

app.use(function(req, res, next){
	const { userId } = req.session;
	if(userId){
		users.GetUserByID(userId, function(result){
			res.locals.user = result;
		})
	}
	next();
});

// home page
app.get('/', redirectLogin, function(req, res){
	res.render('index', {"title" : config.look.title, "active" : "home"});
});

// favorites page
app.get('/favorites', redirectLogin, function(req, res){
	res.render('favorites', {"title" : config.look.title, "active" : "favorites"})
});

// browseTags page
app.get('/browseTags', redirectLogin, function(req, res){
	res.render('browseTags', {"title" : config.look.title, "active" : "browseTags"})
});

// browseAll page
app.get('/browseAll', redirectLogin, function(req, res){
	res.render('browseAll', {"title" : config.look.title, "active" : "browseAll"})
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