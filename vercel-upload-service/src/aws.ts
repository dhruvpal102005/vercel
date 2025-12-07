import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

const s3 = new S3Client({
    region: "auto",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
    endpoint: process.env.AWS_ENDPOINT
})

export const uploadFile = async (fileName: string, localFilePath: string) => {
    const fileContent = fs.readFileSync(localFilePath);
    const response = await s3.send(new PutObjectCommand({
        Body: fileContent,
        Bucket: "vercel",
        Key: fileName,
    }));
    console.log(response);
}