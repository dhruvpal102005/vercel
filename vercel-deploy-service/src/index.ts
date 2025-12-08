require("dotenv").config();
import { createClient } from "redis";
import { copyFinalDist, downloadS3Folder } from "./aws";
import { buildProject } from "./utils";
import fs from "fs";
import path from "path";

const subscriber = createClient();
subscriber.connect();

const publisher = createClient();
publisher.connect();

async function main() {
    while (1) {
        const res = await subscriber.brPop(
            'build-queue',
            0
        );
        if (!res) continue;
        const id = res.element

        try {
            await downloadS3Folder(`output/${id}`)
            await buildProject(id);
            copyFinalDist(id);
            publisher.hSet("status", id, "deployed")
        } catch (e) {
            console.error(e);
            publisher.hSet("status", id, "failed")
        } finally {
            // Cleanup
            const cleanupPath = path.join(__dirname, `output/${id}`);
            if (fs.existsSync(cleanupPath)) {
                fs.rmSync(cleanupPath, { recursive: true, force: true });
            }
        }
    }
}
main();