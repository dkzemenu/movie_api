const mongoose = require('mongoose');
const Models = require('./models.js'); 
const { check, validationResult} = require('express-validator');
// const dotenv = require('dotenv');
// dotenv.config();

// mongoose.connect('mongodb://127.0.0.1:27017/cfDB', { useNewUrlParser: true, useUnifiedTopology: true});

mongoose.connect( process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true});


const Movies = Models.Movie;
const Users = Models.User;

const express = require('express'),
    app = express(),
    morgan = require('morgan'),
    bodyParser = require('body-parser'),
    uuid = require('uuid');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
const cors = require('cors'); 
app.use(cors());
// let allowedOrigins = ['http://localhost:8080', 'https://movieapi-lcrt.onrender.com/', 'http://localhost:1234']
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
    res.send('welcome to the movies');
});

//Return list of all movies
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
/* We’ll expect JSON in this format
{
  ID: Integer,
  Username: String,
  Password: String,
  Email: String,
  Birthday: Date
}*/
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

// Update a users info by Username
// Well expect JSON in this format 
// {Username: String, (required)
// Password: String, (required)
// Email: String, (required)
// Birthday: Date
// }
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
