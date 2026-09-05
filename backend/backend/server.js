import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import crypto from "crypto";

import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "https://memora-opqm.onrender.com";

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;


/* =========================
   CHECK ENV
   ========================= */

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is missing");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is missing"
  );
}


/* =========================
   SUPABASE
   ========================= */

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);


/* =========================
   CORS
   ========================= */

app.use(
  cors({
    origin: [
      FRONTEND_URL,
      "http://localhost:3000",
      "http://127.0.0.1:5500"
    ],
    methods: [
      "GET",
      "POST",
      "OPTIONS"
    ]
  })
);

app.use(express.json());


/* =========================
   FILE UPLOAD
   ========================= */

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (
    req,
    file,
    callback
  ) => {

    if (
      allowedMimeTypes.includes(
        file.mimetype
      )
    ) {
      callback(null, true);
      return;
    }

    callback(
      new Error(
        "รองรับเฉพาะ JPG, PNG และ WEBP"
      )
    );

  }
});


/* =========================
   PRODUCTS
   ========================= */

const products = {

  "our-story": {
    name: "Our Story",
    amount: 259
  }

};


/* =========================
   HELPERS
   ========================= */

function createOrderCode() {

  const date =
    new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "");

  const random =
    crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();

  return `MEM-${date}-${random}`;

}


function isValidEmail(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email);

}


function getExtension(mimetype) {

  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  return map[mimetype] || "jpg";

}


/* =========================
   HEALTH CHECK
   ========================= */

app.get(
  "/",
  (req, res) => {

    res.json({
      ok: true,
      service: "Memora Backend"
    });

  }
);


/* =========================
   CREATE ORDER
   ========================= */

app.post(
  "/api/orders",
  upload.single("slip"),
  async (req, res) => {

    let uploadedSlipPath = null;

    try {

      const email =
        String(
          req.body.email || ""
        )
          .trim()
          .toLowerCase();

      const productId =
        String(
          req.body.productId || ""
        ).trim();


      /* -------------------------
         VALIDATE PRODUCT
         ------------------------- */

      const product =
        products[productId];

      if (!product) {

        return res
          .status(400)
          .json({
            success: false,
            message:
              "ไม่พบสินค้านี้"
          });

      }


      /* -------------------------
         VALIDATE EMAIL
         ------------------------- */

      if (
        !email ||
        !isValidEmail(email)
      ) {

        return res
          .status(400)
          .json({
            success: false,
            message:
              "อีเมลไม่ถูกต้อง"
          });

      }


      /* -------------------------
         VALIDATE SLIP
         ------------------------- */

      if (!req.file) {

        return res
          .status(400)
          .json({
            success: false,
            message:
              "กรุณาแนบสลิปการชำระเงิน"
          });

      }


      /* -------------------------
         ORDER CODE
         ------------------------- */

      const orderCode =
        createOrderCode();


      /* -------------------------
         SLIP PATH
         ------------------------- */

      const extension =
        getExtension(
          req.file.mimetype
        );

      const slipPath =
        `${orderCode}/payment-slip.${extension}`;

      uploadedSlipPath =
        slipPath;


      /* -------------------------
         UPLOAD TO STORAGE
         ------------------------- */

      const {
        error: uploadError
      } =
        await supabase
          .storage
          .from("memora-slips")
          .upload(
            slipPath,
            req.file.buffer,
            {
              contentType:
                req.file.mimetype,

              upsert: false
            }
          );


      if (uploadError) {

        console.error(
          "Slip upload error:",
          uploadError
        );

        return res
          .status(500)
          .json({
            success: false,
            message:
              "ไม่สามารถอัปโหลดสลิปได้"
          });

      }


      /* -------------------------
         INSERT ORDER
         ------------------------- */

      const {
        data,
        error: orderError
      } =
        await supabase
          .from("memora_orders")
          .insert({
            order_code:
              orderCode,

            product_id:
              productId,

            product_name:
              product.name,

            amount:
              product.amount,

            email:
              email,

            slip_path:
              slipPath,

            status:
              "pending"
          })
          .select(
            "id, order_code, status, created_at"
          )
          .single();


      if (orderError) {

        console.error(
          "Order insert error:",
          orderError
        );


        /* remove slip if DB fails */

        await supabase
          .storage
          .from("memora-slips")
          .remove([
            slipPath
          ]);


        return res
          .status(500)
          .json({
            success: false,
            message:
              "ไม่สามารถสร้างคำสั่งซื้อได้"
          });

      }


      /* -------------------------
         SUCCESS
         ------------------------- */

      return res
        .status(201)
        .json({
          success: true,

          order: {
            orderCode:
              data.order_code,

            status:
              data.status,

            createdAt:
              data.created_at
          }
        });


    } catch (error) {

      console.error(
        "Create order error:",
        error
      );


      if (uploadedSlipPath) {

        try {

          await supabase
            .storage
            .from("memora-slips")
            .remove([
              uploadedSlipPath
            ]);

        } catch (
          cleanupError
        ) {

          console.error(
            "Cleanup error:",
            cleanupError
          );

        }

      }


      return res
        .status(500)
        .json({
          success: false,
          message:
            "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
        });

    }

  }
);


/* =========================
   MULTER ERROR
   ========================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    if (
      error instanceof
      multer.MulterError
    ) {

      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {

        return res
          .status(400)
          .json({
            success: false,
            message:
              "ไฟล์สลิปต้องมีขนาดไม่เกิน 5 MB"
          });

      }

    }


    if (error) {

      return res
        .status(400)
        .json({
          success: false,
          message:
            error.message ||
            "ไม่สามารถอัปโหลดไฟล์ได้"
        });

    }


    next();

  }
);


/* =========================
   START SERVER
   ========================= */

app.listen(
  PORT,
  () => {

    console.log(
      `Memora Backend running on port ${PORT}`
    );

  }
);
