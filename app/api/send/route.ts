import { NextResponse } from "next/server";
import { adminDb, adminMessaging } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const COLLECTION = "fcm_tokens";

export async function POST(request: Request) {
  try {
    const { title, body, url } = (await request.json()) as {
      title?: string;
      body?: string;
      url?: string;
    };

    if (!title || !body) {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 }
      );
    }

    const snap = await adminDb().collection(COLLECTION).get();
    const tokens = snap.docs.map((d) => d.get("token") as string).filter(Boolean);

    if (tokens.length === 0) {
      return NextResponse.json({
        successCount: 0,
        failureCount: 0,
        message: "no subscribers",
      });
    }

    const response = await adminMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { url: url ?? "/" },
      webpush: {
        fcmOptions: { link: url ?? "/" },
        notification: {
          icon: "/icon-192.png",
          badge: "/icon-192.png",
        },
      },
    });

    // 失効 / 不正トークンを掃除
    const invalidTokens: string[] = [];
    response.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code ?? "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token" ||
          code === "messaging/invalid-argument"
        ) {
          invalidTokens.push(tokens[i]);
        }
      }
    });
    if (invalidTokens.length > 0) {
      const batch = adminDb().batch();
      for (const t of invalidTokens) {
        batch.delete(adminDb().collection(COLLECTION).doc(t));
      }
      await batch.commit();
    }

    return NextResponse.json({
      successCount: response.successCount,
      failureCount: response.failureCount,
      cleanedUp: invalidTokens.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
