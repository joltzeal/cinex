import { cn } from '@/lib/utils';
import { useRef } from 'react';

export const GlareCard = ({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const isPointerInside = useRef(false);
  const refElement = useRef<HTMLDivElement>(null);
  const state = useRef({
    rotate: {
      x: 0,
      y: 0
    }
  });
  const containerStyle = {
    '--r-x': '0deg',
    '--r-y': '0deg',
    '--duration': '300ms',
    '--radius': '15px',
    '--easing': 'ease',
    '--transition': 'var(--duration) var(--easing)'
  } as any;

  // 移除光线相关的样式变量

  const updateStyles = () => {
    if (refElement.current) {
      const { rotate } = state.current;
      refElement.current?.style.setProperty('--r-x', `${rotate.x}deg`);
      refElement.current?.style.setProperty('--r-y', `${rotate.y}deg`);
    }
  };
  return (
    <div
      style={containerStyle}
      className='relative isolate [aspect-ratio:800/585] w-full transition-transform delay-[var(--delay)] duration-[var(--duration)] ease-[var(--easing)] will-change-transform [contain:layout_style] [perspective:600px]'
      ref={refElement}
      onPointerMove={(event) => {
        const rotateFactor = 0.4;
        const rect = event.currentTarget.getBoundingClientRect();
        const position = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        };
        const percentage = {
          x: (100 / rect.width) * position.x,
          y: (100 / rect.height) * position.y
        };
        const delta = {
          x: percentage.x - 50,
          y: percentage.y - 50
        };

        const { rotate } = state.current;
        rotate.x = -(delta.x / 3.5);
        rotate.y = delta.y / 2;
        rotate.x *= rotateFactor;
        rotate.y *= rotateFactor;

        updateStyles();
      }}
      onPointerLeave={() => {
        isPointerInside.current = false;
        if (refElement.current) {
          refElement.current.style.removeProperty('--duration');
          refElement.current?.style.setProperty('--r-x', `0deg`);
          refElement.current?.style.setProperty('--r-y', `0deg`);
        }
      }}
    >
      <div className='grid h-full origin-center [transform:rotateY(var(--r-x))_rotateX(var(--r-y))] overflow-hidden rounded-[var(--radius)] border transition-transform delay-[var(--delay)] duration-[var(--duration)] ease-[var(--easing)] will-change-transform'>
        <div className='grid h-full w-full mix-blend-soft-light [clip-path:inset(0_0_0_0_round_var(--radius))] [grid-area:1/1]'>
          <div className={cn('h-full w-full bg-slate-950', className)}>
            {children}
          </div>
        </div>
        {/* 移除光线效果，只保留基本的卡片样式 */}
      </div>
    </div>
  );
};
