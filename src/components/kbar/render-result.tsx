import { KBarResults, useMatches, useKBar, ActionImpl } from 'kbar';
import ResultItem from './result-item';
import { Film, Search, Users } from 'lucide-react';



export default function RenderResults() {
  const { results, rootActionId } = useMatches();
  const { query } = useKBar();

  let finalResults = results;

  
  return (
    <KBarResults
      items={results}
      onRender={({ item, active }) =>
        typeof item === 'string' ? (
          <div className='text-primary-foreground px-4 py-2 text-sm uppercase opacity-50'>
            {item}
          </div>
        ) : (
          <ResultItem
            action={item}
            active={active}
            currentRootActionId={rootActionId ?? ''}
          />
        )
      }
    />
  );
}


