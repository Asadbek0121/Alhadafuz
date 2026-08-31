import { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

export default function NotificationIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 288 288" {...props}>
      <g transform="matrix(9 0 0 9 0 0)">
        <path fill="#6356e5" d="M16 30a5.006 5.006 0 0 1-5-5 1 1 0 0 1 2 0 3 3 0 0 0 6 0 1 1 0 0 1 2 0 5.006 5.006 0 0 1-5 5Z" />
        <path fill="#55b3f3" d="m26.785 21.888-.614-1.542a3.01 3.01 0 0 1-.214-1.117v-4.921A10.174 10.174 0 0 0 17 4.061V3a1 1 0 0 0-2 0v1.062a9.855 9.855 0 0 0-5.792 2.625A10.059 10.059 0 0 0 6.043 14v5.229a3.01 3.01 0 0 1-.214 1.117l-.614 1.541A3 3 0 0 0 7.992 26h16.016a3 3 0 0 0 2.777-4.112Zm-1.96 1.677a.977.977 0 0 1-.817.435H7.992a.977.977 0 0 1-.817-.435.992.992 0 0 1-.1-.938l.614-1.542a5.016 5.016 0 0 0 .355-1.856V14a8.051 8.051 0 0 1 2.533-5.854A7.862 7.862 0 0 1 16 6c.177 0 .356.006.535.018a8.161 8.161 0 0 1 7.426 8.29v4.921a5 5 0 0 0 .356 1.856l.613 1.542a.992.992 0 0 1-.105.938Z" />
      </g>
    </svg>
  );
}