import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <div className="page-error-card">
            <div className="page-error-icon">!</div>
            <div className="page-error-body">
              <strong>This page ran into a problem</strong>
              <span>{this.state.error?.message || 'An unexpected error occurred'}</span>
            </div>
            <div className="flex gap-8">
              <button className="btn btn-sm btn-primary" onClick={this.handleReset}>Try Again</button>
              <button className="btn btn-sm btn-outline" onClick={() => window.location.reload()}>Reload</button>
            </div>
          </div>
        );
      }
      return (
        <div className="error-boundary">
          <div className="error-boundary-icon">!</div>
          <h2>Something went wrong</h2>
          <p className="error-boundary-msg">{this.state.error?.message || 'An unexpected error occurred'}</p>
          <div className="flex gap-8">
            <button className="btn btn-primary" onClick={this.handleReset}>Try Again</button>
            <button className="btn btn-outline" onClick={() => window.location.reload()}>Reload App</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
