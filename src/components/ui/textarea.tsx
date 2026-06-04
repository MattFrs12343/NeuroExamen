import * as React from 'react';
import { cn } from '../../lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[72px] w-full rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-y',
        'transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card focus:border-primary/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export { Textarea };
