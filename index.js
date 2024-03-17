const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

require('dotenv').config();
app.use(cors());
app.use(express.json())

var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@ac-gpqk4f0-shard-00-00.qm6ghoc.mongodb.net:27017,ac-gpqk4f0-shard-00-01.qm6ghoc.mongodb.net:27017,ac-gpqk4f0-shard-00-02.qm6ghoc.mongodb.net:27017/?ssl=true&replicaSet=atlas-rcscp7-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const appointmentOptionsCollections = client.db('doctors_portal_recap2').collection('serviceAppointments')
        const bookingsCollections = client.db('doctors_portal_recap2').collection('bookings');
        const usersCollections = client.db('doctors_portal_recap2').collection('users');

        app.get('/appointmentOptions', async (req, res) => {
            const date = req.query.date;
            // console.log(date);
            const query = {};
            const options = await appointmentOptionsCollections.find(query).toArray();
            const bookingQuery = { appoinmentDate: date }
            const allreadyBooked = await bookingsCollections.find(bookingQuery).toArray();
            options.forEach(option => {
                const optionBooked = allreadyBooked.filter(book => book.treatment === option.name);
                const bookedSlots = optionBooked.map(book => book.slot);
                const remaingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
                option.slots = remaingSlots;
            })
            res.send(options)
        })


        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const bookings = await bookingsCollections.find(query).toArray();
            res.send(bookings);
        })


        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            // console.log(booking);
            const query = {
                appoinmentDate: booking.appoinmentDate,
                email: booking.email,
                treatment: booking.treatment
            }
            const alreadyBooked = await bookingsCollections.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `you already have a booking on ${booking.appoinmentDate}`;
                return res.send({ acknowledged: false, message })
            }
            const result = await bookingsCollections.insertOne(booking);
            res.send(result);
        })


        app.post('/users', async(req, res)=>{
            const users = req.body;
            console.log(users);
            const result = await usersCollections.insertOne(users);
            res.send(result);

        })

    }
    finally {

    }

}
run().catch(console.dir);



app.get('/', async (req, res) => {
    res.send('doctors portal server is runing')
})

app.listen(port, () => {
    console.log(`Doctors portal server runing on port ${port}`)
})