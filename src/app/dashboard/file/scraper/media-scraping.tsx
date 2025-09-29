// import MediaScrapingTable from '@/components/media-scraping-table';
// import React from 'react';

// // 模拟的原始数据
// const mockData = [
//   {
//     id: 1,
//     title: '机器人 \u4e4b \u68a6', // "机器人之梦" (Robot Dreams)
//     directory: '本地 /media/Movie/机器人之梦.Robot.Dreams.2023.2160p.WEB-DL.H265.DDP2.0-ADWeb.mkv',
//     transferMethod: '硬链接',
//     timestamp: '2024-12-31 14:02:10',
//     status: '成功',
//   },
//   {
//     id: 2,
//     title: '机器人 \u4e4b \u68a6 (2023)', // "机器人之梦 (2023)"
//     directory: '本地 /media/link/Movie/机器人之梦 (2023)/机器人之梦 (2023) - 2160p.mkv',
//     transferMethod: '硬链接', // 假设也是硬链接
//     timestamp: '2024-12-31 14:03:00', // 假设一个不同的时间
//     status: '失败', // 假设一个失败的例子
//   },
// ];

// // 模拟的表格列定义
// // 在实际应用中，这些可以根据需要进行配置
// const columns = [
//   {
//     accessorKey: 'title',
//     header: '标题',
//     cell: ({ row }: any) => (
//       <div className="flex items-center">
//         {/* Placeholder for icon, similar to the image */}
//         <div className="ml-2">
//           <div className="font-bold">{row.original.title}</div>
//           {/* <div className="text-sm text-gray-500">动画电影</div> */}
//           {/* You might want to add a subtitle or category here if available */}
//         </div>
//       </div>
//     ),
//   },
//   {
//     accessorKey: 'directory',
//     header: '目录',
//     cell: ({ row }: any) => (
//       <div className="flex flex-col">
//         {row.original.directory.split('/').map((part: string, index: number) => (
//           <span key={index}>{part}</span>
//         ))}
//       </div>
//     ),
//   },
//   {
//     accessorKey: 'transferMethod',
//     header: '转移方式',
//     cell: ({ row }: any) => (
//       <div className="flex items-center justify-center">
//         <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
//           {row.original.transferMethod}
//         </span>
//       </div>
//     ),
//   },
//   {
//     accessorKey: 'timestamp',
//     header: '时间',
//   },
//   {
//     accessorKey: 'status',
//     header: '状态',
//     cell: ({ row }: any) => {
//       const status = row.original.status;
//       const statusStyle =
//         status === '成功'
//           ? 'bg-green-100 text-green-800'
//           : status === '失败'
//           ? 'bg-red-100 text-red-800'
//           : 'bg-gray-100 text-gray-800';
//       return (
//         <div className="flex items-center justify-center">
//           <span className={`px-3 py-1 rounded-full text-xs ${statusStyle}`}>
//             {status}
//           </span>
//         </div>
//       );
//     },
//   },
//   {
//     id: 'actions',
//     header: '', // No header for actions column
//     cell: () => (
//       <div className="flex items-center justify-end">
//         {/* Three dots for more actions */}
//         <button className="text-gray-500 hover:text-gray-700">
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 0a12 12 0 100 24 12 12 0 000-24z"></path></svg>
//         </button>
//       </div>
//     ),
//   },
// ];

// const MediaScrapingPage = () => {
//   // In a real application, you would fetch data from a database here.
//   // For now, we use the mockData.
//   const data = mockData;

//   return (
//     <div className="p-6 bg-gray-50 min-h-screen">
//       <div className="flex justify-between items-center mb-6">
//         <div className="flex items-center bg-white rounded-lg shadow-sm px-4 py-2 border border-gray-200">
//           <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
//           <input
//             type="text"
//             placeholder="搜索整理记录"
//             className="focus:outline-none w-full"
//           />
//           <button className="ml-2 text-gray-400">
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.01 9.01 0 01-4.993-1.414l-2.992 2.992a1.5 1.5 0 01-1.06 0.448c-0.893 0-1.786-0.327-2.354-1.03a1.5 1.5 0 01-.293-1.563l0.5-2.397A8.992 8.992 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
//           </button>
//         </div>
//         <button className="flex items-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md">
//           <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
//           整理队列
//         </button>
//         <button className="ml-3 p-2 rounded-lg hover:bg-gray-200">
//           <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 0a12 12 0 100 24 12 12 0 000-24z"></path></svg>
//         </button>
//       </div>

//       {/* Pass data and columns to the client component */}
//       <MediaScrapingTable data={data} columns={columns} />
//     </div>
//   );
// };

// export default MediaScrapingPage;