require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bnuku.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // -----------------------------------------
    const usersCollection = client.db("DropTaskDB").collection("users");
    const tasksCollection = client.db("DropTaskDB").collection("tasks");

    // API to store user info only on first login
    app.post("/users", async (req, res) => {
      const user = req.body; // { uid, email, displayName }

      // Check if user already exists
      const existingUser = await usersCollection.findOne({ uid: user.uid });

      if (existingUser) {
        return res.send({ message: "User already exists", inserted: false });
      }

      // Insert new user
      const result = await usersCollection.insertOne(user);
      res.send({ message: "User added successfully", inserted: true, result });
    });

    
    // add task api endpoint
    app.post("/tasks", async (req, res) => {
      try {
        const { title, description, userId } = req.body;
    
        if (!userId) {
          return res.status(400).json({ message: "User ID is required." });
        }
    
        if (!title || title.length > 50) {
          return res.status(400).json({ message: "Title is required (max 50 characters)." });
        }
    
        if (description && description.length > 200) {
          return res.status(400).json({ message: "Description must be within 200 characters." });
        }
    
        const newTask = {
          title,
          description: description || "",
          timestamp: new Date(),
          category: "To-Do",
          userId, // Associate the task with the logged-in user
        };
    
        const result = await tasksCollection.insertOne(newTask);
        res.status(201).json({ message: "Task added successfully!" });
    
      } catch (error) {
        console.error("Error adding task:", error);
        res.status(500).json({ message: "Internal server error." });
      }
    });
    

    // -----------------------------------------

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Drop task server is running");
});

app.listen(port, () => {
  console.log(`Drop task Server is running on port: ${port}`);
});
