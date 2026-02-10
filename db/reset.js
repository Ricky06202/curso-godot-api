import 'dotenv/config';
import mysql from 'mysql2/promise';

async function reset() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL no está definida en el archivo .env');
    process.exit(1);
  }

  // Extraer nombre de la base de datos de la URL (mysql://user:pass@host:port/dbname)
  const dbName = url.split('/').pop()?.split('?')[0];

  if (!dbName) {
    console.error('No se pudo determinar el nombre de la base de datos desde DATABASE_URL');
    process.exit(1);
  }

  console.log(`Reseteando base de datos: ${dbName}...`);

  const connection = await mysql.createConnection(url);

  try {
    // Desactivar chequeo de llaves foráneas para poder borrar tablas con relaciones
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Obtener todas las tablas
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    if (tableNames.length === 0) {
      console.log('No hay tablas para borrar.');
    } else {
      for (const tableName of tableNames) {
        console.log(`Borrando tabla: ${tableName}`);
        await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      }
      console.log('Todas las tablas han sido borradas.');
    }

    // Reactivar chequeo de llaves foráneas
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

  } catch (error) {
    console.error('Error durante el reset:', error);
  } finally {
    await connection.end();
  }
}

reset();
