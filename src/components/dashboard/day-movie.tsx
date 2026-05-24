"use client"

import {
  Building2,
  CalendarDays,
  Clock3,
  Clapperboard,
  PlayCircle,
  RefreshCw,
  Tags,
  UserCircle,
} from "lucide-react"
import { motion } from "motion/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import {
  CutoutCard,
  CutoutCardAction,
  CutoutCardContent,
  CutoutCardFooter,
  CutoutCardInsetLabel,
  CutoutCardMedia,
  CutoutCardOverlay,
  CutoutCardPin,
  CutoutCorner,
  cutoutCardSurfaceClassName,
  useCutoutContentStaggerVariants,
} from "@/components/ui/cutout-card"
import { useMediaServer } from "@/contexts/media-server-context"
import { MovieDetail, Property } from "@/types/javbus"

type DayMovieData = {
  id: string
  number: string
  title: string
  cover: string | null
  detail: unknown
  mediaLibrary: unknown
}

function proxyImageUrl(url: string) {
  return `/api/subscribe/javbus/proxy?url=${encodeURIComponent(url)}`
}

function getMovieImage(movie: DayMovieData | null, detail: MovieDetail) {
  const image = movie?.cover || detail.img

  if (!image) {
    return "/placeholders/apple-wallpaper.jpg"
  }

  return proxyImageUrl(image)
}

function formatStars(stars: Property[]) {
  if (stars.length === 0) {
    return "暂无演员"
  }

  const names = stars.slice(0, 2).map((star) => star.name).join(" / ")
  return stars.length > 2 ? `${names} ...` : names
}

function formatDuration(minutes: number | null | undefined) {
  if (!minutes) {
    return "-- 分钟"
  }

  return `${minutes} 分钟`
}

export function DayMovie({ movie }: { movie: DayMovieData | null }) {
  const router = useRouter()
  const mediaServer = useMediaServer()
  const stagger = useCutoutContentStaggerVariants()
  const detail = (movie?.detail || {}) as MovieDetail & { starts?: Property[] }
  const genres = Array.isArray(detail.genres) ? detail.genres : []
  const stars = Array.isArray(detail.stars)
    ? detail.stars
    : Array.isArray(detail.starts)
      ? detail.starts
      : []

  const handleRefresh = () => {
    router.refresh()
  }

  const handlePlay = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()

    if (!movie) {
      toast.error("暂无每日推荐影片")
      return
    }

    if (!mediaServer?.publicAddress) {
      toast.error("媒体服务器配置未设置")
      return
    }

    if (!movie.mediaLibrary) {
      toast.error("媒体信息未设置")
      return
    }

    const mediaInfo = movie.mediaLibrary as any
    if (!mediaInfo?.Id || !mediaInfo?.ServerId) {
      toast.error("媒体信息不完整")
      return
    }

    window.open(
      `${mediaServer.publicAddress}/web/index.html#!/item?id=${mediaInfo.Id}&serverId=${mediaInfo.ServerId}`,
      "_blank"
    )
  }

  return (
    <div className="relative w-full">
      <CutoutCard className={cutoutCardSurfaceClassName}>
        <CutoutCardMedia className="h-72">
          <img
            alt={movie?.title || "每日推荐"}
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/cutout:scale-105"
            src={getMovieImage(movie, detail)}
          />
          <CutoutCardOverlay />
          <CutoutCardInsetLabel className="bottom-0 left-0 rounded-tr-[20px] bg-card px-5 py-3">
            <span className="font-semibold text-[11px] text-muted-foreground uppercase tracking-widest">
              每日推荐
            </span>
            <CutoutCorner className="absolute -right-[31px] -bottom-px rotate-90 text-card" />
            <CutoutCorner className="absolute -top-[31px] -left-px rotate-90 text-card" />
          </CutoutCardInsetLabel>
          <CutoutCardPin className="top-0 right-0 max-w-[70%] truncate rounded-bl-[16px] bg-primary px-4 py-2 font-semibold text-primary-foreground text-sm shadow-foreground/10 shadow-md ring-1 ring-border/30">
            {movie?.number || "N/A"}
            <CutoutCorner
              className="absolute top-0 -left-[23px] -rotate-90 text-primary"
              size={24}
            />
            <CutoutCorner
              className="absolute right-0 -bottom-[23px] -rotate-90 text-primary"
              size={24}
            />
          </CutoutCardPin>
        </CutoutCardMedia>
        <CutoutCardContent>
          <motion.div
            animate="show"
            className="contents"
            initial="hidden"
            variants={stagger.container}
          >
            <motion.h2
              className="mb-3 truncate font-semibold text-card-foreground text-xl leading-snug"
              variants={stagger.item}
            >
              {movie?.title || "暂无每日推荐"}
            </motion.h2>
            <motion.div
              className="mb-4 flex min-h-12 flex-wrap content-start gap-2"
              variants={stagger.item}
            >
              {genres.length > 0 ? (
                genres.slice(0, 6).map((genre) => (
                  <Badge key={genre.id || genre.name} variant="secondary">
                    <Tags className="mr-1 h-3 w-3" />
                    {genre.name}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">
                  暂无类型信息
                </span>
              )}
            </motion.div>
            <motion.div
              className="mb-4 grid gap-2 text-muted-foreground text-xs"
              variants={stagger.item}
            >
              <div className="flex min-w-0 flex-wrap gap-2">
                <Badge variant="outline" className="max-w-full">
                  <Building2 className="mr-1 h-3 w-3 shrink-0" />
                  <span className="shrink-0">制作商</span>
                  <span className="truncate">
                    {detail.producer?.name || "未知"}
                  </span>
                </Badge>
                <Badge variant="outline" className="max-w-full">
                  <Clapperboard className="mr-1 h-3 w-3 shrink-0" />
                  <span className="shrink-0">发行商</span>
                  <span className="truncate">
                    {detail.publisher?.name || "未知"}
                  </span>
                </Badge>
              </div>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                {detail.date || "日期未知"}
              </span>
            </motion.div>
            <motion.div variants={stagger.item}>
              <CutoutCardFooter className="border-border/80 border-t pt-4">
                <div className="flex min-w-0 items-center gap-2">
                  <UserCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium text-card-foreground text-sm">
                    {formatStars(stars)}
                  </span>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground text-xs tabular-nums">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatDuration(detail.videoLength)}
                </span>
              </CutoutCardFooter>
            </motion.div>
          </motion.div>
        </CutoutCardContent>
        <CutoutCardAction className="right-5 bottom-5 z-20 flex gap-2">
          <button
            aria-label="刷新每日推荐"
            className="inline-flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-md transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-secondary/80 active:scale-[0.97]"
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              handleRefresh()
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            aria-label="播放每日推荐"
            className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary/90 active:scale-[0.97]"
            type="button"
            onClick={handlePlay}
          >
            <PlayCircle className="h-4 w-4" />
          </button>
        </CutoutCardAction>
      </CutoutCard>
    </div>
  )
}
