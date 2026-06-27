const express = require("express");
const router = express.Router();

const {videoUpload} = require("../middleware/upload");
const {upload,list,getById} = require("../controllers/footage.controller");

router.post(
  "/upload",
  videoUpload.single("video"),
  upload
);

router.get(
  "/list",
  list
);

router.get(
  "/getById/:id",
  getById
);

module.exports = router;