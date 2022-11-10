const express = require('express');
const app = express();
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');

// database configuration
const dbConfig = {
    host: 'db',
    port: 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

// test your database
db.connect()
    .then(obj => {
        console.log('Database connection successful'); // you can view this message in the docker compose logs
        obj.done(); // success, release the connection;
    })
    .catch(error => {
        console.log('ERROR:', error.message || error);
    });

app.use(express.static('src/resources'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/src/views'));
app.use(bodyParser.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        saveUninitialized: false,
        resave: false,
    })
);
app.use(bodyParser.urlencoded({
    extended: true,
})
);

// Begin Routing

// NOTE: pages to render must have './pages/page' format due to project structure

app.get("/", (req, res) => {
    return res.render("./pages/home");
});



app.get("/login", (req, res) => {
    return res.render('./pages/login');
});



app.get("/about", (req, res) => {
    return res.render("pages/about");
});

app.get("/profile", (req, res) => {
    return res.render("pages/profile", { user: req.session.user });
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    return res.render("pages/login");
});

app.post('/login', async (req, res) => {
    const query = "Select * FROM players WHERE username = $1;";
    db.one(query, [req.body.username])
        .then(async (user) => {
            const match = await bcrypt.compare(req.body.password, user.password);
            if (!match) {
                console.log("Incorrect username or password");
                res.render("/login",{
                    message: "Incorrect username or password",
                    error: 1
                });
            } else {
                req.session.user = user;
                req.session.save();
                res.redirect('/profile');
            }
        })
        .catch((err) => {
            console.log(err);
            res.redirect('/login');
        });
});


app.post("/register", async (req, res) => {
    const hash = await bcrypt.hash(req.body.password, 10);
    const tempProfilePhoto = '';
    const classYear = /\d/.test(req.body.classYear) ? req.body.classYear : '0';
    const date = new Date();
    const joinDate = date.toISOString().split('T')[0];
    const insertQuery = 'INSERT INTO players (username, playerName, password, classYear, profilePhoto, joinDate) VALUES ($1, $2, $3, $4, $5, $6);';
    db.any(insertQuery, [req.body.username, req.body.playername, hash, classYear, tempProfilePhoto, joinDate])
        .then(() => {
            res.redirect("/login");
        })
        .catch((err) => {
            console.log(err);
            res.redirect("/login");
        });
});

// End Routing

app.listen(3000);
console.log('Server is listening on port 3000');