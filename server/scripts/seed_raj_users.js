/*
  Creates 10 test users:
  raj12@gmail.com ... raj21@gmail.com
  Password: Rajan@8340@

  Safe to re-run: upserts by email.
*/

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/alumni-platform';

const PASSWORD = 'Rajan@8340@';

const companies = ['ConnectIN', 'Alumni Labs', 'MentorBridge', 'CampusWorks', 'Tech Corp'];
const schools = ['ABC University', 'XYZ Institute', 'State College', 'National University'];
const locations = ['Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Pune'];

const indianMaleFirstNames = ['Aarav', 'Vihaan', 'Aditya', 'Arjun', 'Rohan', 'Kunal', 'Siddharth', 'Rahul', 'Ishaan', 'Pranav'];
const indianFemaleFirstNames = ['Aanya', 'Anaya', 'Diya', 'Ira', 'Kavya', 'Meera', 'Nisha', 'Riya', 'Saanvi', 'Tanvi'];
const indianLastNames = ['Sharma', 'Gupta', 'Verma', 'Singh', 'Iyer', 'Reddy', 'Patel', 'Khan', 'Chatterjee', 'Nair'];

function pick(arr, idx) {
  return arr[idx % arr.length];
}

async function main() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(PASSWORD, salt);

  const ops = [];

  for (let i = 12; i <= 21; i++) {
    const email = `raj${i}@gmail.com`;
    const isFemale = i % 2 === 0;
    const firstName = isFemale
      ? pick(indianFemaleFirstNames, i)
      : pick(indianMaleFirstNames, i);
    const lastName = pick(indianLastNames, i);
    const name = `${firstName} ${lastName}`;

    const userDoc = {
      name,
      email,
      password: hashed,
      headline: `Software Engineer at ${pick(companies, i)}`,
      location: pick(locations, i),
      company: pick(companies, i),
      avatarUrl: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
      education: [
        {
          school: pick(schools, i),
          degree: 'B.Tech',
          fieldOfStudy: 'Computer Science',
          current: false
        }
      ],
      skills: ['JavaScript', 'React', 'Node.js'].slice(0, (i % 3) + 1)
    };

    ops.push({
      updateOne: {
        filter: { email },
        update: { $set: userDoc },
        upsert: true
      }
    });
  }

  const result = await User.bulkWrite(ops, { ordered: false });

  console.log('Seeded/updated raj users successfully');
  console.log({
    inserted: result.upsertedCount,
    updated: result.modifiedCount,
    matched: result.matchedCount
  });

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('seed_raj_users error:', err);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
