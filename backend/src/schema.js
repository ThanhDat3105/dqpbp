require('dotenv').config();
const db = require('./config/db');

async function run() {
    const activities = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'activities'");
    const tasks = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'activity_tasks'");

    require('fs').writeFileSync('./schema.json', JSON.stringify({
        activities: activities.rows.map(r => r.column_name),
        activity_tasks: tasks.rows.map(r => r.column_name)
    }));

    process.exit(0);
}
run().catch(console.error);
