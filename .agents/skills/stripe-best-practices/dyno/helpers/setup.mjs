const referenceFiles = ["payments.md", "security.md"];

export const createSetup = (here) => [
  "mkdir -p .agents/skills/stripe-best-practices/references .claude/skills/stripe-best-practices/references",
  ...referenceFiles.flatMap((file) => [
    `cp ${here.q(`../references/${file}`)} .agents/skills/stripe-best-practices/references/${file}`,
    `cp ${here.q(`../references/${file}`)} .claude/skills/stripe-best-practices/references/${file}`,
  ]),
];
