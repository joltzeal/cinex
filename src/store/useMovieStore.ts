// /store/useMovieStore.ts
import { create } from 'zustand';
import { MovieDetail, Magnet } from '@/types/javbus'; // 确保你的类型路径正确

// 扩展类型以包含磁力链接
type MovieData = MovieDetail & { magnets?: Magnet[] };

// 定义 Store 的 state 和 actions 的类型
interface MovieState {
  currentMovie: MovieData | null;
  setCurrentMovie: (movie: MovieData | null) => void;
}

// 创建 Store
export const useMovieStore = create<MovieState>((set) => ({
  currentMovie: null,
  setCurrentMovie: (movie) => set({ currentMovie: movie }),
}));