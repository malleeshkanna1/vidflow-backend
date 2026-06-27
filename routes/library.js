const express = require("express");

const router = express.Router();

const {create,getById,update} = require("../controllers/library.controller");



router.get(
  "/:id",
  getById
);

router.post(
  "/update",
  update
);

module.exports = router;