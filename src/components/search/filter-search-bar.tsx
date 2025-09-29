'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface Filters {
  sources: string[];
  minSize: number | null;
  maxSize: number | null;
  minFiles: number | null;
  maxFiles: number | null;
}

interface FilterSidebarProps {
  allData: { [source: string]: { count: number } };
  onFilterChange: (filters: Filters) => void;
}

export function FilterSidebar({ allData, onFilterChange }: FilterSidebarProps) {
  const sources = useMemo(() => Object.keys(allData || {}), [allData]);

  const [selectedSources, setSelectedSources] = useState<string[]>(sources);
  const [minSize, setMinSize] = useState('');
  const [maxSize, setMaxSize] = useState('');
  const [minFiles, setMinFiles] = useState('');
  const [maxFiles, setMaxFiles] = useState('');

  // Update parent component when any filter state changes
  useEffect(() => {
    onFilterChange({
      sources: selectedSources,
      minSize: minSize ? parseFloat(minSize) : null,
      maxSize: maxSize ? parseFloat(maxSize) : null,
      minFiles: minFiles ? parseInt(minFiles) : null,
      maxFiles: maxFiles ? parseInt(maxFiles) : null,
    });
  }, [selectedSources, minSize, maxSize, minFiles, maxFiles, onFilterChange]);

  // When new search results arrive, reset the filter checkboxes to all selected
  useEffect(() => {
    setSelectedSources(sources);
  }, [sources]);

  const handleSourceChange = (source: string, checked: boolean) => {
    setSelectedSources(prev =>
      checked ? [...prev, source] : prev.filter(s => s !== source)
    );
  };

  const resetFilters = () => {
    setSelectedSources(sources);
    setMinSize('');
    setMaxSize('');
    setMinFiles('');
    setMaxFiles('');
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Filter Results</CardTitle>
          <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold mb-3">Sources</h4>
          <div className="space-y-2">
            {sources.map(source => (
              <div key={source} className="flex items-center space-x-2">
                <Checkbox
                  id={`source-${source}`}
                  checked={selectedSources.includes(source)}
                  onCheckedChange={(checked) => handleSourceChange(source, !!checked)}
                />
                <Label htmlFor={`source-${source}`} className="capitalize">
                  {source} ({allData[source]?.count || 0})
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">File Size (MB)</h4>
          <div className="flex items-center gap-2">
            <Input type="number" placeholder="Min" value={minSize} onChange={e => setMinSize(e.target.value)} />
            <span className="text-muted-foreground">-</span>
            <Input type="number" placeholder="Max" value={maxSize} onChange={e => setMaxSize(e.target.value)} />
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">File Count</h4>
          <div className="flex items-center gap-2">
            <Input type="number" placeholder="Min" value={minFiles} onChange={e => setMinFiles(e.target.value)} />
            <span className="text-muted-foreground">-</span>
            <Input type="number" placeholder="Max" value={maxFiles} onChange={e => setMaxFiles(e.target.value)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}