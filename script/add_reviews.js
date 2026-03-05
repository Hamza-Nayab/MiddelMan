import "dotenv/config";
import pg from "pg";
import { createHash } from "crypto";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Sample review comments with various sentiments
const comments = [
  "Great seller! Fast shipping and high quality items. Highly recommend!",
  "Excellent products and outstanding customer service. Will buy again!",
  "Very satisfied with my purchase. The product is exactly as described.",
  "Amazing quality and fast delivery. Best seller I've encountered!",
  "Very impressed with the professionalism and quality. A++",
  "Perfect! Everything arrived in perfect condition and on time.",
  "Customer service was exceptional. Highly recommend this seller!",
  "Great value for money. Very satisfied with the purchase experience.",
  "Fantastic seller! Will definitely be returning for more.",
  "Excellent packaging and delivery. Very pleased indeed.",
  "Top quality merchandise. Fast and reliable service.",
  "Highly professional. Would not hesitate to purchase from again.",
  "Best seller on the platform. Highly recommended!",
  "Very happy with my order. Quality exceeded expectations.",
  "Fast, reliable, and trustworthy. Everything went smoothly.",
  "Outstanding seller! Items arrived in perfect condition.",
  "Great communication and fast dispatch. Very pleased!",
  "Wonderful experience from start to finish. Highly satisfied!",
  "Quality products and excellent service. Thank you!",
  "Absolutely delighted with my purchase and the seller!",
  "Reliable and professional. Highly recommend this seller.",
  "Everything was perfect. Great seller, will buy again.",
  "Excellent products and smooth transaction. Very happy!",
  "Amazing quality and exceptional customer service experience.",
  "Perfect sellers! Quality as described, quick delivery.",
];

const reviewerNames = [
  "Alex Johnson",
  "Maria Garcia",
  "John Smith",
  "Emma Wilson",
  "Michael Chen",
  "Sarah Davis",
  "James Brown",
  "Lisa Anderson",
  "Robert Taylor",
  "Jennifer Lee",
  "David Martinez",
  "Jessica White",
  "Chris Robinson",
  "Amanda Harris",
  "Daniel Clark",
  "Lauren Lewis",
  "Matthew Walker",
  "Nicole Young",
  "Andrew Hall",
  "Rachel King",
  "Jason Wright",
  "Emily Scott",
  "Brandon Green",
  "Sophia Adams",
  "Kevin Nelson",
  "Melody Carter",
  "Ryan Mitchell",
  "Victoria Perez",
  "Eric Roberts",
  "Grace Phillips",
];

// Sample IP addresses for realistic randomization
const sampleIPs = [
  "192.168.1.1",
  "10.0.0.1",
  "172.16.0.1",
  "203.0.113.1",
  "198.51.100.1",
  "192.0.2.1",
  "198.18.0.1",
  "192.168.100.1",
  "10.10.0.1",
  "172.31.0.1",
];

function hashValue(value) {
  return createHash("sha256").update(value).digest("hex");
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomRating() {
  // Bias towards higher ratings (4-5 stars) with some 3-star reviews
  const rand = Math.random();
  if (rand < 0.6) return 5; // 60% 5-star
  if (rand < 0.3) return 4; // 30% 4-star
  return 3; // 10% 3-star
}

async function main() {
  const client = await pool.connect();

  try {
    // Step 1: Find seller with username "seller"
    const sellerResult = await client.query(
      "SELECT id FROM users WHERE username = $1",
      ["seller"],
    );

    if (sellerResult.rows.length === 0) {
      console.error('Seller with username "seller" not found!');
      process.exit(1);
    }

    const sellerId = sellerResult.rows[0].id;
    console.log(`Found seller with username "seller" (ID: ${sellerId})`);

    // Step 2: Insert 50 reviews
    const reviewsToInsert = [];

    for (let i = 0; i < 50; i++) {
      const rating = getRandomRating();
      const comment = getRandomElement(comments);
      const authorName = getRandomElement(reviewerNames);
      const ipHash = hashValue(getRandomElement(sampleIPs));

      // Spread reviews over different dates (last 30 days)
      const daysAgo = Math.floor(Math.random() * 30);
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      reviewsToInsert.push({
        seller_id: sellerId,
        reviewer_user_id: null, // Anonymous reviews
        author_name: authorName,
        rating: rating,
        comment: comment,
        is_hidden: false,
        ip_hash: ipHash,
        user_agent_hash: hashValue(`Mozilla/5.0 (Review ${i})`),
        created_at: createdAt,
      });
    }

    // Batch insert reviews
    for (const review of reviewsToInsert) {
      await client.query(
        `INSERT INTO reviews (seller_id, reviewer_user_id, author_name, rating, comment, is_hidden, ip_hash, user_agent_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          review.seller_id,
          review.reviewer_user_id,
          review.author_name,
          review.rating,
          review.comment,
          review.is_hidden,
          review.ip_hash,
          review.user_agent_hash,
          review.created_at,
        ],
      );
    }

    console.log(
      `✓ Successfully inserted 50 reviews for seller (ID: ${sellerId})`,
    );

    // Step 3: Get review stats
    const statsResult = await client.query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        MIN(rating) as min_rating,
        MAX(rating) as max_rating
       FROM reviews WHERE seller_id = $1 AND is_hidden = false`,
      [sellerId],
    );

    const stats = statsResult.rows[0];
    console.log(`\nReview Statistics for seller "${sellerId}":`);
    console.log(`  Total Reviews: ${stats.total_reviews}`);
    console.log(`  Average Rating: ${Number(stats.avg_rating).toFixed(2)} ⭐`);
    console.log(`  Min Rating: ${stats.min_rating} ⭐`);
    console.log(`  Max Rating: ${stats.max_rating} ⭐`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
