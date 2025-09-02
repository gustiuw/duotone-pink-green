export default function Section({ title, children }) {
  return (
    <div className="mb-3">
      <h5>{title}</h5>
      {children}
    </div>
  );
}