const express = require("express");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const baseUrl = (process.env.PUBLIC_BASE_URL || `http://localhost:${port}`).replace(/\/$/, "");

const requiredEnvVars = [
  "ADMIN_PASSWORD",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY"
];

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
  process.exit(1);
}

const supabaseBucket = process.env.SUPABASE_BUCKET || "dealer-files";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const fileMappings = {
  pricelist: {
    label: "Price List",
    objectPath: "pricelist"
  },
  scheme: {
    label: "Scheme",
    objectPath: "scheme"
  },
  catalog: {
    label: "Product Catalog",
    objectPath: "catalog"
  },
  productdetails: {
    label: "Product Details",
    objectPath: "product-details"
  }
};

const extensionByMimeType = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const allowedMimeTypes = Object.keys(extensionByMimeType);

const getDownloadUrl = (type) => `${baseUrl}/api/download/${type}`;

const getFileUrls = () =>
  Object.keys(fileMappings).reduce((accumulator, type) => {
    accumulator[type] = getDownloadUrl(type);
    return accumulator;
  }, {});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  },
  fileFilter: (_request, file, callback) => {
    const isAllowed = allowedMimeTypes.includes(file.mimetype);

    if (!isAllowed) {
      return callback(
        new Error("Only PDF, JPG, JPEG, PNG, and WEBP files are allowed")
      );
    }

    callback(null, true);
  }
});

const inferDownloadName = (type, contentType) => {
  const extension = extensionByMimeType[contentType] || "bin";
  const baseName = fileMappings[type]?.objectPath || type;
  return `${baseName}.${extension}`;
};

const ensureBucketReady = async () => {
  const { data: bucket, error: getBucketError } = await supabase.storage.getBucket(
    supabaseBucket
  );

  if (getBucketError) {
    const bucketMissing = /not found/i.test(getBucketError.message || "");

    if (!bucketMissing) {
      throw getBucketError;
    }

    const { error: createBucketError } = await supabase.storage.createBucket(
      supabaseBucket,
      {
        public: false,
        fileSizeLimit: 20 * 1024 * 1024,
        allowedMimeTypes
      }
    );

    if (createBucketError && !/already exists/i.test(createBucketError.message || "")) {
      throw createBucketError;
    }
  }

  const { error: updateBucketError } = await supabase.storage.updateBucket(
    supabaseBucket,
    {
      public: false,
      fileSizeLimit: 20 * 1024 * 1024,
      allowedMimeTypes
    }
  );

  if (updateBucketError) {
    throw updateBucketError;
  }
};

app.use(
  cors({
    origin: true
  })
);
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/api/files", (_request, response) => {
  response.json(getFileUrls());
});

app.post("/api/login", (request, response) => {
  const { password } = request.body;

  if (!password) {
    return response.status(400).json({ message: "Password is required" });
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return response.status(401).json({ message: "Invalid admin password" });
  }

  response.json({ message: "Login successful" });
});

app.get("/api/download/:type", async (request, response) => {
  try {
    const { type } = request.params;
    const fileConfig = fileMappings[type];

    if (!fileConfig) {
      return response.status(404).json({ message: "Invalid file type" });
    }

    const { data, error } = await supabase.storage
      .from(supabaseBucket)
      .download(fileConfig.objectPath);

    if (error || !data) {
      return response.status(404).json({ message: "No file uploaded yet" });
    }

    const contentType = data.type || "application/octet-stream";
    const downloadName = inferDownloadName(type, contentType);
    const arrayBuffer = await data.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    response.setHeader("Content-Type", contentType);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadName}"`
    );
    response.setHeader("Content-Length", fileBuffer.length);

    response.send(fileBuffer);
  } catch (error) {
    console.error("Download error:", error);
    response.status(500).json({ message: "Failed to download file" });
  }
});

app.post("/api/upload/:type", upload.single("file"), async (request, response) => {
  try {
    const { type } = request.params;
    const password = request.body.password;
    const fileConfig = fileMappings[type];

    if (!fileConfig) {
      return response.status(400).json({ message: "Invalid file type" });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return response.status(401).json({ message: "Invalid admin password" });
    }

    if (!request.file) {
      return response.status(400).json({ message: "File is required" });
    }

    const { error } = await supabase.storage
      .from(supabaseBucket)
      .upload(fileConfig.objectPath, request.file.buffer, {
        contentType: request.file.mimetype,
        upsert: true,
        cacheControl: "3600"
      });

    if (error) {
      throw error;
    }

    response.json({
      message: "File updated successfully",
      url: getDownloadUrl(type)
    });
  } catch (error) {
    console.error("Upload error:", error);
    response.status(500).json({
      message: "Failed to upload file"
    });
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return response.status(400).json({
      message: "File size must be 20MB or less"
    });
  }

  if (error.message === "Only PDF, JPG, JPEG, PNG, and WEBP files are allowed") {
    return response.status(400).json({
      message: error.message
    });
  }

  console.error("Server error:", error);
  response.status(500).json({
    message: "Internal server error"
  });
});

ensureBucketReady()
  .then(() => {
    app.listen(port, () => {
      console.log(`Dealer File Manager API running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize Supabase storage:", error);
    process.exit(1);
  });
