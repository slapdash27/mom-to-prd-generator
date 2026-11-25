import { connection } from "next/server";

import { createTeamAccessToken, isTeamAccessProtected } from "@/lib/team-auth";
import {
  type TeamAuthStatusResponse,
  type TeamAuthVerifyRequest,
  type TeamAuthVerifyResponse,
} from "@/types/prd";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  await connection();

  return Response.json(
    { protected: isTeamAccessProtected() } satisfies TeamAuthStatusResponse,
    { headers: NO_STORE_HEADERS }
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: Partial<TeamAuthVerifyRequest>;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "Payload tidak valid. Kirim data dalam format JSON." } satisfies TeamAuthVerifyResponse,
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const password = typeof body.password === "string" ? body.password : "";

  if (!isTeamAccessProtected()) {
    return Response.json(
      { ok: true, token: "" } satisfies TeamAuthVerifyResponse,
      { headers: NO_STORE_HEADERS }
    );
  }

  if (password !== process.env.TEAM_ACCESS_PASSWORD?.trim()) {
    return Response.json(
      { ok: false, error: "Password tim tidak benar." } satisfies TeamAuthVerifyResponse,
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  return Response.json(
    { ok: true, token: createTeamAccessToken() } satisfies TeamAuthVerifyResponse,
    { headers: NO_STORE_HEADERS }
  );
}
