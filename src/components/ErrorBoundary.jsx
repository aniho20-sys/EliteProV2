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
