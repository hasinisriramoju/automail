const mongoose = require('mongoose');
require('dotenv').config();

const EmailSchema = new mongoose.Schema({}, { strict: false });
const Email = mongoose.model('Email', EmailSchema);

async function updateAllEmailHeaders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas...');

    const emails = await Email.find({});
    console.log(`Found ${emails.length} emails in database.`);

    let updatedCount = 0;
    for (const email of emails) {
      if (email.htmlContent) {
        const original = email.htmlContent;
        let updated = original;

        // Replace any header background with solid/gradient OnIT Green (#00A86B)
        updated = updated.replace(
          /background:\s*linear-gradient\([^)]*\)/gi,
          'background: #00A86B; background: linear-gradient(135deg, #00A86B 0%, #008a58 100%)'
        );
        updated = updated.replace(/background:\s*#1e3a5f/gi, 'background: #00A86B');
        updated = updated.replace(/background:\s*#2563EB/gi, 'background: #00A86B');
        updated = updated.replace(/border-left:\s*3px solid #[0-9a-fA-F]+/gi, 'border-left: 3px solid #00A86B');
        updated = updated.replace(/color:\s*#2563EB/gi, 'color: #00A86B');
        updated = updated.replace(/color:\s*#1e40af/gi, 'color: #0F172A');
        updated = updated.replace(/color:\s*#a5c8ff/gi, 'color: #ffffff');

        if (updated !== original) {
          email.htmlContent = updated;
          await email.save();
          updatedCount++;
        }
      }
    }

    console.log(`Successfully updated ${updatedCount} email headers in MongoDB to OnIT Green (#00A86B).`);
    process.exit(0);
  } catch (err) {
    console.error('Error updating emails in MongoDB:', err);
    process.exit(1);
  }
}

updateAllEmailHeaders();
