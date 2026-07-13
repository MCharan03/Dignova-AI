const url = process.env.DATABASE_URL;
if (url) {
  try {
    const parsed = new URL(url);
    console.log(`export DB_TYPE=postgresdb`);
    console.log(`export DB_POSTGRESDB_HOST=${parsed.hostname}`);
    console.log(`export DB_POSTGRESDB_PORT=${parsed.port || 5432}`);
    console.log(`export DB_POSTGRESDB_DATABASE=${parsed.pathname.substring(1)}`);
    console.log(`export DB_POSTGRESDB_USER=${parsed.username}`);
    console.log(`export DB_POSTGRESDB_PASSWORD="${decodeURIComponent(parsed.password)}"`);
    console.log(`export DB_POSTGRESDB_SSL_ENABLED=true`);
    console.log(`export DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED=false`);
  } catch (e) {
    console.error("Failed to parse DATABASE_URL:", e.message);
  }
}
