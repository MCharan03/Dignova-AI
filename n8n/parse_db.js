const url = process.env.DATABASE_URL;
if (url) {
  try {
    const parsed = new URL(url);
    const password = decodeURIComponent(parsed.password).replace(/'/g, "'\\''")
    // Single-quote the password to prevent shell expansion of special chars like $
    process.stdout.write(`export DB_TYPE=postgresdb\n`);
    process.stdout.write(`export DB_POSTGRESDB_HOST=${parsed.hostname}\n`);
    process.stdout.write(`export DB_POSTGRESDB_PORT=${parsed.port || 5432}\n`);
    process.stdout.write(`export DB_POSTGRESDB_DATABASE=${parsed.pathname.substring(1)}\n`);
    process.stdout.write(`export DB_POSTGRESDB_USER=${parsed.username}\n`);
    process.stdout.write(`export DB_POSTGRESDB_PASSWORD='${password}'\n`);
    process.stdout.write(`export DB_POSTGRESDB_SSL_ENABLED=true\n`);
    process.stdout.write(`export DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED=false\n`);
  } catch (e) {
    console.error("Failed to parse DATABASE_URL:", e.message);
  }
}
