"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppError } from "@/src/components/common/AppState";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class VeilErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV === "development") {
      console.error("Veil render error", error, info);
    }
  }

  render() {
    if (this.state.failed) {
      return <AppError message="Veil hit an unexpected display error. Your data remains stored locally." />;
    }
    return this.props.children;
  }
}
