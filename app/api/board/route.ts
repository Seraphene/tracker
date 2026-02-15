import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const commonFields = {
  username: z.string().trim().min(1),
  pin: z.string().trim().min(4),
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const payloadSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_board"),
    ...commonFields,
    board_name: z.string().trim().min(1),
    board_code: z.string().trim().min(1).optional(),
  }),
  z.object({
    action: z.literal("join_board"),
    ...commonFields,
    board_code: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal("add_item"),
    ...commonFields,
    board_code: z.string().trim().min(1),
    item_name: z.string().trim().min(1),
    target_price: z.number().positive(),
    start_date: isoDate,
    end_date: isoDate,
  }),
  z.object({
    action: z.literal("get_board"),
    ...commonFields,
    board_code: z.string().trim().min(1),
  }),
]);

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "API route is live. Use POST /api/board for actions.",
    hasApiUrl: Boolean(process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_API_URL),
    hasWebhookSecret: Boolean(process.env.N8N_WEBHOOK_SECRET),
  });
}

export async function POST(request: NextRequest) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL ?? process.env.NEXT_PUBLIC_API_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl) {
    console.error("API/board: missing webhook URL env");
    return NextResponse.json(
      {
        ok: false,
        error: "Missing webhook URL environment variable.",
        details: "Set N8N_WEBHOOK_URL (preferred) or NEXT_PUBLIC_API_URL in Vercel.",
      },
      { status: 500 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid payload.",
        details: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookSecret ? { "x-webhook-secret": webhookSecret } : {}),
      },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const text = await upstream.text();
    let parsedUpstreamJson: unknown;

    try {
      parsedUpstreamJson = JSON.parse(text);
    } catch {
      parsedUpstreamJson = undefined;
    }

    if (!upstream.ok) {
      const jsonObj =
        parsedUpstreamJson && typeof parsedUpstreamJson === "object"
          ? (parsedUpstreamJson as Record<string, unknown>)
          : null;

      const upstreamMessage =
        (jsonObj?.error as string | undefined) ??
        (jsonObj?.message as string | undefined) ??
        `Upstream n8n request failed with status ${upstream.status}.`;

      const upstreamDetails =
        typeof parsedUpstreamJson === "string"
          ? parsedUpstreamJson
          : parsedUpstreamJson
            ? JSON.stringify(parsedUpstreamJson)
            : text;

      console.error("API/board upstream error", {
        status: upstream.status,
        message: upstreamMessage,
      });

      return NextResponse.json(
        {
          ok: false,
          error: upstreamMessage,
          details: upstreamDetails.slice(0, 1200),
        },
        { status: upstream.status || 502 },
      );
    }

    if (parsedUpstreamJson !== undefined) {
      return NextResponse.json(parsedUpstreamJson, { status: upstream.status });
    }

    return NextResponse.json(
      { ok: true, raw: text },
      { status: upstream.status || 200 },
    );
  } catch (caught) {
    console.error("API/board fetch failure", {
      message: caught instanceof Error ? caught.message : "Unknown network error",
    });

    return NextResponse.json(
      {
        ok: false,
        error: "Could not reach n8n webhook.",
        details: caught instanceof Error ? caught.message : "Unknown network error.",
      },
      { status: 502 },
    );
  }
}
