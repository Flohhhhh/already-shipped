import path from "node:path";

// Register as a local ESLint plugin. Set appRoot explicitly in monorepos.
const serverBoundaries = {
  rules: {
    layers: {
      meta: {
        type: "problem",
        schema: [
          {
            type: "object",
            properties: {
              appRoot: { type: "string" },
              aliases: { type: "array", items: { type: "string" } },
            },
            additionalProperties: false,
          },
        ],
        messages: { boundary: "{{reason}}" },
      },
      create(context) {
        const options = context.options[0] ?? {};
        const root = path.resolve(options.appRoot ?? process.cwd());
        const aliases = options.aliases ?? ["@/"];
        const normalize = (value) =>
          value
            .split(path.sep)
            .join("/")
            .replace(/\.(?:[cm]?[jt]sx?)$/, "")
            .replace(/\/index$/, "");
        const relative = (value) => normalize(path.relative(root, value));
        const filename = context.filename ?? context.getFilename();
        const source = relative(filename);
        const layer = (value) => {
          if (value.startsWith("convex/_generated")) return "outside";
          if (value === "convex/schema") return "db";
          if (value.startsWith("convex/")) {
            if (/(?:^|\/)data$/.test(value)) return "data";
            if (/(?:^|\/)service$/.test(value)) return "service";
            if (/^convex\/[^/]+$/.test(value)) return "actions";
            return "helper";
          }
          if (/^src\/server\/db(?:\/|$)/.test(value)) return "db";
          if (!value.startsWith("src/server/")) return "outside";
          if (/(?:^|\/)data$/.test(value)) return "data";
          if (/(?:^|\/)service$/.test(value)) return "service";
          if (/(?:^|\/)actions$/.test(value)) return "actions";
          return "helper";
        };
        const sourceLayer = layer(source);
        function check(node, specifier, typeOnly = false) {
          if (typeof specifier !== "string" || typeOnly) return;
          let target;
          if (specifier.startsWith(".")) {
            target = relative(path.resolve(path.dirname(filename), specifier));
          } else {
            const alias = aliases.find((prefix) =>
              specifier.startsWith(prefix),
            );
            if (alias)
              target = normalize(`src/${specifier.slice(alias.length)}`);
          }
          let reason;
          const rawDriver =
            /^(?:drizzle-orm|postgres|pg|@neondatabase\/serverless)(?:\/|$)/.test(
              specifier,
            );
          if (rawDriver && !["db", "data"].includes(sourceLayer)) {
            reason =
              "Runtime database/ORM imports belong in persistence modules.";
          }
          if (target) {
            const targetLayer = layer(target);
            if (targetLayer === "db" && !["db", "data"].includes(sourceLayer)) {
              reason = "Database imports belong in domain data modules.";
            }
            if (
              targetLayer === "data" &&
              !["service", "data"].includes(sourceLayer)
            ) {
              reason = "Import a domain service instead of raw data.";
            }
            if (
              ["db", "data"].includes(sourceLayer) &&
              ["service", "actions"].includes(targetLayer)
            ) {
              reason = "Persistence must not depend on services or actions.";
            }
            if (sourceLayer === "service" && targetLayer === "actions") {
              reason = "Services must not depend on mutation entrypoints.";
            }
          }
          if (reason)
            context.report({ node, messageId: "boundary", data: { reason } });
        }
        return {
          ImportDeclaration(node) {
            const typeOnly =
              node.importKind === "type" ||
              (node.specifiers.length > 0 &&
                node.specifiers.every((item) => item.importKind === "type"));
            check(node, node.source.value, typeOnly);
          },
          ExportNamedDeclaration(node) {
            if (node.source) {
              check(
                node,
                node.source.value,
                node.exportKind === "type" ||
                  (node.specifiers.length > 0 &&
                    node.specifiers.every(
                      (item) => item.exportKind === "type",
                    )),
              );
            }
          },
          ExportAllDeclaration(node) {
            check(node, node.source.value, node.exportKind === "type");
          },
          ImportExpression(node) {
            check(node, node.source.value);
          },
          CallExpression(node) {
            if (
              node.callee.type === "Identifier" &&
              node.callee.name === "require"
            ) {
              check(node, node.arguments[0]?.value);
            }
          },
        };
      },
    },
  },
};

export default serverBoundaries;
