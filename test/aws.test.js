require("dotenv").config();

const s3 = require("../config/aws");

async function test() {
  try {
    const buckets = await s3.listBuckets().promise();

    console.log("✅ Connected to AWS");

    buckets.Buckets.forEach((bucket) => {
      console.log(bucket.Name);
    });
  } catch (err) {
    console.error(err);
  }
}

test();