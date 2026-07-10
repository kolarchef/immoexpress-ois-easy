import dotenv from "dotenv";
dotenv.config();

const port = process.env.PORT ?? "8787";
const secret = process.env.BRAINY_WORKER_SECRET;

if (!secret) {
  console.error("BRAINY_WORKER_SECRET fehlt in der .env — Test abgebrochen.");
  process.exit(1);
}

const payload = {
  city: "Perchtoldsdorf",
  street: "Hochstraße",
  houseNumber: "137",
  region: "Niederösterreich",
  searchMode: "exact",
  limitEuro: 25,
};

console.log(`POST http://localhost:${port}/search-address`);
console.log("Payload:", JSON.stringify(payload));

try {
  const response = await fetch(`http://localhost:${port}/search-address`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();
  console.log(`\nHTTP ${response.status}`);
  console.log(JSON.stringify(body, null, 2));

  if (!response.ok) process.exit(1);

  const results: Array<Record<string, string>> = body.results ?? [];
  console.log(`\n${results.length} Treffer (Modus: ${body.mode})`);
  for (const hit of results) {
    console.log(
      `  ${hit.address}  |  EZ ${hit.ez}  KG-EZ ${hit.kgEz}  Gst ${hit.grundstuecksnummer}  KG-Gst ${hit.kgGst}`
    );
  }
} catch (err) {
  console.error(
    "\nRequest fehlgeschlagen — läuft der Worker? Starte ihn mit: npm run dev (Windows: npm.cmd run dev)"
  );
  console.error((err as Error).message);
  process.exit(1);
}
