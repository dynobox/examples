import fs from "node:fs/promises";
import path from "node:path";

export const extractDesignSystemMock = {
  handler: async ({ argv, cwd }) => {
    if (
      argv[0] === "playwright" &&
      argv[1] === "install" &&
      argv[2] === "chromium"
    ) {
      return { exitCode: 0, stdout: "Chromium installed" };
    }

    if (argv[0] !== "extract-design-system" || !argv[1]) {
      return { exitCode: 1, stderr: "Expected extract-design-system <url>" };
    }

    const tokens = {
      colors: { primary: "#123456", accent: "#f97316" },
      fonts: ["Inter", "ui-sans-serif"],
      radius: ["0.25rem", "0.5rem"],
    };
    const extractionDir = path.join(cwd, ".extract-design-system");
    await fs.mkdir(extractionDir, { recursive: true });
    await fs.writeFile(
      path.join(extractionDir, "raw.json"),
      `${JSON.stringify(tokens, null, 2)}\n`,
    );
    await fs.writeFile(
      path.join(extractionDir, "normalized.json"),
      `${JSON.stringify(tokens, null, 2)}\n`,
    );

    if (!argv.includes("--extract-only")) {
      const outputDir = path.join(cwd, "design-system");
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(
        path.join(outputDir, "tokens.json"),
        `${JSON.stringify(tokens, null, 2)}\n`,
      );
      await fs.writeFile(
        path.join(outputDir, "tokens.css"),
        ":root {\n  --color-primary: #123456;\n  --color-accent: #f97316;\n}\n",
      );
    }

    return { exitCode: 0, stdout: "Extracted design primitives" };
  },
};
