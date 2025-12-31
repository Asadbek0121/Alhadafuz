import React from "react";
import { Input, InputProps } from "@/components/ui/input";

interface PhoneInputProps extends Omit<InputProps, "onChange"> {
    value: string;
    onChange: (value: string) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
    ({ value, onChange, className, ...props }, ref) => {

        // Format the phone number
        const formatPhoneNumber = (val: string) => {
            // 1. Keep only digits
            let digits = val.replace(/\D/g, "");

            // 2. Handle prefix rules
            // If empty or just "998", return empty (clean start) or partial
            if (digits === "") return "";

            // If user starts typing, we assume prefix is 998
            // If the input doesn't start with 998, prepend it
            if (!digits.startsWith("998")) {
                digits = "998" + digits;
            }

            // Max length for 998 + 9 digits = 12
            digits = digits.slice(0, 12);

            // 3. Format
            // +998
            let formatted = "+998";

            // (XX
            if (digits.length > 3) {
                formatted += ` (${digits.slice(3, 5)}`;
            }

            // ) XXX
            if (digits.length >= 6) {
                formatted += `) ${digits.slice(5, 8)}`;
            }

            // -XX
            if (digits.length >= 9) {
                formatted += `-${digits.slice(8, 10)}`;
            }

            // -XX
            if (digits.length >= 11) {
                formatted += `-${digits.slice(10, 12)}`;
            }

            return formatted;
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;

            // Special handling for backspace on prefix
            // If user tries to delete "+998", we generally protect it or allow clearing everything
            // With the logic above, if they delete digits, it re-renders formatted.

            const formatted = formatPhoneNumber(val);
            onChange(formatted);
        };

        // When focusing, if empty, maybe show prefix?
        // Let's keep it simple: placeholder does the job.

        return (
            <Input
                ref={ref}
                type="tel"
                value={value}
                onChange={handleChange}
                placeholder="+998 (90) 123-45-67"
                maxLength={19} // +998 (99) 999-99-99 is 19 chars
                className={className}
                {...props}
            />
        );
    }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
