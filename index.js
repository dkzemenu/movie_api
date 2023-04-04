const express = require('express'),
    app = express(),
    morgan = require('morgan'),
    bodyParser = require('body-parser'),
    uuid = require('uuid');

app.use(bodyParser.json());

let users = [
    {
        id: 1,
        name: "Kim",
        favoriteMovies: []
    }, 
    {
        id: 2,
        name: "Joe",
        favoriteMovies: ["The Fast and The Furious"]
    }
];

//use morgan to log requests
app.use(morgan('common'));

//endpoint with documentation
app.use(express.static('public'));

//json array with movie data
const data = require('./movie-info.json');
let topMovies = data;

//movie app landing page
app.get('/', (req, res) => {
    res.send('welcome to the movies');
});



//Return list of all movies
app.get('/movies', (req, res) => {
    res.json(topMovies);
});

//Return data about single movie by title
app.get('/movies/:title', (req, res) => {
    const { title } = req.params;
    const movie = topMovies.find( movie => movie.title === title); 

    if (movie) {
        res.json(movie);
    } else {
        res.status(400).send('movie not found');
    }
});

//Return data about movie genre
app.get('/movies/genre/:genreName', (req, res) => {
    const { genreName } = req.params;
    const genre = topMovies.find( movie => movie.genre.name === genreName).genre; 

    if (genre) {
        res.json(genre);
    } else {
        res.status(400).send('genre not found');
    }
});

//Return data about director
app.get('/movies/directors/:directorName', (req, res) => {
    // const { directorName } = req.params;
    // const director = topMovies.find( movie => movie.director.name === directorName); 

    // if (director) {
    //     res.json(director);
    // } else {
    //     res.status(400).send('director not found');
    // }

    res.send('Successful get request returning data on the director');
});

//Create Allow new users to register
app.post('/users', (req, res) => {
    const newUser = req.body;

    if (newUser.name) {
        newUser.id = uuid.v4();
        users.push(newUser);
        res.status(201).json(newUser);
    } else {
        res.status(400).send('User not created');
    }
});

//Update Allow users to update their username
app.put('/users/:id', (req, res) => {
    const { id } = req.params;
    const updatedUser = req.body;

    let user = users.find( user => user.id == id);

    if (user) {
        user.name = updatedUser.name;
        res.status(200).json(user);
    } else {
        res.status(400).send('user not found');
    }
});

//Update Allow users to add a movie to their favorites
app.post('/users/:id/:movieTitle', (req, res) => {
    const { id, movieTitle } = req.params;
    
    let user = users.find( user => user.id == id);

    if (user) {
        user.favoriteMovies.push(movieTitle);
        res.status(200).send(`${movieTitle} has been added to user ${id}'s profile`);
    } else {
        res.status(400).send('user not found');
    }
});

//Delete Allow users to delete a movie from their favorites
app.delete('/users/:id/:movieTitle', (req, res) => {
    const { id, movieTitle } = req.params;
    
    let user = users.find( user => user.id == id);

    if (user) {
        user.favoriteMovies = user.favoriteMovies.filter( title => title !== movieTitle);
        res.status(200).send(`${movieTitle} has been removed from user ${id}'s profile`);
    } else {
        res.status(400).send('user not found');
    }
});

//Delete Allow users to deregister
app.delete('/users/:id', (req, res) => {
    const { id } = req.params;
    
    let user = users.find( user => user.id == id);

    if (user) {
        users = users.filter( user => user.id != id);
        res.status(200).send(`user ${id}'s profile has been deleted`);
    } else {
        res.status(400).send('user not found');
    }
});



//error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Send help, I broke');
})

//listen for requests
app.listen(8080, () => {
    console.log('Your app is running on port 8080');
});
