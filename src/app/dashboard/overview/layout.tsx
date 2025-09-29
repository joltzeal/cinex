import React from 'react';

export default function OverViewLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1">
      {children}
    </div>
  );
}
