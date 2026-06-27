const fs = require("fs");

const Customer = require("../models/Customer");
const s3Service = require("../services/s3.service");
const ffmpegService = require("../services/ffmpeg.service");
const mongoose = require('mongoose')
const create = async (req, res) => {
  try {
    const {
      companyName,
      username,
      tagline,
      website,
      email,
      phone,
      address,
      brandColor1,
      brandColor2,
    } = req.body;

    const exists = await Customer.findOne({
      username,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Username already exists.",
      });
    }

    let logo = "";
    let logoKey = "";

    if (req.file) {
      const upload =
        await s3Service.uploadLogo(req.file.path);

      logo = upload.url;
      logoKey = upload.key;

      ffmpegService.deleteFile(req.file.path);
    }

    const customer = await Customer.create({
      companyName,
      username,
      tagline,
      website,
      email,
      phone,
      address,
      brandColor1,
      brandColor2,
      logo,
      logoKey,
    });

    return res.status(201).json({
      success: true,
      message: "Customer created successfully.",
      data: customer,
    });
  } catch (err) {
    console.error(err);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const list = async (req, res) => {
  try {
    const customers = await Customer.find({})
      .select({
        companyName: 1,
        username: 1,
        tagline: 1,
        website: 1,
        email: 1,
        phone: 1,
        address: 1,
        brandColor1: 1,
        brandColor2: 1,
        logo: 1,
        isActive: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const customer = await Customer.findById(id).lean();

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer id.",
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    const {
      companyName,
      username,
      tagline,
      website,
      email,
      phone,
      address,
      brandColor1,
      brandColor2,
      isActive,
    } = req.body;

    // Username uniqueness check
    if (
      username &&
      username !== customer.username
    ) {
      const exists = await Customer.findOne({
        username,
        _id: {
          $ne: id,
        },
      });

      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Username already exists.",
        });
      }
    }

    /**
     * Upload new logo
     */
    if (req.file) {
      const upload =
        await s3Service.uploadLogo(req.file.path);

      // Delete old logo from S3
      if (customer.logoKey) {
        try {
          await s3Service.deleteFile(
            customer.logoKey
          );
        } catch (err) {
          console.error(
            "Failed to delete old logo:",
            err.message
          );
        }
      }

      customer.logo = upload.url;
      customer.logoKey = upload.key;

      ffmpegService.deleteFile(req.file.path);
    }

    customer.companyName =
      companyName ?? customer.companyName;

    customer.username =
      username ?? customer.username;

    customer.tagline =
      tagline ?? customer.tagline;

    customer.website =
      website ?? customer.website;

    customer.email =
      email ?? customer.email;

    customer.phone =
      phone ?? customer.phone;

    customer.address =
      address ?? customer.address;

    customer.brandColor1 =
      brandColor1 ?? customer.brandColor1;

    customer.brandColor2 =
      brandColor2 ?? customer.brandColor2;

    if (typeof isActive !== "undefined") {
      customer.isActive = isActive;
    }

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully.",
      data: customer,
    });
  } catch (err) {
    console.error(err);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const deleteCust = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    // Delete logo from S3
    if (customer.logoKey) {
      try {
        await s3Service.deleteFile(customer.logoKey);
      } catch (err) {
        console.error("Failed to delete logo from S3:", err.message);
      }
    }

    // Delete customer
    await Customer.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully.",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {create,list,getById,update,deleteCust}