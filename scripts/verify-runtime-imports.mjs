import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const FORBIDDEN_SPECIFIERS = ["mysql2", "drizzle-orm"];
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const IMPORT_EXPORT_FROM = /(?:import|export)\s+(?:[^'"]*?from\s+)?['"]([^'"]+)['"]/g;

function fail(message) {
  console.error(`[verify:runtime] FALHA: ${message}`);
  process.exit(1);
}

function assertNoForbiddenImports(filePath, seen = new Set()) {
  const abs = path.resolve(filePath);
  if (seen.has(abs)) return;
  seen.add(abs);

  if (!existsSync(abs)) {
    fail(
      `arquivo compilado não encontrado: ${path.relative(root, abs)} — rode "npm run build" antes de "npm run verify:runtime".`,
    );
  }

  const source = readFileSync(abs, "utf8");
  let match;
  while ((match = IMPORT_EXPORT_FROM.exec(source))) {
    const specifier = match[1];
    if (FORBIDDEN_SPECIFIERS.some((name) => specifier === name || specifier.startsWith(`${name}/`))) {
      fail(
        `import proibido "${specifier}" encontrado em ${path.relative(root, abs)} — este grafo não pode depender de mysql2/drizzle-orm em runtime.`,
      );
    }
    if (specifier.startsWith(".")) {
      assertNoForbiddenImports(path.resolve(path.dirname(abs), specifier), seen);
    }
  }
}

async function main() {
  console.log("[verify:runtime] Verificando import de @finanhouse/domain via Node...");
  const domainEntry = path.join(root, "packages/domain/dist/index.js");
  assertNoForbiddenImports(domainEntry);
  const domainModule = await import(pathToFileURL(domainEntry).href);

  for (const fnName of ["parseMoney", "calculateMonthlySummary", "compareMonthlyPeriods"]) {
    if (typeof domainModule[fnName] !== "function") {
      fail(`@finanhouse/domain não exporta a função "${fnName}" (${domainEntry}).`);
    }
  }
  console.log("[verify:runtime] OK — parseMoney, calculateMonthlySummary, compareMonthlyPeriods presentes.");

  const cents = domainModule.parseMoney("10.00");
  if (cents !== 1000n) {
    fail(`parseMoney('10.00') deveria retornar 1000n, retornou ${cents}.`);
  }

  console.log("[verify:runtime] Verificando import de um serviço compilado de apps/api (summary-services.js)...");
  const serviceEntry = path.join(root, "apps/api/dist/application/services/summary-services.js");
  assertNoForbiddenImports(serviceEntry);
  const serviceModule = await import(pathToFileURL(serviceEntry).href);

  for (const className of ["CalculateMonthlySummaryService", "CompareMonthlyPeriodsService"]) {
    if (typeof serviceModule[className] !== "function") {
      fail(`${path.relative(root, serviceEntry)} não exporta "${className}".`);
    }
  }
  console.log("[verify:runtime] OK — CalculateMonthlySummaryService, CompareMonthlyPeriodsService presentes.");

  console.log("[verify:runtime] Nenhum servidor iniciado, nenhuma conexão de banco, nenhuma leitura de .env.local.");
  console.log(
    "[verify:runtime] SUCESSO — @finanhouse/domain e o serviço de aplicação compilado funcionam via import padrão do Node, sem depender de arquivos .ts em runtime.",
  );
}

main().catch((error) => {
  fail(error instanceof Error ? (error.stack ?? error.message) : String(error));
});
