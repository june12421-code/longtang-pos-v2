import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";

type ShopStatus = "open" | "paused" | "closed";

type UpdateShopSettingsBody = {
  status: ShopStatus;
  message: string;
};

const allowedStatuses: ShopStatus[] = [
  "open",
  "paused",
  "closed",
];

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("shop_settings")
      .select("status, message")
      .eq("id", "main")
      .single();

    if (error) {
      throw new Error(
        `อ่านสถานะร้านไม่สำเร็จ: ${error.message}`
      );
    }

    const status: ShopStatus =
      data.status === "paused" ||
      data.status === "closed"
        ? data.status
        : "open";

    return NextResponse.json({
      status,
      message:
        typeof data.message === "string"
          ? data.message
          : "",
    });
  } catch (error) {
    console.error(
      "Supabase get shop settings error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "อ่านสถานะร้านไม่สำเร็จ",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as UpdateShopSettingsBody;

    if (!allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        {
          error: "สถานะร้านไม่ถูกต้อง",
        },
        {
          status: 400,
        }
      );
    }

    const { error } = await supabaseAdmin
      .from("shop_settings")
      .upsert(
        {
          id: "main",
          status: body.status,
          message: body.message ?? "",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

    if (error) {
      throw new Error(
        `บันทึกสถานะร้านไม่สำเร็จ: ${error.message}`
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Supabase update shop settings error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "บันทึกสถานะร้านไม่สำเร็จ",
      },
      {
        status: 500,
      }
    );
  }
}
