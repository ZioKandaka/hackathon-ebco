import { AppDataSource } from './data-source';

async function main() {
  const dataSource = await AppDataSource.initialize();
  try {
    const applied = await dataSource.runMigrations();
    console.log(`Applied ${applied.length} migration(s).`);
    for (const m of applied) {
      console.log(` - ${m.name}`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err) => {
  console.error('Migration run failed:', err);
  process.exit(1);
});
