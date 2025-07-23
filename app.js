const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = 3000;

const users = [];
const rsvps = [];

const EVENT = {
  name: 'Private Gala Night',
  date: 'August 15, 2025',
  description: 'An exclusive evening for invited guests only.'
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false
}));

function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

function isAdmin(req) {
  const user = users.find(u => u.id === req.session.userId);
  return user && user.role === 'admin';
}

app.get('/', (req, res) => {
  const user = users.find(u => u.id === req.session.userId);
  res.render('home', { user, event: EVENT });
});

app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (users.some(u => u.email === email || u.username === username)) {
    return res.render('register', { error: 'Username or email already exists.' });
  }

  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.render('register', { error: 'Invalid email format.' });
  }

  if (password.length < 8) {
    return res.render('register', { error: 'Password must be at least 8 characters.' });
  }

  const hash = await bcrypt.hash(password, 10);
  const isFirstUser = users.length === 0;
  users.push({
    id: Date.now().toString(),
    username,
    email,
    password: hash,
    role: isFirstUser ? 'admin' : 'user'
  });

  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render('login', { error: 'Invalid credentials.' });
  }
  req.session.userId = user.id;
  res.redirect('/event');
});

app.get('/event', requireLogin, (req, res) => {
  const user = users.find(u => u.id === req.session.userId);
  const hasRSVP = rsvps.some(r => r.userId === user.id);
  const allRSVPs = isAdmin(req)
    ? rsvps.map(r => ({
        ...r,
        username: (users.find(u => u.id === r.userId) || {}).username
      }))
    : null;
  res.render('event', { user, event: EVENT, hasRSVP, allRSVPs });
});

app.post('/rsvp', requireLogin, (req, res) => {
  const userId = req.session.userId;
  if (!rsvps.some(r => r.userId === userId)) {
    rsvps.push({ userId, time: new Date().toLocaleString() });
  }
  res.redirect('/event');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
