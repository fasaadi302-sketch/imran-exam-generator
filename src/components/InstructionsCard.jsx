/**
 * InstructionsCard.jsx
 * Card for managing the list of exam instructions printed on the paper.
 */

export default function InstructionsCard({ instrs, setInstrs }) {
  const update = (i, v) => setInstrs(prev => prev.map((x, j) => (j === i ? v : x)))
  const remove = (i) => setInstrs(prev => prev.filter((_, j) => j !== i))
  const add    = () => setInstrs(prev => [...prev, ''])

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-icon">📝</div>
        <h2>Instructions</h2>
      </div>
      <div className="card-body">
        {instrs.map((instr, i) => (
          <div key={i} className="instr-item">
            <input
              value={instr}
              onChange={e => update(i, e.target.value)}
              placeholder="Enter instruction..."
            />
            <button className="instr-del" onClick={() => remove(i)}>×</button>
          </div>
        ))}
        <button className="add-btn" onClick={add}>+ Add instruction</button>
      </div>
    </div>
  )
}
