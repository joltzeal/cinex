
// interface ForumPost {
//   id: string | null;
//   title: string | null;
//   url: string | null;
//   image: string | null;
//   postDate: string | null;
//   authorName: string | null;
//   content: string | null;
// }
type ForumPost = {
  postId: string;
  title: string;
  url: string;
  cover: string | null;
  author: string | null;
  publishedAt: Date | null;
  forumSubscribeId: string;
  isStar: boolean;
  
};