// Adapt aliases, globs, and adapter exceptions to the generated app.
// Merge these fragments after the project's TypeScript ESLint configuration.
export function serverImportRules(alias = "@") {
  const db = `${alias}/server/db`;
  const dataPatterns = [`${alias}/server/**/data`, `${alias}/server/**/data.*`];
  const convexDataPatterns = ["convex/**/data", "convex/**/data.*"];
  const schemaOnly = {
    group: [`${db}/schema`, `${db}/schema.*`],
    allowTypeImports: true,
    message:
      "Use type-only schema imports here; persistence belongs in data modules.",
  };
  const databaseRestriction = {
    group: [
      db,
      `${db}/index`,
      `${db}/index.*`,
      "convex/schema",
      "convex/schema.*",
    ],
    message: "Database access belongs in domain data modules.",
  };
  const dataRestriction = {
    group: [...dataPatterns, ...convexDataPatterns],
    message: "Import the domain service; raw data modules are internal.",
  };
  const restrict = (patterns) => ({
    "no-restricted-imports": "off",
    "@typescript-eslint/no-restricted-imports": ["error", { patterns }],
  });
  return [
    {
      files: ["**/*.{ts,tsx}"],
      rules: restrict([databaseRestriction, schemaOnly, dataRestriction]),
    },
    {
      files: ["src/server/**/service.{ts,tsx}", "convex/**/service.{ts,tsx}"],
      rules: restrict([databaseRestriction, schemaOnly]),
    },
    {
      files: [
        "src/server/**/data.{ts,tsx}",
        "src/server/db/**/*.{ts,tsx}",
        "convex/**/data.{ts,tsx}",
        "convex/schema.ts",
      ],
      rules: {
        "no-restricted-imports": "off",
        "@typescript-eslint/no-restricted-imports": "off",
      },
    },
  ];
}
