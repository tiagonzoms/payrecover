const postgres = require("postgres");
require("dotenv").config();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não está definida no ambiente.");
  }

  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    connect_timeout: 10,
  });

  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log("Tabelas encontradas no esquema public:");
    console.table(tables);
    console.log("Total:", tables.length);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error("Falha na verificação:", error.message);
  process.exitCode = 1;
});
