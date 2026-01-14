'use client'
import { ArrowRight, Play } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Movie } from "@prisma/client";
import { MovieDetail } from "@/types/javbus";
import { useRouter } from "next/navigation";

export const MediaGrid = ({ movies }: { movies: Movie[] }) => {
  const router = useRouter();
  const fetchImage =  (url: string) => {
    return `/api/subscribe/javbus/proxy?url=${encodeURIComponent(url)}`
  }
  const handleGoToMovie = () => {
    router.push('/dashboard/subscribe/movie')
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play size={20} />
          <h2 className="text-l font-bold tracking-tight">最近添加</h2>
        </div>
        <Button variant="ghost" size="sm" className="cursor-pointer" onClick={handleGoToMovie}>
          查看全部 <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {movies.length === 0 ? (
          <div className="col-span-2 md:col-span-4 flex flex-col items-center justify-center py-16 rounded-xl bg-muted/50 border-2 border-dashed border-muted-foreground/20">
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-muted">
                <Play size={32} className="text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">暂无影片</p>
              <p className="text-xs text-muted-foreground/60">订阅后的影片将显示在这里</p>
            </div>
          </div>
        ) : (
          movies.map((movie) => {
            const movieDetail = movie.detail as unknown as MovieDetail
            return (
            <div
              key={movie.id}
              className="group relative aspect-2/3 overflow-hidden rounded-xl bg-muted cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url("${fetchImage(movie.poster!)}")` }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="absolute bottom-0 left-0 p-4 w-full translate-y-4 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100">
                <h4 className="text-white font-bold text-sm leading-tight truncate">
                  {movie.title}
                </h4>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border-0 rounded">
                    {movie.number}
                  </Badge>
                  <span className="text-[10px] font-mono text-gray-300">
                                    {movieDetail.date}

                </span>
                </div>
              </div>
            </div>
          )
          })
        )}
      </div>
    </div>
  )
};
