import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_MESSAGE = "mom-to-prd-team-access-v1";

export function isTeamAccessProtected(): boolean {
  return Boolean(process.env.TEAM_ACCESS_PASSWORD?.trim());
}

export function createTeamAccessToken(): string {
  const password = process.env.TEAM_ACCESS_PASSWORD?.trim();

  if (!password) {
    return "";
  }

  return createHmac("sha256", password).update(TOKEN_MESSAGE).digest("hex");
}

export function isTeamAccessTokenValid(token: string | null): boolean {
  if (!isTeamAccessProtected()) {
    return true;
  }

  if (!token) {
    return false;
  }

  const expected = Buffer.from(createTeamAccessToken(), "hex");
  const received = Buffer.from(token, "hex");

  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}
