const express = require("express");

const router = express.Router();

const {
    fileUpload
} = require("../middleware/upload");

const controller =
    require("../controllers/file.controller");

router.post(
    "/add",
    fileUpload.single("file"),
    controller.add
);

router.get(
    "/list",
    controller.list
);

router.get(
    "/delete/:id",
    controller.delete
);

module.exports = router;