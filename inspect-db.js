const db = require('./src/config/db');

async function inspect() {
  // Check if departments table exists
  const { rows: tables } = await db.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'departments'
  `);
  console.log('departments table exists:', tables.length > 0);

  if (tables.length > 0) {
    // Show columns
    const { rows: cols } = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'departments'
      ORDER BY ordinal_position
    `);
    console.log('\ndepartments columns:', JSON.stringify(cols, null, 2));

    // Show data
    const { rows: data } = await db.query('SELECT * FROM departments ORDER BY id');
    console.log('\ndepartments data:', JSON.stringify(data, null, 2));
  }

  // Check users.department_id column
  const { rows: userCols } = await db.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name IN ('team', 'department_id')
    ORDER BY ordinal_position
  `);
  console.log('\nusers team/dept columns:', JSON.stringify(userCols, null, 2));

  process.exit(0);
}

inspect().catch(e => { console.error(e.message); process.exit(1); });
