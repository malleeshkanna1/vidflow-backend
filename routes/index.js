var express = require('express');
var router = express.Router();
const {embed,embedJs,embedCss} = require('../controllers/library.controller')
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get(
  "/embed/js/:id",
  embedJs
);

router.get(
  "/embed/css/:id",
  embedCss
);


router.get('/embed/:id',embed);

module.exports = router;
