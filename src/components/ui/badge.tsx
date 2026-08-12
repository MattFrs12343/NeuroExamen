import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border',
  {
    variants: {
      variant: {
        default:     'bg-primary/10 text-primary border-primary/20',
        secondary:   'bg-secondary/10 text-secondary border-secondary/20',
        destructive: 'bg-destructive/10 text-destructive border-destructive/20',
        outline:     'bg-transparent text-foreground border-border',
        success:     'bg-teal-50 text-teal-700 border-teal-200',
        warning:     'bg-amber-50 text-amber-700 border-amber-200',
        pending:     'bg-amber-50 text-amber-700 border-amber-200',
        completed:   'bg-teal-50 text-teal-700 border-teal-200',
        cancelled:   'bg-red-50 text-red-600 border-red-200',
        muted:       'bg-muted text-muted-foreground border-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// eslint-disable-next-line react-refresh/only-export-components -- shadcn/ui convention: variants live next to their component
export { Badge, badgeVariants };
