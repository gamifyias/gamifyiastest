import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg hover:-translate-y-0.5",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md",
        outline: "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Game-specific variants
        game: "bg-gradient-to-b from-game-gold to-game-gold/80 text-primary-foreground font-bold shadow-pixel hover:shadow-pixel-lg hover:-translate-y-1 active:translate-y-0 active:shadow-pixel border-b-4 border-game-gold/60",
        gameSecondary: "bg-gradient-to-b from-game-pipe to-game-pipe-dark text-white font-bold shadow-pixel hover:shadow-pixel-lg hover:-translate-y-1 active:translate-y-0 border-b-4 border-game-pipe-dark",
        gameOutline: "border-2 border-game-gold bg-transparent text-game-gold hover:bg-game-gold/10 font-bold",
        gameDanger: "bg-gradient-to-b from-destructive to-destructive/80 text-white font-bold shadow-pixel hover:shadow-pixel-lg hover:-translate-y-1 border-b-4 border-destructive/60",
        // Admin variants
        admin: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 shadow-admin",
        adminGhost: "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        adminOutline: "border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
        iconSm: "h-8 w-8",
        iconLg: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
