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
    });

    const text = await upstream.text();

    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: upstream.status });
    } catch {
      if (!upstream.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: `Upstream n8n request failed with status ${upstream.status}.`,
            details: text.slice(0, 600),
          },
          { status: upstream.status || 502 },
        );
      }

      return NextResponse.json(
        { ok: upstream.ok, raw: text },
        { status: upstream.status || 500 },
      );
    }
  } catch (caught) {
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
