import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button as UiButton } from "@/components/ui/Button";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
};

export function Button({ className, children, ...props }: Props) {
  return (
    <UiButton className={className} {...props}>
      {children}
    </UiButton>
  );
}
