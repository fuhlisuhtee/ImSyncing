import { getGoogleAccessToken, googleApiError } from "@/app/lib/google";

function isValidDate(value: string | null): value is string {
  return value !== null && !Number.isNaN(Date.parse(value));
}

export async function GET(request: Request) {
  const access = await getGoogleAccessToken(request);
  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const requestUrl = new URL(request.url);
  const timeMin = requestUrl.searchParams.get("timeMin");
  const timeMax = requestUrl.searchParams.get("timeMax");
  if (!isValidDate(timeMin) || !isValidDate(timeMax) || Date.parse(timeMin) >= Date.parse(timeMax)) {
    return Response.json({ error: "A valid calendar date range is required." }, { status: 400 });
  }

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "100");
  url.searchParams.set("fields", "items(id,summary,start,end,htmlLink)");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${access.token}` },
    cache: "no-store",
  });
  if (!response.ok) return googleApiError(response);

  return Response.json(await response.json());
}
