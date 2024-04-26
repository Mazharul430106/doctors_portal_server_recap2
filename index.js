const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const jwt = require('jsonwebtoken');

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


const verifyJwt = (req, res, next) => {
     //console.log( 'bearer inside verifyJwt', req.headers.authorization);

    const authHeader = req.headers.authorization;
    console.log(authHeader)

    if (!authHeader) {
        return res.status(401).send('unauthorized access')
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbiden access' })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        const appointmentOptionsCollections = client.db('doctors_portal_recap2').collection('serviceAppointments')
        const bookingsCollections = client.db('doctors_portal_recap2').collection('bookings');
        const usersCollections = client.db('doctors_portal_recap2').collection('users');

        // appointments options data get from database'
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

        // bookings data get from database'
        app.get('/bookings', verifyJwt, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbiden access' })
            }

            const bookings = await bookingsCollections.find(query).toArray();
            res.send(bookings);
        })

        // bookings data post from database'
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


        // get token from user.
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            console.log(email);
            const query = { email: email };
            const user = await usersCollections.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' });
        })


        // users data post from database'
        app.post('/users', async (req, res) => {
            const users = req.body;
            console.log(users);
            const result = await usersCollections.insertOne(users);
            res.send(result);
        })

        // get all users form database.
        app.get('/users', async (req, res) => {
            const query = {};
            const allUsers = await usersCollections.find(query).toArray();
            res.send(allUsers);
        })

        // chack user admin 
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollections.findOne(query);
            res.send({ isAdmin :user?.role === 'admin'})
        })

        // create admin role 
        app.put('/users/admin/:id', verifyJwt, async (req, res) => {
            const decodedEmail = req.decoded.email;
            console.log(decodedEmail)
            const query = { email: decodedEmail };
            const users = await usersCollections.findOne(query);
            if (users?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollections.updateOne(filter, updateDoc, options);
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