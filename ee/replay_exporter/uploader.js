import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFile, readdir } from "fs/promises";
import path from "path";

const BUCKET = "openreplay-genvideos";
const VIDEOS_DIR = path.resolve("./videos");

const s3 = new S3Client({
  region: process.env.AWS_REGION || "eu-central-1",
});

export async function uploadSessionVideo(sessionId, projectId) {
  console.log('>>>> UPLOAD VIDEO')
  if (!sessionId || !projectId)
    throw new Error("sessionId and projectId are required");

  const filePath = path.join(VIDEOS_DIR, `${sessionId}.webm`);
  const Key = `${projectId}/sessions/${sessionId}/${sessionId}.webm`;

  const Body = await readFile(filePath);

  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key,
    Body,
    ContentType: "video/webm",
  });

  await s3.send(cmd);
  // full url: https://{BUCKET}.s3.{process.env.AWS_REGION}.amazonaws.com/{Key}
  const url = Key;
  console.log(url)
  console.log('>>>> UPLOAD VIDEO DONE')
  return url;
}

export async function uploadPageScreenshots(projectId) {
  console.log('>>>> UPLOAD SCREENSHOTS')
  if (!projectId) throw new Error("projectId is required");
  const pagesDir = path.join(VIDEOS_DIR, "pages");
  try {
    const files = await readdir(pagesDir);

    const uploads = files
      .filter((f) => /\.(png|jpe?g)$/i.test(f))
      .map(async (file) => {
        const keyPath = file.replace(/\|/g, `\\`);
        const Key = `${projectId}/screenshots/${keyPath}`;

        const Body = await readFile(path.join(pagesDir, file));

        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key,
            Body,
            ContentType: "image/jpeg",
          })
        );
      });

    await Promise.all(uploads);
    console.log('>>>> UPLOAD SCREENSHOTS DONE')
  } catch (e) {
    console.error(e)
  } finally {
    return;
  }
}
