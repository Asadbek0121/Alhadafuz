import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

// Since we don't have radix-ui installed (maybe), I'll use a standard label 
// but if I can use radix it is better. I'll assume standard label for now to be safe, 
// or I can check package.json again. I didn't see @radix-ui/react-label.
// I'll make a simple Label component.

const Label = React.forwardRef<
    HTMLLabelElement,
    React.LabelHTMLAttributes<HTMLLabelElement> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => {
    return (
        <label
            ref={ref}
            className={cn(labelVariants(), className)}
            {...props}
        />
    )
})
Label.displayName = "Label"

export { Label }
