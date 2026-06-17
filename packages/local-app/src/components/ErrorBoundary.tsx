import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] caught:", error, info.componentStack)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) return this.props.fallback(error, this.reset)

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#faf9f5",
          color: "#2e2c28",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            background: "#ffffff",
            border: "1px solid #dcd9d2",
            borderRadius: 12,
            padding: 28,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <h1 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 600 }}>
            页面遇到了一个问题
          </h1>
          <p
            style={{
              margin: "0 0 16px",
              color: "#7a7872",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            TokenMeter 在渲染时发生了错误。可能是当前浏览器版本过旧，
            或本地数据接口异常。
          </p>
          <details
            style={{
              marginBottom: 16,
              fontSize: 12,
              color: "#7a7872",
              background: "#f4f2ec",
              border: "1px solid #dcd9d2",
              borderRadius: 6,
              padding: 10,
            }}
          >
            <summary style={{ cursor: "pointer", userSelect: "none" }}>
              查看错误详情
            </summary>
            <pre
              style={{
                margin: "8px 0 0",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {error.message}
            </pre>
          </details>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={this.reset}
              style={{
                padding: "8px 16px",
                background: "#2d5d59",
                color: "#ffffff",
                border: 0,
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              重试
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 16px",
                background: "#ffffff",
                color: "#2e2c28",
                border: "1px solid #dcd9d2",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              刷新页面
            </button>
          </div>
          <p
            style={{
              marginTop: 16,
              marginBottom: 0,
              fontSize: 12,
              color: "#7a7872",
            }}
          >
            提示：建议使用 Chrome 90+、Edge 90+、Firefox 90+ 或 Safari 15+
            等现代浏览器访问。
          </p>
        </div>
      </div>
    )
  }
}