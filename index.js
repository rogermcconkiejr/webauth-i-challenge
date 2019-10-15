const express = require('express');
const bcrypt = require('bcryptjs'); 
const sessions = require('express-session');
const KnexSessionStore = require('connect-session-knex')(sessions);

const db = require('./data/dbConfig');
const Users = require('./users/users-model');
const knexConfig = require('./data/dbConfig');


const server = express();

const sessionConfig = {
  name: 'ohfosho',
  secret: 'keep it secret, keep it safe!', //better to be in environment and dynamic.
  cookie:{
    httpOnly: true, // JS cannot access the cookie (which is what we want.)
    maxAge: 1000 * 60 * 60,  // This is in milliseconds, so this will last for an hour.
    secure: false, //should be true in prod, false in dev. Change based on env.
  },
  resave: false,
  saveUninitialized: true, // keep this false until users accept cookies.
  //change to use our database instead of memory.
  store: new KnexSessionStore({
    knex: knexConfig,
    createtable: true, //automatically create sessions table in db.
    clearInterval: 1000 * 60 * 30, //delete expired sessions every thirty mins.
  })
}

server.use(sessions(sessionConfig))
server.use(express.json());


server.get('/', (req, res) => {
  res.send("It's alive!");
});

server.post('/api/register', (req, res) => {
  let user = req.body;

  const hash = bcrypt.hashSync(user.password, 12)

  user.password = hash;

  Users.add(user)
    .then(saved => {
      res.status(201).json(saved);
    })
    .catch(error => {
      res.status(500).json(error);
    });
});

server.post('/api/login', (req, res) => {
  let { username, password } = req.body;
  if (username && password) {
    Users.findBy({ username })
      .first()
      .then(user => {
        if (user && bcrypt.compareSync(password, user.password)) {
          req.session.username = user.username;
          res.status(200).json({ message: `Logged in` });
        } else {
          res.status(401).json({ message: 'You shall not pass!!' });
        }
      })
      .catch(error => {
        res.status(500).json(error);
      });
  } else {
    res.status(400).json({ message: 'please provide valid credentials' });
  }
});

server.get('/api/users', protected, (req, res) => {
  Users.find()
    .then(users => {
      res.json(users);
    })
    .catch(err => res.send(err));
});

server.get('/api/logout', (req, res)=>{
  if(req.session){
  req.session.destroy(err=>{
    res.status(200).json({ message: 'logged out.'})
  });
  } else {
    res.status(200).json({ message: 'Already logged out.'})
  }
})

// server.get('/hash', (req, res)=>{
// const password = req.headers.authorization;
// if(password){
//   const hash = bcrypt.hashSync(password, 10)

//   res.status(200).json({ hash })
// } else {
//   res.status(400).json({ message: 'please provide valid credentials.'})
// }


// })


function protected(req, res, next) {
  if (req.session && req.session.username) {
    next()
  } else {
    res.status(401).json({ message: 'you shall not pass!'})
  }

    // let { username, password } = req.headers;

    // if (username && password) {
    //   Users.findBy({ username })
    //     .first()
    //     .then(user => {
    //       if (user && bcrypt.compareSync(password, user.password)) {
    //         next()
    //       } else {
    //         res.status(401).json({ message: 'You shall not pass!!' });
    //       }
    //     })
    //     .catch(error => {
    //       res.status(500).json(error);
    //     });
    // } else {
    //   res.status(400).json({ message: 'please provide valid credentials' });
    // }

}
const port = process.env.PORT || 5555;
server.listen(port, () => console.log(`\n** Running on port ${port} **\n`));