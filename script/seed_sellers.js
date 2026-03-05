import "dotenv/config";
import pg from "pg";
import bcrypt from "bcryptjs";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Mock data arrays
const firstNames = [
  "Ali",
  "Sara",
  "Ahmed",
  "Fatima",
  "Hassan",
  "Aisha",
  "Mohammad",
  "Zainab",
  "Omar",
  "Layla",
  "Ibrahim",
  "Noor",
  "Karim",
  "Mariam",
  "Jamal",
  "Amira",
  "Rashid",
  "Leila",
  "Tarek",
  "Hana",
  "Khalid",
  "Samira",
  "Fadi",
  "Dana",
  "Walid",
  "Noura",
  "Mansour",
  "Yasmine",
  "Nabil",
  "Dina",
];

const lastNames = [
  "Khan",
  "Ahmed",
  "Hassan",
  "Ali",
  "Mohamed",
  "Ibrahim",
  "Abdullah",
  "Salem",
  "Mansour",
  "Rashid",
  "Karim",
  "Noor",
  "Sharif",
  "Qadir",
  "Malik",
  "Hakim",
  "Saeed",
  "Amin",
  "Aziz",
  "Hasan",
  "Farah",
  "Jamal",
  "Kamal",
  "Talal",
  "Wazir",
  "Shariah",
  "Latif",
  "Zafer",
  "Nasr",
  "Omar",
];

const cities = [
  "Dubai",
  "Cairo",
  "Beirut",
  "Istanbul",
  "Amman",
  "Riyadh",
  "Jeddah",
  "Baghdad",
  "Doha",
  "Kuwait City",
  "Abu Dhabi",
  "Muscat",
  "Sana'a",
  "Gaza",
  "Ramallah",
  "Casablanca",
  "Fez",
  "Algiers",
  "Tunis",
  "Baghdad",
];

const bios = [
  "Premium quality products & excellent customer service",
  "Direct importer of authentic goods",
  "Trusted seller with 100% positive feedback",
  "Specialized in exclusive items and rare finds",
  "Fast shipping and authentic guarantees",
  "Wholesale and retail available",
  "Family business for over 20 years",
  "Certified seller with verified credentials",
  "Expert in sourcing and quality control",
  "Your trusted marketplace partner",
];

const displayNames = [
  "Elite Store",
  "Prime Market",
  "Quality First",
  "Trust Hub",
  "Premium Goods",
  "Market Leader",
  "Best Deals",
  "Verified Merchant",
  "Expert Traders",
  "Star Seller",
  "Gold Store",
  "Silver Market",
  "Bright Deals",
  "Smart Shopper",
  "Value Express",
  "Pro Seller",
  "Master Dealer",
  "Expert Market",
  "Choice Store",
  "Crown Merchant",
];

const websites = [
  "https://www.example.com",
  "https://www.mystore.com",
  "https://www.business.com",
  "https://www.trusted-shop.com",
  "https://www.quality-goods.com",
];

const platforms = [
  {
    icon: "instagram",
    title: "Instagram",
    urlTemplate: "https://instagram.com/seller{id}",
  },
  {
    icon: "facebook",
    title: "Facebook",
    urlTemplate: "https://facebook.com/seller{id}",
  },
  {
    icon: "linkedin",
    title: "LinkedIn",
    urlTemplate: "https://linkedin.com/in/seller{id}",
  },
  {
    icon: "website",
    title: "Website",
    urlTemplate: "https://www.example.com/seller{id}",
  },
  { icon: "x", title: "Twitter", urlTemplate: "https://x.com/seller{id}" },
];

const countries = ["AE", "EG", "LB", "TR", "SA", "QA", "AE", "KW", "OM", "JO"];

const whatsappNumbers = [
  "+971501234567",
  "+971502345678",
  "+201001234567",
  "+201012345678",
  "+961792345678",
  "+905551234567",
  "+966501234567",
  "+974401234567",
  "+96550234567",
  "+96550345678",
];

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedSellers() {
  const client = await pool.connect();
  const password = "12345678";
  const hashedPassword = await hashPassword(password);

  console.log("🌱 Starting seller account seeding...");

  try {
    await client.query("BEGIN");

    for (let i = 1; i <= 50; i++) {
      const username = `seller_${i}`;
      const email = `seller${i}@middelman.test`;
      const firstName = getRandomItem(firstNames);
      const lastName = getRandomItem(lastNames);
      const displayName = `${firstName} ${lastName}`;
      const bio = getRandomItem(bios);
      const city = getRandomItem(cities);
      const country = getRandomItem(countries);
      const whatsapp = getRandomItem(whatsappNumbers);

      console.log(`  [${i}/50] Creating seller: ${username}`);

      // Insert user
      const userResult = await client.query(
        `INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id`,
        [username, email, hashedPassword, "seller"],
      );

      const userId = userResult.rows[0].id;

      // Insert profile
      await client.query(
        `INSERT INTO profiles (user_id, display_name, bio, contact_email, whatsapp_number, country_code, is_verified, verification_method, theme, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          userId,
          displayName,
          bio,
          `${username}@middelman.test`,
          whatsapp,
          country,
          true, // Mark as verified
          "manual",
          getRandomItem(["light", "dark", "gradient"]),
        ],
      );

      // Insert 3-5 random links for each seller
      const linkCount = Math.floor(Math.random() * 3) + 3; // 3-5 links
      for (let j = 0; j < linkCount; j++) {
        const platform = getRandomItem(platforms);
        const url = platform.urlTemplate.replace("{id}", i);

        await client.query(
          `INSERT INTO links (user_id, icon, title, url, is_active, sort_order, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [userId, platform.icon, platform.title, url, true, j],
        );
      }

      // Add some basic profile stats (optional)
      await client.query(
        `INSERT INTO profile_daily_stats (user_id, day, views, clicks, updated_at)
         VALUES ($1, CURRENT_DATE, $2, $3, NOW())
         ON CONFLICT (user_id, day) DO UPDATE SET views = $2, clicks = $3`,
        [
          userId,
          Math.floor(Math.random() * 100) + 10,
          Math.floor(Math.random() * 20),
        ],
      );
    }

    await client.query("COMMIT");
    console.log("\n✅ Successfully seeded 50 seller accounts!");
    console.log("\n📝 Login credentials:");
    console.log("   Username: seller_1 to seller_50");
    console.log("   Password: 12345678");
    console.log("   Email: seller1@middelman.test to seller50@middelman.test");
    process.exit(0);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\n❌ Error seeding sellers:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedSellers();
