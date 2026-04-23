import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const COLLECTION = "fcm_tokens";

export async function POST(request: Request) {
  try {
    const { token, userAgent } = (await request.json()) as {
      token?: string;
      userAgent?: string;
    };

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "token is required" },
        { status: 400 }
      );
    }

    // token をドキュメント ID にすることで重複登録を自然に排除
    await adminDb()
      .collection(COLLECTION)
      .doc(token)
      .set(
        {
          token,
          userAgent: userAgent ?? "",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const snap = await adminDb()
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const subscribers = snap.docs.map((doc) => {
      const d = doc.data();
      const createdAt =
        d.createdAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString();
      return {
        token: d.token as string,
        userAgent: (d.userAgent as string) ?? "",
        createdAt,
      };
    });

    return NextResponse.json({ subscribers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
