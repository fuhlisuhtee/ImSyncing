import { getGoogleAccessToken, googleApiError } from "@/app/lib/google";

type DocumentContent = {
  content?: DocumentContent[];
  paragraph?: {
    elements?: { textRun?: { content?: string } }[];
  };
  table?: {
    tableRows?: {
      tableCells?: { content?: DocumentContent[] }[];
    }[];
  };
};

function getDocumentText(content: DocumentContent[] = []): string {
  return content
    .map((item) => {
      const paragraphText = item.paragraph?.elements
        ?.map((element) => element.textRun?.content ?? "")
        .join("");
      const tableText = item.table?.tableRows
        ?.map((row) => row.tableCells?.map((cell) => getDocumentText(cell.content)).join("\t") ?? "")
        .join("\n");
      return `${paragraphText ?? ""}${tableText ?? ""}${getDocumentText(item.content)}`;
    })
    .join("");
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/google/docs/[documentId]">,
) {
  const access = await getGoogleAccessToken(request);
  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const { documentId } = await context.params;
  const url = new URL(
    `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`,
  );
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${access.token}` },
    cache: "no-store",
  });
  if (!response.ok) return googleApiError(response);

  const document = (await response.json()) as {
    title?: string;
    body?: { content?: DocumentContent[] };
  };
  return Response.json({
    title: document.title ?? "Untitled document",
    text: getDocumentText(document.body?.content),
  });
}
