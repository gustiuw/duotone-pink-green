export default function Slider({ label, value, onChange, min, max, step }) {
  return (
    <div className="mb-2">
      <label className="form-label">{label}</label>
      <input
        type="range"
        className="form-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}