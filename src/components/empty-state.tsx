// // components/ui/empty-state.tsx
// import React from 'react';
// import Link from 'next/link';
// import { cn } from '@/lib/utils';
// import { buttonVariants } from '@/components/ui/button'; // Assuming you have a shadcn button
// import {PackageOpen} from 'lucide-react';
// // Define the component's props
// interface EmptyStateProps {
//   icon?: React.ReactNode;
//   title: string;
//   message: string;
//   primaryButtonText?: string;
//   primaryButtonHref?: string;
//   secondaryButtonText?: string;
//   secondaryButtonHref?: string;
// }

// // A default icon that matches the original screenshot's style.
// // It uses `currentColor` to inherit its color from text-muted-foreground.
// const DefaultIcon = ({ className }: { className?: string }) => (
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     width="24"
//     height="24"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//     className={cn('h-10 w-10', className)} // Default size can be overridden
//   >
//     <path d="M20 17.54V6.5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11.04" />
//     <path d="M4 18.52a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v0" />
//     <path d="M8 14h8" />
//   </svg>
// );

// export const EmptyState: React.FC<EmptyStateProps> = ({
//   icon = <DefaultIcon />,
//   title,
//   message,
//   primaryButtonText,
//   primaryButtonHref,
//   secondaryButtonText,
//   secondaryButtonHref,
// }) => {
//   return (
//     <div
//       className={cn(
//         // Layout and Sizing
//         'flex flex-1 flex-col items-center justify-center text-center',
//         // Spacing
//         'p-8',
//         // Border and Background
//         'w-full h-full rounded-lg border-2 border-dashed',
//         'border-border bg-transparent' // Theme-aware colors from shadcn/ui
//       )}
//     >
//       {/* Icon */}
//       <div
//         className={cn(
//           'mb-4 flex h-20 w-20 items-center justify-center rounded-full',
//           'bg-muted' // Theme-aware background
//         )}
//       >
//         <div ><PackageOpen /></div>
//       </div>

//       {/* Title */}
//       <h2 className="text-xl font-semibold text-foreground">{title}</h2>

//       {/* Message */}
//       <p className="mt-2 max-w-sm text-sm text-muted-foreground">{message}</p>

//       {/* Buttons */}
//       <div className="mt-6 flex gap-4">
//         {secondaryButtonText && secondaryButtonHref && (
//           <Link
//             href={secondaryButtonHref}
//             className={buttonVariants({ variant: 'outline' })}
//           >
//             {secondaryButtonText}
//           </Link>
//         )}
//         {primaryButtonText && primaryButtonHref && (
//           <Link
//             href={primaryButtonHref}
//             className={buttonVariants({ variant: 'default' })}
//           >
//             {primaryButtonText}
//           </Link>
//         )}
//       </div>
//     </div>
//   );
// };