export default function ColorPicker({ label, value, onChange }) {
  return (
    <div className="mb-2">
      <label className="form-label">{label}</label>
      <input
        type="color"
        className="form-control form-control-color"
        value={value}
        title={label}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        className="form-control mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}