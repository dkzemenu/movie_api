/**
 * Overview: This API links to a database that contains information about users and a list of movies 
 * that a user can access via the app. There are several endpoint calls that can be made that allow
 * the user to access all movies, view details about a genre, director, or summary of a movie. 
 * The user can also add or remove certain movies to a list of favorite movies specific to each user. 
 * Finally, a user can create a new account, edit any account information, or delete an account.
 */

const mongoose = require('mongoose');
const Models = require('./models.js'); 
const { check, validationResult} = require('express-validator');
// const dotenv = require('dotenv');
// dotenv.config();

//for local deploy
mongoose.connect('mongodb://127.0.0.1:27017/myFlixDB', { useNewUrlParser: true, useUnifiedTopology: true});

// mongoose.connect( process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true});


const Movies = Models.Movie;
const Users = Models.User;

const express = require('express'),
    app = express(),
    morgan = require('morgan'),
    bodyParser = require('body-parser'),
    uuid = require('uuid');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

//allow all CORS access
const cors = require('cors'); 
app.use(cors());

// Use below code for CORS limited origin access
// let allowedOrigins = ['http://localhost:4200','http://localhost:8080', 'https://movieapi-lcrt.onrender.com/', 'http://localhost:1234']
// app.use(cors({
//     origin: (origin, callback) => {
//         if (!origin) return callback (null, true); 
//         if(allowedOrigins.indexOf(origin) === -1)  {
//             return callback (new Error('The CORS policy for this app doesnt allow access from this origin ' + origin), false);
//         }
//         return callback(null, true);
//     }
// }));

let auth = require('./auth')(app);
const passport = require('passport');
require('./passport'); 

//use morgan to log requests
app.use(morgan('common'));

//endpoint with documentation
app.use(express.static('public'));



//movie app landing page
app.get('/', (req, res) => {
    res.send('welcome to the movies. This page is working');
});

//Return list of all movies
/**
 * @description get all movies
 * @name GET /movies
 * * Response data format
 * {
 *   _id: ObjectID
 *   "Title": "",
 *   "Description": "",
 *   "Genre": ObjectID,
 *   "Director": [ObjectID],
 *   "Actors": [ObjectID],
 *   "ImagePath": "",
 *   "Featured": Boolean,
 * }
 */
app.get('/movies',
// passport.authenticate('jwt', {session: false}), 
(req, res) => {
    Movies.find()
    .then((movies) =>
    {res.status(201).json(movies);
    })
    .catch((err) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
    }) 
});

//Return data about single movie by title
/**
 * @description get single movie by title
 * @name GET /movies/:Title
 * * Response data format
 * {
 *   _id: ObjectID
 *   "Title": "",
 *   "Description": "",
 *   "Genre": ObjectID,
 *   "Director": [ObjectID],
 *   "Actors": [ObjectID],
 *   "ImagePath": "",
 *   "Featured": Boolean,
 * }
 */
app.get('/movies/:Title', passport.authenticate('jwt', {session: false}), (req,res) => {
    Movies.findOne( {Title: req.params.Title})
    .then((movie) => {
        res.json(movie);
    })
    .catch((err) => {
    console.error(err);
    res.status(500).send('Error: ' + err);
    });
});

//Return data about movie genre
/**
 * @description get movie genre details
 * @name GET /movies/genre_description/:genre
 * * Response data format
 * {
 *   "Genre": ObjectID
 * }
 */
app.get('/movies/genre_description/:Genre', passport.authenticate('jwt', {session: false}),(req, res) => {
	Movies.findOne({ 'Genre.Name': req.params.Genre })
		.then((movie) => {
			if (!movie) {
				return res.status(404).send('Error: ' + req.params.Genre + ' was not found');
			} else {
				res.status(200).json(movie.Genre.Description);
			}
		})
		.catch((err) => {
			console.error(err);
			res.status(500).send('Error: ' + err);
		});
});

//Return data about director
/**
 * @description get movie directoro details
 * @name GET /movies/director_description/:director
 * * Response data format
 * {
 *   "Director": [ObjectID]
 * }
 */
app.get('/movies/director_description/:Director', passport.authenticate('jwt', {session: false}),(req, res) => {
	Movies.findOne({ 'Director.Name': req.params.Director })
		.then((movie) => {
			if (!movie) {
				return res.status(404).send('Error: ' + req.params.Director + ' was not found');
			} else {
				res.status(200).json(movie.Director);
			}
		})
		.catch((err) => {
			console.error(err);
			res.status(500).send('Error: ' + err);
		});
});

