import { getGoogleAccessToken, googleApiError } from "@/app/lib/google";

type SpreadsheetMetadata = {
  properties?: { title?: string };
  sheets?: { properties?: { title?: string; index?: number } }[];
};

export async function GET(
  request: Request,
  context: RouteContext<"/api/google/sheets/[spreadsheetId]">,
) {
  const access = await getGoogleAccessToken(request);
  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const { spreadsheetId } = await context.params;
  const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}`;
  const metadataUrl = new URL(baseUrl);
  metadataUrl.searchParams.set("fields", "properties(title),sheets(properties(title,index))");

  const metadataResponse = await fetch(metadataUrl, {
    headers: { Authorization: `Bearer ${access.token}` },
    cache: "no-store",
  });
  if (!metadataResponse.ok) return googleApiError(metadataResponse);

  const spreadsheet = (await metadataResponse.json()) as SpreadsheetMetadata;
  const firstSheet = spreadsheet.sheets
    ?.slice()
    .sort((left, right) => (left.properties?.index ?? 0) - (right.properties?.index ?? 0))[0]
    ?.properties?.title;
  if (!firstSheet) {
    return Response.json({ title: spreadsheet.properties?.title ?? "Untitled spreadsheet", values: [] });
  }

  const range = `'${firstSheet.replaceAll("'", "''")}'!A1:Z20`;
  const valuesUrl = new URL(`${baseUrl}/values/${encodeURIComponent(range)}`);
  const valuesResponse = await fetch(valuesUrl, {
    headers: { Authorization: `Bearer ${access.token}` },
    cache: "no-store",
  });
  if (!valuesResponse.ok) return googleApiError(valuesResponse);

  const data = (await valuesResponse.json()) as { values?: (string | number | boolean)[][] };
  return Response.json({
    title: spreadsheet.properties?.title ?? "Untitled spreadsheet",
    values: data.values ?? [],
  });
}
