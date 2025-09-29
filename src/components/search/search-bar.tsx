// 'use client'

// import * as React from 'react'
// // --- 修改: 导入新图标和 DropdownMenu 组件 ---
// import { ChevronsUpDown, Magnet, Hash, Search } from 'lucide-react'
// import { cn } from '@/lib/utils'
// import { MovieDetailDialog } from '@/components/JAV/movie-detail-dialog';
// import { SearchResultsDialog } from '@/components/search/search-results-dialog';
// import { useLoading } from '@/app/context/loading-context';

// import { Button } from '@/components/ui/button'
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuGroup,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu'
// import { Input } from '@/components/ui/input'
// import { toast } from 'sonner'
// // 定义搜索类型 (保持不变)
// type SearchType = {
//   value: 'magnet' | 'code'
//   label: string
//   icon: React.ComponentType<{ className?: string }>
// }

// const searchTypes: SearchType[] = [
//   {
//     value: 'magnet',
//     label: '磁力',
//     icon: Magnet,
//   },
//   {
//     value: 'code',
//     label: '番号',
//     icon: Hash,
//   },
// ]

// export function SearchBar() {
//   // --- 状态管理部分保持不变 ---
//   const [selectedType, setSelectedType] =
//     React.useState<SearchType>(searchTypes[0])
//   const [inputValue, setInputValue] = React.useState('')

//   // 新增：磁力搜索相关状态
//   const [searchResults, setSearchResults] = React.useState<any>(null);
//   const [error, setError] = React.useState<string | null>(null);
//   const [showResults, setShowResults] = React.useState(false);

//   // 使用全局loading
//   const { showLoader, hideLoader } = useLoading();

//   // 简化的placeholder
//   const placeholder = `在 ${selectedType.label} 中搜索...`

//   // --- 逻辑处理部分保持不变 ---
//   const handleSearch = async () => {
//     if (!inputValue.trim()) {
//       // 可以在这里加一个更友好的提示，比如输入框抖动效果
//       console.warn('搜索内容为空')
//       toast.error('搜索内容为空')
//       return
//     }



//     if (selectedType.value === 'code') {
//       // 番号搜索：先调用API验证番号是否存在
//       showLoader(`正在搜索番号 "${inputValue}"...`);
//       setError(null);
//       setSearchResults(null);

//       try {
//         const response = await fetch(`/api/subscribe/javbus/movie/${inputValue}`);

//         if (!response.ok) {
//           if (response.status === 404) {
//             throw new Error(`未找到番号 "${inputValue}" 的相关信息`);
//           } else {
//             throw new Error(`请求失败，状态码: ${response.status}`);
//           }
//         }

//         const result = await response.json();

//         if (!result.data) {
//           throw new Error(`番号 "${inputValue}" 没有返回有效数据`);
//         }

//         // 搜索成功，设置结果并显示弹窗
//         setSearchResults({ data: result.data });
//         setShowResults(true);
//       } catch (err: any) {
//         const errorMessage = err.message || '搜索失败';
//         setError(errorMessage);
//         toast.error(errorMessage);
//       } finally {
//         hideLoader();
//       }
//       return;
//     }

//     if (selectedType.value === 'magnet') {
//       // 磁力搜索：调用API并显示结果
//       showLoader(`正在搜索 "${inputValue}"...`);
//       setError(null);
//       setSearchResults(null);

//       try {
//         const url = `/api/download/torrents/search/${encodeURIComponent(inputValue)}?sort=0`;
//         const response = await fetch(url);

//         if (!response.ok) {
//           throw new Error(`Error: ${response.statusText}`);
//         }

//         const data = await response.json();
//         console.log(data);


//         // 检查是否有搜索结果
//         const hasResults = Object.values(data.data).some((source: any) => source.count > 0);

//         if (hasResults) {
//           setSearchResults(data);
//           setShowResults(true);
//         } else {
//           toast.error(`未找到 "${inputValue}" 的相关结果`);
//         }
//       } catch (err: any) {
//         const errorMessage = err.message || '搜索失败';
//         setError(errorMessage);
//         toast.error(errorMessage);
//       } finally {
//         hideLoader();
//       }
//     }
//   }

//   const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
//     if (event.key === 'Enter') {
//       handleSearch()
//     }
//   }

//   return (
//     <>
//       {/* --- 修改: 添加一个外层 div 用于页面居中 --- */}
//       {/* 这个 div 会让搜索框在页面上水平和垂直居中 */}
//       {/* 如果你只想在特定容器内居中，可以移除 h-screen 和 items-center */}
//       <div className="flex w-full items-center justify-center bg-background p-4">
//         {/* --- 修改: 整体布局和尺寸调整 --- */}
//         <div className="flex w-full max-w-2xl items-center rounded-xl border border-input bg-card shadow-lg">
//           {/* --- 修改: 使用 DropdownMenu 替代 Popover --- */}
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <Button
//                 variant="ghost"
//                 className="h-14 shrink-0 rounded-l-xl rounded-r-none border-r px-4 text-base"
//               >
//                 <selectedType.icon className="mr-2 h-5 w-5 shrink-0" />
//                 {/* 在小屏幕上可以考虑隐藏文字标签 */}
//                 <span className="hidden sm:inline">{selectedType.label}</span>
//                 <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
//               </Button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent className="w-[150px]">
//               <DropdownMenuGroup>
//                 {searchTypes.map((type) => (
//                   <DropdownMenuItem
//                     key={type.value}
//                     onSelect={() => {
//                       // onSelect 在选择时触发，比 onClick 更好
//                       setSelectedType(type)
//                     }}
//                   >
//                     <type.icon className="mr-2 h-4 w-4" />
//                     <span>{type.label}</span>
//                   </DropdownMenuItem>
//                 ))}
//               </DropdownMenuGroup>
//             </DropdownMenuContent>
//           </DropdownMenu>

//           <Input
//             type="text"
//             placeholder={placeholder}
//             className={cn(
//               // --- 修改: 调整 Input 样式以适应新布局 ---
//               'h-14 flex-1 border-0 bg-transparent text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
//               'animated-placeholder'
//             )}
//             value={inputValue}
//             onChange={(e) => setInputValue(e.target.value)}
//             onKeyDown={handleKeyDown}
//           />

//           {/* --- 修改: 将搜索按钮改为内部图标 --- */}
//           <button
//             type="button" // 使用 type="button" 避免在 form 中意外触发表单提交
//             onClick={handleSearch}
//             className="group h-14 shrink-0 rounded-r-xl px-4"
//             aria-label="Search"
//           >
//             <Search className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-foreground" />
//           </button>
//         </div>
//       </div>

//       {/* 番号搜索结果弹窗 */}
//       {selectedType.value === 'code' && showResults && searchResults && (
//         <MovieDetailDialog
//           movieData={searchResults.data}
//           autoOpen={true}
//           onClose={() => setShowResults(false)}
//         >
//           <div style={{ display: 'none' }} />
//         </MovieDetailDialog>
//       )}

//       {/* 磁力搜索结果弹窗 */}
//       {selectedType.value === 'magnet' && showResults && searchResults && (
//         <SearchResultsDialog
//           searchResults={searchResults}
//           isLoading={false}
//           error={error}
//           autoOpen={true}
//           onClose={() => setShowResults(false)}
//         >
//           <div style={{ display: 'none' }} />
//         </SearchResultsDialog>
//       )}
//     </>
//   )
// }