const express = require("express");
const router = express.Router();

const {imageUpload} = require("../middleware/upload");
const {create,list,getById,update,deleteCust} = require("../controllers/customer.controller");

router.post(
  "/create",
  imageUpload.single("logo"),
  create
);

router.post(
  "/update/:id",
  imageUpload.single("logo"),
  update
);

router.get(
  "/list",
  list
);

router.get(
  "/:id",
  getById
);

router.get(
  "/delete/:id",
  deleteCust
);

module.exports = router;
