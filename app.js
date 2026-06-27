var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();
const cors = require('cors')
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var footageRouter = require('./routes/footages');
var customersRouter = require('./routes/customers');
var libraryRouter = require('./routes/library');
const mongooseConn = require('./config/db');
require("./workers/footage.worker");

var app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(cors())
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/footages', footageRouter);
app.use('/customers', customersRouter);
app.use('/library', libraryRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

  mongooseConn();

app.listen(process.env.PORT,()=>{
  console.log(`Port is connected to ${process.env.PORT}`)
})

module.exports = app;
