const mongoose = require('mongoose');
const User = require('./models/User');
const MentorshipPost = require('./models/MentorshipPost');
const Discussion = require('./models/Discussion');

mongoose.connect('mongodb://127.0.0.1:27017/alumni-platform', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('MongoDB Connected for Seeding');
        seedData();
    })
    .catch(err => console.error('MongoDB Connection Error:', err));

const seedData = async () => {
    try {
        await User.deleteMany({});
        await MentorshipPost.deleteMany({});
        await Discussion.deleteMany({});

        const users = await User.insertMany([
            {
                name: "Atif Siddiqui",
                batch: "2019",
                degree: "B.Tech",
                location: "San Francisco",
                role: "Software Engineer",
                company: "Tech Corp",
                avatarUrl: "https://i.pravatar.cc/150?u=atif",
                featured: true
            },
            {
                name: "Nishant Singh M",
                batch: "2019",
                degree: "MBA",
                location: "New York",
                role: "Marketing Manager",
                company: "Biz Inc",
                avatarUrl: "https://i.pravatar.cc/150?u=nishant"
            },
            {
                name: "Raj Gupta",
                batch: "2017",
                degree: "B.Tech",
                location: "London",
                role: "Data Scientist",
                company: "Data Ltd",
                avatarUrl: "https://i.pravatar.cc/150?u=raj"
            },
            {
                name: "Jane Matthews",
                batch: "2018",
                degree: "B.Sc",
                location: "Seattle",
                role: "Product Manager",
                company: "Product Co",
                avatarUrl: "https://i.pravatar.cc/150?u=jane"
            },
            {
                name: "Rahul Sharma",
                batch: "2020",
                degree: "B.Tech",
                location: "Bangalore",
                role: "Developer",
                company: "Soft Sys",
                avatarUrl: "https://i.pravatar.cc/150?u=rahul"
            }
        ]);

        console.log('Users Seeded');

        await MentorshipPost.create([
            {
                title: "Career Guidance in AI",
                author: users[0]._id, // Atif
                description: "Looking to mentor students interested in Artificial Intelligence.",
                datePosted: new Date()
            },
            {
                title: "PM Role Prep",
                author: users[3]._id, // Jane
                description: "Mock interviews and resume reviews for PM roles.",
                datePosted: new Date()
            }
        ]);
        console.log('Mentorship Posts Seeded');

        await Discussion.create([
            {
                topic: "Alumni Meetup 2024",
                author: users[1]._id, // Nishant
                content: "Let's discuss the venue for the next meetup.",
                timestamp: new Date()
            },
            {
                topic: "Job Openings at Data Ltd",
                author: users[2]._id, // Raj
                content: "We are hiring Data Engineers!",
                timestamp: new Date()
            }
        ]);
        console.log('Discussions Seeded');

        console.log('All Data Seeded Successfully');
        process.exit();
    } catch (err) {
        console.error('Seeding Error:', err);
        process.exit(1);
    }
};
