import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

const s3 = new S3Client({
    region: "auto",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
    endpoint: process.env.AWS_ENDPOINT
})

export async function downloadS3Folder(prefix: string) {
    const allFiles = await s3.send(new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME || "vercel",
        Prefix: prefix
    }));

    const allPromises = allFiles.Contents?.map(async ({ Key }) => {
        return new Promise(async (resolve) => {
            if (!Key) {
                resolve("");
                return;
            }
            const finalOutputPath = path.join(__dirname, Key);
            const dirName = path.dirname(finalOutputPath);
            if (!fs.existsSync(dirName)) {
                fs.mkdirSync(dirName, { recursive: true });
            }
            const outputFile = fs.createWriteStream(finalOutputPath);

            const getObjectParams = {
                Bucket: process.env.S3_BUCKET_NAME || "vercel",
                Key
            };
            const { Body } = await s3.send(new GetObjectCommand(getObjectParams));

            if (Body instanceof Readable) {
                Body.pipe(outputFile).on("finish", () => {
                    resolve("");
                });
            } else {
                // Should not happen in Node environment usually, but handle just in case or resolve immediately
                resolve("");
            }
        })
    }) || []

    await Promise.all(allPromises?.filter(x => x !== undefined));
}

export function copyFinalDist(id: string) {
    const folderPath = path.join(__dirname, `output/${id}/dist`);
    const allFiles = getAllFiles(folderPath);
    allFiles.forEach(file => {
        uploadFile(`dist/${id}/` + file.slice(folderPath.length + 1), file);
    })
}

const getAllFiles = (folderPath: string) => {
    let response: string[] = [];

    const allFilesAndFolders = fs.readdirSync(folderPath); allFilesAndFolders.forEach(file => {
        const fullFilePath = path.join(folderPath, file);
        if (fs.statSync(fullFilePath).isDirectory()) {
            response = response.concat(getAllFiles(fullFilePath))
        } else {
            response.push(fullFilePath);
        }
    });
    return response;
}

const uploadFile = async (fileName: string, localFilePath: string) => {
    const fileContent = fs.readFileSync(localFilePath);
    const response = await s3.send(new PutObjectCommand({
        Body: fileContent,
        Bucket: process.env.S3_BUCKET_NAME || "vercel",
        Key: fileName,
    }));
    console.log(response);
}