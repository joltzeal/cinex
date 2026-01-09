// // app/context/loading-context.tsx
// "use client";

// import { createContext, useState, useContext, ReactNode } from "react";

// interface LoadingContextType {
//   isLoading: boolean;
//   loadingMessage: string;
//   showLoader: (message?: string) => void;
//   hideLoader: () => void;
//   updateLoadingMessage: (message: string) => void;
// }

// const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

// export function LoadingProvider({ children }: { children: ReactNode }) {
//   const [isLoading, setIsLoading] = useState(false);
//   const [loadingMessage, setLoadingMessage] = useState("正在处理...");

//   const showLoader = (message = "正在处理...") => {
//     setLoadingMessage(message);
//     setIsLoading(true);
//   };

//   const hideLoader = () => {
//     setIsLoading(false);
//   };

//   const updateLoadingMessage = (message: string) => {
//     setLoadingMessage(message);
//   };

//   return (
//     <LoadingContext.Provider value={{ isLoading, loadingMessage, showLoader, hideLoader, updateLoadingMessage }}>
//       {children}
//     </LoadingContext.Provider>
//   );
// }

// export function useLoading() {
//   const context = useContext(LoadingContext);
//   if (context === undefined) {
//     throw new Error("useLoading must be used within a LoadingProvider");
//   }
//   return context;
// }
