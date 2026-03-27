import { Component, ErrorInfo, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode; fallback?: ReactNode };

type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-900">Something went wrong</p>
            <p className="mt-2 max-w-sm text-sm text-slate-600">
              The lab hit an unexpected error. You can return home and try again.
            </p>
            <Button asChild className="mt-6 bg-indigo-600 hover:bg-indigo-700">
              <Link to="/">Back to Dashboard</Link>
            </Button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
