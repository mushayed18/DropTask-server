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
    // await client.connect();

    // -----------------------------------------
    const usersCollection = client.db("DropTaskDB").collection("users");
    const tasksCollection = client.db("DropTaskDB").collection("tasks");

    // API to store user info only on first login
    app.post("/users", async (req, res) => {
      const { email, displayName } = req.body; // Extract only email and displayName

      if (!email || !displayName) {
        return res
          .status(400)
          .json({ message: "Email and display name are required." });
      }

      try {
        // Check if the user already exists using email
        const existingUser = await usersCollection.findOne({ email });

        if (existingUser) {
          return res.send({ message: "User already exists", inserted: false });
        }

        // Insert new user without UID
        const result = await usersCollection.insertOne({ email, displayName });
        res.send({
          message: "User added successfully",
          inserted: true,
          result,
        });
      } catch (error) {
        console.error("Error adding user:", error);
        res.status(500).json({ message: "Internal server error." });
      }
    });

    // add task api endpoint
    app.post("/tasks", async (req, res) => {
      try {
        const { title, description, email } = req.body; // Use email instead of userId

        if (!email) {
          return res.status(400).json({ message: "User email is required." });
        }

        if (!title || title.length > 50) {
          return res
            .status(400)
            .json({ message: "Title is required (max 50 characters)." });
        }

        if (description && description.length > 200) {
          return res
            .status(400)
            .json({ message: "Description must be within 200 characters." });
        }

        const newTask = {
          title,
          description: description || "",
          timestamp: new Date(),
          category: "To-Do",
          email, // Associate the task with the user's email
        };

        const result = await tasksCollection.insertOne(newTask);
        res.status(201).json({ message: "Task added successfully!" });
      } catch (error) {
        console.error("Error adding task:", error);
        res.status(500).json({ message: "Internal server error." });
      }
    });

    // fetch the tasks of logged in user
    app.get("/tasks/:email", async (req, res) => {
      try {
        const { email } = req.params;

        if (!email) {
          return res.status(400).json({ message: "User email is required." });
        }

        // Fetch tasks based on user email instead of userId
        const userTasks = await tasksCollection.find({ email }).toArray();

        res.status(200).json(userTasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ message: "Internal server error." });
      }
    });

    // Update Task API
    const { ObjectId } = require("mongodb");

    app.put("/tasks/:taskId", async (req, res) => {
      try {
        const { taskId } = req.params;
        const { title, description, email } = req.body; // Accept title & description

        if (!email) {
          return res.status(400).json({ message: "User email is required." });
        }

        // Prepare update fields
        let updateFields = { timestamp: new Date() };
        if (title) updateFields.title = title;
        if (description) updateFields.description = description;

        // Update task only if it belongs to the correct user
        const updatedTask = await tasksCollection.findOneAndUpdate(
          { _id: new ObjectId(taskId), email }, // ✅ Match by email
          { $set: updateFields },
          { returnDocument: "after" }
        );

        if (!updatedTask.value) {
          return res
            .status(404)
            .json({ message: "Task not found or access denied." });
        }

        res.json({
          message: "Task updated successfully",
          task: updatedTask.value,
        });
      } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Internal server error." });
      }
    });

    // Delete a task (DELETE)
    app.delete("/tasks/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { email } = req.body; // ✅ Get email from request body

        if (!email) {
          return res.status(400).json({ message: "User email is required." });
        }

        // Delete task only if it belongs to the correct user
        const result = await tasksCollection.deleteOne({
          _id: new ObjectId(id),
          email, // ✅ Match by email to prevent unauthorized deletion
        });

        if (result.deletedCount === 0) {
          return res
            .status(404)
            .json({ message: "Task not found or access denied." });
        }

        res.json({ message: "Task deleted successfully", result });
      } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ message: "Failed to delete task." });
      }
    });

    // -----------------------------------------

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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
