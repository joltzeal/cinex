// import React from 'react';

// // 定义 props 类型
// interface PostContentViewProps {
//   htmlContent: string;
// }

// // 使用 React.memo 包装组件
// // 只有当 props (这里是 htmlContent) 发生变化时，这个组件才会重渲染
// const PostContentView = React.memo(function PostContentView({ htmlContent }: PostContentViewProps) {
//   console.log("PostContentView is rendering..."); // 你可以加上这个log来观察渲染行为

//   return (
//     <div
//       className="text-sm leading-relaxed [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_a]:text-primary [&_a]:underline [&_p]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:mb-4 [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-4"
//       dangerouslySetInnerHTML={{ __html: htmlContent }}
//     />
//   );
// });

// export default PostContentView;