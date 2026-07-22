import express, { Request, Response } from 'express';
import { promises as fs } from 'fs';
import fsSync from 'fs';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';  // Import CORS
import path from 'path';
import multer from 'multer';
import { pipeline, Readable } from "stream";
import { promisify } from "util";
import axios from 'axios';
const streamPipeline = promisify(pipeline);
// multer in-memory or direct-to-disk upload
const upload = multer({ dest: path.join(__dirname, '../tmp_uploads') })
const BATCH_SIZE = 2;
import { OAuth2Client } from "google-auth-library";
const prisma = new PrismaClient();
import cookieParser from "cookie-parser";
import { execSync } from 'child_process';

const app = express();
const port = 3000;
// Use CORS middleware
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://127.0.0.1", "http://127.0.0.1:80", "http://localhost", "http://localhost:80", "https://clip-flip.com", "https://www.clip-flip.com"],
    credentials: true,
  })
);
app.use(express.json()); // Add this line to enable JSON body parsing
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
function getVideoDuration(file: string): number {
  return Number(
    execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
      { encoding: "utf8" }
    ).trim()
  );
}
app.post('/videos', async (req: Request, res: Response) => {
  try {
    const { id, studio, title, models, tag } = req.body;

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
app.post('/videos/remove-tag', async (req: Request, res: Response) => {
  try {
    const { videoId, tagTitle } = req.body;

    if (!videoId || !tagTitle) {
      return res.status(400).json({ error: 'videoId and tagTitle are required' });
    }

    const video = await prisma.video.update({
      where: { id: Number(videoId) },
      data: {
        tags: {
          disconnect: {
            title: tagTitle
          }
        }
      },
      include: {
        tags: true,
        models: true
      }
    });

    res.json(video);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove tag' });
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
        models: true,
        reactions: {
          select: {
            userId: true,
            type: true,
          },
        },
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
// app.get("/video/:id", (req, res) => {
//   const id = req.params.id; // e.g., "50.mp4"

//   const html = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <title>ClipFlip Video</title>

//   <!-- Open Graph for Reddit and other platforms -->
//   <meta property="og:type" content="video.other">
//   <meta property="og:title" content="ClipFlip Video">
//   <meta property="og:description" content="Watch this video on ClipFlip">
//   <meta property="og:url" content="https://www.clipflip.online/api/video/${id}">
//   <meta property="og:image" content="https://www.clipflip.online/thumbnail.jpg">
//   <meta property="og:video" content="https://www.clipflip.online/video/${id}">
//   <meta property="og:video:secure_url" content="https://www.clipflip.online/video/${id}">
//   <meta property="og:video:type" content="video/mp4">
//   <meta property="og:video:width" content="1280">
//   <meta property="og:video:height" content="720">

//   <!-- Twitter Card for Twitter/X -->
//   <meta name="twitter:card" content="player">
//   <meta name="twitter:title" content="ClipFlip Video">
//   <meta name="twitter:description" content="Watch this video on ClipFlip">
//   <meta name="twitter:image" content="https://www.clipflip.online/thumbnail.jpg">
//   <meta name="twitter:player" content="https://www.clipflip.online/api/video/${id}">
//   <meta name="twitter:player:width" content="1280">
//   <meta name="twitter:player:height" content="720">

//   <style>
//     body { 
//         margin: 0; 
//         background: #000; 
//         position: relative; 
//         height: 100vh; 
//         display: flex; 
//         justify-content: center; 
//         align-items: center; 
//     }
//     video { 
//         max-width: 100%; 
//         max-height: 100%; 
//     }
//     .logo { 
//         position: absolute; 
//         top: 10px; 
//         left: 10px; 
//         width: 40px; /* Reduced from 80px to 40px (2x smaller) */
//         cursor: pointer; 
//         z-index: 2; 
//     }
//   </style>
// </head>
// <body>
//   <video controls autoplay loop muted playsinline>
//     <source src="https://www.clipflip.online/video/${id}" type="video/mp4">
//     Your browser does not support the video tag.
//   </video>
//   <a href="https://www.clipflip.online">
//     <img src="https://www.clipflip.online/logo.jpg" class="logo" alt="ClipFlip Logo" />
//   </a>
// </body>
// </html>
// `;

//   res.setHeader('Content-Type', 'text/html');
//   res.send(html);
// });
app.get("/seo-tags/:tag", async (req: Request, res: Response) => {
  try {
    const tag = req.params.tag.toLowerCase().trim();

    const allowedTags = ["anal", "amateur", "blowjob", "panties", "ass", "cfnm", "cum", "cowgirl", "gangbang", "doggy", "deepthroat", "handjob", "choking", "feet", "big boobs", "shemale", "pregnant"];

    if (!allowedTags.includes(tag)) {
      return res.status(404).json({ error: "Tag page not found" });
    }

    const allClips = await prisma.video.findMany({
      where: {
        tags: {
          some: {
            title: {
              equals: tag,
            },
          },
        },
      },
      include: {
        tags: true,
        models: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    const groupedByTitle = new Map<string, typeof allClips>();

    for (const clip of allClips) {
      const title = clip.title?.trim();

      if (!title) {
        continue;
      }

      if (!groupedByTitle.has(title)) {
        groupedByTitle.set(title, []);
      }

      groupedByTitle.get(title)!.push(clip);
    }

    const videos = Array.from(groupedByTitle.entries()).map(
      ([title, videoClips], index) => {
        const firstClip = videoClips[0];

        return {
          index: index + 1,
          title,
          slug: title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, ""),

          models: firstClip.models.map((model) => model.name),

          tags: Array.from(
            new Set(firstClip.tags.map((tagItem) => tagItem.title))
          ),

          clipCount: videoClips.length,

          clipIds: videoClips.map((clip) => clip.id),
        };
      }
    );
    const titleFromSlug = (slug: string): string => {
      return slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    };
    const groupedClipCount = videos.reduce(
      (sum, video) => sum + video.clipCount,
      0
    );

    res.json({
      tag,
      title: `${titleFromSlug(tag)} Porn Clips - Free ${titleFromSlug(tag)} Videos | ClipFlip`,
      description:
        `Browse free ${titleFromSlug(tag)} porn clips on ClipFlip. Watch adult video previews and open clips in the endless random player.`,
      heading: `${titleFromSlug(tag)} Porn Clips`,
      intro:
        `Browse ${titleFromSlug(tag)} porn clips grouped by video title. Hover previews to see available clips, then open the endless player.`,
      canonicalUrl: `https://clip-flip.com/${tag}/`,
      videoCount: videos.length,
      clipCount: groupedClipCount,
      videoBaseUrl: "http://127.0.0.1",
      thumbnailBaseUrl: "https://clip-flip.com/video/thumbnails/",
      videos,
    });
  } catch (error) {
    console.error("Error building SEO tag page data:", error);

    res.status(500).json({
      error: "Failed to build SEO tag page data",
    });
  }
});
app.get("/videos", async (req: Request, res: Response) => {
  const search = req.query.search?.toString() || "";
  const userId = Number(req.cookies.userId);

  const videos = await prisma.video.findMany({
    where: search
      ? {
        OR: [
          { title: { contains: search } },
          { studio: { contains: search } },
          { models: { some: { name: { contains: search } } } },
          { tags: { some: { title: { contains: search } } } },
        ],
      }
      : undefined,
    include: {
      tags: true,
      models: true,
      reactions: {
        select: {
          userId: true,
          type: true,
        },
      },
    },
    orderBy: { id: "desc" },
  });

  const mappedVideos = videos.map((video) => {
    const likes = video.reactions.filter((r) => r.type === "like").length;
    const dislikes = video.reactions.filter((r) => r.type === "dislike").length;
    const myReaction = userId
      ? video.reactions.find((r) => r.userId === userId)?.type ?? null
      : null;



    return {
      ...video,
      likes,
      dislikes,
      myReaction,
      reactions: undefined,
    };
  });

  res.json(mappedVideos);
});
app.get("/new", async (req: Request, res: Response) => {
  try {
    const videos = await prisma.newVideo.findMany({
      orderBy: { id: "asc" },
      include: {
        tags: true,
      }
    });

    res.json(videos);
  } catch (error) {
    console.error("Failed to fetch new videos:", error);

    res.status(500).json({
      error: "Failed to fetch new videos",
    });
  }
});

app.get('/tags', async (req, res) => {
  try {
    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
        : undefined;

    const tags = await prisma.tag.findMany({
      where: search
        ? {
          title: {
            contains: search,
          },
        }
        : undefined,
      orderBy: {
        title: 'asc',
      },
      include: {
        _count: {
          select: {
            videos: true, // relation name in your schema
          },
        },
      },
    });

    const result = tags.map((tag) => ({
      ...tag,
      videoCount: tag._count.videos,
      _count: undefined,
    }));

    res.status(200).json(result);
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
        AND: tags.map(tagTitle => ({
          tags: {
            some: { title: tagTitle }
          }
        }))
      },
      include: {
        tags: true,
        models: true
      }
    });
    res.json(videos);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});
// Route to get all tags
app.get("/ai", async (_req, res) => {
  console.log("AI started")

  try {
    const dir = "./segments"
    const outDir = "./filtered"

    await fs.mkdir(outDir, { recursive: true })

    const files = await fs.readdir(dir)

    const groups = new Map<string, { first?: string; middle?: string }>()

    for (const file of files) {
      const match = file.match(/^(\d+)_(first|middle)\.jpg$/)
      if (!match) continue

      const [, id, type] = match
      if (!groups.has(id)) groups.set(id, {})
      groups.get(id)![type as "first" | "middle"] = file
    }

    let counter = 0
    for (const [id, pair] of groups) {
      // if (counter > 0) break
      // counter++
      const videoPath = path.join(dir, `${id}.mp4`)

      // if missing images → delete everything
      if (!pair.first || !pair.middle) {
        await fs.rm(videoPath, { force: true })
        if (pair.first) await fs.rm(path.join(dir, pair.first), { force: true })
        if (pair.middle) await fs.rm(path.join(dir, pair.middle), { force: true })
        continue
      }

      const buffer1 = await fs.readFile(path.join(dir, pair.first))
      const buffer2 = await fs.readFile(path.join(dir, pair.middle))

      const base64_1 = buffer1.toString("base64")
      const base64_2 = buffer2.toString("base64")

      console.log(`Processing ${id}`)

      // const response = await openai.responses.create({
      //   model: "gpt-5.4",
      //   input: [
      //     {
      //       role: "user",
      //       content: [
      //         {
      //           type: "input_text",
      //           text: `Does the image show a female. Does the image show clearly visible ASS? Does the image show a panties on female ass?. If all 3 are yes then reply yes, otherwise no. Say yes only when you have 90% confidence`,
      //         },
      //         // {
      //         //   type: "input_image",
      //         //   image_url: `data:image/jpeg;base64,${base64_1}`,
      //         //   detail: "auto",
      //         // },
      //         {
      //           type: "input_image",
      //           image_url: `data:image/jpeg;base64,${base64_2}`,
      //           detail: "auto",
      //         },
      //       ],
      //     },
      //   ],
      // })

      // const answer = response.output_text.toLowerCase()
      // console.log(id, answer)

      // if (answer.includes("yes")) {
      //   // copy video
      //   await fs.copyFile(videoPath, path.join(outDir, `${id}.mp4`))

      //   // remove images only
      //   await fs.rm(path.join(dir, pair.first), { force: true })
      //   await fs.rm(path.join(dir, pair.middle), { force: true })
      // } else {
      //   // remove everything
      //   await fs.rm(videoPath, { force: true })
      //   await fs.rm(path.join(dir, pair.first), { force: true })
      //   await fs.rm(path.join(dir, pair.middle), { force: true })
      // }
      const hiveRes = await axios.post(
        "https://api.thehive.ai/api/v3/chat/completions",
        {
          model: "hive/vision-language-model",
          temperature: 0,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `
Analyze the images.

Return ONLY valid JSON:

{
  "ass_visible": true | false,
  "panties_visible": true | false
}

Rules:
- "ass_visible": true ONLY if female buttocks are clearly visible (not just shape)
- "panties_visible": true ONLY if underwear (panties) is clearly identifiable
- If unsure about ANY → return false
- Do NOT guess
`
                },
                // {
                //   type: "media_url",
                //   media_url: {
                //     url: `data:image/jpeg;base64,${base64_1}`,
                //   },
                // },
                {
                  type: "media_url",
                  media_url: {
                    url: `data:image/jpeg;base64,${base64_2}`,
                  },
                },
              ],
            },
          ],
        },
        {
          headers: {
            authorization: `Bearer ${process.env.HIVE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      )

      const raw = hiveRes.data.choices?.[0]?.message?.content

      const text =
        typeof raw === "string"
          ? raw
          : Array.isArray(raw)
            ? raw.map((c: any) => c.text || "").join("")
            : ""

      let parsed: any = {}
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = { ass_visible: false, panties_visible: false }
      }

      const match = Boolean(parsed.ass_visible) && Boolean(parsed.panties_visible)
      console.log(parsed)
      console.log(match)

      if (match) {
        await fs.copyFile(videoPath, path.join(outDir, `${id}.mp4`))
        await fs.rm(videoPath, { force: true })
      } else {
        await fs.rm(videoPath, { force: true })
      }

      await fs.rm(path.join(dir, pair.first), { force: true })
      await fs.rm(path.join(dir, pair.middle), { force: true })
    }

    res.json("done")
  } catch (err) {
    console.error(err)
    res.status(500).json({ ok: false })
  }
})
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
    const outputDir = path.join(__dirname, '../video1');
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

// app.post("/upload-video", upload.array("files"), async (req: Request, res: Response) => {
//   try {
//     const outputDir = path.join(__dirname, "../video1/new");
//     const outputDirThumbnails = path.join(__dirname, "../video1/new/thumbnails");
//     function getHighestNumericId(dir: string): number {
//       let maxId = 0;

//       for (const file of fsSync.readdirSync(dir)) {
//         const match = file.match(/^(\d+)\.mp4$/);

//         if (!match) continue;

//         const id = Number(match[1]);

//         if (id > maxId) {
//           maxId = id;
//         }
//       }

//       return maxId;
//     }

//     let nextVideo = getHighestNumericId(outputDir) + 1;
//     let segmentId = getHighestNumericId(outputDir) + 1;
//     const { tagId } = req.body;

//     const segmentLength = 3;

//     for (const file of req.files as Express.Multer.File[]) {
//       const duration = getVideoDuration(file.path);

//       console.log(`Video ${file.originalname} duration: ${duration} seconds`);

//       for (let start = 0; start + segmentLength <= duration; start += segmentLength) {

//         const end = start + segmentLength;


//         const newVideo = await prisma.newVideo.create({
//           data: {
//             title: file.originalname,
//             startTime: start,
//             endTime: end,
//             tags: tagId
//               ? { connect: [{ id: Number(tagId) }] }
//               : undefined,
//           },
//           include: {
//             tags: true,
//           },
//         });

//         const segmentId = newVideo.id;

//         const videoOut = path.join(outputDir, `${segmentId}.mp4`);
//         const firstOut = path.join(outputDirThumbnails, `${segmentId}_first.jpg`);
//         const middleOut = path.join(outputDirThumbnails, `${segmentId}_middle.jpg`);

//         execSync(
//           `ffmpeg -y -ss ${start} -i "${file.path}" -t ${segmentLength} -c:v libx264 -preset slow -crf 18 -c:a aac -b:a 192k "${videoOut}"`,
//           { stdio: "inherit" }
//         );

//         execSync(
//           `ffmpeg -y -ss ${start} -i "${file.path}" -frames:v 1 "${firstOut}"`,
//           { stdio: "inherit" }
//         );

//         const mid = ((start + end) / 2).toFixed(2);

//         execSync(
//           `ffmpeg -y -ss ${mid} -i "${file.path}" -frames:v 1 "${middleOut}"`,
//           { stdio: "inherit" }
//         );

//         console.log(`Created segment ${segmentId}`);
//       }

//       fsSync.unlinkSync(file.path);
//     }

//     res.json({ success: true });
//   } catch (error) {
//     console.error("Error handling upload:", error);

//     res.status(500).json({
//       error: "Failed to upload video",
//       details: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// });

app.delete("/video/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    console.log(id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const outputDir = path.join(__dirname, "../video1/new");
    const thumbnailsDir = path.join(outputDir, "thumbnails");

    const videoFile = path.join(outputDir, `${id}.mp4`);
    console.log(videoFile);

    const firstImage = path.join(thumbnailsDir, `${id}_first.jpg`);
    const middleImage = path.join(thumbnailsDir, `${id}_middle.jpg`);

    const result = await prisma.newVideo.delete({
      where: { id },
    });
    console.log(result);


    const deleteIfExists = (file: string) => {
      console.log("Deleting:", file);

      if (!fsSync.existsSync(file)) {
        console.log("Doesn't exist");
        return;
      }

      try {
        fsSync.unlinkSync(file);
        console.log("Deleted");
      } catch (e) {
        console.error("Failed:", e);
      }
    };

    deleteIfExists(videoFile);
    deleteIfExists(firstImage);
    deleteIfExists(middleImage);

    res.json({ success: true });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to delete video",
    });
  }
});
app.post("/video/:id/approve", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const approvedDir = path.join(__dirname, "../video");
    const pendingDir = path.join(__dirname, "../video1/new");

    const approvedThumbDir = path.join(approvedDir, "thumbnails");
    const pendingThumbDir = path.join(pendingDir, "thumbnails");

    const sourceVideo = path.join(pendingDir, `${id}.mp4`);
    const destVideo = path.join(approvedDir, `${id}.mp4`);

    const sourceFirstThumb = path.join(pendingThumbDir, `${id}_first.jpg`);
    const sourceMiddleThumb = path.join(pendingThumbDir, `${id}_middle.jpg`);

    const destFirstThumb = path.join(approvedThumbDir, `${id}.jpg`);
    const destMiddleThumb = path.join(approvedThumbDir, `${id}_mid.jpg`);

    // Get metadata
    const newVideo = await prisma.newVideo.findUnique({
      where: { id },
      include: {
        tags: true,
      },
    });
    console.log(newVideo);


    if (!newVideo) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Copy metadata to main table
    await prisma.video.create({
      data: {
        title: newVideo.title,
        tags: {
          connect: newVideo.tags.map((tag) => ({ id: tag.id })),
        },
        // copy any other fields you have
      },
    });

    // Copy files
    fsSync.copyFileSync(sourceVideo, destVideo);
    fsSync.copyFileSync(sourceFirstThumb, destFirstThumb);
    fsSync.copyFileSync(sourceMiddleThumb, destMiddleThumb);

    // Delete originals
    const deleteIfExists = (file: string) => {
      if (fsSync.existsSync(file)) {
        fsSync.unlinkSync(file);
      }
    };

    deleteIfExists(sourceVideo);
    deleteIfExists(sourceFirstThumb);
    deleteIfExists(sourceMiddleThumb);

    // Remove from newVideo table
    await prisma.newVideo.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to approve video",
    });
  }
});
app.get("/download", async (_req, res) => {
  const FULL_SAMPLE_URL =
    "https://ev-h.phncdn.com/hls/videos/202408/06/456164611/1080P_4000K_456164611.mp4/seg-2-v1-a1.ts?validfrom=1780178723&validto=1780185923&ipa=1&hdl=-1&hash=qHHle%2BaybF2PdkmJucRjU2%2Bw5cI%3D";

  const outputDir = path.join(__dirname, '../segments');
  await fs.mkdir(outputDir, { recursive: true });

  const urlObj = new URL(FULL_SAMPLE_URL);

  // Find the last number before .ts
  const match = urlObj.pathname.match(/^(.*?)(\d+)([^\/]*\.ts)$/);

  if (!match) {
    return res.status(400).json({
      error: "Could not identify segment number in URL",
    });
  }

  const [, prefix, currentSeg, suffix] = match;

  let seg = Number(currentSeg);
  let downloaded = 0;

  while (true) {
    const pathname = `${prefix}${seg}${suffix}`;

    const url =
      `${urlObj.origin}${pathname}` +
      (urlObj.search ? urlObj.search : "");

    const filePath = path.join(outputDir, `${seg}.ts`);

    console.log(`Downloading ${url}`);

    const response = await fetch(url);

    if (!response.ok || !response.body) {
      console.log(`Stop at segment ${seg} (${response.status})`);
      break;
    }

    const stream =
      typeof (response.body as any).getReader === "function"
        ? Readable.fromWeb(response.body as any)
        : (response.body as unknown as NodeJS.ReadableStream);

    await streamPipeline(stream, fsSync.createWriteStream(filePath));

    downloaded++;
    seg++;
  }

  res.json({ downloaded });
});
app.post("/auth/google", async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const user = await prisma.user.upsert({
      where: { googleId: payload.sub },
      update: {
        email: payload.email,
        name: payload.name ?? null,
        picture: payload.picture ?? null,
      },
      create: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name ?? null,
        picture: payload.picture ?? null,
      },
    });

    res.cookie("userId", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // true on https production
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
    console.log(user);

    return res.json({ success: true, user });
  } catch (err) {
    return res.status(401).json({ success: false, error: "Login failed" });
  }
});
// app.get("/auth/me", async (req: Request, res: Response) => {
app.get("/auth/me", async (req, res) => {
  console.log("cookies:", req.cookies);

  const userId = Number(req.cookies.userId);
  console.log("userId:", userId);

  if (!userId) {
    return res.json({ loggedIn: false, user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  console.log(user);

  res.json({
    loggedIn: !!user,
    user,
  });
});
//   const userId = Number(req.cookies.userId);

//   if (!userId) {
//     return res.json({ loggedIn: false, user: null });
//   }

//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//   });
//   console.log(user);
//   console.log("?????");

//   if (!user) {
//     return res.json({ loggedIn: false, user: null });
//   }

//   return res.json({ loggedIn: true, user });
// });
app.get("/videos/favorites/:userId", async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);

    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const videos = await prisma.video.findMany({
      where: {
        reactions: {
          some: {
            userId,
            // type: "favorite",
          },
        },
      },
      include: {
        tags: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    res.json(videos);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch favorite videos",
    });
  }
});
app.post("/auth/logout", (req: Request, res: Response) => {
  res.clearCookie("userId");
  return res.json({ success: true });
});
app.post("/videos/:id/reaction", async (req: Request, res: Response) => {
  const userId = Number(req.cookies.userId);
  const videoId = Number(req.params.id);
  const { type } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  if (!["like", "dislike"].includes(type)) {
    return res.status(400).json({ error: "Invalid reaction" });
  }

  const existing = await prisma.videoReaction.findUnique({
    where: {
      userId_videoId: {
        userId,
        videoId,
      },
    },
  });

  if (existing?.type === type) {
    await prisma.videoReaction.delete({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
    });
  } else {
    await prisma.videoReaction.upsert({
      where: {
        userId_videoId: {
          userId,
          videoId,
        },
      },
      update: {
        type,
      },
      create: {
        userId,
        videoId,
        type,
      },
    });
  }

  const likes = await prisma.videoReaction.count({
    where: {
      videoId,
      type: "like",
    },
  });

  const dislikes = await prisma.videoReaction.count({
    where: {
      videoId,
      type: "dislike",
    },
  });

  const reaction = await prisma.videoReaction.findUnique({
    where: {
      userId_videoId: {
        userId,
        videoId,
      },
    },
  });

  return res.json({
    likes,
    dislikes,
    reaction: reaction?.type ?? null,
  });
});
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});

