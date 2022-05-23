const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gbt80.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const userCollection = client.db('PMA').collection('users');
        const projectCollection = client.db('PMA').collection('projects');
        const enrollmentCollection = client.db('PMA').collection('enrollments');

        //add a project
        app.post('/project', async (req, res) => {
            const project = req.body;
            const result = await projectCollection.insertOne(project);
            res.send(result);
        })

        //get project
        app.get('/project', async (req, res) => {
            const projects = await projectCollection.find().toArray();
            res.send(projects);
        });
        app.get('/project/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const project = await projectCollection.findOne(filter);
            res.send(project);
        })
        app.put('/project/accept/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const newState = 'In progress';
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    state: newState
                },
            };
            const result = await projectCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })
        app.put('/project/complete/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const newState = 'Completed';
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    state: newState
                },
            };
            const result = await projectCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        //user 
        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        })
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            console.log(email, user);
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token });
        });
        app.delete('/user/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await userCollection.deleteOne(filter);
            res.send(result);
        })

        //supervisor check api
        app.get('/supervisor/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const user = await userCollection.findOne(filter);
            console.log(user);
            if (user?.role === 'supervisor') {
                return res.send({ supervisor: true });
            }
            else {
                return res.send({ supervisor: false });
            }
        })

        //enroll a project
        app.post('/enroll/:id', async (req, res) => {
            const enroll = req.body;
            const query = {
                email: enroll.email,
                project: enroll.project
            }
            const exists = await enrollmentCollection.findOne(query);
            if (exists) {
                return res.send({ success: false })
            }
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const project = await projectCollection.findOne(filter);
            const member = project.member;
            const newMember = member + 1;
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    member: newMember
                },
            };
            await projectCollection.updateOne(filter, updateDoc, options);
            const result = await enrollmentCollection.insertOne(enroll);
            res.send(result);
        })

        //find enroll project
        app.get('/enroll/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await enrollmentCollection.find(filter).toArray();
            res.send(result);
        })

    }
    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('PMA is running..................');
})

app.listen(port, () => {
    console.log('PMA is running on port....', port);
})