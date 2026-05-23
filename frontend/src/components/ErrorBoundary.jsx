import { Component } from 'react';

/**
 * Catches render-time errors in the page area. A single failing page then
 * shows a recoverable message instead of blanking the whole application.
 * Keyed by route in Layout, so navigating away clears the error state.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // Surfaced for diagnostics (DevTools / backend log); not shown to the user.
    console.error('Sahifa xatosi:', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="empty" style={{ padding: 48 }}>
          <div className="e-ico">⚠️</div>
          <div className="e-text">
            Sahifada xatolik yuz berdi. Sahifani qayta yuklang yoki boshqa
            bo&apos;limga o&apos;ting.
          </div>
          <button
            className="btn btn-primary mt-16"
            onClick={() => window.location.reload()}
          >
            Qayta yuklash
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
