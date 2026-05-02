require('dotenv').config();
console.log('RESEND_FROM=', process.env.RESEND_FROM);
console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
