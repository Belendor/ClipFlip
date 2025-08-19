import express, { Request, Response } from 'express';
import ollama from 'ollama'
import { promises as fs } from 'fs';
import fsSync from 'fs';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';  // Import CORS
import path from 'path';
import multer from 'multer';

// multer in-memory or direct-to-disk upload
const upload = multer({ dest: path.join(__dirname, '../tmp_uploads') })
const BATCH_SIZE = 2;

const prisma = new PrismaClient();

const app = express();
const port = 3000;
// Use CORS middleware
app.use(cors()); // Enable all CORS requests, or customize as needed
app.use(express.json()); // Add this line to enable JSON body parsing

app.post('/videos', async (req: Request, res: Response) => {
  try {
    const { id, studio, title, models, tag } = req.body;

    console.log(tag);

    const videoId = Number(id);
    if (!videoId || isNaN(videoId)) {
      return res.status(400).json({ error: 'Valid video ID is required' });
    }

    const createData: any = {};
    const updateData: any = {};

    if (title !== undefined) {
      createData.title = title;
      updateData.title = title;
    }

    if (studio !== undefined) {
      createData.studio = studio;
      updateData.studio = studio;
    }

    if (models !== undefined) {
      const modelNames = Array.isArray(models) ? models : [models];

      const connectOrCreateModels = modelNames.map((name: string) => ({
        where: { name },
        create: { name }
      }));

      createData.models = { connectOrCreate: connectOrCreateModels };
      updateData.models = { connectOrCreate: connectOrCreateModels };
    }

    if (tag && typeof tag === 'object' && typeof tag.id === 'number') {
      const tagConnectArray = [{ id: tag.id }];
      createData.tags = { connect: tagConnectArray };
      updateData.tags = { connect: tagConnectArray };
    }

    const video = await prisma.video.upsert({
      where: { id: videoId },
      create: createData,
      update: updateData,
      include: {
        tags: true,
        models: true
      }
    });

    res.json(video);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Failed to process video',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get a specific video by ID
app.get('/videos/:id', async (req: Request, res: Response) => {
  const videoId = parseInt(req.params.id); // Get ID from params

  try {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        tags: true,
      },
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json(video); // Return the video details
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});
app.get("/video/:id", (req, res) => {
  const id = req.params.id;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width">
  <title>ClipFlip Video</title>

  <!-- Open Graph for embeds -->
  <meta property="og:type" content="video.other">
  <meta property="og:title" content="ClipFlip Video">
  <meta property="og:description" content="Watch this video on ClipFlip">
  <meta property="og:url" content="https://www.clipflip.online">
  <meta property="og:image" content="https://www.clipflip.online/thumbnail.jpg">
  <meta property="og:video" content="https://www.clipflip.online/video/${id}">
  <meta property="og:video:type" content="video/mp4">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="player">
  <meta name="twitter:title" content="ClipFlip Video">
  <meta name="twitter:description" content="Watch this video on ClipFlip">
  <meta name="twitter:image" content="https://www.clipflip.online/thumbnail.jpg">
  <meta name="twitter:player" content="https://www.clipflip.online/api/video/${id}">
  <meta name="twitter:player:width" content="1280">
  <meta name="twitter:player:height" content="720">

  <style>
    body { margin:0; background:#000; position:relative; height:100vh; display:flex; justify-content:center; align-items:center; }
    video { max-width:100%; max-height:100%; }
    .logo { position:absolute; top:10px; left:10px; width:80px; cursor:pointer; z-index:2; }
  </style>
</head>
<body>
  <video controls autoplay loop muted playsinline>
    <source src="https://www.clipflip.online/video/${id}" type="video/mp4">
  </video>
  <a href="https://www.clipflip.online">
    <img src="https://www.clipflip.online/logo.png" class="logo" />
  </a>
</body>
</html>
`;

  res.send(html);
});

app.get('/tags', async (req, res) => {
  try {
    const allTags = await prisma.tag.findMany();
    res.status(200).json(allTags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});
// Route to get all tags
app.post('/videos/by-tags', async (req, res) => {
  const { tags } = req.body; // tags: string[]
  if (!Array.isArray(tags) || tags.length === 0) {
    return res.status(400).json({ error: 'Tags must be a non-empty array' });
  }
  try {
    const videos = await prisma.video.findMany({
      where: {
        tags: {
          some: {
            title: {
              in: tags
            }
          }
        }
      }
    });
    res.json(videos);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});
// Route to get all tags
app.get('/ai', async (req, res) => {

  const dir = './segments';
  const files = await fs.readdir(dir);
  const jpgFiles = files.filter((f) => f.endsWith('.jpg'));

  for (let i = 0; i < jpgFiles.length; i += BATCH_SIZE) {
    const batch = jpgFiles.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (jpgFile) => {
        const baseName = jpgFile.split('.')[0];
        const jpgPath = path.join(dir, jpgFile);
        const mp4Path = path.join(dir, `${baseName}.mp4`);

        try {
          const imageBase64 = await fs.readFile(jpgPath, { encoding: 'base64' });

          const response = await ollama.generate({
            model: 'llava',
            prompt: "Are panties or underwear visible in this image and it covers ass? Reply with 'true' or 'false'.",
            images: [imageBase64],
          });

          const answer = response.response.trim().toLowerCase();
          console.log(`${jpgFile}: model answer: ${answer}`);
          const isVisible = answer.includes('true') && !answer.includes('false');

          if (!isVisible) {
            await fs.unlink(jpgPath).catch(() => { });
            await fs.unlink(mp4Path).catch(() => { });
            console.log(`Deleted ${jpgFile} and ${baseName}.mp4`);
          } else {
            console.log(`Kept ${jpgFile} and ${baseName}.mp4`);
          }
        } catch (err) {
          console.error(`Error processing ${jpgFile}:`, err);
        }
      })
    );
  }

  res.json({ "ok": true });
});
app.get('/', async (req, res) => {
  res.json({ ok: true });
  // try {
  //   const BATCH_SIZE = 100
  //   const total = 3848

  //   for (let i = 3663; i <= total; i += BATCH_SIZE) {
  //     const batch = Array.from({ length: BATCH_SIZE }, (_, idx) => {
  //       const videoId = i + idx
  //       if (videoId > total) return null
  //       return {
  //         id: videoId,
  //         tags: {
  //           connect: [{ id: 3 }]
  //         }
  //       }
  //     }).filter(Boolean)

  //     // assign tag to each video
  //     for (const v of batch) {
  //       if (v !== null) {
  //         await prisma.video.update({
  //           where: { id: v.id },
  //           data: {
  //             tags: {
  //               disconnect: [{ id: 3 }],
  //             },
  //           },
  //         })
  //       }
  //     }

  //     console.log(`✅ Inserted videos ${i}–${Math.min(i + BATCH_SIZE - 1, total)}`)
  //   }


  //   res.json({ ok: true })
  // } catch (err) {
  //   console.error(err)
  //   res.status(500).json({ error: 'Seeding failed' })
  // }
})
app.post('/upload-video', upload.array('files'), async (req: Request, res: Response) => {
  try {
    // find highest existing ID in ../output
    const outputDir = path.join(__dirname, '../new');
    const files = fsSync.readdirSync(outputDir);

    let maxId = 0;
    files.forEach(file => {
      const match = file.match(/^(\d+)\.mp4$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    });

    // get the highest current ID in DB
    const lastVideo = await prisma.video.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true }
    });
    console.log(`Last video ID in DB: ${lastVideo?.id || 0}, max ID in output folder: ${maxId}`);
    

    let nextId = (lastVideo?.id || 0) + 1;
    let nextVideo = nextId;

    // save each uploaded file into the new folder
    for (const file of req.files as Express.Multer.File[]) {
      const targetPath = path.join(outputDir, `${nextVideo}.mp4`);
      fsSync.renameSync(file.path, targetPath);
      nextVideo++;
    }

    // add to DB — you can tweak fields to match your schema
    const { title, tagId } = req.body;

    const createdVideos = [];

    for (const file of req.files as Express.Multer.File[]) {
      const video = await prisma.video.create({
        data: {
          id: nextId, // or let DB auto-generate if you don't set ID manually
          title: title || "",
          tags: tagId
            ? { connect: [{ id: Number(tagId) }] }
            : undefined,
        },
        include: { tags: true }
      });
      nextId++;
      createdVideos.push(video);
    }

    res.json({ success: true, videos: createdVideos });

  } catch (error) {
    console.error('Error handling upload:', error);
    res.status(500).json({
      error: 'Failed to upload video',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(port,'0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});

