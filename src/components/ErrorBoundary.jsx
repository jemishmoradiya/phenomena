import { Component } from "react";

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(previousProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return typeof this.props.fallback === "function"
      ? this.props.fallback(() => this.setState({ hasError: false }))
      : this.props.fallback;
  }
}

export default ErrorBoundary;