//Create Allow new users to register
/**
 * @description Allow a new user to register
 * @name POST /users
 * request data format
* {
    Username: string,
    Password: string,
    Email: string,
    Birthday: date
}
*response data format
* We’ll expect JSON in this format
*{
  ID: Integer,
  Username: String,
  Password: String,
  Email: String,
  Birthday: Date
} */ 
app.post('/users',[check('Username', 'Username is required').isLength({min: 5}), 
        check( 'Username', 'Username contains non alphanumeric characters - not allowed').isAlphanumeric(),
        check('Password', 'Password is required').not().isEmpty(),
        check('Email', 'Email does not appear to be valid').isEmail()
        ], (req, res) => {
    let errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(422).json({errors: errors.array()});
    }
    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({Username: req.body.Username})
    .then((user) => {
        if(user) {
            return res.status(400).send(req.body.Username + ' already exists');
        } else {
            Users
                .create({
                    Username: req.body.Username,
                    Password: hashedPassword, 
                    Email: req.body.Email, 
                    Birthday: req.body.Birthday
                })
                .then((user) => {res.status(201).json(user)})
                .catch((error) => {console.error(error);
                    res.status(500).send('Error: ' + error); 
                })
        }
    })
    .catch((error) => {
        console.error(error);
        res.status(500).send('Error: ' + error);
    });
});


// get all users 
app.get('/users', passport.authenticate('jwt', {session: false}), (req, res) => {
    Users.find()
        .then((users) => {
            res.status(201).json(users);
        })
        .catch((err) => {
            console.error(err);
            res.status(500).send('Error: ' + err);
        });
});

// get users by username
/**
 * @description Get a user info by username
 * @name GET /users
 * request data format
* {
    Username: string
}
*response data format
* We’ll expect JSON in this format
*{
  ID: Integer,
  Username: String,
  Password: String,
  Email: String,
  Birthday: Date
} */ 
app.get('/users/:Username', passport.authenticate('jwt', {session: false}),(req, res) => {
    Users.findOne({Username: req.params.Username})
    .then((user) => {
        res.json(user);
    })
    .catch((err)=> {
        console.error(err);
        res.status(500).send('Error: ' + err);
    });
});

/**
* @description Update a users info by Username
* @name PUT /user/:username
*request data format
* {
    username: string,
    password: string,
    email: string,
    birthday: date
}
*response data format
*Well expect JSON in this format 
*{Username: String, (required)
Password: String, (required)
Email: String, (required)
Birthday: Date
}
 */
app.put('/users/:Username', [check('Username', 'Username is required').isLength({min: 5}), 
check( 'Username', 'Username contains non alphanumeric characters - not allowed').isAlphanumeric(),
check('Password', 'Password is required').not().isEmpty(),
check('Email', 'Email does not appear to be valid').isEmail()
],(req, res) => {
    let hashedPassword = Users.hashPassword(req.body.Password);
	Users.findOneAndUpdate(
		{ Username: req.params.Username },
		{
			$set: {
				Username: req.body.Username,
				Password: hashedPassword,
				Email: req.body.Email,
				Birthday: req.body.Birthday,
			},
		},
		{ new: true }
	)
		.then((user) => {
			if (!user) {
				return res.status(404).send('Error: No user was found');
			} else {
				res.json(user);
			}
		})
		.catch((err) => {
			console.error(err);
			res.status(500).send('Error: ' + err);
		});
});

//Update Allow users to add a movie to their favorites
/**
 * @description allows a user to add a movie to their favorite movies list
 * @name POST /users/:username/movies/:MovieID
 */
app.post('/users/:Username/movies/:MovieID', passport.authenticate('jwt', {session: false}),(req, res) =>{
    Users.findOneAndUpdate({ Username: req.params.Username}, {
        $push: {FavoriteMovies: req.params.MovieID}
    },
    { new: true})
    .then((updatedUser) => {
        if(!updatedUser) {
            return res.send('Error: No user');
        } else {
            res.json(updatedUser);
        }
    })
    .catch((error) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
    });
});

//Delete Allow users to delete a movie from their favorites
/**
 * @description allows a user to delete a movie from their favorites list
 * @name DELETE /users/:username/movies/:MovieID
 */
app.delete('/users/:Username/movies/:MovieID', passport.authenticate('jwt', {session: false}),(req, res) =>{
    Users.findOneAndUpdate({ Username: req.params.Username}, {
        $pull: {FavoriteMovies: req.params.MovieID}
    },
    { new: true})
    .then((updatedUser) => {
        if(!updatedUser) {
            return res.send('Error: No user');
        } else {
            res.json(updatedUser);
        }
    })
    .catch((error) => {
        console.error(err);
        res.status(500).send('Error: ' + err);
    });
});

//Delete Allow users to deregister
/**
 * @description allows a user to delete their user profile from the database
 * @name DELETE /users/:username
 */
app.delete('/users/:Username',passport.authenticate('jwt', {session: false}), (req, res) => {
    Users.findOneAndRemove({Username: req.params.Username})
    .then ((user) => {
        if(!user) {
            res.status(400).send(req.params.Username + ' was not found');
        } else {
            res.status(200).send(req.params.Username + ' was deleted forever');
        }
    })
    .catch((err) => {
        console.error(err);
        res.status(500).send('Error: '+ err);
    });
});



//error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Send help, I broke');
})

//listen for requests
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
    console.log('listening on port ' + port);
});
