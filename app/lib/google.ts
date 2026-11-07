import { getToken } from "next-auth/jwt";

type GoogleToken = {
  token: string;
} | {
  error: string;
  status: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function getGoogleAccessToken(request: Request): Promise<GoogleToken> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return { error: "Authentication is not configured. Set AUTH_SECRET and restart the app.", status: 503 };
  }

  const token = await getToken({
    req: request,
    secret,
    secureCookie: process.env.NODE_ENV === "production",
  });
  if (!token || typeof token.googleAccessToken !== "string") {
    return { error: "Connect your Google account to use this service.", status: 401 };
  }

  const expiresAt = typeof token.googleAccessTokenExpiresAt === "number"
    ? token.googleAccessTokenExpiresAt
    : 0;
  if (expiresAt > Date.now() + 60_000) {
    return { token: token.googleAccessToken };
  }

  const refreshToken = token.googleRefreshToken;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (typeof refreshToken !== "string" || !clientId || !clientSecret) {
    return {
      error: "Google authorization expired. Reconnect your account to continue.",
      status: 401,
    };
  }

  const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const refreshData: unknown = await refreshResponse.json();
  if (!refreshResponse.ok || !isRecord(refreshData) || typeof refreshData.access_token !== "string") {
    return {
      error: "Could not renew Google authorization. Reconnect your account and try again.",
      status: 401,
    };
  }

  return { token: refreshData.access_token };
}

export async function googleApiError(response: Response) {
  let message = `Google API request failed (${response.status}).`;
  try {
    const details: unknown = await response.json();
    if (isRecord(details) && isRecord(details.error) && typeof details.error.message === "string") {
      message = details.error.message;
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  return Response.json({ error: message }, { status: response.status });
}
