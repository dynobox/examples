type SaveResult = {
  content: string;
  source: "cache" | "storage";
};

export async function saveContent(
  previousContent: string,
  nextContent: string,
): Promise<SaveResult> {
  if (nextContent === previousContent) {
    return { content: previousContent, source: "cache" };
  }

  await writeContent(nextContent);
  return { content: nextContent, source: "storage" };
}

declare function writeContent(content: string): Promise<void>;
