require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({ select: { id: true, likes: true, dislikes: true } });
  for (const post of posts) {
    const likeCount = await prisma.postReaction.count({ where: { post_id: post.id, type: 'like' } });
    const dislikeCount = await prisma.postReaction.count({ where: { post_id: post.id, type: 'dislike' } });
    if (post.likes !== likeCount || post.dislikes !== dislikeCount) {
      console.log(`Fixing post ${post.id}: likes ${post.likes}→${likeCount}, dislikes ${post.dislikes}→${dislikeCount}`);
      await prisma.post.update({ where: { id: post.id }, data: { likes: likeCount, dislikes: dislikeCount } });
    } else {
      console.log(`Post ${post.id}: OK (likes=${likeCount}, dislikes=${dislikeCount})`);
    }
  }
  console.log('Done');
}
main().catch(console.error).finally(() => prisma.$disconnect());
