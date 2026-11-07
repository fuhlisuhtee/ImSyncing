import { getGoogleAccessToken, googleApiError } from "@/app/lib/google";

export async function GET(request: Request) {
  const access = await getGoogleAccessToken(request);
  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", "trashed = false");
  url.searchParams.set("orderBy", "modifiedTime desc");
  url.searchParams.set("pageSize", "50");
  url.searchParams.set(
    "fields",
    "files(id,name,mimeType,modifiedTime,webViewLink,size)",
  );

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${access.token}` },
    cache: "no-store",
  });
  if (!response.ok) return googleApiError(response);

  return Response.json(await response.json());
}
