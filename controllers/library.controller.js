const mongoose = require("mongoose");

const Library = require("../models/Library");
const Customer = require("../models/Customer");
const Footage = require("../models/Footage");

/**
 * POST /libraries
 * Create or Update Library
 */
const update = async (req, res) => {
  try {
    const {
      customer_id,
      lib_heading,
      description,
      footages_id,
      isActive,
    } = req.body;

    /**
     * Validate Customer
     */
    if (!mongoose.Types.ObjectId.isValid(customer_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const customer = await Customer.findById(customer_id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found.",
      });
    }

    /**
     * Validate Footages
     */
    if (!Array.isArray(footages_id) || footages_id.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one footage.",
      });
    }

    const validCount = await Footage.countDocuments({
      _id: {
        $in: footages_id,
      },
    });

    if (validCount !== footages_id.length) {
      return res.status(400).json({
        success: false,
        message: "One or more footage IDs are invalid.",
      });
    }

    /**
     * Find existing library
     */
    let library = await Library.findOne({
      customer_id,
    });

    if (!library) {
      /**
       * Create
       */
      library = await Library.create({
        customer_id,
        lib_heading,
        description,
        footages_id,
        isActive,
      });

      return res.status(201).json({
        success: true,
        message: "Library created successfully.",
        data: library,
      });
    }

    /**
     * Update
     */
    library.lib_heading = lib_heading;
    library.description = description;
    library.footages_id = footages_id;

    if (typeof isActive !== "undefined") {
      library.isActive = isActive;
    }

    await library.save();

    return res.status(200).json({
      success: true,
      message: "Library updated successfully.",
      data: library,
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
        message: "Invalid library ID.",
      });
    }

    const library = await Library.findOne({
      customer_id: id,
    })
      .populate({
        path: "customer_id",
        select:
          "companyName username tagline website email phone address brandColor1 brandColor2 logo",
      })
      .populate({
        path: "footages_id",
        select:
          "name thumbnail duration resolution size status tags category location video",
      })
      .lean();

    if (!library) {
      return res.status(404).json({
        success: false,
        message: "Library not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: library,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const embed = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID.",
      });
    }

    const library = await Library.findOne({
      customer_id: id,
      isActive: true,
    })
      .populate({
        path: "customer_id",
        select:
          "companyName username tagline website email phone address brandColor1 brandColor2 logo",
      })
      .populate({
        path: "footages_id",
        match: {
          status: "completed",
        },
        select: `
          name
          description
          category
          location
          video
          thumbnail
          subtitle
          duration
          resolution
          fps
          format
          codec
          aspectRatio
          transcription
          tags
          createdAt
        `,
      })
      .lean();

    if (!library) {
      return res.status(404).json({
        success: false,
        message: "Library not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        customer: library.customer_id,

        lib_heading: library.lib_heading,

        description: library.description,

        footages: library.footages_id,
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

async function getEmbedData(customerId) {
  return await Library.findOne({
    customer_id: customerId,
    isActive: true,
  })
    .populate({
      path: "customer_id",
      select:
        "companyName username tagline website email phone address brandColor1 brandColor2 logo",
    })
    .populate({
      path: "footages_id",
      match: {
        status: "completed",
      },
    })
    .lean();
}

const embedJs = async (req, res) => {
  try {
    const { id } = req.params;

    const library = await getEmbedData(id);

    if (!library) {
      return res.status(404).send("Library not found");
    }

    const VIDEO_DATA = {
      customer: library.customer_id,
      lib_heading: library.lib_heading,
      description: library.description,
      footages: library.footages_id,
      app_url : `${process.env.APP_URL}:${process.env.PORT}`
    };

    res.type("application/javascript");

    res.render("embed/cyrano-video", {
      customerId: id,
      VIDEO_DATA,
      layout: false,
    });
  } catch (err) {
    console.error(err);

    res.status(500).send(err.message);
  }
};

const embedCss = async (req, res) => {
  try {
    const { id } = req.params;

    const library = await getEmbedData(id);

    if (!library) {
      return res.status(404).send("Library not found");
    }

    const VIDEO_DATA = {
      customer: library.customer_id,
      lib_heading: library.lib_heading,
      description: library.description,
      footages: library.footages_id,
    };

    res.type("text/css");

    res.render("embed/cyrano-video-css", {
      customerId: id,
      VIDEO_DATA,
      layout: false,
    });
  } catch (err) {
    console.error(err);

    res.status(500).send(err.message);
  }
};

module.exports = { getById, update,embed,embedJs,embedCss };
