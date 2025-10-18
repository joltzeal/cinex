"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import MovieDetailDisplay from "@/components/search/movie-detail"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Movie } from "@prisma/client";

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center min-h-[500px]">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
    <p className="mt-4 text-muted-foreground">正在加载影片信息...</p>
  </div>
);

// Error or no-data message component for the dialog
const MessageState = ({ title, message }: { title: string, message: string }) => (
  <div className="flex items-center justify-center min-h-[500px] p-4">
    <Alert variant="destructive" className="max-w-md">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  </div>
);


// --- Dialog Content (Contains all the data fetching logic) ---

interface MovieDetailDialogContentProps {
  movieId: string;
  mediaServer?: MediaServerConfig | null;
}

function MovieDetailDialogContent({ movieId, mediaServer }: MovieDetailDialogContentProps) {
  // 1. Get data and actions from the Zustand Store

  // 2. Local state for loading and errors
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movie, setMovie] = useState<Movie | null>(null);

  //   // If store data is not a match, fetch new movie data
  const fetchMovieData = async () => {
    console.log(`MovieDetailDialog: Fetching data for ID: ${movieId}...`);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/movie/${movieId}`);
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const result = await response.json();
      if (!result || !result.data) throw new Error("Movie data not found.");

      setMovie(result.data);

    } catch (err: any) {
      setError(err.message || "An unknown error occurred while loading data.");
      setMovie(null); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovieData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId]);

  const isFetchingData = isLoading && (!movie || movie.number !== movieId);

  // --- Render Logic ---
  if (isFetchingData) {
    return <LoadingState />;
  }

  if (error) {
    return <MessageState title="Loading Error" message={error} />;
  }

  // Ensure currentMovie is not null and matches the requested movieId
  if (!movie || movie.number !== movieId) {
    return <MessageState title="No Data" message="Could not find information for this movie." />;
  }

  return <MovieDetailDisplay movie={movie}  />;
}


// --- Main Exported Dialog Component ---

interface MovieDetailDialogProps {
  movieId: string;
  children: React.ReactNode; // This will be the trigger element (e.g., a button or card)
}

export function MovieDetailDialog({ movieId, children }: MovieDetailDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTitle className="sr-only">电影详情</DialogTitle>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="min-w-[90vw] p-0">
        {open && <MovieDetailDialogContent movieId={movieId} />}
      </DialogContent>
    </Dialog>
  );
}