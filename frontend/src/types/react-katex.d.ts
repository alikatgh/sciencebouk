declare module "react-katex" {
  import type { ReactElement } from "react";

  interface MathComponentProps {
    math: string;
    errorColor?: string;
    renderError?: (error: Error) => ReactElement;
  }

  export function BlockMath(props: MathComponentProps): ReactElement;
  export function InlineMath(props: MathComponentProps): ReactElement;
}
