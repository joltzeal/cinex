'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Rating, RatingButton } from '@/components/ui/shadcn-io/rating';
import { Tag, TagInput } from 'emblor';

interface ReviewDialogProps {
  isOpen: boolean;
  review: { rating: string; comment: string; tags: string[] };
  onClose: () => void;
  onSubmit: (data: { rating: string; comment: string; tags: string[] }) => void;
}

export function MovieReviewDialog({
  isOpen,
  review,
  onClose,
  onSubmit
}: ReviewDialogProps) {
  const [rating, setRating] = useState(review.rating || '0');
  const [comment, setComment] = useState(review.comment);
  const [tags, setTags] = useState<Tag[]>(
    review.tags.map((tag, index) => ({ id: String(index), text: tag }))
  );
  const [activeTagIndex, setActiveTagIndex] = React.useState<number | null>(
    null
  );

  // 当 review prop 变化时，更新 state
  useEffect(() => {
    setRating(review.rating || '0');
    setComment(review.comment);
    setTags(
      review.tags.map((tag, index) => ({ id: String(index), text: tag }))
    );
  }, [review]);

  const handleSubmit = () => {
    onSubmit({ rating, comment, tags: tags.map((tag) => tag.text) });
    onClose();
  };

  const handleCancel = () => {
    onClose();
    // 可选：重置状态
    setRating('0');
    setComment('');
    setTags([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>提交你的评价</DialogTitle>
          <DialogDescription>
            请留下你的评分、短评和一些标签。
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='flex flex-col items-center gap-3'>
            <h4 className='text-sm font-medium'>评分</h4>
            <Rating
              defaultValue={parseInt(rating)}
              onValueChange={(value) => setRating(value.toString())}
            >
              {Array.from({ length: 5 }).map((_, index) => (
                <RatingButton className='text-yellow-500' key={index} />
              ))}
            </Rating>
            <span className='text-muted-foreground text-xs'>
              {rating === '0' ? '请选择星级' : `${rating} 星`}
            </span>
          </div>

          <div className='grid gap-2'>
            <h4 className='text-sm font-medium'>短评</h4>
            <Textarea
              placeholder='请输入你的短评...'
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className='min-h-[80px]'
            />
          </div>

          <div className='grid gap-2'>
            <h4 className='text-sm font-medium'>标签</h4>
            <TagInput
              placeholder='添加标签...'
              tags={tags}
              setTags={(newTags) => {
                setTags(newTags);
              }}
              activeTagIndex={activeTagIndex}
              setActiveTagIndex={setActiveTagIndex}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={handleCancel}>
            取消
          </Button>
          <Button onClick={handleSubmit}>提交</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
