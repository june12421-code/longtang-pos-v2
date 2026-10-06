import { NextRequest, NextResponse } from "next/server";

import { adminClient as supabaseAdmin } from "../../../lib/supabaseAdmin";

const BUCKET_NAME = "menu-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(
  request: NextRequest
) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "ไม่พบไฟล์รูปภาพ",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          error: "ไฟล์รูปภาพมีขนาด 0 bytes",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "รูปภาพมีขนาดใหญ่เกิน 5 MB",
        },
        {
          status: 400,
        }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "รองรับเฉพาะไฟล์ JPG, PNG และ WEBP",
        },
        {
          status: 400,
        }
      );
    }

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const fileName =
      `${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } =
      await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(
          fileName,
          arrayBuffer,
          {
            contentType: file.type,
            cacheControl: "31536000",
            upsert: false,
          }
        );

    if (uploadError) {
      throw new Error(
        `อัปโหลดรูปเข้า Supabase ไม่สำเร็จ: ${uploadError.message}`
      );
    }

    const { data } =
      supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

    if (!data.publicUrl) {
      throw new Error(
        "สร้าง Public URL ของรูปไม่สำเร็จ"
      );
    }

    return NextResponse.json({
      success: true,
      url: data.publicUrl,
    });
  } catch (error) {
    console.error(
      "Supabase menu image upload error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "อัปโหลดรูปไม่สำเร็จ",
      },
      {
        status: 500,
      }
    );
  }
}