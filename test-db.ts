import postgres from "postgres";

async function testConnection() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL não está definida.");
    process.exitCode = 1;
    return;
  }

  const sql = postgres(databaseUrl, {
    connect_timeout: 10,
  });
try 
{
 const result = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  ORDER BY table_name
`;

console.log("Tabelas encontradas:", result.map(row => row.table_name));
  } catch (error) {
    console.error(
      "Falha na conexão:",
      error instanceof Error ? error.message : error
    );

    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

testConnection();