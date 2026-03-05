import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const SAMPLE_LINKS = [
  { icon: "website", title: "My Portfolio", url: "https://example.com" },
  {
    icon: "instagram",
    title: "Instagram",
    url: "https://instagram.com/seller",
  },
  {
    icon: "linkedin",
    title: "LinkedIn",
    url: "https://linkedin.com/in/seller",
  },
  {
    icon: "facebook",
    title: "Facebook Page",
    url: "https://facebook.com/seller",
  },
  { icon: "x", title: "Twitter/X", url: "https://x.com/seller" },
  {
    icon: "youtube",
    title: "YouTube Channel",
    url: "https://youtube.com/@seller",
  },
  { icon: "github", title: "GitHub", url: "https://github.com/seller" },
  { icon: "tiktok", title: "TikTok", url: "https://tiktok.com/@seller" },
  {
    icon: "discord",
    title: "Discord Server",
    url: "https://discord.gg/seller",
  },
  { icon: "telegram", title: "Telegram", url: "https://t.me/seller" },
  {
    icon: "whatsapp",
    title: "WhatsApp Business",
    url: "https://wa.me/1234567890",
  },
  { icon: "email", title: "Email Me", url: "mailto:seller@example.com" },
];

async function addLinksToSeller() {
  const client = await pool.connect();
  try {
    console.log("Finding seller with username 'seller'...");

    const sellerResult = await client.query(
      "SELECT * FROM users WHERE username = $1 LIMIT 1",
      ["seller"],
    );

    if (sellerResult.rows.length === 0) {
      console.error("❌ Seller with username 'seller' not found");
      process.exit(1);
    }

    const seller = sellerResult.rows[0];
    console.log(`✅ Found seller: ${seller.username} (ID: ${seller.id})`);

    // Check existing links
    const existingLinksResult = await client.query(
      "SELECT * FROM links WHERE user_id = $1",
      [seller.id],
    );

    console.log(`📋 Existing links: ${existingLinksResult.rows.length}`);

    // Delete existing links if any
    if (existingLinksResult.rows.length > 0) {
      await client.query("DELETE FROM links WHERE user_id = $1", [seller.id]);
      console.log(
        `🗑️  Deleted ${existingLinksResult.rows.length} existing links`,
      );
    }

    // Add 12 links
    console.log("Adding 12 new links...");
    for (let i = 0; i < 12; i++) {
      const linkData = SAMPLE_LINKS[i];
      await client.query(
        `INSERT INTO links (user_id, icon, title, url, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [seller.id, linkData.icon, linkData.title, linkData.url, i],
      );
      console.log(`  ✓ Added link ${i + 1}: ${linkData.title}`);
    }

    console.log("\n✅ Successfully added 12 links to seller!");

    // Show final count
    const finalLinksResult = await client.query(
      "SELECT * FROM links WHERE user_id = $1",
      [seller.id],
    );

    console.log(`📊 Total links: ${finalLinksResult.rows.length}`);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

addLinksToSeller();
