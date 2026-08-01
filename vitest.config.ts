import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";
import ts from "typescript";

const tsTransformPlugin = () => ({
  name: "ts-transpile-for-vitest",
  transform(code: string, id: string) {
    if (id.includes("/node_modules/")) return null;
    if (!/\.(ts|tsx|js|jsx)$/.test(id)) return null;

    const result = ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        sourceMap: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
      fileName: id,
    });

    return {
      code: result.outputText,
      map: result.sourceMapText ?? null,
    };
  },
});

export default defineConfig({
  esbuild: false,
  plugins: [tsTransformPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    pool: "threads",
  },
});
