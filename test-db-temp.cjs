require("dotenv").config();
const postgres = require("postgres");

async function test() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.error("DATABASE_URL não foi carregada.");
    process.exitCode = 1;
    return;
  }

  const sql = postgres(url, { connect_timeout: 10 });

  try {
    const result = await sql.unsafe("SELECT 1 AS teste");
    console.log("Ligação PostgreSQL OK:", result[0].teste);
  } catch (error) {
    console.error("Falha na ligação PostgreSQL:", error.message);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

test();
