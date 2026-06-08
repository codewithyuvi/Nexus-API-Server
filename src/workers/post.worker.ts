import { Worker } from "bullmq";
import { prisma } from "../utils/prisma";

import { redisConnection } from "../constants/redisConnection";

const ticketJob = async (job:any) => {
  const { tenantId, userId, newPost } = job.data;


  for (let i = 0; i < 500; i++) {
    await prisma.comment.create({
      data: {
        tenantId,
        authorId: userId,
        postId: newPost.id,
        content: `comment ${i}`,
        isInternal: false,
      },
    });
  }
};

// "PostQueue" same as we define in post.queue.ts, means PostQueue vali queue se ticket pick krna h
const postWorker = new Worker("PostQueue", ticketJob, { 
  connection: redisConnection,
});
