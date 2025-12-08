
require("dotenv").config();
import fs from "fs";
import express from "express";
import cors from "cors";
import simpleGit from "simple-git";
import { generate } from "./utils";
import { getAllFiles } from "./file";
import path from "path";
import { uploadFile } from "./aws";
import { createClient } from "redis";
const publisher = createClient();
publisher.connect();

const subscriber = createClient();
subscriber.connect();

const app = express();
app.use(cors())
app.use(express.json());

app.post("/deploy", async (req, res) => {
    const repoUrl = req.body.repoUrl;
    const id = generate();
    const outputPath = path.join(__dirname, `output/${id}`);

    try {
        await simpleGit().clone(repoUrl, outputPath);

        const files = getAllFiles(outputPath);

        // Upload files in parallel? The original code did forEach async which is risky without Promise.all
        // But let's stick to the original logic structure but correct resource usage if possible. 
        // Original: files.forEach(async file ... ) - this returns immediately.
        // We should await it.

        await Promise.all(files.map(async file => {
            await uploadFile(file.slice(__dirname.length + 1), file);
        }));

        await new Promise((resolve) => setTimeout(resolve, 5000))
        publisher.lPush("build-queue", id);
        publisher.hSet("status", id, "uploaded");

        res.json({
            id: id
        })
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Deployment failed" });
    } finally {
        if (fs.existsSync(outputPath)) {
            fs.rmSync(outputPath, { recursive: true, force: true });
        }
    }

});

app.get("/status", async (req, res) => {
    const id = req.query.id;
    const response = await subscriber.hGet("status", id as string);
    res.json({
        status: response
    })
})

app.listen(3000);