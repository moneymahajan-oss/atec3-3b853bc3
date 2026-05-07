import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[SectionError:${this.props.name || "unknown"}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // Render nothing — the rest of the page continues
      return null;
    }
    return this.props.children;
  }
}
