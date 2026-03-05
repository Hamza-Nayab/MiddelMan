import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function verifySellers() {
  const client = await pool.connect();

  try {
    // Count total sellers
    const countResult = await client.query(
      `SELECT COUNT(*) as total FROM users WHERE role = 'seller' AND username LIKE 'seller_%'`,
    );
    const totalSellers = countResult.rows[0].total;

    console.log(`\n✅ Total seller accounts created: ${totalSellers}\n`);

    // Get sample sellers with their profiles
    const sampleResult = await client.query(
      `SELECT u.id, u.username, u.email, p.display_name, p.bio, p.country_code
       FROM users u
       JOIN profiles p ON u.id = p.user_id
       WHERE u.role = 'seller' AND u.username LIKE 'seller_%'
       ORDER BY u.id LIMIT 5`,
    );

    console.log("📋 Sample sellers:\n");
    sampleResult.rows.forEach((seller, idx) => {
      console.log(`${idx + 1}. ${seller.username}`);
      console.log(`   Email: ${seller.email}`);
      console.log(`   Display Name: ${seller.display_name}`);
      console.log(`   Bio: ${seller.bio}`);
      console.log(`   Country: ${seller.country_code}\n`);
    });

    // Get seller with most links
    const linksResult = await client.query(
      `SELECT u.username, COUNT(l.id) as link_count
       FROM users u
       LEFT JOIN links l ON u.id = l.user_id
       WHERE u.role = 'seller' AND u.username LIKE 'seller_%'
       GROUP BY u.id, u.username
       ORDER BY link_count DESC
       LIMIT 1`,
    );

    console.log(`🔗 Sample seller with links:`);
    if (linksResult.rows.length > 0) {
      const seller = linksResult.rows[0];
      console.log(`   ${seller.username} has ${seller.link_count} links\n`);
    }

    // Get all usernames for quick reference
    const allUsernames = await client.query(
      `SELECT username FROM users WHERE role = 'seller' AND username LIKE 'seller_%' ORDER BY id`,
    );

    console.log(`🔐 All seller usernames (password: 12345678 for all):\n`);
    allUsernames.rows.forEach((row, idx) => {
      if ((idx + 1) % 5 === 0) {
        console.log(`   ${row.username}`);
      } else {
        process.stdout.write(`   ${row.username}, `);
      }
    });
    console.log("\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error verifying sellers:", error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

verifySellers();
