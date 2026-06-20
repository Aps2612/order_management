export function Loading({ label = "Loading..." }) {
  return <div className="state-view">{label}</div>;
}

export function ErrorView({ message }) {
  return <div className="state-view error">{message}</div>;
}

export function EmptyView({ message = "Nothing here yet." }) {
  return <div className="state-view muted">{message}</div>;
}
